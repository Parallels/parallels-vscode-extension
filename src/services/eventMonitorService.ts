import * as cp from "child_process";
import {LogService} from "./logService";
import {Provider} from "../ioc/provider";
import {VirtualMachine} from "../models/parallels/virtualMachine";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {FLAG_NO_GROUP, FLAG_PARALLELS_DESKTOP_PATH} from "../constants/flags";

interface ParallelsServiceEvent {
  Timestamp: string;
  "VM ID": string;
  "Event name": string;
  "Additional info"?: any;
}

interface VmStateChange {
  "Vm state name": string;
}

interface VmAdded {
  vm_id: string;
  new_vm: VirtualMachine;
}

interface VmRemoved {
  vm_id: string;
}

export class EventMonitorService {
  private static process: cp.ChildProcess | undefined;
  private static onUpdateCallback: (() => void) | undefined;

  static start(onUpdate: () => void) {
    if (this.process) {
      return;
    }
    this.onUpdateCallback = onUpdate;
    LogService.info("Starting Parallels Desktop Event Monitor", "EventMonitorService");

    try {
      const settings = Provider.getSettings();
      const prlctlPath = settings.get<string>(FLAG_PARALLELS_DESKTOP_PATH) || "prlctl";

      this.process = this.spawnEventMonitorProcess(prlctlPath);

      if (this.process.stdout) {
        this.process.stdout.on("data", data => {
          const output = data.toString();
          const lines = output.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event: ParallelsServiceEvent = JSON.parse(line);
              this.processEvent(event);
            } catch (e) {
              LogService.error(`Failed to parse Event Monitor output line: ${line}`, "EventMonitorService");
              // Ignore non-JSON lines
            }
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on("data", data => {
          LogService.error(`Event Monitor Error: ${data.toString()}`, "EventMonitorService");
        });
      }

      this.process.on("exit", code => {
        LogService.info(`Event Monitor exited with code ${code}`, "EventMonitorService");
        this.process = undefined;
      });
    } catch (e) {
      LogService.error(`Failed to start Event Monitor: ${e}`, "EventMonitorService");
    }
  }

  private static spawnEventMonitorProcess(prlctlPath: string): cp.ChildProcess {
    // macOS: 'prlctl' buffers output when not in a TTY.
    // We use 'expect' to create a PTY, forcing line-buffering.
    // 'set timeout -1' prevents the default 10s timeout.
    const script = `set timeout -1; spawn "${prlctlPath}" monitor-events --json; expect eof`;
    LogService.info(`Spawning Event Monitor (macOS/expect)`, "EventMonitorService");
    return cp.spawn("expect", ["-c", script]);
  }

  static stop() {
    if (this.process) {
      LogService.info("Stopping Parallels Desktop Event Monitor", "EventMonitorService");
      this.process.kill();
      this.process = undefined;
    }
  }

  private static async processEvent(event: ParallelsServiceEvent) {
    const config = Provider.getConfiguration();
    let shouldRefresh = false;
    LogService.info(`Processing event: ${event["Event name"]}`, "EventMonitorService");

    switch (event["Event name"]) {
      case "vm_state_changed":
        shouldRefresh = await this.processVmStateChanged(event, config);
        break;
      case "vm_added":
        shouldRefresh = await this.processVmAdded(event, config);
        break;
      case "vm_unregistered":
        shouldRefresh = await this.processVmUnregistered(event, config);
        break;
      case "vm_snapshots_tree_changed":
        shouldRefresh = await this.processSnapshotsTreeChanged(event, config);
        break;
      // case "vm_config_changed":
      //     shouldRefresh = await this.processVmConfigChanged(event, config);
      //     break;
      default:
        LogService.debug(`Unhandled event: ${event["Event name"]}`, "EventMonitorService");
        break;
    }

    if (shouldRefresh && this.onUpdateCallback) {
      config.save();
      this.onUpdateCallback();
    }
  }

  private static async processVmStateChanged(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const info = event["Additional info"] as VmStateChange;
    const vmId = event["VM ID"];
    if (!info || !vmId) return false;

    const vm = config.getVirtualMachine(vmId);
    if (vm) {
      const newState = info["Vm state name"];
      LogService.info(`Updating VM ${vm.Name} state to ${newState}`, "EventMonitorService");
      vm.State = newState;
      if (newState === "running") {
        this.fetchAndSetVmIp(vmId, config);
      } else if (newState === "stopped" || newState === "suspended") {
        vm.configuredIpAddress = undefined;
      }
      return true;
    }
    return false;
  }

  private static async fetchAndSetVmIp(vmId: string, config: any) {
    try {
      const detailsArray = await ParallelsDesktopService.getVmsRunningDetails(vmId);
      const details = detailsArray[0];
      const vm = config.getVirtualMachine(vmId);
      if (vm && details && details.ip_configured) {
        LogService.debug(`Updating IP for VM ${vm.Name} to ${details.ip_configured}`, "EventMonitorService");
        vm.configuredIpAddress = details.ip_configured;
        config.save();
        if (this.onUpdateCallback) {
          this.onUpdateCallback();
        }
      }
    } catch (error) {
      LogService.error(`Failed to fetch IP for VM ${vmId}: ${error}`, "EventMonitorService");
    }
  }

  private static async processVmAdded(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (!vmId) {
      LogService.error("VM Added event missing VM ID", "EventMonitorService");
      return false;
    }
    LogService.info(`VM Added event for ID: ${vmId}.`, "EventMonitorService");
    return await this.updateVmInConfig(vmId, config);
  }

  private static async processVmUnregistered(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (vmId) {
      LogService.info(`VM Unregistered: ${vmId}`, "EventMonitorService");
      config.removeMachine(vmId);
      return true;
    }
    return false;
  }

  private static async processSnapshotsTreeChanged(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (vmId) {
      LogService.info(`Snapshots tree changed for VM: ${vmId}`, "EventMonitorService");
      return await this.updateVmInConfig(vmId, config);
    }
    return false;
  }

  private static async updateVmInConfig(vmId: string, config: any): Promise<boolean> {
    LogService.info(`Fetching details for VM ${vmId}...`, "EventMonitorService");
    try {
      // We need to execute prlctl list to get the full VM details
      const fullVm = await ParallelsDesktopService.getVmPath(vmId);
      const noGroup = config.getVirtualMachineGroup(FLAG_NO_GROUP);

      if (fullVm && noGroup) {
        // Check if the VM is already known
        const existingVm = config.getVirtualMachine(vmId);
        if (existingVm) {
          LogService.info(`VM ${vmId} already exists in config, updating...`, "EventMonitorService");
          // Preserve group if it exists, otherwise use default
          fullVm.group = existingVm.group || noGroup.uuid;
          // Remove old object to ensure clean update
          config.removeMachine(vmId);
        } else {
          fullVm.group = noGroup.uuid;
        }

        fullVm.hidden = false;
        // Add the new/updated VM object
        const targetGroup = config.getVirtualMachineGroup(fullVm.group) || noGroup;
        targetGroup.addVm(fullVm);

        LogService.info(`Updated/Added VM ${fullVm.Name} to group ${targetGroup.uuid}`, "EventMonitorService");
        return true;
      }
    } catch (e) {
      LogService.error(`Failed to fetch details for VM ${vmId}: ${e}`, "EventMonitorService");
    }
    return false;
  }
}
