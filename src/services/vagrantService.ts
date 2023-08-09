import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import {FLAG_VAGRANT_PATH, FLAG_VAGRANT_VERSION} from "../constants/flags";
import {Provider} from "../ioc/provider";
import {parallelsOutputChannel} from "../helpers/channel";
import {getVagrantBoxFolder} from "../helpers/helpers";
import {LogService} from "./logService";
import {log} from "console";

export class VagrantService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled() {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_VAGRANT_PATH)) {
        LogService.info(`Packer was found on path ${cache.get(FLAG_VAGRANT_PATH)} from cache`, "VagrantService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_VAGRANT_PATH)) {
        LogService.info(
          `Packer was found on path ${settings.get<string>(FLAG_VAGRANT_PATH)} from settings`,
          "VagrantService"
        );
        return resolve(true);
      }

      cp.exec("which vagrant", (err, stdout) => {
        if (err) {
          LogService.error("Vagrant is not installed", "VagrantService", true, false);
          return resolve(false);
        }
        const path = stdout.replace("\n", "").trim();
        LogService.info(`Vagrant was found on path ${path}`, "VagrantService");
        const packerPath = settings.get<string>(FLAG_VAGRANT_PATH);
        if (!packerPath) {
          settings.update(FLAG_VAGRANT_PATH, path, true);
        }
        Provider.getCache().set(FLAG_VAGRANT_PATH, path);
        return resolve(true);
      });
    });
  }

  static version(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let version = Provider.getCache().get(FLAG_VAGRANT_VERSION);
      if (version) {
        LogService.info(`Vagrant was found on version ${version} from cache`, "VagrantService");
        return resolve(true);
      }

      LogService.info("Checking if Vagrant is installed...", "VagrantService");
      cp.exec("vagrant --version", (err, stdout) => {
        if (err) {
          LogService.error("Vagrant is not installed", "VagrantService", true, false);
          return resolve(false);
        }
        version = stdout.replace("\n", "").trim();
        LogService.info(`Vagrant ${version} was found in the system`, "VagrantService");
        Provider.getCache().set(FLAG_VAGRANT_VERSION, version);
        return resolve(true);
      });
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Vagrant...", "VagrantService");
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
      brew.stdout.on("data", data => {
        LogService.info(data.toString(), "VagrantService");
      });
      brew.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      brew.on("close", code => {
        if (code !== 0) {
          LogService.error(`brew tap exited with code ${code}`, "VagrantService", true, false);
          return resolve(false);
        }

        const packer = cp.spawn("brew", ["install", "hashicorp/tap/hashicorp-vagrant"]);
        packer.stdout.on("data", data => {
          LogService.info(data.toString(), "VagrantService");
        });
        packer.stderr.on("data", data => {
          LogService.error(data.toString(), "VagrantService");
        });
        packer.on("close", code => {
          if (code !== 0) {
            LogService.error(`brew install exited with code ${code}`, "VagrantService", true, false);
            return resolve(false);
          }

          LogService.info("Vagrant was installed successfully", "VagrantService");
          return resolve(true);
        });
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
          LogService.error(`vagrant box list exited with code ${code}`, "VagrantService", true, false);
          return reject(code);
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
          LogService.error(`vagrant up exited with code ${code}`, "VagrantService", true, false);
          return reject(code);
        }

        LogService.info(`Vagrant ${boxName} was initialized successfully`, "VagrantService");
        return resolve(true);
      });
    });
  }

  static async remove(boxName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (boxName === "") {
        LogService.error("Vagrant box name is empty", "VagrantService", true, false);
        return resolve(true);
      }

      LogService.info(`Removing vagrant box ${boxName}`, "VagrantService");
      const vagrant = cp.spawn("vagrant", ["box", "remove", `"${boxName}"`, "--all", "--force"]);
      vagrant.stdout.on("data", data => {
        LogService.info(data.toString(), "VagrantService");
      });
      vagrant.stderr.on("data", data => {
        LogService.error(data.toString(), "VagrantService");
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          LogService.error(`vagrant box remove exited with code ${code}`, "VagrantService", true, false);
          return reject(code);
        }

        LogService.info(`Vagrant ${boxName} was removed successfully`, "VagrantService");
        resolve(true);
      });
    });
  }

  static async add(name: string, boxPath: string): Promise<boolean> {
    if (name === "") {
      LogService.error("Vagrant box name is empty", "VagrantService", true, false);
      return false;
    }
    if (boxPath === "") {
      LogService.error("Vagrant box path is empty", "VagrantService", true, false);
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
          LogService.error(`vagrant box add exited with code ${code}`, "VagrantService", true, false);
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
}
