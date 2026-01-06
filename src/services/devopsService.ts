import * as fs from "fs";
import * as vscode from "vscode";
import {jwtDecode} from "jwt-decode";
import {CatalogPullRequest} from "./../models/devops/catalogPullRequest";
import {config} from "./../ioc/provider";
import {AuthorizationRequest, AuthorizationToken} from "./../models/devops/authorization";
import {spawn} from "child_process";
import {Provider} from "../ioc/provider";
import {LogService} from "./logService";
import {
  CommandsFlags,
  FLAG_DEVOPS_PATH,
  FLAG_DEVOPS_VERSION,
  FLAG_IS_PARALLELS_CATALOG_OFFLINE
} from "../constants/flags";
import {DevOpsCatalogHostProvider} from "../models/devops/catalogHostProvider";
import axios from "axios";
import {AuthorizationResponse} from "../models/devops/authorization";
import {CatalogManifestItem} from "../models/devops/catalogManifest";
import {diffArray, hasPassed24Hours} from "../helpers/diff";
import {DevOpsRemoteHostProvider} from "../models/devops/remoteHostProvider";
import {VirtualMachine} from "../models/parallels/virtualMachine";
import {DevOpsRemoteHostResource} from "../models/devops/remoteHostResource";
import {DevOpsRemoteHost, DevOpsRemoteHostReverseProxyHost} from "../models/devops/remoteHost";
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
import {TELEMETRY_INSTALL_DEVOPS} from "../telemetry/operations";
import {compareSemanticVersions, getFoldersBasePath} from "../helpers/helpers";
import path from "path";
import {
  calcTotalCacheSize,
  CatalogCacheResponse,
  CatalogCacheResponseManifest,
  updateCurrentCacheManifestsItems
} from "../models/parallels/catalog_cache_response";
import {
  DevOpsReverseProxy,
  ReverseProxyConfig,
  updateCurrentDevOpsReverseProxyItems
} from "../models/devops/reverse_proxy_hosts";

const refreshThreshold = 15000;
const parallelsCatalogThreshold = 3600000;
const hardwareRefreshThreshold = 10;
const MIN_WEBSOCKET_VERSION = "0.5.0";

let catalogViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingCatalogProviders = false;
let catalogViewAutoRefreshStarted = false;

let parallelsCatalogViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let parallelsCatalogViewAutoRefreshStarted = false;

let remoteHostsViewAutoRefreshInterval: NodeJS.Timeout | undefined;
let isRefreshingRemoteHostProviders = false;
let remoteHostViewAutoRefreshStarted = false;

export class DevOpsService {
  constructor(private context: vscode.ExtensionContext) {
    axios.defaults.headers.common["X-SOURCE-ID"] = "VSCODE_EXTENSION";
    axios.defaults.timeout = 150000;
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

        cache.set(FLAG_DEVOPS_PATH, settings.get<string>(FLAG_DEVOPS_PATH));
      }

      const basePath = getFoldersBasePath();
      if (!basePath) {
        LogService.error("Could not get base path for Parallels DevOps", "DevOpsService", false, false);
        return resolve(false);
      }
      const filePath = path.join(basePath, "tools", "prldevops");
      if (fs.existsSync(filePath)) {
        LogService.info(`Parallels DevOps was found on path ${filePath}`, "DevOpsService");
        const devOpsServicePath = settings.get<string>(FLAG_DEVOPS_PATH);
        if (!devOpsServicePath) {
          settings.update(FLAG_DEVOPS_PATH, filePath, true);
        }
        cache.set(FLAG_DEVOPS_PATH, filePath);
        return resolve(true);
      } else {
        return resolve(false);
      }
    });
  }

  static version(force = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const version = Provider.getCache().get(FLAG_DEVOPS_VERSION);
      if (version && !force) {
        LogService.info(`Parallels DevOps ${version} was found in the system`, "DevOpsService");
        return resolve(version);
      }

      const path = Provider.getCache().get(FLAG_DEVOPS_PATH);

      if (!path) {
        LogService.error("Could not get Parallels DevOps path", "DevOpsService", false, false);
        return reject("Could not get Parallels DevOps path");
      }

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

  static checkForLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      LogService.info("Checking for latest Parallels DevOps version...", "DevOpsService");
      axios
        .get("https://api.github.com/repos/Parallels/prl-devops-service/releases/latest")
        .then(response => {
          const latestVersion = response.data.tag_name.replace("release-v", "").replace("v", "").trim();
          LogService.info(`Latest Parallels DevOps version is ${latestVersion}`, "DevOpsService");
          return resolve(latestVersion);
        })
        .catch(err => {
          LogService.error(`Error checking for latest Parallels DevOps version, err: ${err}`, "DevOpsService");
          return reject(err);
        });
    });
  }

  static install(): Promise<boolean> {
    const telemetry = Provider.telemetry();
    LogService.info("Installing Parallels DevOps...", "DevOpsService");
    const basePath = getFoldersBasePath();
    const filePath = path.join(basePath, "tools");
    return new Promise(async (resolve, reject) => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Parallels Desktop",
          cancellable: false
        },
        async (progress, token) => {
          if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, {recursive: true});
          }

          progress.report({message: "Installing Parallels DevOps..."});
          const installCmd = [
            "-c",
            `"$(curl -fsSL https://raw.githubusercontent.com/Parallels/prl-devops-service/main/scripts/install.sh)" - --no-service --path ${filePath} --std-user`
          ];
          console.log(installCmd.join(" "));
          const cmd = spawn("/bin/bash", installCmd, {
            shell: true,
            cwd: getFoldersBasePath()
          });
          cmd.stdout.on("data", data => {
            console.log(data.toString());
            LogService.info(data.toString(), "DevOpsService");
          });

          cmd.stderr.on("data", data => {
            const d = data.toString();
            console.log(d);
            LogService.error(data.toString(), "DevOpsService");
          });

          cmd.on("close", async code => {
            if (code !== 0) {
              LogService.error(`install exited with code ${code}`, "DevOpsService", true, false);
              telemetry.sendErrorEvent(TELEMETRY_INSTALL_DEVOPS, "Failed to install Parallels DevOps");
              progress.report({message: "Failed to install Parallels DevOps, see logs for more details"});
              vscode.window.showErrorMessage("Failed to install Parallels DevOps, see logs for more details");
              return resolve(false);
            }

            const version = await DevOpsService.version(true);
            telemetry.sendOperationEvent(TELEMETRY_INSTALL_DEVOPS, "success", {
              description: `Parallels DevOps version ${version} installed successfully`
            });
            progress.report({message: `Parallels DevOps version ${version} installed successfully`});
            vscode.window.showInformationMessage(`Parallels DevOps version ${version} installed successfully`);
            return resolve(true);
          });
        }
        //   const terminal = vscode.window.createTerminal(`Parallels Desktop: Installing DevOps Service`);
        //   terminal.sendText(
        //     `echo ${sudoPassword} | sudo -S /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Parallels/prl-devops-service/main/scripts/install.sh)" - --no-service ; exit $?`
        //   );
        //   vscode.window.onDidCloseTerminal(async closedTerminal => {
        //     if (closedTerminal.name === terminal.name) {
        //       if (terminal.exitStatus?.code !== 0) {
        //         LogService.error(
        //           `install exited with code ${terminal.exitStatus?.code}`,
        //           "DevOpsService",
        //           true,
        //           false
        //         );
        //         progress.report({message: "Failed to install Parallels DevOps service, see logs for more details"});
        //         return resolve(false);
        //       }
        //       const config = Provider.getConfiguration();
        //       const ok = await config.initDevOpsService(false);
        //       if (!ok) {
        //         progress.report({message: "Failed to install Parallels DevOps service, see logs for more details"});
        //         return resolve(false);
        //       } else {
        //         const version = await DevOpsService.version();
        //         progress.report({message: `Parallels DevOps version ${version} installed successfully`});
        //         return resolve(true);
        //       }
        //     }
        //   });
        // });

        // if (!result) {
        //   telemetry.sendErrorEvent(TELEMETRY_INSTALL_DEVOPS, "Failed to install Parallels DevOps");
        //   progress.report({message: "Failed to install Parallels DevOps, see logs for more details"});
        //   vscode.window.showErrorMessage("Failed to install Parallels DevOps, see logs for more details");
        //   return resolve(false);
        // } else {
        //   const version = await DevOpsService.version(true);
        //   telemetry.sendOperationEvent(TELEMETRY_INSTALL_DEVOPS, "success", {
        //     description: `Parallels DevOps version ${version} installed successfully`
        //   });
        //   progress.report({message: `Parallels DevOps version ${version} installed successfully`});
        //   vscode.window.showInformationMessage(`Parallels DevOps version ${version} installed successfully`);
        //   return resolve(true);
        // }
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
            .then(result => {
              const oldState = provider.state;
              const currentState = result ? "active" : "inactive";
              if (oldState !== currentState) {
                config.updateDevOpsHostsProviderState(provider.ID, currentState);
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
            LogService.info(`Error refreshing catalog providers: ${err}`, "DevOpsService");
            isRefreshingCatalogProviders = false;
          });
      }, refreshThreshold);
    }
  }

  static stopCatalogViewAutoRefresh(): void {
    console.log("Stopping Catalog view auto refresh");
    if (catalogViewAutoRefreshInterval) {
      clearInterval(catalogViewAutoRefreshInterval);
    }

    catalogViewAutoRefreshStarted = false;
  }

  static stopParallelsCatalogViewAutoRefresh(): void {
    console.log("Stopping Parallels Catalog view auto refresh");
    if (parallelsCatalogViewAutoRefreshInterval) {
      clearInterval(parallelsCatalogViewAutoRefreshInterval);
    }

    parallelsCatalogViewAutoRefreshStarted = false;
  }

  static isRemoteHostsViewAutoRefreshStarted(): boolean {
    return remoteHostViewAutoRefreshStarted;
  }

  static startRemoteHostsViewAutoRefresh(): void {
    if (remoteHostViewAutoRefreshStarted) {
      return;
    }
    if (remoteHostsViewAutoRefreshInterval) {
      clearInterval(remoteHostsViewAutoRefreshInterval);
    }
    remoteHostViewAutoRefreshStarted = true;

    LogService.info(`Found ${config.remoteHostProviders.length} remote host providers to check`, "DevOpsService");

    // Import EventMonitorService dynamically to avoid circular dependency
    import("./eventMonitorService").then(EventMonitorServiceModule => {
      LogService.info("EventMonitorService imported successfully", "DevOpsService");
      const EventMonitorService = EventMonitorServiceModule.EventMonitorService;

      // Check each provider and start WebSocket or polling
      for (const provider of config.remoteHostProviders) {
        LogService.info(
          `Checking provider ${provider.name} (type: ${provider.type}, hosts: ${provider.hosts?.length ?? 0})`,
          "DevOpsService"
        );

        if (this.shouldUseWebSocket(provider)) {
          LogService.info(`Starting WebSocket monitoring for ${provider.name}`, "DevOpsService");
          EventMonitorService.connectWebSocket(provider);
        } else {
          LogService.info(
            `Provider ${provider.name} does not support WebSocket - using polling instead`,
            "DevOpsService"
          );
        }
      }

      // Continue with polling for non-WebSocket providers and connectivity checks
      if (!isRefreshingRemoteHostProviders) {
        remoteHostsViewAutoRefreshInterval = setInterval(() => {
          isRefreshingRemoteHostProviders = true;

          for (const provider of config.remoteHostProviders) {
            // Test connectivity for all providers
            DevOpsService.testHost(provider)
              .then(result => {
                const oldState = provider.state;
                const currentState = result ? "active" : "inactive";
                if (oldState !== currentState) {
                  config.updateDevOpsHostsProviderState(provider.ID, currentState);
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

          // Refresh providers (WebSocket-enabled ones will be handled by EventMonitorService)
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
    });
  }

  static stopRemoteHostsViewAutoRefresh(): void {
    console.log("Stopping Remote Hosts view auto refresh");
    if (remoteHostsViewAutoRefreshInterval) {
      clearInterval(remoteHostsViewAutoRefreshInterval);
    }

    // Import EventMonitorService dynamically to avoid circular dependency
    import("./eventMonitorService").then(EventMonitorServiceModule => {
      const EventMonitorService = EventMonitorServiceModule.EventMonitorService;
      EventMonitorService.disconnectAllWebSockets();
    });

    remoteHostViewAutoRefreshStarted = false;
  }

  static async refreshCatalogProviders(force: boolean): Promise<void> {
    const config = Provider.getConfiguration();
    const providers = config.allCatalogProviders;
    let hasUpdate = false;

    for (const provider of providers) {
      if (provider.state === "inactive") {
        continue;
      }

      if (
        !provider.hardwareInfo ||
        hasPassed24Hours(provider.lastUpdatedHardwareInfo ?? "", hardwareRefreshThreshold)
      ) {
        this.getRemoteHostHardwareInfo(provider)
          .then(hardwareInfo => {
            provider.hardwareInfo = hardwareInfo;
            provider.lastUpdatedHardwareInfo = new Date().toISOString();
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          })
          .catch(err => {
            hasUpdate = true;
            LogService.error(
              `Error getting hardware info for catalog provider ${provider.name}, err: ${err}`,
              "DevOpsService"
            );
          });
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

      if (provider.user?.isSuperUser) {
        this.getRemoteHostUsers(provider)
          .then(users => {
            if (users && (force || diffArray(provider.users ?? [], users, "name"))) {
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
            if (claims && (force || diffArray(provider.claims ?? [], claims, "name"))) {
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
            if (roles && (force || diffArray(provider.roles ?? [], roles, "name"))) {
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
    }

    vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
  }

  static async refreshRemoteHostProviders(force: boolean): Promise<void> {
    const config = Provider.getConfiguration();
    const providers = config.allRemoteHostProviders;
    for (const provider of providers) {
      if (!provider) {
        LogService.error("Remote host provider is undefined", "DevOpsService");
        continue;
      }
      if (provider.state === "inactive") {
        LogService.info(
          `Parallels Catalog provider ${provider.name} is inactive, retrying connection`,
          "DevOpsService"
        );
        let result: boolean | void = false;
        result = await DevOpsService.testHost(provider).catch(() => {
          LogService.error(`Error testing remote host provider ${provider.name}`, "DevOpsService");
          result = false;
        });
        if (!result) {
          LogService.info(
            `Parallels Catalog provider ${provider.name} is still inactive after refresh`,
            "DevOpsService"
          );
          continue;
        } else {
          provider.state = "active";
        }
      }

      let hasUpdate = false;

      if (
        force ||
        !provider.hardwareInfo ||
        hasPassed24Hours(provider.lastUpdatedHardwareInfo ?? "", hardwareRefreshThreshold)
      ) {
        this.getRemoteHostHardwareInfo(provider)
          .then(hardwareInfo => {
            provider.hardwareInfo = hardwareInfo;
            provider.needsTreeRefresh = true;
            hasUpdate = true;
            provider.lastUpdatedHardwareInfo = new Date().toISOString();
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

      if (provider.user?.isSuperUser) {
        this.getRemoteHostUsers(provider)
          .then(users => {
            if (users && (force || diffArray(provider.users ?? [], users, "name"))) {
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
            if (claims && (force || diffArray(provider.claims ?? [], claims, "name"))) {
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
            if (roles && (force || diffArray(provider.roles ?? [], roles, "name"))) {
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
      }

      if (provider.type === "orchestrator") {
        // Updating orchestrator resources
        this.getRemoteHostOrchestratorResources(provider)
          .then(resources => {
            if (resources && (force || diffArray(provider.resources ?? [], resources, "cpu_type"))) {
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
          .then(async hosts => {
            const orderedHosts = hosts.sort((a, b) => {
              return a.id.localeCompare(b.id);
            });
            const orderedProviderHosts =
              provider.hosts?.sort((a, b) => {
                return a.id.localeCompare(b.id);
              }) ?? [];
            orderedProviderHosts.forEach(host => {
              host.catalogCache = undefined;
            });
            if (hosts && (force || diffArray(orderedProviderHosts, orderedHosts, "id"))) {
              provider.hosts = hosts ?? [];
              provider.needsTreeRefresh = true;
              hasUpdate = true;
              LogService.info(
                `Found different object hosts for remote host orchestrator hosts ${provider.name} updating tree`,
                "DevOpsService"
              );

              // Check if WebSocket should now be enabled after hosts are loaded/updated
              LogService.info(`Hosts updated for ${provider.name}, checking WebSocket eligibility`, "DevOpsService");
              import("./eventMonitorService").then(EventMonitorServiceModule => {
                const EventMonitorService = EventMonitorServiceModule.EventMonitorService;
                const shouldUseWs = this.shouldUseWebSocket(provider);
                LogService.info(`shouldUseWebSocket returned ${shouldUseWs} for ${provider.name}`, "DevOpsService");
                if (shouldUseWs) {
                  LogService.info(
                    `Hosts updated for ${provider.name} - starting WebSocket monitoring`,
                    "DevOpsService"
                  );
                  EventMonitorService.connectWebSocket(provider);
                } else {
                  LogService.info(`Skipping WebSocket for ${provider.name} - not eligible`, "DevOpsService");
                }
              });

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
        // Getting the catalog cache for each host
        if (!provider.catalogCache) {
          provider.catalogCache = {
            total_size: 0,
            host_id: provider.ID,
            manifests: []
          };
        }
        const allFoundManifests: CatalogCacheResponseManifest[] = [];
        for (const host of provider.hosts ?? []) {
          if (host.enabled && host.state === "healthy") {
            try {
              const cache = await this.getHostCatalogCache(provider, host.id);
              cache.host_id = host.id;
              host.catalogCache = {
                total_size: 0,
                host_id: host.id,
                manifests: []
              };
              if (provider.catalogCache) {
                for (const manifest of cache.manifests) {
                  manifest.host_id = host.id;
                  host.catalogCache.manifests.push(manifest);
                  const existingManifest = allFoundManifests.find(
                    m =>
                      m.id === manifest.id &&
                      m.host_id === manifest.host_id &&
                      m.name === manifest.name &&
                      m.version === manifest.version &&
                      m.architecture === manifest.architecture &&
                      m.catalog_id === manifest.catalog_id
                  );
                  if (existingManifest) {
                    continue;
                  }
                  allFoundManifests.push(manifest);
                }
              }
            } catch (e) {
              continue;
            }
          }
        }
        const updatedManifests = updateCurrentCacheManifestsItems(provider.catalogCache.manifests, allFoundManifests);
        provider.catalogCache.manifests = updatedManifests;
        provider.catalogCache.total_size = calcTotalCacheSize(provider.catalogCache);

        // getting the reverse proxy configuration for each host
        if (!provider.reverseProxy) {
          provider.reverseProxy = {
            reverse_proxy_config: {
              enabled: false,
              id: "",
              host: "",
              port: ""
            },
            reverse_proxy_hosts: []
          };
        }

        const allReverseProxyHosts: DevOpsRemoteHostReverseProxyHost[] = [];
        for (const host of provider.hosts ?? []) {
          if (host.enabled && host.state === "healthy") {
            try {
              const hostReverseProxy = await this.getRemoteHostReverseProxy(provider, host.id).catch(err => {
                LogService.error(
                  `Error getting reverse proxy configuration for remote host provider ${provider.name}, err: ${err}`,
                  "DevOpsService"
                );
              });
              if (hostReverseProxy) {
                hostReverseProxy.reverse_proxy_hosts?.forEach(h => {
                  h.host_id = host.id;
                });
                host.reverseProxy = hostReverseProxy;
                const currentItems = host.reverseProxy.reverse_proxy_hosts ?? [];
                allReverseProxyHosts.push(...currentItems);
              }
            } catch (e) {
              continue;
            }
          }
        }
        const updatedReverseProxyHosts = updateCurrentDevOpsReverseProxyItems(
          provider.reverseProxy.reverse_proxy_hosts ?? [],
          allReverseProxyHosts
        );
        provider.reverseProxy.reverse_proxy_hosts = updatedReverseProxyHosts;
      } else {
        if (provider.state === "active") {
          this.getHostCatalogCache(provider, "")
            .then(cache => {
              cache.host_id = "";
              if (!provider.catalogCache) {
                provider.catalogCache = {
                  total_size: 0,
                  host_id: provider.ID,
                  manifests: []
                };
              }
              for (const manifest of cache.manifests) {
                manifest.host_id = provider.ID;
              }
              const updatedManifests = updateCurrentCacheManifestsItems(
                provider.catalogCache.manifests,
                cache.manifests
              );
              provider.catalogCache.manifests = updatedManifests;
              provider.catalogCache.total_size = calcTotalCacheSize(provider.catalogCache);
            })
            .catch(err => {
              LogService.error(
                `Error getting catalog cache for remote host ${provider.name}, err: ${err}`,
                "DevOpsService"
              );
              provider.catalogCache = undefined;
            });

          const reverseProxy = await this.getRemoteHostReverseProxy(provider).catch(err => {
            LogService.error(
              `Error getting reverse proxy configuration for remote host provider ${provider.name}, err: ${err}`,
              "DevOpsService"
            );
          });
          if (reverseProxy) {
            provider.reverseProxy = reverseProxy;
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
      const response = await axios
        .get(`${url}/api/health/probe`, {
          timeout: 5000
        })
        .catch(err => {
          error = err;
        });

      if (error !== undefined) {
        LogService.error(`Error testing host ${url}, err: ${error}`, "DevOpsService");
        return resolve(false);
      }

      if (response === undefined) {
        return resolve(false);
      }

      if (response?.status !== 200) {
        LogService.error(`Error testing host ${url}, err: ${response?.statusText}`, "DevOpsService");
        return resolve(false);
      }

      await this.authorize(host)
        .then(() => {
          return resolve(true);
        })
        .catch(err => {
          error = err;
          LogService.error(`Error authorizing host ${url}, err: ${err}`, "DevOpsService");
          return resolve(false);
        });

      if (response?.status !== 200) {
        LogService.error(`Error testing host ${url}, err: ${response?.statusText}`, "DevOpsService");
        return resolve(false);
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
            "X-LOGGING": "IGNORE",
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
          description: "",
          items: manifest[Object.keys(manifest)[0]]
        };

        if (item.items.length > 0) {
          if (item.items[0].description) {
            item.description = item.items[0].description;
          }
        }

        items.push(item);
      }

      return resolve(items);
    });
  }

  static async getRemoteHostHardwareInfo(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider
  ): Promise<HostHardwareInfo | undefined> {
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
            "X-LOGGING": "IGNORE",
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
            "X-LOGGING": "IGNORE",
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
            "X-LOGGING": "IGNORE",
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
            "X-LOGGING": "IGNORE",
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
            "X-LOGGING": "IGNORE",
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
            "X-LOGGING": "IGNORE",
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

  static async getRemoteHostVersion(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider
  ): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const path = `${url}/api/v1/version`;

      let error: any;
      const response = await axios
        .get<{version: string}>(`${path}`, {
          headers: {
            "X-LOGGING": "IGNORE",
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          LogService.debug(`Failed to get version from ${provider.name}: ${err}`, "DevOpsService");
          return undefined;
        });

      return resolve(response?.data?.version);
    });
  }

  static shouldUseWebSocket(provider: DevOpsRemoteHostProvider): boolean {
    LogService.info(
      `shouldUseWebSocket called for provider ${provider.name} (type: ${provider.type})`,
      "DevOpsService"
    );

    // Only orchestrators support WebSocket events
    if (provider.type !== "orchestrator") {
      LogService.info(`Provider ${provider.name} is not orchestrator type (${provider.type})`, "DevOpsService");
      return false;
    }

    // Check if any host has WebSocket capability
    if (provider.hosts && provider.hosts.length > 0) {
      // Log each host's WebSocket status for debugging
      provider.hosts.forEach(host => {
        LogService.info(
          `Host "${host.host}" (id: ${host.id}): has_websocket_events=${host.has_websocket_events}, version=${host.devops_version}`,
          "DevOpsService"
        );
      });

      const wsHosts = provider.hosts.filter(host => host.has_websocket_events === true);
      LogService.info(
        `Provider ${provider.name} has ${wsHosts.length}/${provider.hosts.length} hosts with WebSocket support (returning ${wsHosts.length > 0})`,
        "DevOpsService"
      );
      if (wsHosts.length > 0) {
        LogService.info(
          `WebSocket-enabled hosts: ${wsHosts.map(h => `${h.host} (v${h.devops_version})`).join(", ")}`,
          "DevOpsService"
        );
      }
      return wsHosts.length > 0;
    }

    LogService.info(`Provider ${provider.name} has no hosts (returning false)`, "DevOpsService");
    return false;
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
            "X-LOGGING": "IGNORE",
            Authorization: `Bearer ${auth?.token}`
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (!response) {
        return reject(error);
      }

      const hosts = response?.data ?? [];

      LogService.info(`Fetched ${hosts.length} hosts from orchestrator API`, "DevOpsService");

      return resolve(hosts);
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
          },
          timeout: 600000
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
          },
          timeout: 600000
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
          },
          timeout: 600000
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
          },
          timeout: 600000
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
          },
          timeout: 600000
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
          },
          timeout: 600000
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      return !response ? reject(error) : resolve(true);
    });
  }

  static async unregisterRemoteHostVm(provider: DevOpsRemoteHostProvider, virtualMachineId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      const request = {
        id: virtualMachineId,
        clean_source_uuid: true
      };

      let path = `${url}/api/v1/machines/${virtualMachineId}/unregister`;
      if (provider.type === "orchestrator") {
        const vm = provider.virtualMachines.find(
          vm =>
            vm.ID.toLowerCase() === virtualMachineId.toLowerCase() ||
            vm.Name.toLowerCase() === virtualMachineId.toLowerCase()
        );
        if (!vm) {
          return reject("Virtual machine not found");
        }

        path = `${url}/api/v1/orchestrator/hosts/${vm.host_id}/machines/${virtualMachineId}/unregister`;
      }

      let error: any;
      const response = await axios
        .post(`${path}`, request, {
          headers: {
            Authorization: `Bearer ${auth?.token}`
          },
          timeout: 600000
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
          },
          timeout: 600000
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

      const version = await this.version();
      const canUseClient = compareSemanticVersions("0.8.6", version) > 0;

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

${request.client && canUseClient ? `CLIENT ${request.client}` : ""}
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
${request.description ? `DESCRIPTION ${request.description}` : ""}
${request.specs.cpu > 0 ? `MINIMUM_REQUIREMENT CPU ${request.specs?.cpu}` : ""}
${request.specs.memory > 0 ? `MINIMUM_REQUIREMENT MEMORY ${request.specs?.memory}` : ""}
${request.specs.disk > 0 ? `MINIMUM_REQUIREMENT DISK ${request.specs?.disk}` : ""}


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
    request: CatalogPullRequest,
    progress:
      | vscode.Progress<{
          message?: string;
          increment?: number;
        }>
      | undefined = undefined
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

      const errorMessages: string[] = [];
      let totalDownloaded = 0;
      if (!path) {
        return reject("Error generating pull file");
      }
      const execPath = Provider.getCache().get(FLAG_DEVOPS_PATH);
      const cmd = spawn(execPath, ["pull", path]);

      cmd.stdout.on("data", data => {
        const lines: string[] = (data.toString() as string).split("\n");
        for (const line of lines) {
          // logging error messages
          const linesToAdd: string[] = [];
          if (line.toLowerCase().startsWith("error")) {
            const subLines = line.split(":");
            if (subLines.length > 1) {
              const subLine = subLines[1];
              if (subLine == undefined || subLine === "") {
                continue;
              }
              linesToAdd.push(subLine.trim());
            } else {
              linesToAdd.push(line.trim());
            }

            for (const errorLine of linesToAdd) {
              if (errorLine == undefined || errorLine === "") {
                continue;
              }
              errorMessages.push(errorLine.trim());
            }
          }
          // collecting special progress messages
          if (line.startsWith("\r\x1b[K\r")) {
            const subLines = line.split("\r\x1b[K\r");
            for (const subLine of subLines) {
              if (subLine == undefined || subLine === "") {
                continue;
              }
              console.log(subLine);
              if (line.includes("Downloading")) {
                const parts = subLine.split(": ");
                if (parts.length === 2) {
                  if (parts[0].startsWith("Downloading")) {
                    if (progress !== undefined) {
                      const percentage = Number(parts[1].split(" ")[0].replace("%", ""));
                      if (percentage === 0 && totalDownloaded === 0) {
                        progress.report({message: parts[0], increment: 0});
                      }
                      if (percentage > totalDownloaded) {
                        const differenceToIncrement = percentage - totalDownloaded;
                        totalDownloaded = percentage;
                        progress.report({message: parts[0], increment: differenceToIncrement});
                      }
                    }
                  }
                }
              } else {
                console.log(subLine);
                if (progress !== undefined) {
                  progress.report({message: subLine});
                }
              }
            }
          }
        }

        LogService.info(data.toString(), "DevOpsService");
      });

      cmd.stderr.on("data", data => {
        LogService.error(data.toString(), "DevOpsService");
      });

      cmd.on("close", code => {
        // fs.unlinkSync(path);
        if (code !== 0) {
          LogService.error(`prldevops pull exited with code ${code}`, "DevOpsService");
          if (errorMessages.length > 0) {
            return reject(errorMessages.join("\n"));
          }
          return reject(`prldevops pull exited with code ${code}`);
        }
        LogService.info(`Manifest ${request.catalog_id} pulled from provider ${provider.name}`, "DevOpsService");
        if (progress !== undefined) {
          progress.report({message: "Download complete", increment: 100});
        }
        return resolve();
      });
    });
  }

  static async pushManifestFromCatalogProvider(
    provider: DevOpsCatalogHostProvider,
    request: CatalogPushRequest,
    progress:
      | vscode.Progress<{
          message?: string;
          increment?: number;
        }>
      | undefined = undefined
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

      let totalDownloaded = 0;
      const path = await this.generatePushPDFile(provider, request).catch(err => {
        return reject(err);
      });

      if (!path) {
        return reject("Error generating push file");
      }

      const execPath = Provider.getCache().get(FLAG_DEVOPS_PATH);
      const cmd = spawn(execPath, ["push", path]);

      cmd.stdout.on("data", data => {
        const lines: string[] = (data.toString() as string).split("\n");
        for (const line of lines) {
          if (line.startsWith("\r\x1b[K\r")) {
            const subLines = line.split("\r\x1b[K\r");
            for (const subLine of subLines) {
              if (subLine == undefined || subLine === "") {
                continue;
              }
              console.log(subLine);
              if (line.includes("Uploading")) {
                const parts = subLine.split(": ");
                if (parts.length === 2) {
                  if (parts[0].startsWith("Uploading")) {
                    if (progress !== undefined) {
                      const percentage = Number(parts[1].split(" ")[0].replace("%", ""));
                      if (percentage === 0 && totalDownloaded === 0) {
                        progress.report({message: parts[0], increment: 0});
                      }
                      if (percentage > totalDownloaded) {
                        const differenceToIncrement = percentage - totalDownloaded;
                        totalDownloaded = percentage;
                        progress.report({message: parts[0], increment: differenceToIncrement});
                      }
                    }
                  }
                }
              } else {
                console.log(subLine);
                if (progress !== undefined) {
                  progress.report({message: subLine});
                }
              }
            }
          }
        }
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
          },
          timeout: 600000
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
          },
          timeout: 18000000 // 5 hours
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

  static async getHostCatalogCache(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    hostId = ""
  ): Promise<CatalogCacheResponse> {
    return new Promise(async (resolve, reject) => {
      if (provider === undefined) {
        return reject("Provider is required");
      }

      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/catalog/cache`;

      if ("type" in provider) {
        if (provider.type === "orchestrator") {
          if (!hostId) {
            return reject("Host ID is required");
          }

          path = `${url}/api/v1/orchestrator/hosts/` + hostId + `/catalog/cache`;
        }
      }

      let error: any;
      const response = await axios
        .get<CatalogCacheResponse>(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
            "X-LOGGING": "IGNORE"
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

  static async clearHostCatalogCache(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    hostId = "",
    catalogId = "",
    versionId = ""
  ): Promise<CatalogCacheResponse> {
    return new Promise(async (resolve, reject) => {
      if (provider === undefined) {
        return reject("Provider is required");
      }

      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let path = `${url}/api/v1/catalog/cache`;

      if ("type" in provider) {
        if (provider.type === "orchestrator") {
          if (!hostId) {
            return reject("Host ID is required");
          }

          path = `${url}/api/v1/orchestrator/hosts/` + hostId + `/catalog/cache`;
        }
      }
      if (catalogId) {
        path += `/${catalogId}`;
      }
      if (versionId) {
        path += `/${versionId}`;
      }

      let error: any;
      const response = await axios
        .delete(`${path}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
            "X-LOGGING": "IGNORE"
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (response?.status !== 202) {
        return reject(response?.statusText);
      }

      return !response ? reject(error) : resolve(response?.data);
    });
  }

  static async getRemoteHostReverseProxy(
    provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined,
    hostId = ""
  ): Promise<DevOpsReverseProxy> {
    return new Promise(async (resolve, reject) => {
      const response: DevOpsReverseProxy = {};
      if (provider === undefined) {
        return reject("Provider is required");
      }

      const url = await this.getHostUrl(provider).catch(err => {
        return reject(err);
      });
      const auth = await this.authorize(provider).catch(err => {
        return reject(err);
      });

      let configPath = `${url}/api/v1/reverse-proxy`;

      if ("type" in provider) {
        if (provider.type === "orchestrator") {
          if (!hostId) {
            return reject("Host ID is required");
          }

          configPath = `${url}/api/v1/orchestrator/hosts/` + hostId + `/reverse-proxy`;
        }
      }

      let error: any;
      const rpConfigResponse = await axios
        .get<ReverseProxyConfig>(`${configPath}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
            "X-LOGGING": "IGNORE"
          }
        })
        .catch(err => {
          error = err;
          return reject(err);
        });

      if (rpConfigResponse?.status !== 200) {
        return reject(rpConfigResponse?.statusText);
      }

      if (!rpConfigResponse) {
        return reject(error);
      }

      response.reverse_proxy_config = rpConfigResponse.data;

      let hostPath = `${url}/api/v1/reverse-proxy/hosts`;

      if ("type" in provider) {
        if (provider.type === "orchestrator") {
          if (!hostId) {
            return reject("Host ID is required");
          }

          hostPath = `${url}/api/v1/orchestrator/hosts/` + hostId + `/reverse-proxy/hosts`;
        }
      }

      let hostError: any;
      const rpHostsResponse = await axios
        .get<DevOpsRemoteHostReverseProxyHost[]>(`${hostPath}`, {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
            "X-LOGGING": "IGNORE"
          }
        })
        .catch(err => {
          hostError = err;
          return reject(err);
        });

      if (rpHostsResponse?.status !== 200) {
        return reject(rpHostsResponse?.statusText);
      }

      if (!rpHostsResponse) {
        return reject(hostError);
      }
      response.reverse_proxy_hosts = rpHostsResponse.data;
      return resolve(response);
    });
  }
}
