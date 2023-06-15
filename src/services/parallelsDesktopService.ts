import {VM_TYPE} from "./../constants/flags";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";
import {Provider} from "../ioc/provider";
import {FLAG_NO_GROUP} from "../constants/flags";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";
import {parallelsOutputChannel} from "../helpers/channel";
import {VirtualMachine} from "../models/virtualMachine";
import {MachineSnapshot} from "../models/virtualMachineSnapshot";
import {generateMacConfigPvs} from "../helpers/pvsConfig";
import {NewVirtualMachineSpecs} from "../models/newVmRequest";

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

  static async getVms(): Promise<VirtualMachine[]> {
    return new Promise((resolve, reject) => {
      const config = Provider.getConfiguration();
      // Adding the default group
      if (!config.existsVirtualMachineGroup(FLAG_NO_GROUP)) {
        config.addVirtualMachineGroup(new VirtualMachineGroup(FLAG_NO_GROUP));
      }

      cp.exec("prlctl list -a -i --json", (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        try {
          // Adding all of the VMs to the default group
          const vms: VirtualMachine[] = JSON.parse(stdout);
          const noGroup = config.getVirtualMachineGroup(FLAG_NO_GROUP);
          noGroup?.clear();
          vms.forEach(vm => {
            const vmGroup = config.inVMGroup(vm.ID);
            if (vmGroup !== undefined) {
              const group = config.getVirtualMachineGroup(vmGroup);

              if (group === undefined) {
                parallelsOutputChannel.appendLine(`Group ${vmGroup} not found`);
                return reject(`group ${vmGroup} not found`);
              }

              vm.group = group?.name;
              group.add(vm);
              parallelsOutputChannel.appendLine(`Found vm ${vm.Name} in group ${vm.group}`);
            } else {
              noGroup?.add(vm);
              parallelsOutputChannel.appendLine(`Found vm ${vm.Name} with no group`);
            }
          });

          // sync the config file
          const configMachines = config.getAllMachines();
          configMachines.forEach(configMachine => {
            const vm = vms.find(vm => vm.ID === configMachine.ID);
            if (vm === undefined) {
              config.removeMachine(configMachine.ID);
              config.save();
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

      parallelsOutputChannel.appendLine(`starting vm: ${vmId}`);
      const prlctl = cp.spawn("prlctl", ["start", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
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
      const prlctl = cp.spawn("prlctl", ["start", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", async code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl start exited with code ${code}`);
          return resolve(false);
        }

        const ok = await this.setVmConfig(vmId, "startup-view", "window");
        if (!ok) {
          parallelsOutputChannel.appendLine(`failed to set startup-view to window`);
          return reject("failed to set startup-view to window");
        }
        return resolve(true);
      });
    });
  }

  static async setVmConfig(vmId: string, key: string, value: string, args: string[] = []): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`setting vm: ${vmId} flag ${key} to ${value}`);
      const prlctl = cp.spawn("prlctl", ["set", `"${vmId}"`, `--${key}`, value, ...args], {shell: true});
      parallelsOutputChannel.appendLine(prlctl.spawnargs.join(" "));
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl set exited with code ${code}`);
          parallelsOutputChannel.show();
          return reject(code);
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
      const prlctl = cp.spawn("prlctl", ["stop", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
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
      const prlctl = cp.spawn("prlctl", ["resume", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
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
      const prlctl = cp.spawn("prlctl", ["pause", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl pause exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async suspendVm(vmId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`suspending vm: ${vmId}`);
      const prlctl = cp.spawn("prlctl", ["suspend", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl suspend exited with code ${code}`);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static async getVmStatus(
    vmId: string
  ): Promise<"running" | "stopped" | "suspended" | "paused" | "snapshooting" | "unknown"> {
    return new Promise((resolve, reject) => {
      let stdOut: any;
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`getting status for vm: ${vmId}`);
      const prlctl = cp.spawn("prlctl", ["status", `"${vmId}"`], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        if (!stdOut) {
          stdOut = data;
        } else {
          stdOut += data;
        }
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        let status: "running" | "stopped" | "suspended" | "paused" | "snapshooting" | "unknown" = "unknown";
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
        if (stdOut.includes("snapshooting")) {
          status = "snapshooting";
        }

        // refreshing the vm state in the config
        const config = Provider.getConfiguration();
        config.setVmStatus(vmId, status);

        return resolve(status);
      });
    });
  }

  static async getVmSnapshots(vmId: string): Promise<MachineSnapshot[]> {
    return new Promise((resolve, reject) => {
      let stdout = "";
      const result: MachineSnapshot[] = [];

      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }

      parallelsOutputChannel.appendLine(`getting snapshots for vm: ${vmId}`);
      const prlctl = cp.spawn("prlctl", ["snapshot-list", `"${vmId}"`, "-j"], {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        stdout += data;
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl snapshot-list exited with code ${code}`);
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
          return resolve(result);
        } catch (e) {
          return reject(e);
        }
      });
    });
  }

  static async takeVmSnapshot(vmId: string, name: string, description?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }
      if (!name) {
        parallelsOutputChannel.appendLine(`name is empty`);
        return reject("name is empty");
      }

      parallelsOutputChannel.appendLine(`taking a snapshot for vm: ${vmId}`);
      const options = ["snapshot", `"${vmId}"`, "--name", `"${name}"`];
      if (description) {
        options.push("--description");
        options.push(description);
      }

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl snapshot exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async deleteVmSnapshot(vmId: string, snapshotId: string, includeChildren: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }
      if (!snapshotId) {
        parallelsOutputChannel.appendLine(`name is empty`);
        return reject("name is empty");
      }

      parallelsOutputChannel.appendLine(`deleting snapshot: ${snapshotId} for vm: ${vmId}`);
      const options = ["snapshot-delete", `"${vmId}"`, "--id", snapshotId];
      if (includeChildren) {
        options.push("--children");
      }

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl snapshot-delete exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async restoreVmSnapshot(vmId: string, snapshotId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!vmId) {
        parallelsOutputChannel.appendLine(`vmId is empty`);
        return reject("vmId is empty");
      }
      if (!snapshotId) {
        parallelsOutputChannel.appendLine(`name is empty`);
        return reject("name is empty");
      }

      parallelsOutputChannel.appendLine(`restoring snapshot: ${snapshotId} for vm: ${vmId}`);
      const options = ["snapshot-switch", `"${vmId}"`, "--id", snapshotId];

      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
        reject(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl snapshot-delete exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async registerVm(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!path) {
        parallelsOutputChannel.appendLine(`vm path is empty`);
        return reject("vm path is empty");
      }

      parallelsOutputChannel.appendLine(`registering vm on path: ${path}`);
      const options = ["register", `"${path}"`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl register exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async captureScreen(machineId: string, destination: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!machineId) {
        parallelsOutputChannel.appendLine(`vm id is empty`);
        return reject("vm id is empty");
      }

      parallelsOutputChannel.appendLine(`capturing machine screen ${machineId}`);
      const options = ["capture", `"${machineId}"`, "--file", `"${destination}"`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      parallelsOutputChannel.appendLine(`prlctl ${options.join(" ")}`);
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl capture exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async createVm(name: string, type: VM_TYPE): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!name) {
        parallelsOutputChannel.appendLine(`vm path is empty`);
        return reject("vm path is empty");
      }

      parallelsOutputChannel.appendLine(`creating vm ${name}`);
      const options = ["create", `"${name}"`, "-d", `${VM_TYPE[type]}`];
      const prlctl = cp.spawn("prlctl", options, {shell: true});
      prlctl.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      prlctl.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`prlctl create exited with code ${code}`);
          return reject(code);
        }

        return resolve(true);
      });
    });
  }

  static async createMacVm(ipswPath: string, name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!ipswPath) {
        parallelsOutputChannel.appendLine(`ipsw path is empty`);
        return reject("ipsw path is empty");
      }
      if (!name) {
        parallelsOutputChannel.appendLine(`name is empty`);
        return reject("name is empty");
      }
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
          parallelsOutputChannel.appendLine(`error creating config.pvs file: ${e}`);
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
        parallelsOutputChannel.appendLine(`creating mac vm ${name} on ${machinePath}`);
        const options = [ipswPath, fileName];
        try {
          const cmd = cp.spawn('"/Applications/Parallels Desktop.app/Contents/MacOS/prl_macvm_create"', options, {
            shell: true
          });
          cmd.stdout.on("data", data => {
            parallelsOutputChannel.appendLine(data);
          });
          cmd.stderr.on("data", data => {
            parallelsOutputChannel.appendLine(data);
          });
          cmd.on("close", code => {
            if (code !== 0) {
              parallelsOutputChannel.appendLine(`prl_macvm_create exited with code ${code}`);
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
              parallelsOutputChannel.appendLine(`error creating config.pvs file: ${e}`);
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
        parallelsOutputChannel.appendLine(`ISO path is empty`);
        return reject("ISO path is empty");
      }
      if (!name) {
        parallelsOutputChannel.appendLine(`name is empty`);
        return reject("name is empty");
      }

      let homePath = cp.execSync(`echo $HOME`).toString();
      homePath = homePath.replace(/\n/g, "");
      const machinePath = path.join(homePath, "Parallels");
      isoPath = isoPath.replace(/\s/g, "\\ ");
      const originalName = name;
      name = name.replace(/\s/g, "\\ ");
      const fileName = `${machinePath}/${originalName}.pvm`;
      // check if file exist, if it does let's just try to attach the machine
      if (fs.existsSync(fileName)) {
        // registering the vm
        this.registerVm(`${machinePath}/${name}.pvm`)
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
                        this.startVm(originalName)
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
          })
          .catch(reason => {
            return reject(reason);
          });
      }
    });
  }
}
