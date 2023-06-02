import * as cp from "child_process";
import {ParallelsVirtualMachine} from "../models/virtual_machine";
import {Provider} from "../ioc/provider";
import {FLAG_NO_GROUP} from "../constants/flags";
import {VirtualMachineGroup} from "../models/groups";
import {parallelsOutputChannel} from "../helpers/channel";

export class ParallelsDesktopService {
  static isParallelsDesktopInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      cp.exec("which prlctl", err => {
        if (err) {
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      cp.exec("prlctl --version", (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        return resolve(stdout);
      });
    });
  }

  static async getMachines(): Promise<ParallelsVirtualMachine[]> {
    return new Promise((resolve, reject) => {
      const config = Provider.getConfiguration();
      // Adding the default group
      if (!config.existsVirtualMachineGroup(FLAG_NO_GROUP)) {
        config.addVirtualMachineGroup(new VirtualMachineGroup(FLAG_NO_GROUP));
      }

      cp.exec("prlctl list -a --json", (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        try {
          // Adding all of the VMs to the default group
          const vms: ParallelsVirtualMachine[] = JSON.parse(stdout);
          const noGroup = config.getVirtualMachineGroup(FLAG_NO_GROUP);
          noGroup?.clear();
          vms.forEach(vm => {
            const vmGroup = config.inVMGroup(vm.uuid);
            if (vmGroup !== undefined) {
              const group = config.getVirtualMachineGroup(vmGroup);

              if (group === undefined) {
                parallelsOutputChannel.appendLine(`group ${vmGroup} not found`);
                return reject(`group ${vmGroup} not found`);
              }

              vm.group = group?.name;
              group.add(vm);
              parallelsOutputChannel.appendLine(`found vm: ${vm.name} in group ${vm.group}`);
            } else {
              noGroup?.add(vm);
              parallelsOutputChannel.appendLine(`found vm: ${vm.name}`);
            }
          });
          resolve(vms);
        } catch (e) {
          parallelsOutputChannel.appendLine("error while parsing vms");
          return reject(e);
        }
      });
    });
  }

  static async install(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["install", "parallels"]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`brew install exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async startVm(vmId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      const ok = await this.setVmConfig(vmId, "startup-view", "window");
      if (!ok) {
        parallelsOutputChannel.appendLine(`failed to set startup-view to window`);
        return reject("failed to set startup-view to window");
      }

      parallelsOutputChannel.appendLine(`starting vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["start", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl start exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async startHeadlessVm(vmId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      const ok = await this.setVmConfig(vmId, "startup-view", "headless");
      if (!ok) {
        parallelsOutputChannel.appendLine(`failed to set startup-view to headless`);
        return reject("failed to set startup-view to headless");
      }

      parallelsOutputChannel.appendLine(`starting vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["start", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl start exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async setVmConfig(vmId: string, key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`setting vm: ${vmId} flag ${key} to ${value}`);
      const brew = cp.spawn("prlctl", ["set", vmId, `--${key}`, value]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl set exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async stopVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`stopping vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["stop", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl stop exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async resumeVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`resuming vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["resume", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl resume exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async pauseVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`pausing vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["pause", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl pause exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async getVmStatus(vmId: string): Promise<"running" | "stopped" | "suspended" | "paused" | "unknown"> {
    return new Promise((resolve, reject) => {
      let stdOut: any;
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`getting status for vm: ${vmId}`);
      const brew = cp.spawn("prlctl", ["status", vmId]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        if (!stdOut) {
          stdOut = data;
        } else {
          stdOut += data;
        }
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      brew.on("close", code => {
        let status: "running" | "stopped" | "suspended" | "paused" | "unknown" = "unknown";
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl pause exited with code ${code}`);
          return reject(status);
        }
        if (stdOut.includes("running")) {
          status = "running";
        }
        if (stdOut.includes("stopped")) {
          status = "stopped";
        }
        if (stdOut.includes("suspended")) {
          status = "suspended";
        }
        if (stdOut.includes("paused")) {
          status = "paused";
        }

        // refreshing the vm state in the config
        const config = Provider.getConfiguration();
        config.setVmStatus(vmId, status);

        return resolve(status);
      });
    });
  }
}
