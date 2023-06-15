import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import {FLAG_VAGRANT_PATH, FLAG_VAGRANT_VERSION} from "../constants/flags";
import {Provider} from "../ioc/provider";
import {parallelsOutputChannel} from "../helpers/channel";
import {getVagrantBoxFolder} from "../helpers/helpers";

export class VagrantService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled() {
    return new Promise(resolve => {
      const vagrantPath = Provider.getCache().get(FLAG_VAGRANT_PATH);
      if (vagrantPath) {
        parallelsOutputChannel.appendLine(`Vagrant was found on path ${vagrantPath}`);
        return resolve(true);
      }

      cp.exec("which vagrant", err => {
        if (err) {
          parallelsOutputChannel.appendLine("Vagrant is not installed");
          return resolve(false);
        }
        parallelsOutputChannel.appendLine(`Vagrant was found on path ${vagrantPath}`);
        Provider.getCache().set(FLAG_VAGRANT_PATH, vagrantPath);
        return resolve(true);
      });
    });
  }

  static version(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let version = Provider.getCache().get(FLAG_VAGRANT_VERSION);
      if (version) {
        parallelsOutputChannel.appendLine(`${version} was found in the system`);
        return resolve(true);
      }

      parallelsOutputChannel.appendLine("Checking if Vagrant is installed...");
      cp.exec("vagrant --version", (err, stdout, stderr) => {
        if (err) {
          parallelsOutputChannel.appendLine("Vagrant is not installed");
          parallelsOutputChannel.show();
          return resolve(false);
        }
        version = stdout.replace("\n", "").trim();
        parallelsOutputChannel.appendLine(`${version} was found in the system`);
        Provider.getCache().set(FLAG_VAGRANT_VERSION, version);
        return resolve(true);
      });
    });
  }

  static install(): Promise<boolean> {
    parallelsOutputChannel.show();
    parallelsOutputChannel.appendLine("Installing Vagrant...");
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
      brew.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      brew.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`brew tap exited with code ${code}`);
          parallelsOutputChannel.show();
          return resolve(false);
        }
        const packer = cp.spawn("brew", ["install", "hashicorp/tap/hashicorp-vagrant"]);
        packer.stdout.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        packer.stderr.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        packer.on("close", code => {
          if (code !== 0) {
            parallelsOutputChannel.appendLine(`brew install exited with code ${code}`);
            parallelsOutputChannel.show();

            return resolve(false);
          }
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
        parallelsOutputChannel.appendLine(data);
        stdOut += data;
      });
      vagrant.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`vagrant box list exited with code ${code}`);
          parallelsOutputChannel.show();
          return reject(code);
        }

        const boxes = stdOut.split("\n").map(box => {
          const boxName = box.split("(")[0].trim();
          return boxName;
        });

        return resolve(boxes.filter(box => box !== ""));
      });
    });
  }

  static async init(boxName: string, context: vscode.ExtensionContext): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const vagrantBoxFolder = getVagrantBoxFolder();
      const vmBoxFolder = `${vagrantBoxFolder}/${boxName.replace(/\s/g, "_")}`;
      if (fs.existsSync(vmBoxFolder)) {
        fs.rmSync(vmBoxFolder, {recursive: true});
      }

      fs.mkdirSync(vmBoxFolder);

      const vagrant = cp.spawn("vagrant", ["init", `"${boxName}"`], {shell: true, cwd: vmBoxFolder});
      vagrant.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`vagrant init exited with code ${code}`);
          parallelsOutputChannel.show();
          return reject(code);
        }
        const vagrantUp = cp.spawn("vagrant", ["up"], {shell: true, cwd: vmBoxFolder});
        vagrantUp.stdout.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        vagrantUp.stderr.on("data", data => {
          parallelsOutputChannel.appendLine(data);
        });
        vagrantUp.on("close", code => {
          if (code !== 0) {
            parallelsOutputChannel.appendLine(`vagrant up exited with code ${code}`);
            parallelsOutputChannel.show();
            return reject(code);
          }

          return resolve(true);
        });
      });
    });
  }

  static async remove(boxName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const vagrant = cp.spawn("vagrant", ["box", "remove", `${boxName}`, "--all", "--force"]);
      vagrant.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`vagrant box remove exited with code ${code}`);
          parallelsOutputChannel.show();
          return reject(code);
        }

        resolve(true);
      });
    });
  }

  static async add(name: string, boxPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const vagrant = cp.spawn("vagrant", ["box", "add", boxPath, "--name", `"${name}"`], {shell: true});
      vagrant.stdout.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.stderr.on("data", data => {
        parallelsOutputChannel.appendLine(data);
      });
      vagrant.on("close", code => {
        if (code !== 0) {
          parallelsOutputChannel.appendLine(`vagrant box add exited with code ${code}`);
          parallelsOutputChannel.show();
          return reject(code);
        }

        resolve(true);
      });
    });
  }
}
