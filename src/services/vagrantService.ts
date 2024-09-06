import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import {
  CommandsFlags,
  FLAG_HAS_VAGRANT,
  FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS,
  FLAG_VAGRANT_PATH,
  FLAG_VAGRANT_VERSION
} from "../constants/flags";
import {Provider} from "../ioc/provider";
import {getVagrantBoxFolder} from "../helpers/helpers";
import {LogService} from "./logService";
import {VagrantCloudBoxes} from "../models/vagrant/VagrantCloudBoxes";
import axios from "axios";
import {VagrantCloudBox} from "../models/vagrant/VagrantCloudBox";
import {TELEMETRY_INSTALL_VAGRANT} from "../telemetry/operations";
import {VagrantBoxProvider} from "../tree/vagrantBoxProvider/vagrantBoxProvider";

export class VagrantService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_VAGRANT_PATH)) {
        LogService.info(`Vagrant was found on path ${cache.get(FLAG_VAGRANT_PATH)} from cache`, "VagrantService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_VAGRANT_PATH)) {
        LogService.info(
          `Vagrant was found on path ${settings.get<string>(FLAG_VAGRANT_PATH)} from settings`,
          "VagrantService"
        );
        const path = settings.get<string>(FLAG_VAGRANT_PATH) ?? "";
        if (fs.existsSync(path)) {
          return resolve(true);
        } else {
          LogService.error("Vagrant is not installed", "VagrantService");
          settings.update(FLAG_VAGRANT_PATH, "", true);
          return resolve(false);
        }
      }

      cp.exec("which vagrant", (err, stdout) => {
        if (err) {
          LogService.error("Vagrant is not installed", "VagrantService");
          return resolve(false);
        }
        const path = stdout.replace("\n", "").trim();
        LogService.info(`Vagrant was found on path ${path}`, "VagrantService");
        const vagrantPath = settings.get<string>(FLAG_VAGRANT_PATH);
        if (!vagrantPath) {
          settings.update(FLAG_VAGRANT_PATH, path, true);
        }
        Provider.getCache().set(FLAG_VAGRANT_PATH, path);
        return resolve(true);
      });
    });
  }

  static isPluginInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS)) {
        const isInstalled = cache.get(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS) === "true";
        LogService.info(
          `Vagrant Plugin ${isInstalled ? "is installed" : "is not installed"} from cache`,
          "VagrantService"
        );
        return resolve(isInstalled);
      }

      if (settings.get<string>(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS)) {
        const isInstalled = cache.get(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS) === "true";
        LogService.info(
          `Vagrant Plugin ${isInstalled ? "is installed" : "is not installed"} from settings`,
          "VagrantService"
        );
        return resolve(isInstalled);
      }

      cp.exec("vagrant plugin list", (err, stdout) => {
        if (err) {
          LogService.error("Vagrant parallels plugin is not installed", "VagrantService");
          return resolve(false);
        }
        if (stdout.includes("vagrant-parallels")) {
          LogService.info(`Vagrant parallels plugin was found`, "VagrantService");
          settings.update(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS, true, true);
          Provider.getCache().set(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS, "true");
          return resolve(true);
        } else {
          LogService.info(`Vagrant parallels plugin was not found`, "VagrantService");
          settings.update(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS, false, true);
          Provider.getCache().set(FLAG_VAGRANT_PARALLELS_PLUGIN_EXISTS, "false");
          return resolve(false);
        }
      });
    });
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_VAGRANT_VERSION);
      if (version) {
        LogService.info(`Vagrant ${version} was found in the system`, "VagrantService");
        return resolve(version);
      }

      cp.exec("vagrant --version", (err, stdout) => {
        if (err) {
          LogService.error("Vagrant is not installed", "VagrantService");
          return reject(err);
        }

        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)\n/);
        if (versionMatch) {
          LogService.info(`Vagrant ${versionMatch[1]} was found in the system`, "VagrantService");
          Provider.getCache().set(FLAG_VAGRANT_VERSION, version);
          return resolve(versionMatch[1]);
        } else {
          LogService.error("Could not extract vagrant version number from output", "VagrantService", false, false);
          return reject("Could not extract vagrant version number from output");
        }
      });
    });
  }

  static install(context: vscode.ExtensionContext): Promise<boolean> {
    const telemetry = Provider.telemetry();
    LogService.info("Installing Vagrant...", "VagrantService");
    return new Promise(async resolve => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          progress.report({message: "Installing Vagrant..."});
          const result = await new Promise(async (resolve, reject) => {
            progress.report({message: "Installing Brew Vagrant Tap..."});
            const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
            brew.stdout.on("data", data => {
              LogService.info(data.toString(), "VagrantService");
            });
            brew.stderr.on("data", data => {
              LogService.error(data.toString(), "VagrantService");
            });
            brew.on("close", code => {
              if (code !== 0) {
                LogService.error(`brew tap exited with code ${code}`, "VagrantService");
                progress.report({message: "Failed to install Vagrant, see logs for more details"});
                return resolve(false);
              }
              progress.report({message: "Installing "});

              const terminal = vscode.window.createTerminal(`Parallels Desktop: Installing Vagrant`);
              terminal.state;
              terminal.show();
              terminal.sendText(`brew install hashicorp/tap/hashicorp-vagrant && exit $?`);
              vscode.window.onDidCloseTerminal(async closedTerminal => {
                if (closedTerminal.name === terminal.name) {
                  if (terminal.exitStatus?.code !== 0) {
                    LogService.error(
                      `brew install exited with code ${terminal.exitStatus?.code}`,
                      "VagrantService",
                      true,
                      false
                    );
                    progress.report({message: "Failed to install Vagrant, see logs for more details"});
                    return resolve(false);
                  }
                  try {
                    const config = Provider.getConfiguration();
                    await config.initVagrant().catch(error => {
                      LogService.error(`Error saving Vagrant configuration: ${error}`, "VagrantService", true, false);
                      return resolve(false);
                    });
                    if (config.tools.vagrant?.isInstalled) {
                      const vagrantBoxProvider = new VagrantBoxProvider(context);
                    }
                    return resolve(true);
                  } catch (error) {
                    LogService.error(`Error saving Vagrant configuration: ${error}`, "VagrantService", true, false);
                    return resolve(false);
                  }
                }
              });
            });
          });
          if (!result) {
            telemetry.sendErrorEvent(TELEMETRY_INSTALL_VAGRANT, "Failed to install Vagrant");
            progress.report({message: "Failed to install Vagrant, see logs for more details"});
            return resolve(false);
          } else {
            telemetry.sendOperationEvent(TELEMETRY_INSTALL_VAGRANT, "success", {
              description: "Vagrant was installed successfully"
            });
            progress.report({message: "Vagrant was installed successfully"});
            vscode.window.showInformationMessage("Vagrant was installed successfully");
            return resolve(true);
          }
        }
      );
      return resolve(true);
    });
  }

  static async installParallelsPlugin(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      LogService.info("Installing Vagrant Parallels Plugin...", "VagrantService");
      let stdOut = "";
      const vagrant = cp.spawn("vagrant", ["plugin", "install", "vagrant-parallels"]);
      vagrant.stdout.on("data", data => {
        stdOut += data;
        LogService.debug(data.toString(), "VagrantService");
      });
      vagrant.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          LogService.error(`Vagrant plugin install exited with code ${code}`, "VagrantService");
          return reject(`Vagrant plugin install exited with code ${code}, please check logs for more details`);
        }

        LogService.info(`Successfully installed vagrant parallels plugin `, "VagrantService");
        return resolve(true);
      });
    });
  }

  static async getBoxes(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      let stdOut = "";
      const vagrant = cp.spawn("vagrant", ["box", "list"]);
      vagrant.stdout.on("data", data => {
        stdOut += data;
        LogService.debug(data.toString(), "VagrantService");
      });
      vagrant.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          LogService.error(`Vagrant box list exited with code ${code}`, "VagrantService");
          return reject(`Vagrant box list exited with code ${code}, please check logs for more details`);
        }

        const boxes = stdOut.split("\n").map(box => {
          const boxName = box.split("(")[0].trim();
          return boxName;
        });

        LogService.info(`Found ${boxes.length} vagrant boxes`, "VagrantService");
        return resolve(boxes.filter(box => box !== ""));
      });
    });
  }

  static async init(
    boxName: string,
    machineName: string,
    isWindowsMachine: boolean,
    context: vscode.ExtensionContext
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const vagrantBoxFolder = getVagrantBoxFolder();
      if (machineName === "") {
        machineName = boxName;
      }

      const vmBoxFolder = `${vagrantBoxFolder}/${machineName.replace(/\s/g, "_")}`;
      if (fs.existsSync(vmBoxFolder)) {
        fs.rmSync(vmBoxFolder, {recursive: true});
      }

      fs.mkdirSync(vmBoxFolder);
      this.generateVagrantFile(boxName, machineName, isWindowsMachine, context);

      const vagrantUp = cp.spawn("vagrant", ["up"], {shell: true, cwd: vmBoxFolder});
      vagrantUp.stdout.on("data", data => {
        LogService.info(data.toString(), "VagrantService");
      });
      vagrantUp.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrantUp.on("close", code => {
        if (code !== 0) {
          LogService.error(`Vagrant up exited with code ${code}`, "VagrantService");
          return reject(`Vagrant up exited with code ${code}, please check logs for more details`);
        }

        LogService.info(`Vagrant ${boxName} was initialized successfully`, "VagrantService");
        return resolve(true);
      });
    });
  }

  static async remove(boxName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (boxName === "") {
        LogService.error("Vagrant box name is empty", "VagrantService");
        return resolve(true);
      }

      LogService.info(`Removing vagrant box ${boxName}`, "VagrantService");
      const vagrant = cp.spawn("vagrant", ["box", "remove", `${boxName}`, "--all", "--force"]);
      vagrant.stdout.on("data", data => {
        LogService.info(data.toString(), "VagrantService");
      });
      vagrant.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          LogService.error(`Vagrant box remove exited with code ${code}`, "VagrantService");
          return reject(`Vagrant box remove exited with code ${code}, please check logs for more details`);
        }

        LogService.info(`Vagrant ${boxName} was removed successfully`, "VagrantService");
        resolve(true);
      });
    });
  }

  static async add(name: string, boxPath: string): Promise<boolean> {
    if (name === "") {
      LogService.error("Vagrant box name is empty", "VagrantService");
      return false;
    }
    if (boxPath === "") {
      LogService.error("Vagrant box path is empty", "VagrantService");
      return false;
    }

    LogService.info(`Adding vagrant box ${name} from ${boxPath}`, "VagrantService");
    return new Promise((resolve, reject) => {
      const vagrant = cp.spawn("vagrant", ["box", "add", `"${boxPath}"`, "--name", `"${name}"`], {shell: true});
      vagrant.stdout.on("data", data => {
        LogService.info(data.toString(), "VagrantService");
      });
      vagrant.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          LogService.error(`vagrant box add exited with code ${code}`, "VagrantService");
          return reject(code);
        }

        LogService.info(`Vagrant ${name} was added successfully`, "VagrantService");
        resolve(true);
      });
    });
  }

  static generateVagrantFile(
    boxName: string,
    machineName: string,
    isWindowsMachine: boolean,
    context: vscode.ExtensionContext
  ): boolean {
    const vagrantBoxFolder = getVagrantBoxFolder();
    if (machineName === "") {
      machineName = boxName;
    }

    const vmBoxFolder = `${vagrantBoxFolder}/${machineName.replace(/\s/g, "_")}`;
    const vagrantFile = `${vmBoxFolder}/Vagrantfile`;
    let vagrantFileTemplate = `
Vagrant.configure("2") do |config|
  config.vm.box = "${boxName}"`;
    if (isWindowsMachine) {
      vagrantFileTemplate += `
  config.vm.communicator = "winssh"
  config.vm.guest = :windows`;
    }

    vagrantFileTemplate += `
  config.vm.provider "parallels" do |prl|
    prl.name = "${machineName}"
  end
end
      `;
    fs.writeFileSync(vagrantFile, vagrantFileTemplate);

    return true;
  }

  static async searchBoxFromCloud(query: string): Promise<VagrantCloudBoxes> {
    return new Promise(async (resolve, reject) => {
      const response = await axios.get(
        `https://app.vagrantup.com/api/v1/search?q=${query}&provider=parallels&sort=created`
      );
      if (response.status !== 200) {
        return reject(response.statusText);
      }

      const boxes: VagrantCloudBox[] = [];
      if (!response.data.boxes) return resolve({boxes: []});

      for (let i = 0; i < response.data.boxes.length; i++) {
        const box = VagrantCloudBox.fromJson(response.data.boxes[i]);
        boxes.push(box);
      }

      return resolve({
        boxes: boxes
      });
    });
  }
}
