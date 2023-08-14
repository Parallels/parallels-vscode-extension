import {FLAG_PARALLELS_DESKTOP_PATH, VM_TYPE} from "./../constants/flags";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import {Provider} from "../ioc/provider";
import {FLAG_NO_GROUP} from "../constants/flags";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";
import {VirtualMachine} from "../models/virtualMachine";
import {MachineSnapshot} from "../models/virtualMachineSnapshot";
import {generateMacConfigPvs} from "../helpers/pvsConfig";
import {LogService} from "./logService";
import {NewVirtualMachineSpecs} from "../models/NewVirtualMachineSpecs";
import {ParallelsDesktopServerInfo} from "../models/ParallelsDesktopServerInfo";

export class ParallelsDesktopService {
  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_PARALLELS_DESKTOP_PATH)) {
        LogService.info(
          `Packer was found on path ${cache.get(FLAG_PARALLELS_DESKTOP_PATH)} from cache`,
          "PackerService"
        );
        return resolve(true);
      }

      if (settings.get<string>(FLAG_PARALLELS_DESKTOP_PATH)) {
        LogService.info(
          `Packer was found on path ${settings.get<string>(FLAG_PARALLELS_DESKTOP_PATH)} from settings`,
          "PackerService"
        );
        return resolve(true);
      }

      cp.exec("which prlctl", (err, stdout) => {
        if (err) {
          LogService.error("Parallels Desktop is not installed", "ParallelsDesktopService", false, false);
          return resolve(false);
        }

        const path = stdout.replace("\n", "").trim();
        LogService.info(`Parallels Desktop Client was found on path ${path}`, "PackerService");
        const packerPath = settings.get<string>(FLAG_PARALLELS_DESKTOP_PATH);
        if (!packerPath) {
          settings.update(FLAG_PARALLELS_DESKTOP_PATH, path, true);
        }
        Provider.getCache().set(FLAG_PARALLELS_DESKTOP_PATH, path);
        return resolve(true);
      });
    });
  }

  static async getVms(): Promise<VirtualMachine[]> {
    return new Promise((resolve, reject) => {
      const config = Provider.getConfiguration();
      // Adding the default group
      if (!config.existsVirtualMachineGroup(FLAG_NO_GROUP)) {
        config.addVirtualMachineGroup(new VirtualMachineGroup(FLAG_NO_GROUP));
      }

      cp.exec("prlctl list -a -i --json", (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        try {
          // Adding all of the VMs to the default group
          const vms: VirtualMachine[] = JSON.parse(stdout);
          const noGroup = config.getVirtualMachineGroup(FLAG_NO_GROUP);
          vms.forEach(vm => {
            const dbMachine = config.getVirtualMachine(vm.ID);
            if (dbMachine !== undefined) {
              // This will try to fix any wrong groups that might have been set
              if (!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(dbMachine.group)) {
                dbMachine.group = noGroup?.uuid ?? "";
              }
              const machineGroup = config.getVirtualMachineGroup(dbMachine.group);
              if (machineGroup === undefined) {
                LogService.error(`Group ${dbMachine.group} not found, rejecting`, "ParallelsDesktopService");
                return reject(`Group ${dbMachine.group} not found, rejecting`);
              }

              vm.group = machineGroup?.uuid;
              vm.hidden = dbMachine.hidden;
              machineGroup.addVm(vm);
              LogService.debug(`Found vm ${vm.Name} in group ${vm.group}`, "ParallelsDesktopService");
            } else {
              vm.hidden = false;
              noGroup?.addVm(vm);
              LogService.debug(`Found vm ${vm.Name} in group ${noGroup?.uuid}`, "ParallelsDesktopService");
            }
          });
          // Checking for duplicated VMs, this can happen if a machine has been renamed

          // sync the config file and clean any unwanted machines
          const configMachines = config.allMachines;
          configMachines.forEach(configMachine => {
            const vm = vms.find(vm => vm.ID === configMachine.ID);
            if (vm === undefined) {
              config.removeMachine(configMachine.ID);
              config.save();
            }
          });
          config.sort();
          resolve(vms);
        } catch (e) {
          LogService.error(`Error while parsing vms: ${e}`, "ParallelsDesktopService");
          return reject(e);
        }
      });
    });
  }

  static async install(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          progress.report({message: "Installing Parallels Desktop..."});
          const result = await new Promise(async (resolve, reject) => {
            const brew = cp.spawn("brew", ["install", "parallels"]);
            brew.stdout.on("data", data => {
              LogService.info(data.toString(), "ParallelsDesktopService");
            });
            brew.stderr.on("data", data => {
              LogService.error(data.toString(), "ParallelsDesktopService");
            });
            brew.on("close", code => {
              if (code !== 0) {
                LogService.error(`brew install exited with code ${code}`, "ParallelsDesktopService");
                return reject(code);
              }
              LogService.info(`Parallels Desktop was installed successfully`, "ParallelsDesktopService");
              return resolve(true);
            });
          });
          if (!result) {
            progress.report({message: "Failed to install Parallels Desktop, see logs for more details"});
            vscode.window.showErrorMessage("Failed to install Parallels Desktop, see logs for more details");
            return resolve(false);
          } else {
            progress.report({message: "Parallels Desktop was installed successfully"});
            vscode.window.showInformationMessage("Parallels Desktop was installed successfully");
            return resolve(true);
          }
        }
      );
      return resolve(true);
    });
  }

  static async startVm(vmId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Starting vm ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["start", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl start exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Vm ${vmId} started successfully`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async startHeadlessVm(vmId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      const ok = await this.setVmConfig(vmId, "startup-view", "headless");
      if (!ok) {
        LogService.error(`Failed to set startup-view to headless`, "ParallelsDesktopService");
        return reject("failed to set startup-view to headless");
      }

      LogService.info(`Starting vm ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["start", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", async code => {
        if (code !== 0) {
          LogService.error(`prlctl start exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        const ok = await this.setVmConfig(vmId, "startup-view", "window");
        if (!ok) {
          LogService.error(`Failed to set startup-view to window`, "ParallelsDesktopService");
          return reject("failed to set startup-view to window");
        }

        LogService.info(`Vm ${vmId} started successfully in headless mode`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async setVmConfig(vmId: string, key: string, value: string, args: string[] = []): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`sSetting vm ${vmId} flag ${key} to ${value}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["set", `"${vmId}"`, `--${key}`, value, ...args], {shell: true});
      LogService.debug(prlctl.spawnargs.join(" "), "ParallelsDesktopService");
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl set exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Vm ${vmId} flag ${key} set to ${value} successfully`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async stopVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Stopping vm ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["stop", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl stop exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(`Error stopping Virtual Machine, return code: ${code}`);
        }

        LogService.info(`Vm ${vmId} stopped successfully`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async resumeVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Resuming vm ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["resume", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl resume exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Vm ${vmId} resumed successfully`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async pauseVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error("vmId is empty", "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Pausing vm ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["pause", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl pause exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Vm ${vmId} paused successfully`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async deleteVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Deleting Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["delete", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", async code => {
        if (code !== 0) {
          LogService.error(`prlctl delete exited with code ${code}`, "ParallelsDesktopService", true);
          await ParallelsDesktopService.unregisterVm(vmId)
            .then(result => {
              if (!result) {
                return resolve(false);
              }
              // Lets try to unregister the machine
              return resolve(true);
            })
            .catch(error => {
              LogService.error(`prlctl delete exited with code ${code}`, "ParallelsDesktopService", true);
              return resolve(false);
            });
        }

        LogService.info(`Virtual Machine ${vmId} deleted`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async unregisterVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Unregistering Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["unregister", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          // Lets try to unregister the machine
          LogService.error(`prlctl unregister exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Virtual Machine ${vmId} unregistered`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async suspendVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Suspending Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["suspend", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl suspend exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Virtual Machine ${vmId} suspended`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async enterVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Entering Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["enter", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl enter exited with code ${code}`, "ParallelsDesktopService", true);
          return resolve(false);
        }

        LogService.info(`Virtual Machine ${vmId} entered`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async getVmStatus(
    vmId: string
  ): Promise<"running" | "stopped" | "suspended" | "paused" | "snapshooting" | "unknown"> {
    return new Promise((resolve, reject) => {
      let stdOut = "";
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }
      LogService.info(`Getting status for Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["status", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        stdOut += data;
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        let status: "running" | "stopped" | "suspended" | "paused" | "snapshooting" | "unknown" = "unknown";
        if (code !== 0) {
          LogService.error(`prlctl pause exited with code ${code}`, "ParallelsDesktopService", true);
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
        if (stdOut.includes("snapshooting")) {
          status = "snapshooting";
        }

        // refreshing the vm state in the config
        const config = Provider.getConfiguration();
        config.setVmStatus(vmId, status);

        LogService.info(`Virtual Machine ${vmId} status: ${status}`, "ParallelsDesktopService");
        return resolve(status);
      });
    });
  }

  static async getVmSnapshots(vmId: string): Promise<MachineSnapshot[]> {
    return new Promise((resolve, reject) => {
      let stdout = "";
      const result: MachineSnapshot[] = [];

      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }

      LogService.info(`Getting snapshots for Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const prlctl = cp.spawn("prlctl", ["snapshot-list", `"${vmId}"`, "-j"], {shell: true});
      prlctl.stdout.on("data", data => {
        stdout += data;
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl snapshot-list exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        try {
          if (stdout === "") {
            return resolve(result);
          }
          const snapshots = JSON.parse(stdout);
          for (const snapshot in snapshots) {
            const machineSnapshot = snapshots[snapshot] as MachineSnapshot;
            machineSnapshot.id = snapshot.replace("{", "").replace("}", "");
            machineSnapshot.parent = machineSnapshot.parent.replace("{", "").replace("}", "");
            result.push(machineSnapshot);
          }
          LogService.info(`Virtual Machine ${vmId} snapshots: ${JSON.stringify(result)}`, "ParallelsDesktopService");
          return resolve(result);
        } catch (e) {
          LogService.error(`prlctl snapshot-list parsing error: ${e}`, "ParallelsDesktopService", true);
          return reject(e);
        }
      });
    });
  }

  static async takeVmSnapshot(vmId: string, name: string, description?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }
      if (!name) {
        LogService.error(`name is empty`, "ParallelsDesktopService");
        return reject("name is empty");
      }

      LogService.info(`Taking a snapshot for Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const options = ["snapshot", `"${vmId}"`, "--name", `"${name}"`];
      if (description) {
        options.push("--description");
        options.push(description);
      }

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl snapshot exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${vmId} snapshot ${name} created`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async deleteVmSnapshot(vmId: string, snapshotId: string, includeChildren: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }
      if (!snapshotId) {
        LogService.error(`snapshotId is empty`, "ParallelsDesktopService");
        return reject("name is empty");
      }

      LogService.info(`Deleting snapshot ${snapshotId} for Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const options = ["snapshot-delete", `"${vmId}"`, "--id", snapshotId];
      if (includeChildren) {
        options.push("--children");
      }

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl snapshot-delete exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${vmId} snapshot ${snapshotId} deleted`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async restoreVmSnapshot(vmId: string, snapshotId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        LogService.error(`vmId is empty`, "ParallelsDesktopService");
        return reject("vmId is empty");
      }
      if (!snapshotId) {
        LogService.error(`snapshotId is empty`, "ParallelsDesktopService");
        return reject("name is empty");
      }

      LogService.info(`Restoring snapshot ${snapshotId} for Virtual Machine ${vmId}`, "ParallelsDesktopService");
      const options = ["snapshot-switch", `"${vmId}"`, "--id", snapshotId];

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl snapshot-switch exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${vmId} snapshot ${snapshotId} restored`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async registerVm(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!path) {
        LogService.error(`vm path is empty`, "ParallelsDesktopService");
        return reject("vm path is empty");
      }

      LogService.info(`Registering Virtual Machine ${path}`, "ParallelsDesktopService");
      const options = ["register", `"${path}"`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl register exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${path} registered`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async renameVm(machineIdOrName: string, newMachineName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!machineIdOrName) {
        LogService.error(`Machine name or id is missing`, "ParallelsDesktopService");
        return reject("Machine name or id is missing");
      }
      if (!newMachineName) {
        LogService.error(`New machine name is missing`, "ParallelsDesktopService");
        return reject("New machine name is missing");
      }

      LogService.info(`Renaming Virtual Machine ${machineIdOrName}`, "ParallelsDesktopService");
      const options = ["set", `"${machineIdOrName}"`, "--name", `"${newMachineName}"`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl set rename exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${machineIdOrName} renamed to ${newMachineName}`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async captureScreen(machineId: string, destination: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!machineId) {
        LogService.error(`vm id is empty`, "ParallelsDesktopService");
        return reject("vm id is empty");
      }

      if (!destination) {
        LogService.error(`destination is empty`, "ParallelsDesktopService");
        return reject("destination is empty");
      }

      LogService.info(`Capturing machine screen ${machineId}`, "ParallelsDesktopService");
      const options = ["capture", `"${machineId}"`, "--file", `"${destination}"`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      LogService.debug(`prlctl ${options.join(" ")}`, "ParallelsDesktopService");

      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl capture exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${machineId} screen captured`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async createVm(name: string, type: VM_TYPE): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!name) {
        LogService.error(`name is empty`, "ParallelsDesktopService");
        return reject("vm path is empty");
      }

      if (!type) {
        LogService.error(`type is empty`, "ParallelsDesktopService");
        return reject("type is empty");
      }

      LogService.info(`Creating Virtual Machine ${name}`, "ParallelsDesktopService");
      const options = ["create", `"${name}"`, "-d", `${VM_TYPE[type]}`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        LogService.info(data.toString(), "ParallelsDesktopService");
      });
      prlctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlctl create exited with code ${code}`, "ParallelsDesktopService", true);
          return reject(code);
        }

        LogService.info(`Virtual Machine ${name} created`, "ParallelsDesktopService");
        return resolve(true);
      });
    });
  }

  static async createMacVm(ipswPath: string, name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!ipswPath) {
        LogService.error(`ipsw path is empty`, "ParallelsDesktopService");
        return reject("ipsw path is empty");
      }
      if (!name) {
        LogService.error(`name is empty`, "ParallelsDesktopService");
        return reject("name is empty");
      }
      if (Provider.getConfiguration().packerDesktopMajorVersion <= 17) {
        LogService.error(`Packer Desktop 17 and below is not supported`, "ParallelsDesktopService");
        return reject("Packer Desktop 17 and below is not supported");
      }
      if (Provider.getConfiguration().packerDesktopMajorVersion == 18) {
        LogService.info("Detected Parallels Desktop version 18, using old process", "ParallelsDesktopService");
        let homePath = cp.execSync(`echo $HOME`).toString();
        homePath = homePath.replace(/\n/g, "");
        const machinePath = path.join(homePath, "Parallels");
        ipswPath = ipswPath.replace(/\s/g, "\\ ");
        const originalName = name;
        name = name.replace(/\s/g, "\\ ");
        const fileName = `${machinePath}/${originalName}.macvm`;
        // check if file exist, if it does let's just try to attach the machine
        if (fs.existsSync(fileName)) {
          try {
            // creating the custom config.pvs file if it does not exist in the bundle
            const configPath = path.join(machinePath, `${originalName}.macvm`, "config.pvs");
            if (!fs.existsSync(configPath)) {
              const configPvs = generateMacConfigPvs(originalName);
              fs.writeFileSync(configPath, configPvs);
            }
          } catch (e) {
            LogService.error(`Error creating config.pvs file: ${e}`, "ParallelsDesktopService");
            return reject(e);
          }

          // registering the vm
          this.registerVm(`${machinePath}/${name}.macvm`)
            .then(value => {
              if (!value) {
                return reject(false);
              }
              return resolve(true);
            })
            .catch(reason => {
              return reject(reason);
            });
        } else {
          LogService.info(`Creating Virtual Machine ${name}`, "ParallelsDesktopService");
          const options = [ipswPath, fileName];
          try {
            const cmd = cp.spawn('"/Applications/Parallels Desktop.app/Contents/MacOS/prl_macvm_create"', options, {
              shell: true
            });
            cmd.stdout.on("data", data => {
              LogService.info(data.toString(), "ParallelsDesktopService");
            });
            cmd.stderr.on("data", data => {
              LogService.error(data.toString(), "ParallelsDesktopService");
            });
            cmd.on("close", code => {
              if (code !== 0) {
                LogService.error(`prl_macvm_create exited with code ${code}`, "ParallelsDesktopService", true);
                return reject(code);
              }
              try {
                // creating the custom config.pvs file if it does not exist in the bundle
                const configPath = path.join(machinePath, `${originalName}.macvm`, "config.pvs");
                if (!fs.existsSync(configPath)) {
                  const configPvs = generateMacConfigPvs(originalName);
                  fs.writeFileSync(configPath, configPvs);
                }
              } catch (e) {
                LogService.error(`Error creating config.pvs file: ${e}`, "ParallelsDesktopService");
                return reject(e);
              }

              // registering the vm
              this.registerVm(`${machinePath}/${name}.macvm`)
                .then(value => {
                  if (!value) {
                    return reject(false);
                  }
                  return resolve(true);
                })
                .catch(reason => {
                  return reject(reason);
                });
            });
          } catch (e) {
            return reject(e);
          }
        }
      }
      if (Provider.getConfiguration().packerDesktopMajorVersion >= 19) {
        LogService.info("Detected Parallels Desktop version 19, using new process", "ParallelsDesktopService");
        const options = ["create", `"${name}"`, "-o", "macos", "--restore-image", `"${ipswPath}"`];
        const prlctl = cp.spawn("prlctl", options, {shell: true});
        prlctl.stdout.on("data", data => {
          LogService.info(data.toString(), "ParallelsDesktopService");
        });
        prlctl.stderr.on("data", data => {
          LogService.error(data.toString(), "ParallelsDesktopService");
        });
        prlctl.on("close", code => {
          if (code !== 0) {
            LogService.error(`prlctl create exited with code ${code}`, "ParallelsDesktopService", true);
            return reject(code);
          }

          LogService.info(`Mac VM ${name} created successfully`, "ParallelsDesktopService");
          return resolve(true);
        });
      }
    });
  }

  static async createIsoVm(
    name: string,
    isoPath: string,
    type: VM_TYPE,
    specs: NewVirtualMachineSpecs
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!isoPath) {
        LogService.error(`ISO path is empty`, "ParallelsDesktopService");
        return reject("ISO path is empty");
      }
      if (!name) {
        LogService.error(`name is empty`, "ParallelsDesktopService");
        return reject("name is empty");
      }

      isoPath = isoPath.replace(/\s/g, "\\ ");
      const originalName = name;

      const fileName = `${Provider.getConfiguration().vmHome}/${originalName}.pvm`;
      // check if file exist, if it does let's just try to attach the machine
      if (fs.existsSync(fileName)) {
        // registering the vm
        this.registerVm(name)
          .then(value => {
            if (!value) {
              return reject(false);
            }
            return resolve(true);
          })
          .catch(reason => {
            return reject(reason);
          });
      } else {
        this.createVm(originalName, type)
          .then(async value => {
            if (!value) {
              return reject(false);
            }
            // let oppResult = false;
            // Setting the CPU
            await this.setVmConfig(originalName, "cpus", `${specs.cpus}`).catch(reason => {
              return reject(reason);
            });
            // Setting the RAM
            await this.setVmConfig(originalName, "memsize", `${specs.memory}`).catch(reason => {
              return reject(reason);
            });
            // Setting the disk size
            await this.setVmConfig(originalName, "device-set", "hdd0", ["--size", `${specs.disk}`]).catch(reason => {
              return reject(reason);
            });

            this.setVmConfig(originalName, "device-del", "cdrom0")
              .then(value => {
                if (!value) {
                  return reject(false);
                }
                this.setVmConfig(originalName, "device-add", "cdrom", ["--image", isoPath, "--connect"])
                  .then(value => {
                    if (!value) {
                      return reject(false);
                    }
                    this.setVmConfig(originalName, "device-bootorder", `"cdrom0 hdd0"`)
                      .then(value => {
                        if (!value) {
                          return reject(false);
                        }
                        return resolve(true);
                      })
                      .catch(reason => {
                        return reject(reason);
                      });
                  })
                  .catch(reason => {
                    return reject(reason);
                  });
              })
              .catch(reason => {
                return reject(reason);
              });
          })
          .catch(reason => {
            return reject(reason);
          });
      }
    });
  }

  static async getServerInfo(): Promise<ParallelsDesktopServerInfo> {
    return new Promise((resolve, reject) => {
      let stdOut = "";
      LogService.info("Getting server info", "ParallelsDesktopService");
      const prlsrvctl = cp.spawn("prlsrvctl", ["info", "--json"], {shell: true});
      prlsrvctl.stdout.on("data", data => {
        stdOut += data.toString();
        LogService.debug(data.toString(), "ParallelsDesktopService");
      });
      prlsrvctl.stderr.on("data", data => {
        LogService.error(data.toString(), "ParallelsDesktopService");
      });
      prlsrvctl.on("close", code => {
        if (code !== 0) {
          LogService.error(`prlsrvctl info exited with code ${code}`, "ParallelsDesktopService");
          return reject(`prlsrvctl info exited with code ${code}`);
        }
        try {
          const info = JSON.parse(stdOut);
          return resolve(info as ParallelsDesktopServerInfo);
        } catch (e) {
          LogService.error(`prlsrvctl info: ${e}`, "ParallelsDesktopService");
          return reject(e);
        }
      });
    });
  }
}
