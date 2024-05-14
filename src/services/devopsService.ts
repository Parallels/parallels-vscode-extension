import * as fs from "fs";
import * as vscode from "vscode";
import { CatalogPullRequest } from './../models/devops/catalogPullRequest';
import { config } from './../ioc/provider';
import { AuthorizationRequest } from './../models/devops/authorization';
import { spawn } from "child_process";
import { Provider } from "../ioc/provider";
import { LogService } from "./logService";
import { CommandsFlags, FLAG_DEVOPS_PATH, FLAG_DEVOPS_VERSION, FLAG_GIT_PATH, FLAG_GIT_VERSION } from "../constants/flags";
import { DevOpsCatalogHostProvider } from "../models/devops/catalogHostProvider";
import axios from "axios";
import { AuthorizationResponse } from "../models/devops/authorization";
import { CatalogManifestItem } from '../models/devops/catalogManifest';
import { diffArray } from '../helpers/diff';
import { DevOpsRemoteHostProvider } from '../models/devops/remoteHostProvider';
import { VirtualMachine } from '../models/parallels/virtualMachine';
import { DevOpsRemoteHostResource } from '../models/devops/remoteHostResource';
import { DevOpsRemoteHost } from '../models/devops/remoteHost';
import { cleanString } from "../helpers/strings";
import { DevOpsVirtualMachineConfigureRequest } from "../models/devops/virtualMachineConfigureRequest";
import { CatalogPushRequest } from "../models/devops/catalogPushRequest";
import { AddOrchestratorHostRequest } from "../models/devops/addOrchestratorHostRequest";

const refreshThreshold = 5000;

let catalogViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingCatalogProviders = false;
let catalogViewAutoRefreshStarted = false;

let remoteHostsViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingRemoteHostProviders = false;
let remoteHostViewAutoRefreshStarted = false;

export class DevOpsService {


  constructor(private context: vscode.ExtensionContext) { }

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_DEVOPS_PATH)) {
        LogService.info(`Parallels DevOps service was found on path ${cache.get(FLAG_DEVOPS_PATH)} from cache`, "DevOpsService");
        return resolve(true);
      }

      if (settings.get<string>(FLAG_DEVOPS_PATH)) {
        LogService.info(`Parallels DevOps was found on path ${settings.get<string>(FLAG_DEVOPS_PATH)} from settings`, "DevOpsService");
        return resolve(true);
      }

      const cmd = spawn("which", ["prldevops"])
      cmd.stdout.on("data", data => {
        const path = data.toString().replace("\n", "").trim();
        LogService.info(`Parallels DevOps was found on path ${path}`, "DevOpsService");
        const devOpsServicePath = settings.get<string>(FLAG_DEVOPS_PATH);
        if (!devOpsServicePath) {
          settings.update(FLAG_DEVOPS_PATH, path, true);
        }
        Provider.getCache().set(FLAG_DEVOPS_PATH, path);
      })
      cmd.stderr.on("data", data => {
        LogService.error(`Parallels DevOps is not installed, err:\n${data.toString()}`, "DevOpsService");
      })
      cmd.on("close", code => {
        if (code !== 0) {
          LogService.error(`which prldevops exited with code ${code}`, "DevOpsService");
          return resolve(false);
        }
        return resolve(true);
      })
    })
  }

  static version(): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_DEVOPS_VERSION);
      if (version) {
        LogService.info(`Parallels DevOps ${version} was found in the system`, "DevOpsService");
        return resolve(version);
      }

      const path = Provider.getCache().get(FLAG_DEVOPS_PATH);
      LogService.info("Getting Parallels DevOps version...", "DevOpsService");
      const cmd = spawn(path, ["--version"]);
      let foundVersion = "";
      cmd.stdout.on("data", data => {
        const versionMatch = data.toString().match(/\d+\.\d+\.\d+/);
        if (versionMatch) {
          LogService.info(`Parallels DevOps ${versionMatch[0]} was found in the system`, "DevOpsService");
          Provider.getCache().set(FLAG_DEVOPS_VERSION, versionMatch[0]);
          foundVersion = versionMatch[0]
        } else {
          LogService.error("Could not extract Parallels DevOps version number from output", "DevOpsService", false, false);
          return reject("Could not extract Parallels DevOps version number from output");
        }
      });
      cmd.stderr.on("data", data => {
        LogService.error(`Could not extract Parallels DevOps version number from output, err:\n ${data.toString()}`, "DevOpsService", false, false);
        return reject("Could not extract Parallels DevOps version number from output");
      });

      cmd.on("close", code => {
        if (code !== 0 || !foundVersion) {
          LogService.error(`prldevops --version exited with code ${code}`, "DevOpsService");
          return reject(`prldevops --version exited with code ${code}`);
        } else {
          return resolve(foundVersion);
        }
      })
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Parallels DevOps...", "DevOpsService");
    return new Promise(async (resolve, reject) => {
      vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "Enter the Sudo password",
        password: true,
        prompt: "Enter the sudo password to install Parallels DevOps"
      }).then(async password => {
        if (!password) {
          vscode.window.showErrorMessage("Password is required to install Parallels DevOps");
          return resolve(false);
        }
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Parallels Desktop",
            cancellable: false
          },
          async (progress, token) => {
            progress.report({ message: "Installing Parallels DevOps..." });
            const result = await new Promise(async (resolve, reject) => {
              //   const brew = cp.spawn("brew", ["install", "prldevops"]);
              //   brew.stdout.on("data", data => {
              //     LogService.info(data.toString(), "DevOpsService");
              //   });
              //   brew.stderr.on("data", data => {
              //     LogService.error(data.toString(), "DevOpsService");
              //   });
              //   brew.on("close", code => {
              //     if (code !== 0) {
              //       LogService.error(`brew install prldevops exited with code ${code}`, "DevOpsService");
              //       return resolve(false);
              //     }
              //     return resolve(true);
              //   });
              // });
              // if (!result) {
              //   progress.report({message: "Failed to install Parallels DevOps, see logs for more details"});
              //   vscode.window.showErrorMessage("Failed to install Parallels DevOps, see logs for more details");
              //   return resolve(false);
              // } else {
              //   progress.report({message: "Parallels DevOps was installed successfully"});
              //   vscode.window.showInformationMessage("Parallels DevOps was installed successfully");
              //   return resolve(true);
              // }
              return resolve(true);
            }
            );
          })
        return resolve(true);
      });
    });
  }

  static startCatalogViewAutoRefresh(): void {
    if (catalogViewAutoRefreshStarted) {
      return;
    }

    if (catalogViewAutoRefreshInterval) {
      clearInterval(catalogViewAutoRefreshInterval);
    }

    catalogViewAutoRefreshStarted = true;
    if (!isRefreshingCatalogProviders) {
      catalogViewAutoRefreshInterval = setInterval(() => {
        isRefreshingCatalogProviders = true;
        for (const provider of config.catalogProviders) {
          DevOpsService.authorize(provider).then(() => {
            const oldState = provider.state;
            config.updateDevOpsHostsProviderState(provider.ID, "active")
            if (oldState === "inactive") {
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
            }
          }).catch(() => {
            const oldState = provider.state;
            config.updateDevOpsHostsProviderState(provider.ID, "inactive")
            if (oldState === "active") {
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
            }
          })
        }
        this.refreshCatalogProviders(false)
          .then(() => {
            isRefreshingCatalogProviders = false;
          })
          .catch(err => {
            LogService.error(`Error refreshing catalog providers: ${err}`, "DevOpsService");
            isRefreshingCatalogProviders = false;
          });
      }, refreshThreshold);
    }
  }

  static startRemoteHostsViewAutoRefresh(): void {
    if (remoteHostViewAutoRefreshStarted) {
      return;
    }

    if (remoteHostsViewAutoRefreshInterval) {
      clearInterval(remoteHostsViewAutoRefreshInterval);
    }

    remoteHostViewAutoRefreshStarted = true;
    if (!isRefreshingRemoteHostProviders) {
      remoteHostsViewAutoRefreshInterval = setInterval(() => {
        isRefreshingRemoteHostProviders = true;
        for (const provider of config.remoteHostProviders) {
          DevOpsService.authorize(provider).then(() => {
            const oldState = provider.state;
            config.updateDevOpsHostsProviderState(provider.ID, "active")
            if (oldState === "inactive") {
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
            }
          }).catch(() => {
            const oldState = provider.state;
            config.updateDevOpsHostsProviderState(provider.ID, "inactive")
            if (oldState === "active") {
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
            }
          })
        }


        this.refreshRemoteHostProviders(false)
          .then(() => {
            isRefreshingRemoteHostProviders = false;
          })
          .catch(err => {
            LogService.error(`Error refreshing remote hosts view providers: ${err}`, "DevOpsService");
            isRefreshingRemoteHostProviders = false;
          });
      }, refreshThreshold);
    }
  }

  static async refreshCatalogProviders(force: boolean): Promise<void> {
    const config = Provider.getConfiguration();
    const providers = config.allCatalogProviders;
    let hasUpdate = false
    let shouldRefreshTree = false

    for (const provider of providers) {
      if (provider.state === "inactive") {
        continue;
      }

      const manifests = await this.getCatalogManifests(provider).catch(err => {
        LogService.error(`Error getting catalog manifests for provider ${provider.name}, err: ${err}`, "DevOpsService");
      })
      if (manifests && (force || diffArray(provider.manifests, manifests, "name"))) {
        provider.manifests = manifests;
        provider.needsTreeRefresh = true;
        hasUpdate = true;
        LogService.info(`Found different object for catalog provider ${provider.name} updating tree`, "DevOpsService");
        shouldRefreshTree = true
      } else {
        if (provider.needsTreeRefresh) {
          provider.needsTreeRefresh = false;
          hasUpdate = true;
        }
      }

      if (hasUpdate) {
        for (const provider of providers) {
          provider.needsTreeRefresh = false;
        }

        config.catalogProviders = providers;
        config.save();
      }
      if (shouldRefreshTree) {
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
      }
    }
  }

  static async refreshRemoteHostProviders(force: boolean): Promise<void> {
    const config = Provider.getConfiguration();
    const providers = config.allRemoteHostProviders;
    for (const provider of providers) {
      if (provider.state === "inactive") {
        continue;
      }

      let hasUpdate = false
      let shouldRefreshTree = false
      const virtualMachines = await this.getRemoteHostVms(provider).catch(err => {
        LogService.error(`Error getting virtual machines for remote host provider ${provider.name}, err: ${err}`, "DevOpsService");
      })

      if (virtualMachines && (force || diffArray(provider.virtualMachines, virtualMachines, "ID"))) {
        provider.virtualMachines = virtualMachines ?? [];
        provider.needsTreeRefresh = true;
        hasUpdate = true;
        LogService.info(`Found different object virtual machines for remote host provider ${provider.name} updating tree`, "DevOpsService");
        shouldRefreshTree = true
      } else {
        if (provider.needsTreeRefresh) {
          provider.needsTreeRefresh = false;
          hasUpdate = true;
        }
      }

      if (provider.type === "orchestrator") {
        // Updating orchestrator resources
        const resources = await this.getRemoteHostOrchestratorResources(provider).catch(err => {
          LogService.error(`Error getting resources for remote host orchestrator provider ${provider.name}, err: ${err}`, "DevOpsService");
        })
        if (resources && (force || diffArray(provider.resources, resources, "cpu_type"))) {
          provider.resources = resources ?? [];
          provider.needsTreeRefresh = true;
          hasUpdate = true;
          LogService.info(`Found different object for remote host orchestrator resource ${provider.name} updating tree`, "DevOpsService");
          shouldRefreshTree = true
        } else {
          if (provider.needsTreeRefresh) {
            provider.needsTreeRefresh = false;
            hasUpdate = true;
          }
        }

        // Updating orchestrator hosts
        const hosts = await this.getRemoteHostOrchestratorHosts(provider).catch(err => {
          LogService.error(`Error getting hosts for remote host orchestrator provider ${provider.name}, err: ${err}`, "DevOpsService");
        })
        if (hosts && (force || diffArray(provider.hosts, hosts, "id"))) {
          provider.hosts = hosts ?? [];
          provider.needsTreeRefresh = true;
          hasUpdate = true;
          LogService.info(`Found different object for remote host orchestrator hosts ${provider.name} updating tree`, "DevOpsService");
          shouldRefreshTree = true
        } else {
          if (provider.needsTreeRefresh) {
            provider.needsTreeRefresh = false;
            hasUpdate = true;
          }
        }
      }

      if (hasUpdate) {
        for (const provider of providers) {
          provider.needsTreeRefresh = false;
        }

        config.remoteHostProviders = providers;
        config.save();
      }
      if (shouldRefreshTree) {
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
      }
    }
  }

  static async getHostUrl(host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider): Promise<string> {
    return new Promise((resolve, reject) => {
      if (host.rawHost) {
        return resolve(host.rawHost);
      }
      if (!host.scheme) {
        host.scheme = "http";
      }
      if (!host.host) {
        return reject("Host url is required");
      }
      let url = `${host.scheme}://${host.host}`;
      if (host.port) {
        url += `:${host.port}`;
      }
      return resolve(url);
    });
  }

  static async authorize(host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider): Promise<AuthorizationResponse> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(host).catch(err => {
        return reject(err);
      });
      const request: AuthorizationRequest = {
        email: host.username,
        password: host.password
      }
      const config = Provider.getConfiguration();

      const response = await axios.post<AuthorizationResponse>(
        `${url}/api/v1/auth/token`, request
      ).catch(err => {
        return reject(`Unable to authorize using user ${host.username} on host ${url}`);
      })
      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      return resolve(response.data);
    });
  }

  static async testHost(host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!host) {
        return reject('Host is required')
      }
      let url = ''
      if (host.rawHost) {
        url = host.rawHost;
      } else {
        if (!host.scheme) {
          host.scheme = "http";
        }
        if (!host.host) {
          return reject('Host url is required');
        }
        url = `${host.scheme}://${host.host}`;
        if (host.port) {
          url += `:${host.port}`;
        }
      }

      const response = await axios.get(
        `${url}/api/health/probe`, {
      }
      ).catch(err => {
        return reject(err);
      })

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      await this.authorize(host).then(() => {
        return resolve(true);
      }).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async getCatalogManifests(provider: DevOpsCatalogHostProvider): Promise<CatalogManifestItem[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const response = await axios.get(
        `${url}/api/v1/catalog`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      const items: CatalogManifestItem[] = []
      const manifests: [] = response?.data ?? [];
      for (const manifest of manifests) {
        const t = Object.keys(manifest)[0];
        const a = manifest[0]
        const item: CatalogManifestItem = {
          name: Object.keys(manifest)[0],
          items: manifest[Object.keys(manifest)[0]]
        }

        items.push(item);
      }


      return resolve(items);
    });
  }


  static async getRemoteHostVms(provider: DevOpsRemoteHostProvider): Promise<VirtualMachine[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })
      let path = `${url}/api/v1/machines`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines`
      }

      const response = await axios.get<VirtualMachine[]>(
        `${path}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async getRemoteHostOrchestratorResources(provider: DevOpsRemoteHostProvider): Promise<DevOpsRemoteHostResource[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const path = `${url}/api/v1/orchestrator/overview/resources`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const response = await axios.get<DevOpsRemoteHostResource[]>(
        `${path}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async getRemoteHostOrchestratorHosts(provider: DevOpsRemoteHostProvider): Promise<DevOpsRemoteHost[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const path = `${url}/api/v1/orchestrator/hosts`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const response = await axios.get<DevOpsRemoteHost[]>(
        `${path}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async enableRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}/enable`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const response = await axios.put(
        `${path}`, null, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async disableRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}/disable`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const response = await axios.put(
        `${path}`, null, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async addRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, request: AddOrchestratorHostRequest): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      if (!request) {
        return reject("Request is required");
      }

      const path = `${url}/api/v1/orchestrator/hosts`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const response = await axios.post(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async removeRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}`
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const response = await axios.delete(
        `${path}`,  {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(response?.data ?? []);
    });
  }

  static async startRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "start",
            value: ""
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async stopRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "stop",
            value: ""
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async pauseRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "pause",
            value: ""
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async resumeRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "resume",
            value: ""
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async suspendRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "suspend",
            value: ""
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async removeRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/machines/${virtualMachineId}`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}`
      }

      const response = await axios.delete(
        `${path}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async cloneRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string, cloneName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })
      if (!cloneName) {
        return reject("Clone name is required");
      }

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "machine",
            operation: "clone",
            options: [
              {
                flag: "name",
                value: cloneName
              }
            ]
          }
        ]
      }

      const response = await axios.put(
        `${path}`, request, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

  static async generatePullPDFile(provider: DevOpsCatalogHostProvider, request: CatalogPullRequest): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const from = url
      let insecure = false
      if (provider.scheme === "http") {
        insecure = true
      }

      const pdFile = `FROM ${from}
${insecure ? "INSECURE true" : ""}
AUTHENTICATE USERNAME ${provider.username}
AUTHENTICATE PASSWORD ${provider.password}

CATALOG_ID ${request.catalog_id}
VERSION ${request.version}
ARCHITECTURE ${request.architecture}

MACHINE_NAME ${request.machine_name}

DESTINATION ${request.path}

START_AFTER_PULL ${request.start_after_pull}
`
      const path = `/tmp/pull_${cleanString(request.machine_name)}.pdfile`
      // deleting the file if it exists
      if (fs.existsSync(path)) {
        fs.unlinkSync(path)
      }

      fs.writeFileSync(path, pdFile);
      return resolve(path);
    });
  }

  static async generatePushPDFile(provider: DevOpsCatalogHostProvider, request: CatalogPushRequest): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const to = url
      let insecure = false
      if (provider.scheme === "http") {
        insecure = true
      }

      const pdFile = `TO ${to}
${insecure ? "INSECURE true" : ""}
AUTHENTICATE USERNAME ${provider.username}
AUTHENTICATE PASSWORD ${provider.password}

PROVIDER ${request.connection}

CATALOG_ID ${request.catalog_id}
VERSION ${request.version}
ARCHITECTURE ${request.architecture}

LOCAL_PATH ${request.local_path}
`
      const path = `/tmp/push_${cleanString(request.catalog_id)}.pdfile`
      // deleting the file if it exists
      if (fs.existsSync(path)) {
        fs.unlinkSync(path)
      }

      fs.writeFileSync(path, pdFile);
      return resolve(path);
    });
  }

  static async pullManifestFromCatalogProvider(provider: DevOpsCatalogHostProvider, request: CatalogPullRequest): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!request) {
        return reject("Request is required");
      }
      if (!(await this.isInstalled())) {
        const options: string[] = [];
        options.push("Install Parallels Desktop DevOps Service");
        options.push("Download Parallels Desktop DevOps Service");
        const selection = await vscode.window
          .showErrorMessage(
            "Parallels Desktop DevOps is not installed, please install Parallels Desktop DevOps and try again.",
            "Open Parallels Desktop Service Documentation",
            ...options)
        switch (selection) {
          case "Open Parallels Desktop Service Documentation":
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse("https://parallels.github.io/prl-devops-service/")
            );
            break;
          case "Install Parallels Desktop DevOps Service": {
            const ok = await this.install();
            if (!ok) {
              reject("Failed to install Parallels Desktop DevOps Service");
            }
            break;
          }
          case "Download Parallels Desktop DevOps Service":
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse("https://github.com/Parallels/prl-devops-service/releases")
            );
            break;
        }
      }

      const path = await this.generatePullPDFile(provider, request).catch(err => {
        return reject(err);
      });

      if (!path) {
        return reject("Error generating pull file");
      }

      const cmd = spawn("prldevops", ["pull", path]);

      cmd.stdout.on("data", data => {
        LogService.info(data.toString(), "DevOpsService");
      });

      cmd.stderr.on("data", data => {
        LogService.error(data.toString(), "DevOpsService");
      });

      cmd.on("close", code => {
        fs.unlinkSync(path);
        if (code !== 0) {
          LogService.error(`prldevops pull exited with code ${code}`, "DevOpsService");
          return reject(`prldevops pull exited with code ${code}`);
        }
        LogService.info(`Manifest ${request.catalog_id} pulled from provider ${provider.name}`, "DevOpsService");
        return resolve();
      });
    });
  }

  static async pushManifestFromCatalogProvider(provider: DevOpsCatalogHostProvider, request: CatalogPushRequest): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!request) {
        return reject("Request is required");
      }
      if (!(await this.isInstalled())) {
        const options: string[] = [];
        options.push("Install Parallels Desktop DevOps Service");
        options.push("Download Parallels Desktop DevOps Service");
        const selection = await vscode.window
          .showErrorMessage(
            "Parallels Desktop DevOps is not installed, please install Parallels Desktop DevOps and try again.",
            "Open Parallels Desktop Service Documentation",
            ...options)
        switch (selection) {
          case "Open Parallels Desktop Service Documentation":
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse("https://parallels.github.io/prl-devops-service/")
            );
            break;
          case "Install Parallels Desktop DevOps Service": {
            const ok = await this.install();
            if (!ok) {
              reject("Failed to install Parallels Desktop DevOps Service");
            }
            break;
          }
          case "Download Parallels Desktop DevOps Service":
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse("https://github.com/Parallels/prl-devops-service/releases")
            );
            break;
        }
      }

      const path = await this.generatePushPDFile(provider, request).catch(err => {
        return reject(err);
      });

      if (!path) {
        return reject("Error generating push file");
      }

      const cmd = spawn("prldevops", ["push", path]);

      cmd.stdout.on("data", data => {
        LogService.info(data.toString(), "DevOpsService");
      });

      let error =''
      cmd.stderr.on("data", data => {
        error += data.toString()
        LogService.error(data.toString(), "DevOpsService");
      });

      cmd.on("close", code => {
        // fs.unlinkSync(path);
        if (code !== 0) {
          LogService.error(`prldevops push exited with code ${code}, err: ${error}`, "DevOpsService");
          return reject(`prldevops push exited with code ${code}`);
        }
        LogService.info(`Manifest ${request.catalog_id} pushed to provider ${provider.name}`, "DevOpsService");
        return resolve();
      });
    });
  }

  static async removeCatalogManifest(provider: DevOpsCatalogHostProvider, manifestId:string, versionId?:string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      })

      let path = `${url}/api/v1/catalog/${manifestId}`
      if (versionId) {
        path = `${url}/api/v1/catalog/${manifestId}/${versionId}`
      }

      const response = await axios.delete(
        `${path}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`
        }
      }
      ).catch(err => {
        return reject(err);
      })

      return resolve(true);
    });
  }

}
