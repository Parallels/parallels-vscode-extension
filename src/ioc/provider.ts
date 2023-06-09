import * as vscode from "vscode";
import {ConfigurationService} from "../services/configurationService";
import {LocalStorageService} from "../services/localStorage";
import {CacheService} from "../services/memoryCache";
import {FLAG_CONFIGURATION} from "../constants/flags";

export let localStorage: LocalStorageService;
export let cache: CacheService;
export let config: ConfigurationService;

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

  static getSettings(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("parallels-desktop");
  }

  private loadConfiguration(): void {
    // reading the configuration from the local storage
    // localStorage.set(FLAG_CONFIGURATION, undefined);
    const configJson = localStorage.get(FLAG_CONFIGURATION);
    if (configJson) {
      config = ConfigurationService.fromJson(configJson);
    } else {
      config = new ConfigurationService();
      localStorage.set(FLAG_CONFIGURATION, config.toJson());
    }
  }
}
