import * as vscode from "vscode";
import * as cp from "child_process";
import {Provider} from "../ioc/provider";
import {LogService} from "./logService";
import path = require("path");
import {FLAG_BREW_PATH, FLAG_BREW_VERSION} from "../constants/flags";

export class BrewService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_BREW_PATH)) {
        LogService.info(`Brew was found on path ${cache.get(FLAG_BREW_PATH)} from cache`, "BrewService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_BREW_PATH)) {
        LogService.info(`Brew was found on path ${settings.get<string>(FLAG_BREW_PATH)} from settings`, "BrewService");
        return resolve(true);
      }

      cp.exec("which brew", (err, stdout) => {
        if (err) {
          LogService.error("Brew is not installed", "BrewService");
          return resolve(false);
        }
        const path = stdout.replace("\n", "").trim();
        LogService.info(`Brew was found on path ${path}`, "BrewService");
        const gitPath = settings.get<string>(FLAG_BREW_PATH);
        if (!gitPath) {
          settings.update(FLAG_BREW_PATH, path, true);
        }
        Provider.getCache().set(FLAG_BREW_PATH, path);
        return resolve(true);
      });
    });
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_BREW_VERSION);
      if (version) {
        LogService.info(`${version} was found in the system`, "BrewService");
        return resolve(version);
      }

      LogService.info("Getting Brew version...", "BrewService");
      cp.exec("brew --version", (err, stdout, stderr) => {
        if (err) {
          LogService.error("Brew is not installed", "BrewService", false, false);
          return reject(err);
        }
        const versionMatch = stdout.match(/Homebrew (\d+\.\d+\.\d+)/);
        if (versionMatch) {
          LogService.info(`Brew ${versionMatch[1]} was found in the system`, "BrewService");
          Provider.getCache().set(FLAG_BREW_VERSION, versionMatch[1]);
          return resolve(versionMatch[1]);
        } else {
          LogService.error("Could not extract brew version number from output", "BrewService", false, false);
          return reject("Could not extract brew version number from output");
        }
      });
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Brew...", "BrewService");
    return new Promise(async resolve => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          progress.report({message: "Installing Brew..."});
          const result = await new Promise(async (resolve, reject) => {
            const brew = cp.spawn("brew", ["tap", "hashicorp/tap"]);
            brew.stdout.on("data", data => {
              LogService.info(data.toString(), "BrewService");
            });
            brew.stderr.on("data", data => {
              LogService.error(data.toString(), "BrewService");
            });
            brew.on("close", code => {
              if (code !== 0) {
                LogService.error(`brew tap exited with code ${code}`, "BrewService");
                progress.report({message: "Failed to install Brew, see logs for more details"});
                return resolve(false);
              }
              progress.report({
                message: "Brew needs sudo to install correctly,\n please introduce the password in the input box"
              });
              const terminal = vscode.window.createTerminal(`Parallels Desktop: Installing Brew`);
              terminal.show();
              terminal.sendText(
                `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
              );
              terminal.sendText(`exit $?`);
              vscode.window.onDidCloseTerminal(async closedTerminal => {
                if (closedTerminal.name === terminal.name) {
                  if (terminal.exitStatus?.code !== 0) {
                    LogService.error(
                      `brew install exited with code ${terminal.exitStatus?.code}`,
                      "BrewService",
                      true,
                      false
                    );
                    progress.report({message: "Failed to install Brew, see logs for more details"});
                    return resolve(false);
                  }
                  const config = Provider.getConfiguration();
                  config.tools.brew.isInstalled = true;
                  config.tools.brew.version = await BrewService.version();
                  config.save();
                  return resolve(true);
                }
              });
            });
          });
          if (!result) {
            progress.report({message: "Failed to install Brew, see logs for more details"});
            vscode.window.showErrorMessage("Failed to install Brew, see logs for more details");
            return resolve(false);
          } else {
            progress.report({message: "Brew was installed successfully"});
            vscode.window.showInformationMessage("Brew was installed successfully");
            return resolve(true);
          }
        }
      );
      return resolve(true);
    });
  }
}
