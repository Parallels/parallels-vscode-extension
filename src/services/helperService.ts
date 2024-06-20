import * as crypto from "crypto";
import * as fs from "fs";
import * as vscode from "vscode";
import * as cp from "child_process";
import path = require("path");
import axios from "axios";
import {Provider} from "../ioc/provider";
import {Constants} from "../constants/flags";
import {HardwareInfo} from "../models/parallels/HardwareInfo";
import {LogService} from "./logService";

export class HelperService {
  static checkFileChecksum(filePath: string, expectedChecksum: string, algorithm: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return resolve(false);
      }
      if (!expectedChecksum) {
        return resolve(false);
      }
      if (!algorithm) {
        return resolve(false);
      }
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      stream.on("error", err => {
        reject(err);
      });
      stream.on("data", chunk => {
        hash.update(chunk);
      });
      stream.on("end", () => {
        const actualChecksum = hash.digest("hex");
        if (actualChecksum === expectedChecksum) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  static async downloadFile(
    context: vscode.ExtensionContext,
    name: string,
    fileName: string,
    url: string,
    filePath: string
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      LogService.info(`Downloading image from ${url}...`, "CoreService");
      const response = await axios.get(url, {
        responseType: "stream"
      });
      const totalLength = response.headers["content-length"];
      let downloaded = 0;
      const writer = fs.createWriteStream(filePath);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Downloading image for ${name}`
        },
        async progress => {
          return new Promise<boolean>((resolve, reject) => {
            response.data.on("data", (chunk: any) => {
              downloaded += chunk.length;
              const percent = Math.round((100 * downloaded) / totalLength);
              progress.report({message: `${percent}%`});
            });
            writer.on("finish", () => {
              LogService.info(`Image downloaded to ${path.join(context.extensionPath, filePath)}`, "CoreService");
              return resolve(true);
            });
            response.data.on("error", (err: any) => {
              LogService.error(`Error downloading image: ${err}`, "CoreService");
              return reject(err);
            });
          })
            .then(result => {
              return resolve(result);
            })
            .catch(reason => {
              return reject(reason);
            });
        }
      );
      response.data.pipe(writer);
    });
  }

  static async getHardwareInfo(): Promise<HardwareInfo> {
    return new Promise((resolve, reject) => {
      const cacheSvc = Provider.getCache();
      if (cacheSvc.has(Constants.CacheFlagHardwareInfo)) {
        LogService.info(`Getting Hardware info from cache`, "CoreService");
        return resolve(cacheSvc.get(Constants.CacheFlagHardwareInfo));
      }

      let stdout = "";
      LogService.info(`Getting Hardware Info`, "CoreService");
      const options = ["SPHardwareDataType", "-json"];
      const cmd = cp.spawn("system_profiler", options, {shell: true});
      cmd.stdout.on("data", data => {
        stdout += data.toString();
        LogService.debug(data, "CoreService");
      });
      cmd.stderr.on("data", data => {
        LogService.error(data, "CoreService");
      });
      cmd.on("close", code => {
        if (code !== 0) {
          LogService.error(`system_profiler exited with code ${code}`, "CoreService", true);
          return reject(code);
        }
        try {
          const result = JSON.parse(stdout.replace(/[%]/g, ""));
          LogService.info(`Hardware Info was collected successfully...`, "CoreService");
          return resolve(result);
        } catch (e) {
          LogService.error(`error parsing JSON, err:${e}`, "CoreService");
          return reject(e);
        }
      });
    });
  }

  static async getArchitecture(): Promise<string> {
    return new Promise((resolve, reject) => {
      const cacheSvc = Provider.getCache();
      if (cacheSvc.has(Constants.CacheFlagArchitecture)) {
        LogService.info(`Getting architecture from cache`, "CoreService");
        return resolve(cacheSvc.get(Constants.CacheFlagArchitecture));
      }

      let stdout = "";
      LogService.info(`Getting Architecture`, "CoreService");
      const options = ["-m"];
      const cmd = cp.spawn("uname", options, {shell: true});
      cmd.stdout.on("data", data => {
        stdout += data.toString();
        LogService.debug(data, "CoreService");
      });
      cmd.stderr.on("data", data => {
        LogService.error(data, "CoreService");
      });
      cmd.on("close", code => {
        if (code !== 0) {
          LogService.error(`uname exited with code ${code}`, "CoreService", true);
          return reject(code);
        }
        try {
          const result = stdout
            .replace(/[\n\r]/g, "")
            .replace(/[\n]/g, "")
            .trim();
          LogService.info(`Architecture collected successfully...`, "CoreService");
          return resolve(result);
        } catch (e) {
          LogService.error(`error collecting architecture, err:${e}`, "CoreService");
          return reject(e);
        }
      });
    });
  }

  static async getLocale(): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = "";
      LogService.info(`Getting Machine Locale`, "CoreService");
      const options = ["read", "-g", "AppleLanguages"];
      const cmd = cp.spawn("defaults", options, {shell: true});
      cmd.stdout.on("data", data => {
        stdout += data.toString();
        LogService.debug(data, "CoreService");
      });
      cmd.stderr.on("data", data => {
        LogService.error(data, "CoreService");
      });
      cmd.on("close", code => {
        if (code !== 0) {
          LogService.error(`default exited with code ${code}`, "CoreService", true);
          return reject(code);
        }
        try {
          stdout = stdout
            .replace(/[\n\r]/g, "")
            .replace(/\(/g, "")
            .replace(/\)/g, "")
            .trim();
          LogService.info(`Hardware Info was collected successfully...`, "CoreService");
          return resolve(stdout);
        } catch (e) {
          LogService.error(`error parsing JSON, err:${e}`, "ParallelsDesktopService");
          return resolve("en_US");
        }
      });
    });
  }
}
