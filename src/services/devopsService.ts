import * as fs from "fs";
import * as vscode from "vscode";
import {jwtDecode} from "jwt-decode";
import {CatalogPullRequest} from "./../models/devops/catalogPullRequest";
import {config} from "./../ioc/provider";
import {AuthorizationRequest, AuthorizationToken} from "./../models/devops/authorization";
import {spawn} from "child_process";
import {Provider} from "../ioc/provider";
import {LogService} from "./logService";
import {CommandsFlags, FLAG_DEVOPS_PATH, FLAG_DEVOPS_VERSION} from "../constants/flags";
import {DevOpsCatalogHostProvider} from "../models/devops/catalogHostProvider";
import axios from "axios";
import {AuthorizationResponse} from "../models/devops/authorization";
import {CatalogManifestItem} from "../models/devops/catalogManifest";
import {diffArray} from "../helpers/diff";
import {DevOpsRemoteHostProvider} from "../models/devops/remoteHostProvider";
import {VirtualMachine} from "../models/parallels/virtualMachine";
import {DevOpsRemoteHostResource} from "../models/devops/remoteHostResource";
import {DevOpsRemoteHost} from "../models/devops/remoteHost";
import {cleanString} from "../helpers/strings";
import {DevOpsVirtualMachineConfigureRequest} from "../models/devops/virtualMachineConfigureRequest";
import {CatalogPushRequest} from "../models/devops/catalogPushRequest";
import {AddOrchestratorHostRequest} from "../models/devops/addOrchestratorHostRequest";
import {DevOpsCreateUserRequest, DevOpsUpdateUserRequest, DevOpsUser} from "../models/devops/users";
import {
  DevOpsCatalogRolesAndClaimsCreateRequest,
  DevOpsRolesAndClaims,
  DevOpsRolesAndClaimsCreateRequest
} from "../models/devops/rolesAndClaims";
import {HostHardwareInfo} from "../models/devops/hardwareInfo";
import {CreateCatalogMachine} from "../models/devops/createCatalogMachine";
import {UpdateOrchestratorHostRequest} from "../models/devops/updateOrchestratorHostRequest";

const refreshThreshold = 5000;

let catalogViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingCatalogProviders = false;
let catalogViewAutoRefreshStarted = false;

let remoteHostsViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingRemoteHostProviders = false;
let remoteHostViewAutoRefreshStarted = false;

export class DevOpsService {
  constructor(private context: vscode.ExtensionContext) {
    axios.defaults.headers.common["X-LOGGING"] = "IGNORE";
    axios.defaults.timeout = 15000;
  }

  static isInstalled(): Promise<boolean> {
    return new Promise(resolve => {
      const settings = Provider.getSettings();
      const cache = Provider.getCache();
      if (cache.get(FLAG_DEVOPS_PATH)) {
        LogService.info(
          `Parallels DevOps service was found on path ${cache.get(FLAG_DEVOPS_PATH)} from cache`,
          "DevOpsService"
        );
        return resolve(true);
      }

      if (settings.get<string>(FLAG_DEVOPS_PATH)) {
        LogService.info(
          `Parallels DevOps was found on path ${settings.get<string>(FLAG_DEVOPS_PATH)} from settings`,
          "DevOpsService"
        );
        return resolve(true);
      }

      const cmd = spawn("which", ["prldevops"]);
      cmd.stdout.on("data", data => {
        const path = data.toString().replace("\n", "").trim();
        LogService.info(`Parallels DevOps was found on path ${path}`, "DevOpsService");
        const devOpsServicePath = settings.get<string>(FLAG_DEVOPS_PATH);
        if (!devOpsServicePath) {
          settings.update(FLAG_DEVOPS_PATH, path, true);
        }
        Provider.getCache().set(FLAG_DEVOPS_PATH, path);
      });
      cmd.stderr.on("data", data => {
        LogService.error(`Parallels DevOps is not installed, err:\n${data.toString()}`, "DevOpsService");
      });
      cmd.on("close", code => {
        if (code !== 0) {
          LogService.error(`which prldevops exited with code ${code}`, "DevOpsService");
          return resolve(false);
        }
        return resolve(true);
      });
    });
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
          foundVersion = versionMatch[0];
        } else {
          LogService.error(
            "Could not extract Parallels DevOps version number from output",
            "DevOpsService",
            false,
            false
          );
          return reject("Could not extract Parallels DevOps version number from output");
        }
      });
      cmd.stderr.on("data", data => {
        LogService.error(
          `Could not extract Parallels DevOps version number from output, err:\n ${data.toString()}`,
          "DevOpsService",
          false,
          false
        );
        return reject("Could not extract Parallels DevOps version number from output");
      });

      cmd.on("close", code => {
        if (code !== 0 || !foundVersion) {
          LogService.error(`prldevops --version exited with code ${code}`, "DevOpsService");
          return reject(`prldevops --version exited with code ${code}`);
        } else {
          return resolve(foundVersion);
        }
      });
    });
  }

  static install(): Promise<boolean> {
    LogService.info("Installing Parallels DevOps...", "DevOpsService");
    return new Promise(async (resolve, reject) => {
      const sudoPassword = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "Enter the Sudo password",
        password: true,
        prompt: "Enter the sudo password to install Parallels DevOps"
      });
      if (!sudoPassword) {
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
          progress.report({message: "Installing Parallels DevOps..."});
          const result = await new Promise(async (resolve, reject) => {
            const terminal = vscode.window.createTerminal(`Parallels Desktop: Installing DevOps Service`);
            terminal.sendText(
              `echo ${sudoPassword} | sudo -S /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Parallels/prl-devops-service/main/scripts/install.sh)"; exit $?`
            );
            vscode.window.onDidCloseTerminal(async closedTerminal => {
              if (closedTerminal.name === terminal.name) {
                if (terminal.exitStatus?.code !== 0) {
                  LogService.error(
                    `install exited with code ${terminal.exitStatus?.code}`,
                    "DevOpsService",
                    true,
                    false
                  );
                  progress.report({message: "Failed to install Parallels DevOps service, see logs for more details"});
                  return resolve(false);
                }
                const config = Provider.getConfiguration();
                const ok = await config.initDevOpsService();
                if (!ok) {
                  progress.report({message: "Failed to install Parallels DevOps service, see logs for more details"});
                  return resolve(false);
                } else {
                  progress.report({message: "Parallels DevOps installed successfully"});
                  return resolve(true);
                }
              }
            });
          });

          if (!result) {
            progress.report({message: "Failed to install Parallels DevOps, see logs for more details"});
            vscode.window.showErrorMessage("Failed to install Parallels DevOps, see logs for more details");
            return resolve(false);
          } else {
            progress.report({message: "Parallels DevOps installed successfully"});
            vscode.window.showInformationMessage("Parallels DevOps installed successfully");
            return resolve(true);
          }
        }
      );
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
          DevOpsService.testHost(provider)
            .then(() => {
              const oldState = provider.state;
              config.updateDevOpsHostsProviderState(provider.ID, "active");
              if (oldState === "inactive") {
                vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
              }
            })
            .catch(() => {
              const oldState = provider.state;
              config.updateDevOpsHostsProviderState(provider.ID, "inactive");
              if (oldState === "active") {
                vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
              }
            });
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
          DevOpsService.testHost(provider)
            .then(() => {
              const oldState = provider.state;
              config.updateDevOpsHostsProviderState(provider.ID, "active");
              if (oldState === "inactive") {
                vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
              }
            })
            .catch(() => {
              const oldState = provider.state;
              config.updateDevOpsHostsProviderState(provider.ID, "inactive");
              if (oldState === "active") {
                vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
              }
            });
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
    let hasUpdate = false;

    for (const provider of providers) {
      if (provider.state === "inactive") {
        continue;
      }

      this.getCatalogManifests(provider)
        .then(manifests => {
          if (manifests && (force || diffArray(provider.manifests, manifests, "name"))) {
            provider.manifests = manifests;
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object catalog manifests for provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting catalog manifests for provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostUsers(provider)
        .then(users => {
          if (users && (force || diffArray(provider.users, users, "name"))) {
            provider.users = users ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object users for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting virtual machines for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostClaims(provider)
        .then(claims => {
          if (claims && (force || diffArray(provider.claims, claims, "name"))) {
            provider.claims = claims ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object roles for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting claims for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostRoles(provider)
        .then(roles => {
          if (roles && (force || diffArray(provider.roles, roles, "name"))) {
            provider.roles = roles ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object roles for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting roles for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      if (hasUpdate) {
        for (const provider of providers) {
          provider.needsTreeRefresh = false;
        }

        config.catalogProviders = providers;
        config.save();
      }
    }

    vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
  }

  static async refreshRemoteHostProviders(force: boolean): Promise<void> {
    const config = Provider.getConfiguration();
    const providers = config.allRemoteHostProviders;
    for (const provider of providers) {
      if (provider.state === "inactive") {
        continue;
      }

      let hasUpdate = false;

      if (!provider.hardwareInfo && provider.type === "remote_host") {
        this.getRemoteHostHardwareInfo(provider)
          .then(hardwareInfo => {
            provider.hardwareInfo = hardwareInfo;
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          })
          .catch(err => {
            hasUpdate = true;
            LogService.error(
              `Error getting hardware info for remote host provider ${provider.name}, err: ${err}`,
              "DevOpsService"
            );
          });
      }

      this.getRemoteHostVms(provider)
        .then(virtualMachines => {
          if (virtualMachines && (force || diffArray(provider.virtualMachines, virtualMachines, "ID"))) {
            provider.virtualMachines = virtualMachines ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object virtual machines for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting virtual machines for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostUsers(provider)
        .then(users => {
          if (users && (force || diffArray(provider.users, users, "name"))) {
            provider.users = users ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object users for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting users for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostClaims(provider)
        .then(claims => {
          if (claims && (force || diffArray(provider.claims, claims, "name"))) {
            provider.claims = claims ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object claims for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting claims for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      this.getRemoteHostRoles(provider)
        .then(roles => {
          if (roles && (force || diffArray(provider.roles, roles, "name"))) {
            provider.roles = roles ?? [];
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            LogService.info(
              `Found different object roles for remote host provider ${provider.name} updating tree`,
              "DevOpsService"
            );
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          } else {
            if (provider.needsTreeRefresh) {
              provider.needsTreeRefresh = false;
              hasUpdate = true;
            }
          }
        })
        .catch(err => {
          hasUpdate = true;
          LogService.error(
            `Error getting roles for remote host provider ${provider.name}, err: ${err}`,
            "DevOpsService"
          );
        });

      if (provider.type === "orchestrator") {
        // Updating orchestrator resources
        this.getRemoteHostOrchestratorResources(provider)
          .then(resources => {
            if (resources && (force || diffArray(provider.resources, resources, "cpu_type"))) {
              provider.resources = resources ?? [];
              provider.needsTreeRefresh = true;
              hasUpdate = true;
              LogService.info(
                `Found different object resources for remote host orchestrator resource ${provider.name} updating tree`,
                "DevOpsService"
              );
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
            } else {
              if (provider.needsTreeRefresh) {
                provider.needsTreeRefresh = false;
                hasUpdate = true;
              }
            }
          })
          .catch(err => {
            LogService.error(
              `Error getting resources for remote host orchestrator provider ${provider.name}, err: ${err}`,
              "DevOpsService"
            );
          });

        // Updating orchestrator hosts
        this.getRemoteHostOrchestratorHosts(provider)
          .then(hosts => {
            if (hosts && (force || diffArray(provider.hosts, hosts, "id"))) {
              provider.hosts = hosts ?? [];
              provider.needsTreeRefresh = true;
              hasUpdate = true;
              LogService.info(
                `Found different object hosts for remote host orchestrator hosts ${provider.name} updating tree`,
                "DevOpsService"
              );
              vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
            } else {
              if (provider.needsTreeRefresh) {
                provider.needsTreeRefresh = false;
                hasUpdate = true;
              }
            }
          })
          .catch(err => {
            hasUpdate = true;
            LogService.error(
              `Error getting hosts for remote host orchestrator provider ${provider.name}, err: ${err}`,
              "DevOpsService"
            );
          });
      }

      if (hasUpdate) {
        for (const provider of providers) {
          provider.needsTreeRefresh = false;
        }

        config.remoteHostProviders = providers;
        config.save();
      }
    }

    vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
  }

  static async getHostUrl(host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!host) {
        return reject("Host is required");
      }

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

  static async authorize(
    host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined
  ): Promise<AuthorizationResponse> {
    return new Promise(async (resolve, reject) => {
      if (!host) {
        return reject("Host is required");
      }
      if (host.authToken) {
        const token = jwtDecode<AuthorizationToken>(host.authToken);
        if (token) {
          const dateNow = Math.round(Date.now() / 1000);
          const tokenExp = token.exp ?? 0;
          if (tokenExp > dateNow) {
            const response: AuthorizationResponse = {
              token: host.authToken,
              email: token.email ?? "",
              expires_at: token.exp ?? 0
            };
            if (!host.user) {
              host.user = {
                name: token.email ?? "",
                email: token.email ?? "",
                username: token.email ?? "",
                id: token.uid ?? "",
                roles: token.roles ?? [],
                claims: token.claims ?? [],
                isSuperUser: false
              };
              for (const role of host.user.roles) {
                if (role === "SUPER_USER") {
                  host.user.isSuperUser = true;
                  break;
                }
              }
            }
            return resolve(response);
          }
        }
      }

      const url = await this.getHostUrl(host).catch(err => {
        return reject(err);
      });

      const request: AuthorizationRequest = {
        email: host.username,
        password: host.password
      };

      let error: any;
      const response = await axios.post<AuthorizationResponse>(`${url}/api/v1/auth/token`, request).catch(err => {
        error = err;
        return reject(`Unable to authorize using user ${host.username} on host ${url}`);
      });

      if (response?.status !== 200) {
        host.authToken = undefined;
        host.user = undefined;
        return reject(response?.statusText ?? error);
      }

      host.authToken = response.data.token;
      return resolve(response.data);
    });
  }

  static async testHost(host: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (!host) {
        return reject("Host is required");
      }
      let url = "";
      if (host.rawHost) {
        url = host.rawHost;
      } else {
        if (!host.scheme) {
          host.scheme = "http";
        }
        if (!host.host) {
          return reject("Host url is required");
        }
        url = `${host.scheme}://${host.host}`;
        if (host.port) {
          url += `:${host.port}`;
        }
      }

      let error: any;
      const response = await axios.get(`${url}/api/health/probe`, {}).catch(err => {
        error = err;
        return reject(err);
      });

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      await this.authorize(host)
        .then(() => {
          return resolve(true);
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

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
      });

      let error: any;
      const response = await axios
        .get(`${url}/api/v1/catalog`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      const items: CatalogManifestItem[] = [];
      const manifests: [] = response?.data ?? [];
      for (const manifest of manifests) {
        const t = Object.keys(manifest)[0];
        const a = manifest[0];
        const item: CatalogManifestItem = {
          name: Object.keys(manifest)[0],
          items: manifest[Object.keys(manifest)[0]]
        };

        items.push(item);
      }

      return resolve(items);
    });
  }

  static async getRemoteHostHardwareInfo(provider: DevOpsRemoteHostProvider): Promise<HostHardwareInfo | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let error: any;
      const response = await axios
        .get<HostHardwareInfo>(`${url}/api/v1/config/hardware`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      return resolve(response?.data ?? undefined);
    });
  }
  static async getRemoteHostVms(provider: DevOpsRemoteHostProvider): Promise<VirtualMachine[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      let path = `${url}/api/v1/machines`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines`;
      }

      let error: any;
      const response = await axios
        .get<VirtualMachine[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async getRemoteHostUsers(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined
  ): Promise<DevOpsUser[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users`;

      let error: any;
      const response = await axios
        .get<DevOpsUser[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async removeRemoteHostUsers(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}`;

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async updateRemoteHostUsers(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string,
    request: DevOpsUpdateUserRequest
  ): Promise<DevOpsUser | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}`;

      let error: any;
      const response = await axios
        .put<DevOpsUser>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? undefined);
    });
  }

  static async createRemoteHostUsers(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    request: DevOpsCreateUserRequest
  ): Promise<DevOpsUser | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users`;

      let error: any;
      const response = await axios
        .post<DevOpsUser>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? undefined);
    });
  }

  static async addRemoteHostUserClaim(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string,
    claimName: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}/claims`;

      const request: DevOpsRolesAndClaimsCreateRequest = {
        name: claimName
      };

      let error: any;
      const response = await axios
        .post<DevOpsUser>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeRemoteHostUserClaim(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string,
    claimName: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}/claims/${claimName}`;

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async addRemoteHostUserRole(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}/roles`;

      const request: DevOpsRolesAndClaimsCreateRequest = {
        name: roleName
      };

      let error: any;
      const response = await axios
        .post<DevOpsUser>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeRemoteHostUserRole(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    userId: string,
    roleName: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/users/${userId}/roles/${roleName}`;

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async getRemoteHostClaims(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined
  ): Promise<DevOpsRolesAndClaims[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/claims`;

      let error: any;
      const response = await axios
        .get<DevOpsRolesAndClaims[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async removeRemoteHostClaim(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    claimId: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/claims/${claimId}`;

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async createRemoteHostClaim(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    request: DevOpsRolesAndClaimsCreateRequest
  ): Promise<DevOpsRolesAndClaims | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/claims`;

      let error: any;
      const response = await axios
        .post<DevOpsRolesAndClaims>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? undefined);
    });
  }

  static async getRemoteHostRoles(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined
  ): Promise<DevOpsRolesAndClaims[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/roles`;

      let error: any;
      const response = await axios
        .get<DevOpsRolesAndClaims[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async removeRemoteHostRole(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    roleId: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/roles/${roleId}`;

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async createRemoteHostRole(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    request: DevOpsRolesAndClaimsCreateRequest
  ): Promise<DevOpsRolesAndClaims | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      const path = `${url}/api/v1/auth/roles`;

      let error: any;
      const response = await axios
        .post<DevOpsRolesAndClaims>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? undefined);
    });
  }

  static async getRemoteHostOrchestratorResources(
    provider: DevOpsRemoteHostProvider
  ): Promise<DevOpsRemoteHostResource[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/orchestrator/overview/resources`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      let error: any;
      const response = await axios
        .get<DevOpsRemoteHostResource[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async getRemoteHostOrchestratorHosts(provider: DevOpsRemoteHostProvider): Promise<DevOpsRemoteHost[]> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/orchestrator/hosts`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      let error: any;
      const response = await axios
        .get<DevOpsRemoteHost[]>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async enableRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}/enable`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      let error: any;
      const response = await axios
        .put(`${path}`, null, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async disableRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}/disable`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      let error: any;
      const response = await axios
        .put(`${path}`, null, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async addRemoteHostOrchestratorHost(
    provider: DevOpsRemoteHostProvider,
    request: AddOrchestratorHostRequest
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      if (!request) {
        return reject("Request is required");
      }

      const path = `${url}/api/v1/orchestrator/hosts`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let error: any;
      const response = await axios
        .post(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async updateRemoteHostOrchestratorHost(
    provider: DevOpsRemoteHostProvider,
    hostId: string,
    request: UpdateOrchestratorHostRequest
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      if (!request) {
        return reject("Request is required");
      }

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async removeRemoteHostOrchestratorHost(provider: DevOpsRemoteHostProvider, hostId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/orchestrator/hosts/${hostId}`;
      if (provider.type !== "orchestrator") {
        return reject("Only orchestrator type can get resources");
      }

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(response?.data ?? []);
    });
  }

  static async startRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "start",
            value: ""
          }
        ]
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async stopRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "stop",
            value: ""
          }
        ]
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async pauseRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "pause",
            value: ""
          }
        ]
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async resumeRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "resume",
            value: ""
          }
        ]
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async suspendRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
      }

      const request: DevOpsVirtualMachineConfigureRequest = {
        operations: [
          {
            group: "state",
            operation: "suspend",
            value: ""
          }
        ]
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines/${virtualMachineId}`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}`;
      }

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async cloneRemoteHostVm(
    provider: DevOpsRemoteHostProvider,
    virtualMachineId: string,
    cloneName: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      if (!cloneName) {
        return reject("Clone name is required");
      }

      let path = `${url}/api/v1/machines/${virtualMachineId}/set`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines/${virtualMachineId}/set`;
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
      };

      let error: any;
      const response = await axios
        .put(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async generatePullPDFile(provider: DevOpsCatalogHostProvider, request: CatalogPullRequest): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const from = url;
      let insecure = false;
      if (provider.scheme === "http") {
        insecure = true;
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
`;
      const path = `/tmp/pull_${cleanString(request.machine_name)}.pdfile`;
      // deleting the file if it exists
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
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
      const to = url;
      let insecure = false;
      if (provider.scheme === "http") {
        insecure = true;
      }

      const pdFile = `TO ${to}
${insecure ? "INSECURE true" : ""}
AUTHENTICATE USERNAME ${provider.username}
AUTHENTICATE PASSWORD ${provider.password}

PROVIDER ${request.connection}

CATALOG_ID ${request.catalog_id}
VERSION ${request.version}
ARCHITECTURE ${request.architecture}

${request.required_claims?.length > 0 ? `CLAIM ${request.required_claims.join(",")}` : ""}
${request.required_roles?.length > 0 ? `ROLE ${request.required_roles.join(",")}` : ""}
${request.tags?.length > 0 ? `TAG ${request.tags.join(",")}` : ""}

LOCAL_PATH ${request.local_path}
`;
      const path = `/tmp/push_${cleanString(request.catalog_id)}.pdfile`;
      // deleting the file if it exists
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }

      fs.writeFileSync(path, pdFile);
      return resolve(path);
    });
  }

  static async pullManifestFromCatalogProvider(
    provider: DevOpsCatalogHostProvider,
    request: CatalogPullRequest
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!request) {
        return reject("Request is required");
      }
      if (!(await this.isInstalled())) {
        const options: string[] = [];
        options.push("Install Parallels Desktop DevOps Service");
        options.push("Download Parallels Desktop DevOps Service");
        const selection = await vscode.window.showErrorMessage(
          "Parallels Desktop DevOps is not installed, please install Parallels Desktop DevOps and try again.",
          "Open Parallels Desktop Service Documentation",
          ...options
        );
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

  static async pushManifestFromCatalogProvider(
    provider: DevOpsCatalogHostProvider,
    request: CatalogPushRequest
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!request) {
        return reject("Request is required");
      }
      if (!(await this.isInstalled())) {
        const options: string[] = [];
        options.push("Install Parallels Desktop DevOps Service");
        options.push("Download Parallels Desktop DevOps Service");
        const selection = await vscode.window.showErrorMessage(
          "Parallels Desktop DevOps is not installed, please install Parallels Desktop DevOps and try again.",
          "Open Parallels Desktop Service Documentation",
          ...options
        );
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

      let error = "";
      cmd.stderr.on("data", data => {
        error += data.toString();
        LogService.error(data.toString(), "DevOpsService");
      });

      cmd.on("close", code => {
        fs.unlinkSync(path);
        if (code !== 0) {
          LogService.error(`prldevops push exited with code ${code}, err: ${error}`, "DevOpsService");
          return reject(`prldevops push exited with code ${code}`);
        }
        LogService.info(`Manifest ${request.catalog_id} pushed to provider ${provider.name}`, "DevOpsService");
        return resolve();
      });
    });
  }

  static async removeCatalogManifest(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId?: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/catalog/${manifestId}`;
      if (versionId) {
        path = `${url}/api/v1/catalog/${manifestId}/${versionId}`;
      }

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async taintCatalogManifest(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/taint`;

      let error: any;
      const response = await axios
        .patch(`${path}`, null, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async untaintCatalogManifest(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/untaint`;

      let error: any;
      const response = await axios
        .patch(`${path}`, null, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async revokeCatalogManifest(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });
      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/revoke`;

      let error: any;
      const response = await axios
        .patch(`${path}`, null, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async addCatalogManifestRoles(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string,
    roles: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/roles`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        required_roles: roles
      };

      let error: any;
      const response = await axios
        .patch(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeCatalogManifestRoles(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    manifestId: string,
    versionId: string,
    architecture: string,
    roles: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/roles`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        required_roles: roles
      };

      let error: any;
      const response = await axios
        .request({
          method: "DELETE",
          url: `${path}`,
          headers: {
            Authorization: `Bearer ${auth?.token}`
          },
          data: request
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async addCatalogManifestClaims(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string,
    claims: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/claims`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        required_claims: claims
      };

      let error: any;
      const response = await axios
        .patch(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeCatalogManifestClaims(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    manifestId: string,
    versionId: string,
    architecture: string,
    claims: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/claims`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        required_claims: claims
      };

      let error: any;
      const response = await axios
        .request({
          method: "DELETE",
          url: `${path}`,
          headers: {
            Authorization: `Bearer ${auth?.token}`
          },
          data: request
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async addCatalogManifestTags(
    provider: DevOpsCatalogHostProvider,
    manifestId: string,
    versionId: string,
    architecture: string,
    tags: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/tags`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        tags: tags
      };

      let error: any;
      const response = await axios
        .patch(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async removeCatalogManifestTags(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    manifestId: string,
    versionId: string,
    architecture: string,
    tags: string[]
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      if (!versionId) {
        return reject("Version is required");
      }
      if (!architecture) {
        return reject("Architecture is required");
      }

      const path = `${url}/api/v1/catalog/${manifestId}/${versionId}/${architecture}/tags`;

      const request: DevOpsCatalogRolesAndClaimsCreateRequest = {
        tags: tags
      };

      let error: any;
      const response = await axios
        .request({
          method: "DELETE",
          url: `${path}`,
          headers: {
            Authorization: `Bearer ${auth?.token}`
          },
          data: request
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async createRemoteHostVmFromCatalog(
    provider: DevOpsRemoteHostProvider,
    request: CreateCatalogMachine
  ): Promise<VirtualMachine> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/machines`;
      if (provider.type === "orchestrator") {
        path = `${url}/api/v1/orchestrator/machines`;
      }

      let error: any;
      const response = await axios
        .post<VirtualMachine>(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (response?.status !== 200) {
        return reject(response?.statusText);
      }

      return !response ? reject(error) : resolve(response?.data);
    });
  }
}
