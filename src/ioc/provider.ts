import * as vscode from "vscode";
import {ConfigurationService} from "../services/configurationService";
import {LocalStorageService} from "../services/localStorage";
import {CacheService} from "../services/memoryCache";
import {getUserProfileFolder} from "../helpers/helpers";
import * as path from "path";
import * as fs from "fs";
import { LogService } from "../services/logService";

export let localStorage: LocalStorageService;
export let cache: CacheService;
export let config: ConfigurationService;
export let configurationInitialized = false;

export class Provider {
  constructor(private context: vscode.ExtensionContext) {
    localStorage = new LocalStorageService(this.context.globalState);
    cache = new CacheService();
    this.loadConfiguration();
  }

  static getLocalStorage(): LocalStorageService {
    return localStorage;
  }

  static getCache(): CacheService {
    return cache;
  }

  static getConfiguration(): ConfigurationService {
    return config;
  }

  static getOs(): string {
    return process.platform;
  }

  static getSettings(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("parallels-desktop");
  }

  private loadConfiguration(): void {
    const configFolder = getUserProfileFolder();

    const userProfile = path.join(configFolder, "profile.json");
    LogService.info(`User profile: ${userProfile}`);
    if (!fs.existsSync(userProfile)) {
      config = new ConfigurationService(this.context);
      const test = config.toJson();
      fs.writeFileSync(userProfile, config.toJson());
    }

    const configJson = fs.readFileSync(userProfile, "utf8");
    if (configJson) {
      config = ConfigurationService.fromJson(this.context, configJson);
    } else {
      config = new ConfigurationService(this.context);
    }

    configurationInitialized = true;
  }
}
