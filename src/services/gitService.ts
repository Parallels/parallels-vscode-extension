import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import {Provider, telemetryService} from "../ioc/provider";
import {getPackerTemplateFolder} from "../helpers/helpers";
import {LogService} from "./logService";
import path = require("path");
import {FLAG_GIT_PATH, FLAG_GIT_VERSION} from "../constants/flags";
import {TELEMETRY_INSTALL_GIT} from "../telemetry/operations";

export class GitService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_GIT_PATH)) {
        LogService.info(`Git was found on path ${cache.get(FLAG_GIT_PATH)} from cache`, "GitService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_GIT_PATH)) {
        LogService.info(`Git was found on path ${settings.get<string>(FLAG_GIT_PATH)} from settings`, "GitService");
        return resolve(true);
      }

      cp.exec("which git", (err, stdout) => {
        if (err) {
          LogService.error("Git is not installed", "GitService");
          return resolve(false);
        }
        const path = stdout.replace("\n", "").trim();
        LogService.info(`Git was found on path ${path}`, "GitService");
        const gitPath = settings.get<string>(FLAG_GIT_PATH);
        if (!gitPath) {
          settings.update(FLAG_GIT_PATH, path, true);
        }
        Provider.getCache().set(FLAG_GIT_PATH, path);
        return resolve(true);
      });
    });
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_GIT_VERSION);
      if (version) {
        LogService.info(`Git ${version} was found in the system`, "GitService");
        return resolve(version);
      }

      LogService.info("Getting Git version...", "GitService");
      cp.exec("git --version", (err, stdout, stderr) => {
        if (err) {
          LogService.error("Git is not installed", "GitService", false, false);
          return reject(err);
        }
        const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/);
        if (versionMatch) {
          LogService.info(`Git ${versionMatch[1]} was found in the system`, "GitService");
          Provider.getCache().set(FLAG_GIT_VERSION, versionMatch[1]);
          return resolve(versionMatch[1]);
        } else {
          LogService.error("Could not extract git version number from output", "GitService", false, false);
          return reject("Could not extract git version number from output");
        }
      });
    });
  }

  static install(): Promise<boolean> {
    const telemetry = Provider.telemetry();
    LogService.info("Installing Git...", "GitService");
    return new Promise(async (resolve, reject) => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          progress.report({message: "Installing Git..."});
          const result = await new Promise(async (resolve, reject) => {
            const brew = cp.spawn("brew", ["install", "git"]);
            brew.stdout.on("data", data => {
              LogService.info(data.toString(), "GitService");
            });
            brew.stderr.on("data", data => {
              LogService.error(data.toString(), "GitService");
            });
            brew.on("close", code => {
              if (code !== 0) {
                LogService.error(`brew install git exited with code ${code}`, "GitService");
                return resolve(false);
              }
              return resolve(true);
            });
          });
          if (!result) {
            telemetry.sendErrorEvent(TELEMETRY_INSTALL_GIT, "Failed to install Git");
            progress.report({message: "Failed to install Git, see logs for more details"});
            vscode.window.showErrorMessage("Failed to install Git, see logs for more details");
            return resolve(false);
          } else {
            telemetry.sendOperationEvent(TELEMETRY_INSTALL_GIT, "success", {
              description: "Git was installed successfully"
            });
            progress.report({message: "Git was installed successfully"});
            vscode.window.showInformationMessage("Git was installed successfully");
            return resolve(true);
          }
        }
      );
      return resolve(true);
    });
  }

  static async cloneOrUpdatePackerExamples(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(path.join(getPackerTemplateFolder(), ".git"))) {
        LogService.info("Packer templates already cloned, checking if master as changes", "GitService");
        let stdOut = "";

        const git = cp.spawn("git", ["pull"], {
          cwd: getPackerTemplateFolder()
        });
        git.stdout.on("data", data => {
          LogService.debug(data.toString(), "GitService");
          stdOut += data;
        });
        git.stderr.on("data", data => {
          LogService.error(data.toString(), "GitService");
        });
        git.on("close", code => {
          const config = Provider.getConfiguration();
          if (code !== 0) {
            LogService.error(`git pull exited with code ${code}`, "GitService");
            return reject(`git pull exited with code ${code}, please check logs for more details`);
          }
          LogService.info("Packer templates updated", "GitService");
          config.packerTemplatesCloned = true;
          return resolve(true);
        });
      } else {
        LogService.info("Cloning packer examples...", "GitService");
        let stdOut = "";
        const git = cp.spawn(
          "git",
          ["clone", "https://github.com/Parallels/packer-examples.git", getPackerTemplateFolder()],
          {}
        );
        git.stdout.on("data", data => {
          LogService.debug(data.toString(), "GitService");
          stdOut += data;
        });
        git.stderr.on("data", data => {
          LogService.error(data.toString(), "GitService");
        });
        git.on("close", code => {
          const config = Provider.getConfiguration();
          if (code !== 0) {
            LogService.error(`git clone exited with code ${code}`, "GitService");
            return reject(`git clone exited with code ${code}`);
          }
          LogService.info("Packer templates cloned", "GitService");
          config.packerTemplatesCloned = true;
          return resolve(true);
        });
      }
    });
  }
}
