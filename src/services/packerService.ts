import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import {Constants, FLAG_PACKER_PATH, FLAG_PACKER_RECIPES_CACHED, FLAG_PACKER_VERSION} from "../constants/flags";
import {Provider} from "../ioc/provider";
import {VirtualMachineAddon} from "../models/parallels/VirtualMachineAddon";
import {PackerVirtualMachineConfig} from "../models/packer/PackerVirtualMachineConfig";
import {LogService} from "./logService";
import {getPackerTemplateFolder} from "../helpers/helpers";
import {GitService} from "./gitService";

export class PackerService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_PACKER_PATH)) {
        LogService.info(`Packer was found on path ${cache.get(FLAG_PACKER_PATH)} from cache`, "PackerService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_PACKER_PATH)) {
        LogService.info(
          `Packer was found on path ${settings.get<string>(FLAG_PACKER_PATH)} from settings`,
          "PackerService"
        );
        return resolve(true);
      }

      cp.exec("which packer", (err, stdout) => {
        if (err) {
          LogService.error("Packer is not installed", "PackerService");
          return resolve(false);
        }
        const path = stdout.replace("\n", "").trim();
        LogService.info(`Packer was found on path ${path}`, "PackerService");
        const packerPath = settings.get<string>(FLAG_PACKER_PATH);
        if (!packerPath) {
          settings.update(FLAG_PACKER_PATH, path, true);
        }
        Provider.getCache().set(FLAG_PACKER_PATH, path);
        return resolve(true);
      });
    });
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_PACKER_VERSION);
      if (version) {
        LogService.info(`Packer ${version} was found in the system`, "PackerService");
        return resolve(version);
      }

      cp.exec("packer --version", (err, stdout) => {
        if (err) {
          LogService.error("Packer is not installed", "PackerService");
          return reject("Packer is not installed");
        }

        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)\n/);
        if (versionMatch) {
          LogService.info(`Packer ${versionMatch[1]} was found in the system`, "PackerService");
          Provider.getCache().set(FLAG_PACKER_VERSION, version);
          return resolve(versionMatch[1]);
        } else {
          LogService.error("Could not extract packer version number from output", "PackerService", false, false);
          return reject("Could not extract packer version number from output");
        }
      });
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Packer...", "PackerService");
    return new Promise(async (resolve, reject) => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          progress.report({message: "Installing Packer..."});
          const result = await new Promise(async (resolve, reject) => {
            const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
            brew.stdout.on("data", data => {
              LogService.info(data.toString(), "PackerService");
            });
            brew.stderr.on("data", data => {
              LogService.error(data.toString(), "PackerService");
            });
            brew.on("close", code => {
              if (code !== 0) {
                LogService.error(`brew tap exited with code ${code}`, "PackerService");
                return resolve(false);
              }

              const packer = cp.spawn("brew", ["install", "hashicorp/tap/packer"]);
              packer.stdout.on("data", data => {
                LogService.info(data.toString(), "PackerService");
              });
              packer.stderr.on("data", data => {
                LogService.error(data.toString(), "PackerService");
              });
              packer.on("close", async code => {
                if (code !== 0) {
                  LogService.error(`brew install exited with code ${code}`, "PackerService");
                  return resolve(false);
                }
                const config = Provider.getConfiguration();
                config.tools.packer.isInstalled = true;
                config.tools.packer.version = await PackerService.version();
                config.save();
                LogService.info("Packer was installed successfully", "PackerService");
                return resolve(true);
              });
            });
          });
          if (!result) {
            progress.report({message: "Failed to install Packer, see logs for more details"});
            vscode.window.showErrorMessage("Failed to install Packer, see logs for more details");
            return resolve(false);
          } else {
            progress.report({message: "Packer was installed successfully"});
            vscode.window.showInformationMessage("Packer was installed successfully");
            return resolve(true);
          }
        }
      );
      return resolve(true);
    });
  }

  static getPlatformAddons(platform: string): Promise<VirtualMachineAddon[]> {
    return new Promise((resolve, reject) => {
      try {
        if (!platform) {
          LogService.error("Platform is required", "PackerService");
          return reject("Platform is required");
        }
        if (Provider.getCache().get(`${Constants.CacheFlagPackerAddons}.${platform}`)) {
          LogService.info(`Getting addons for platform ${platform} from cache`, "PackerService");

          return resolve(Provider.getCache().get(`${Constants.CacheFlagPackerAddons}.${platform}`));
        }

        LogService.info(`Getting addons for platform ${platform}`, "PackerService");
        const scriptPath = path.join(getPackerTemplateFolder(), "scripts");
        let stdOut = "";
        const cmd = cp.spawn("./list-addons.sh", [platform], {
          cwd: scriptPath,
          shell: true
        });
        cmd.stdout.on("data", data => {
          stdOut += data;
          LogService.debug(data.toString());
        });
        cmd.stderr.on("data", data => {
          LogService.error(data.toString());
        });
        cmd.on("close", code => {
          if (code !== 0) {
            LogService.error(`Error getting addons for platform ${platform}`, "PackerService", true);
            return reject(`Error getting addons for platform ${platform}`);
          }
          if (!stdOut) {
            LogService.error(`No addons found for platform ${platform}`, "PackerService", true);
            return resolve([]);
          }
          const output = JSON.parse(stdOut);
          Provider.getCache().set(`${Constants.CacheFlagPackerAddons}.${platform}`, output);
          LogService.info(`Got ${output.length} addons for platform ${platform}`, "PackerService");
          return resolve(output as VirtualMachineAddon[]);
        });
      } catch (e) {
        LogService.error(`Error getting addons for platform ${platform}`, "PackerService", true);
        return reject(`Error getting addons for platform ${platform}`);
      }
    });
  }

  static generateVariablesOverride(variables: any, path: string): boolean {
    if (!variables) {
      return false;
    }
    if (!path) {
      return false;
    }
    try {
      let fileContent = "";
      fileContent = this.generateObjectVar(variables);
      if (fs.existsSync(path)) {
        LogService.info(`Removing existing variables override file ${path}`, "PackerService");
        fs.unlinkSync(path);
      }

      fs.writeFileSync(path, fileContent);
      LogService.info(`Variables override file ${path} generated`, "PackerService");
      return true;
    } catch (e) {
      LogService.error(`Error generating variables override file ${path}`, "PackerService", true);
      return false;
    }
  }

  static generateObjectVar(variable: any, indent = 0): string {
    let indentStr = "";
    if (indent > 0) {
      indentStr = " ".repeat(indent);
    }
    if (typeof variable === "string") {
      return `"${variable}"`;
    } else if (typeof variable === "number") {
      return `${variable}`;
    } else if (typeof variable === "boolean") {
      return `${variable}`;
    } else if (Array.isArray(variable)) {
      let result = "";
      if (indent === 0) {
        result = "";
      } else {
        result = "[\n";
      }
      variable.forEach((v, i) => {
        result += `${indentStr}${this.generateObjectVar(v, indent + 2)}${i < variable.length - 1 ? "," : ""}\n`;
      });
      if (indent === 0) {
        result += "";
      } else {
        result += `${" ".repeat(indent - 2)}]`;
      }
      return result;
    } else if (typeof variable === "object") {
      let result = "";
      if (indent === 0) {
        result = "";
      } else {
        result = "{\n";
      }
      Object.keys(variable).forEach((k, i) => {
        result += `${indentStr}${k} = ${this.generateObjectVar(variable[k], indent + 2)}${
          i < Object.keys(variable).length - 1 ? "" : ""
        }\n`;
      });
      if (indent === 0) {
        result += "";
      } else {
        result += `${" ".repeat(indent - 2)}}`;
      }
      return result;
    }
    return "";
  }

  initPackerFolder(machine: PackerVirtualMachineConfig): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const config = await Provider.getConfiguration();
        if (!machine) {
          LogService.error("A machine configuration is required", "PackerService");
          return reject("A machine configuration is required");
        }
        if (!fs.existsSync(machine.packerScriptFolder)) {
          LogService.error(`Path ${machine.packerScriptFolder} does not exist`, "PackerService");
          return reject(`Path ${machine.packerScriptFolder} does not exist`);
        }

        let options: string[];
        let command: string;
        if (config.packerDesktopMajorVersion <= 18) {
          LogService.info(
            `Using Parallels Desktop version ${config.packerDesktopMajorVersion} method`,
            "PackerService"
          );
          command =
            "PYTHONPATH=/Library/Frameworks/ParallelsVirtualizationSDK.framework/Versions/Current/Libraries/Python/3.7";
          options = ["packer", "init", "."];
        } else {
          LogService.info(
            `Using Parallels Desktop version ${config.packerDesktopMajorVersion} method`,
            "PackerService"
          );
          command = "packer";
          options = ["init", "."];
        }

        const packer = cp.spawn(command, options, {
          cwd: machine.packerScriptFolder,
          shell: true
        });
        packer.stdout.on("data", data => {
          LogService.info(data.toString(), "PackerService");
        });
        packer.stderr.on("data", data => {
          LogService.error(data.toString(), "PackerService");
        });
        packer.on("close", code => {
          if (code !== 0) {
            LogService.error(`Packer init exited with code ${code}`, "PackerService");
            return reject(`Packer init exited with code ${code}, please check logs`);
          }
          LogService.info(`Machine ${machine.name} script initialized on ${machine.outputFolder}`, "PackerService");
          return resolve(true);
        });
      } catch (error) {
        LogService.error(
          `Error initializing machine ${machine.name} script on ${machine.outputFolder}`,
          "PackerService"
        );
        reject(error);
      }
    });
  }

  buildVm(machine: PackerVirtualMachineConfig): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const config = Provider.getConfiguration();
        if (!machine) {
          LogService.error("A machine configuration is required", "PackerService");
          return reject("A machine configuration is required");
        }

        if (fs.existsSync(machine.outputFolder)) {
          if (machine.forceBuild) {
            LogService.info(`Removing existing output folder ${machine.outputFolder}`, "PackerService");
            fs.rmdirSync(machine.outputFolder, {recursive: true});
          } else {
            LogService.error(`Output folder ${machine.outputFolder} already exists`, "PackerService");
            return reject(`Output folder ${machine.outputFolder} already exists`);
          }
        }
        if (!fs.existsSync(machine.packerScriptFolder)) {
          LogService.error(`Packer script folder ${machine.packerScriptFolder} does not exist`, "PackerService");
          return reject(`Packer script folder ${machine.packerScriptFolder} does not exist`);
        }
        if (
          !PackerService.generateVariablesOverride(
            machine.variables,
            path.join(machine.packerScriptFolder, "variables.override.pkrvars.hcl")
          )
        ) {
          LogService.error(`Error generating variables override file`, "PackerService");
          return reject(`Error generating variables override file`);
        }

        LogService.info(
          `Initializing Virtual Machine ${machine.name} on ${machine.outputFolder} using packer`,
          "PackerService"
        );

        await this.initPackerFolder(machine).catch(error => {
          LogService.error(
            `Error initializing machine ${machine.name} script on ${machine.outputFolder}`,
            "PackerService"
          );
          reject(error);
        });

        LogService.info(
          `Creating Virtual Machine ${machine.name} on ${machine.outputFolder} using packer`,
          "PackerService"
        );
        let options: string[];
        let command: string;
        if (config.packerDesktopMajorVersion <= 18) {
          LogService.info(
            `Using Parallels Desktop version ${config.packerDesktopMajorVersion} method`,
            "PackerService"
          );
          command =
            "PYTHONPATH=/Library/Frameworks/ParallelsVirtualizationSDK.framework/Versions/Current/Libraries/Python/3.7";
          options = ["packer", `build`, '-var-file="variables.override.pkrvars.hcl"', "."];
        } else {
          LogService.info(
            `Using Parallels Desktop version ${config.packerDesktopMajorVersion} method`,
            "PackerService"
          );
          command = "packer";
          options = [`build`, '-var-file="variables.override.pkrvars.hcl"', "."];
        }

        const packer = cp.spawn(command, options, {
          cwd: machine.packerScriptFolder,
          shell: true
        });
        packer.stdout.on("data", data => {
          LogService.info(data.toString(), "PackerService");
        });
        packer.stderr.on("data", data => {
          LogService.error(data.toString(), "PackerService");
        });
        packer.on("close", code => {
          if (code !== 0) {
            LogService.error(`Packer build exited with code ${code}`, "PackerService");
            return reject(`Packer build exited with code ${code}, please check logs`);
          }
          LogService.info(`Machine ${machine.name} created on ${machine.outputFolder}`, "PackerService");
          return resolve(true);
        });
      } catch (error) {
        LogService.error(`Error building machine ${machine.name} on ${machine.outputFolder}`, "PackerService");
        reject(error);
      }
    });
  }

  static getToolsFlavor(os: string, platform: string): string {
    let result = "";
    platform = platform.toLowerCase();

    switch (os.toLowerCase()) {
      case "linux":
        if (platform === "arm64") {
          result = "lin-arm";
        } else {
          result = "lin";
        }
        break;
      case "windows":
        if (platform === "arm64") {
          result = "win-arm";
        } else {
          result = "win";
        }
        break;
      case "macos":
        if (platform === "arm64") {
          result = "mac-arm";
        } else {
          result = "mac";
        }
        break;
      default:
        result = "other";
        break;
    }

    return result;
  }

  static async canAddVms(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const config = Provider.getConfiguration();
      let missingTools = false;
      if (!config.tools.packer.isInstalled) {
        missingTools = true;
        const options: string[] = [];
        if (config.tools.brew.isInstalled) {
          options.push("Install Hashicorp Packer");
        }
        options.push("Download Hashicorp Packer");
        const selection = await vscode.window.showErrorMessage(
          "Hashicorp Packer is not installed, we use Hashicorp Packer to create Vms, please install Hashicorp Packer to be able to create virtual machines with Packer scripts.",
          "Open Packer Website",
          ...options
        );

        if (selection === "Open Packer Website") {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://developer.hashicorp.com/packer"));
          return;
        }
        if (selection === "Install Hashicorp Packer") {
          PackerService.install();
          return;
        }
        if (selection === "Download Hashicorp Packer") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(
              "https://developer.hashicorp.com/packer/tutorials/docker-get-started/get-started-install-cli"
            )
          );
          return;
        }
      }

      if (!config.tools.git.isInstalled) {
        missingTools = true;
        const options: string[] = [];
        if (config.tools.brew.isInstalled) {
          options.push("Install Git");
        }
        options.push("Download Git");
        const selection = await vscode.window.showErrorMessage(
          "Git is not installed, we need git to clone our vm recipes please install git to be able to create Packer Virtual Machines.",
          "Open Git Website",
          ...options
        );
        if (selection === "Open Git Website") {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://git-scm.com/"));
          return;
        }
        if (selection === "Install Git") {
          GitService.install().then(isGitInstalled => {
            if (!isGitInstalled) {
              return;
            }
            // Cloning Packer example repo, need to wait to allow background process to finish
            GitService.cloneOrUpdatePackerExamples();
          });
          return;
        }
        if (selection === "Download Git") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse("https://git-scm.com/book/en/v2/Getting-Started-Installing-Git")
          );
          return;
        }
      }

      if (config.tools.git.isInstalled && !(config.tools.packer.isCached ?? false)) {
        // Cloning Packer example repo, need to wait to allow background process to finish
        await GitService.cloneOrUpdatePackerExamples().catch(error => {
          missingTools = true;
          LogService.error(error, "CoreService");
          config.tools.packer.isCached = false;
          vscode.commands.executeCommand("setContext", FLAG_PACKER_RECIPES_CACHED, false);
        });
        // Caching Packer Addons
        if (config.tools.packer.isInstalled && config.tools.git.isInstalled && config.packerTemplatesCloned) {
          const platforms = ["windows", "ubuntu", "macos"];
          platforms.forEach(platform => {
            const addons = PackerService.getPlatformAddons(platform);
            Provider.getCache().set(`${Constants.CacheFlagPackerAddons}.${platform}`, addons);
          });
        }
        vscode.commands.executeCommand("setContext", FLAG_PACKER_RECIPES_CACHED, true);
        config.tools.packer.isCached = true;
      }

      resolve(!missingTools);
    });
  }
}
