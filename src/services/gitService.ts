import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import {Provider} from "../ioc/provider";
import {getPackerTemplateFolder} from "../helpers/helpers";
import {LogService} from "./logService";
import path = require("path");
import {FeatureFlags} from "../constants/flags";

export class GitService {
  constructor(private context: vscode.ExtensionContext) {}

  static isInstalled() {
    return new Promise(resolve => {
      cp.exec("which git", (err, stdout) => {
        if (err) {
          LogService.error("Git is not installed", "GitService", false, false);
          return resolve(false);
        }
        LogService.info(`Git was found on path ${stdout}`, "GitService");
        Provider.getCache().set(FeatureFlags.FLAG_GIT_PATH, stdout);
        return resolve(true);
      });
    });
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FeatureFlags.FLAG_GIT_VERSION);
      if (version) {
        LogService.info(`${version} was found in the system`, "GitService");
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
          LogService.info(`${versionMatch[1]} was found in the system`);
          Provider.getCache().set(FeatureFlags.FLAG_GIT_VERSION, versionMatch[1]);
          return resolve(versionMatch[1]);
        } else {
          LogService.error("Could not extract git version number from output", "GitService", false, false);
          return reject("Could not extract git version number from output");
        }
      });
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Git...", "GitService");
    return new Promise((resolve, reject) => {
      const brew = cp.spawn("brew", ["install", "git"]);
      brew.stdout.on("data", data => {
        LogService.info(data.toString(), "GitService");
      });
      brew.stderr.on("data", data => {
        LogService.error(data.toString(), "GitService");
      });
      brew.on("close", code => {
        if (code !== 0) {
          LogService.error(`brew install git exited with code ${code}`, "GitService", true, false);
          return resolve(false);
        }
        return resolve(true);
      });
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
          if (code !== 0) {
            LogService.error(`git pull exited with code ${code}`, "GitService", true, false);
            return reject(code);
          }
          LogService.info("Packer templates updated", "GitService");

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
          if (code !== 0) {
            LogService.error(`git clone exited with code ${code}`, "GitService", true, false);
            return reject(code);
          }
          LogService.info("Packer templates cloned", "GitService");

          return resolve(true);
        });
      }
    });
  }
}
