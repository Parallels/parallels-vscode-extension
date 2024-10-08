import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {CreateCatalogMachine} from "../../../models/devops/createCatalogMachine";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsPullCatalogManifestMachineOnHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CommandsFlags.devopsPullCatalogManifestMachineOnRemoteHost,
      async (item: DevOpsTreeItem) => {
        const telemetry = Provider.telemetry();
        telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "PULL_CATALOG_MANIFEST_MACHINE_ON_HOST_COMMAND_CLICK");
        if (!item) {
          return;
        }

        const config = Provider.getConfiguration();
        const providerId = item.id.split("%%")[1];
        const provider = config.findRemoteHostProviderById(providerId);

        let pickupManualCatalogProvider = false;
        let catalogProviderId = "";
        let catalogHostProvider: DevOpsCatalogHostProvider;

        if (!provider) {
          ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Provider ${item.name} not found`);
          return;
        }
        if (config.catalogProviders.length > 0) {
          const providerItems = config.catalogProviders.map(provider => {
            return {label: provider.name, description: provider.host, id: provider.ID};
          });

          providerItems.push({label: "Other", description: "Add Other provider", id: "other"});
          const selectedProvider = await vscode.window.showQuickPick(providerItems, {
            placeHolder: `Select the catalog provider to pull the manifest from`
          });
          if (!selectedProvider) {
            return;
          }

          if (selectedProvider.id === "other") {
            pickupManualCatalogProvider = true;
          } else {
            catalogProviderId = selectedProvider.id;
          }
        } else {
          pickupManualCatalogProvider = true;
        }

        if (pickupManualCatalogProvider) {
          let host = await vscode.window.showInputBox({
            prompt: "Catalog Provider Host?",
            placeHolder: "Enter the Catalog Provider Host, example http://localhost:8080",
            ignoreFocusOut: true
          });
          if (!host) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Catalog Provider Host is required`);
            return;
          }
          if (!host.startsWith("http://") && !host.startsWith("https://")) {
            host = `https://${host}`;
          }

          catalogHostProvider = {
            class: "DevOpsCatalogHostProvider",
            ID: "temp",
            rawHost: host ?? "",
            name: "",
            username: "",
            password: "",
            state: "unknown",
            manifests: []
          };

          let hostname: URL;
          try {
            hostname = new URL(host);
          } catch (error) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, "Invalid Catalog Provider Host");
            return;
          }

          catalogHostProvider.host = hostname.hostname;
          catalogHostProvider.port = parseInt(hostname.port);
          catalogHostProvider.scheme = hostname.protocol.replace(":", "");

          let retry = 3;
          let foundError = false;
          while (true) {
            const username = await vscode.window.showInputBox({
              prompt: "Catalog Provider Username?",
              placeHolder: "Enter the Catalog Provider Username",
              ignoreFocusOut: true
            });
            if (!username) {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Catalog Provider Username is required`);
              return;
            }

            const password = await vscode.window.showInputBox({
              prompt: "Catalog Provider Password?",
              placeHolder: "Enter the Catalog Provider Password",
              password: true,
              ignoreFocusOut: true
            });
            if (!password) {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Catalog Provider Password is required`);
              return;
            }

            catalogHostProvider.username = username;
            catalogHostProvider.password = password;

            const auth = await DevOpsService.authorize(catalogHostProvider).catch(error => {
              foundError = true;
            });
            if (auth && auth.token && !foundError) {
              break;
            }
            if (!auth || !foundError) {
              foundError = true;
            }

            if (retry === 0) {
              break;
            }

            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to connect to catalog provider ${host}`);

            retry--;
          }
          if (foundError) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to connect to Catalog Provider ${host}, exiting`, true);
            return;
          }
        } else {
          catalogHostProvider =
            config.findCatalogProviderByIOrName(catalogProviderId) ?? ({} as DevOpsCatalogHostProvider);
        }

        const manifests = await DevOpsService.getCatalogManifests(catalogHostProvider).catch(error => {
          ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to get manifests from provider ${provider.name}`, true);
          return;
        });

        const manifestItems =
          manifests?.map(manifest => {
            const item = {
              label: manifest?.name,
              description: "",
              detail: ""
            };
            if (manifest.items.length == 1) {
              item.description = `${manifest.items[0].version} - ${manifest.items[0].architecture}`;
            }
            if (manifest.items.length > 0) {
              item.detail = `${manifest.items[0].description ? manifest.items[0].description : ""}`;
            }
            return item;
          }) ?? [];

        const manifestId = await vscode.window.showQuickPick(manifestItems, {
          placeHolder: `Select the manifest to pull`,
          ignoreFocusOut: true
        });
        if (!manifestId) {
          return;
        }
        const selectedManifest = manifests?.find(manifest => manifest.name === manifestId.label);

        const versions =
          selectedManifest?.items.map(item => {
            return {label: item.version, description: item.description};
          }) ?? [];

        let versionId = "";
        if (selectedManifest?.items.length === 1) {
          versionId = selectedManifest.items[0].version;
        } else {
          const selectedVersion = await vscode.window.showQuickPick(versions, {
            placeHolder: `Select the version to pull`
          });
          if (!selectedVersion) {
            return;
          }
          versionId = selectedVersion.label ?? "";
        }
        let architecture = "";
        if (item.type === "provider.remote_host.orchestrator") {
          const selectedArchitecture = await vscode.window.showQuickPick([{label: "x86_64"}, {label: "arm64"}], {
            placeHolder: `Select the architecture`,
            ignoreFocusOut: true
          });
          if (!selectedArchitecture) {
            return;
          }
          architecture = selectedArchitecture.label ?? "";
        } else {
          if (provider.hardwareInfo?.cpu_type) {
            architecture = provider.hardwareInfo.cpu_type;
          }
        }

        const machineName = await vscode.window.showInputBox({
          placeHolder: `Enter the machine name you want to create`,
          prompt: `Machine name`
        });
        if (!machineName) {
          ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Machine name is required`);
          return;
        }

        const startAfterPull = await YesNoQuestion(`Do you want the VM ${machineName} to start after pull?`);

        const providerUrl = await DevOpsService.getHostUrl(catalogHostProvider);
        const request: CreateCatalogMachine = {
          name: machineName ?? "unknown",
          start_on_create: startAfterPull === ANSWER_YES ? true : false,
          architecture: architecture,
          catalog_manifest: {
            catalog_id: selectedManifest?.name ?? "",
            version: versionId,
            connection: `host=${provider.username}:${provider.password}@${providerUrl}`
          }
        };

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Creating VM ${machineName} from catalog manifest ${selectedManifest?.name} for remote host ${provider.name}`
          },
          async () => {
            let foundError = false;
            await DevOpsService.createRemoteHostVmFromCatalog(provider, request).catch(error => {
              LogService.error(
                `Error creating VM ${machineName} from catalog manifest ${selectedManifest?.name} for remote host ${provider.name}`,
                error
              );
              ShowErrorMessage(
                TELEMETRY_DEVOPS_REMOTE,
                `Error creating VM ${machineName} from catalog manifest ${selectedManifest?.name} for remote host ${provider.name}`,
                true
              );
              foundError = true;
              return;
            });

            if (foundError) {
              return;
            }
            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);

            vscode.window.showInformationMessage(
              `VM ${machineName} created successfully on remote host ${provider.name}`
            );
          }
        );
      }
    )
  );
};

export const DevOpsPullCatalogManifestMachineOnHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsPullCatalogManifestMachineOnHostCommand
};
