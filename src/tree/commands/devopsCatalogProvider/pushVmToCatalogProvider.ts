import * as vscode from "vscode";

import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {HelperService} from "../../../services/helperService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {CatalogPushRequest} from "../../../models/devops/catalogPushRequest";
import {cleanString} from "../../../helpers/strings";
import {DevOpsRolesAndClaims} from "../../../models/devops/rolesAndClaims";
import {TELEMETRY_DEVOPS_CATALOG} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";
import {cp} from "fs";
import path from "path";

const registerDevOpsPushVmToCatalogProviderManifestCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CommandsFlags.devopsPushVmToCatalogProviderManifest,
      async (item: DevOpsTreeItem) => {
        const telemetry = Provider.telemetry();
        telemetry.sendOperationEvent(TELEMETRY_DEVOPS_CATALOG, "PUSH_CATALOG_COMMAND_CLICK");
        if (!item) {
          return;
        }

        if (!(await DevOpsService.isInstalled())) {
          const options: string[] = [];
          if (Provider.getOs() === "darwin" || Provider.getOs() === "linux") {
            options.push("Install Parallels Desktop DevOps Service");
          }
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
              return;
            case "Install Parallels Desktop DevOps Service": {
              const ok = await DevOpsService.install();
              if (!ok) {
                vscode.window.showErrorMessage(`Error installing Parallels Desktop DevOps Service`);
                return;
              }
              break;
            }
            case "Download Parallels Desktop DevOps Service":
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse("https://github.com/Parallels/prl-devops-service/releases")
              );
              return;
          }
        }

        if (!(await DevOpsService.isInstalled())) {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, "Could not find Parallels Desktop DevOps Service");
          return;
        }

        const config = Provider.getConfiguration();
        const providerId = item.id.split("%%")[0];
        const architecture = await HelperService.getArchitecture();
        const provider = config.findCatalogProviderByIOrName(providerId);
        if (!provider) {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Provider ${item.name} not found`);
          return;
        }

        let localMachines: VirtualMachine[] = [];
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Getting virtual Machines`
          },
          async () => {
            localMachines = config.allMachines.filter(m => m.State === "stopped");
            if (localMachines.length === 0) {
              ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, "No local machines found");
              return;
            }
          }
        );

        const vms: vscode.QuickPickItem[] = localMachines.map(vm => ({
          label: vm.Name,
          description: vm.Description,
          detail: vm.ID
        }));
        vms.sort((a, b) => a.label.localeCompare(b.label));
        vms.push({label: "Local Virtual Machine", description: "Virtual Machine from path"});

        const selectedVm = await vscode.window.showQuickPick(vms, {
          placeHolder: "Select the local machine to push",
          ignoreFocusOut: true
        });

        if (!selectedVm) {
          return;
        }
        let machinePath = "";
        const specs = {
          cpu: 0,
          memory: 0,
          disk: 0
        };

        if (selectedVm.label === "Local Virtual Machine") {
          const vmPath = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "Select the virtual machine",
            filters: {
              "Virtual Machines": ["pvm", "macvm"]
            }
          });

          if (!vmPath) {
            return;
          }

          machinePath = vmPath[0].fsPath;
          const machineConfig = await ParallelsDesktopService.getVmConfigFromPath(path.join(machinePath, "config.pvs"));
          if (machineConfig) {
            specs.cpu = machineConfig.ParallelsVirtualMachine.Hardware.Cpu.Number;
            specs.memory = machineConfig.ParallelsVirtualMachine.Hardware.Memory.RAM;
            specs.disk = machineConfig.ParallelsVirtualMachine.Hardware.Hdd.Size;
          }
        } else {
          const vm = await ParallelsDesktopService.getVmPath(selectedVm.detail?.toString() ?? "");
          machinePath = vm.Home;
          machinePath = machinePath.slice(0, machinePath.lastIndexOf("/"));
          specs.cpu = vm.Hardware.cpu.cpus;
          specs.memory = Number.parseInt(vm.Hardware.memory.size);
          specs.disk = Number.parseInt(vm.Hardware.hdd0.size);
        }

        let catalogId = await vscode.window.showInputBox({
          placeHolder: "Enter the catalog id",
          ignoreFocusOut: true
        });

        if (!catalogId) {
          return;
        }

        const version = await vscode.window.showInputBox({
          placeHolder: "Enter the version",
          ignoreFocusOut: true,
          value: "latest"
        });

        catalogId = cleanString(catalogId).toLowerCase();

        const name = await vscode.window.showInputBox({
          placeHolder: "Enter the catalog name",
          ignoreFocusOut: true
        });

        if (name && !/^[a-zA-Z0-9_-\s]+$/.test(name)) {
          vscode.window.showErrorMessage(
            "Catalog name can only contain alphanumeric characters, underscores, spaces and hyphens."
          );
          return;
        }

        //remote providers
        const remoteProviders: vscode.QuickPickItem[] = [];
        if ((await DevOpsService.getHostUrl(provider)).indexOf("localhost") !== -1) {
          remoteProviders.push({label: "Local Storage", description: "Local Storage"});
        }
        remoteProviders.push({label: "AWS", description: "Amazon S3 Bucket"});
        remoteProviders.push({label: "Azure", description: "Azure Blob Storage"});
        remoteProviders.push({label: "Artifactory", description: "JFrog Artifactory"});

        const selectedRemoteProvider = await vscode.window.showQuickPick(remoteProviders, {
          placeHolder: "Select the remote provider to push",
          ignoreFocusOut: true
        });

        let providerConnectionString = "";
        switch (selectedRemoteProvider?.label) {
          case "Local Storage": {
            providerConnectionString = await generateLocalStorageProviderConnectionString();
            break;
          }
          case "AWS": {
            providerConnectionString = await generateAwsS3ProviderConnectionString();
            break;
          }
          case "Azure": {
            providerConnectionString = await generateAzureProviderConnectionString();
            break;
          }
          case "Artifactory": {
            providerConnectionString = await generateArtifactoryProviderConnectionString();
            break;
          }
          default:
            break;
        }
        if (!providerConnectionString) {
          return;
        }

        const existingClaims =
          provider.claims?.map((claim: DevOpsRolesAndClaims) => {
            return {
              label: claim.name
            };
          }) ?? [];
        const existingRoles =
          provider.roles?.map((role: DevOpsRolesAndClaims) => {
            return {
              label: role.name
            };
          }) ?? [];

        const selectedClaims = await vscode.window.showQuickPick(existingClaims, {
          placeHolder: `Select the claims to add to the catalog manifest ${catalogId}`,
          canPickMany: true
        });

        const selectedRoles = await vscode.window.showQuickPick(existingRoles, {
          placeHolder: `Select the roles to add to the catalog manifest ${catalogId}`,
          canPickMany: true
        });

        const tagsInput = await vscode.window.showInputBox({
          placeHolder: "Enter Tags separated by comma",
          ignoreFocusOut: true,
          value: `latest${version ? `,${version}` : ""}`
        });

        const tags = tagsInput?.split(",").map(t => t.trim()) ?? [];

        const request: CatalogPushRequest = {
          catalog_id: catalogId,
          version: version ?? "latest",
          architecture: architecture,
          description: name ?? "",
          connection: providerConnectionString,
          local_path: machinePath,
          required_roles: selectedRoles?.map(r => r.label) ?? [],
          required_claims: selectedClaims?.map(c => c.label) ?? [],
          tags: tags,
          specs: {
            cpu: specs.cpu,
            memory: specs.memory,
            disk: specs.disk
          }
        };

        if (request.required_roles.length === 0) {
          if (provider.user) {
            const roles = provider.user?.roles ?? [];
            request.required_roles.push(...roles);
          } else {
            request.required_roles.push("USER");
          }
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `${request.description ?? request.catalog_id} ${request.version}`
          },
          async progress => {
            progress.report({
              message: `Getting ready to push to ${provider.name}`
            });
            let foundError = false;
            await DevOpsService.pushManifestFromCatalogProvider(provider, request, progress).catch(reject => {
              LogService.error(`Error pushing manifest from provider ${provider.name}`, reject);
              ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Error pushing manifest from provider ${provider.name}`, true);
              foundError = true;
              return;
            });

            if (foundError) {
              return;
            }

            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);

            vscode.window.showInformationMessage(`Machine ${request.local_path} pushed successfully`);
          }
        );
      }
    )
  );
};

async function generateLocalStorageProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const localPath = await vscode.window.showInputBox({
      placeHolder: "Enter the local path to push the machine",
      ignoreFocusOut: true
    });
    if (!localPath) {
      resolve("");
    }

    const providerConnectionString = `provider=local-storage;catalog_path=${localPath}`;
    resolve(providerConnectionString);
  });
}

async function generateAwsS3ProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const bucketName = await vscode.window.showInputBox({
      placeHolder: "Enter the bucket name",
      ignoreFocusOut: true
    });
    if (!bucketName) {
      return;
    }
    const region = await vscode.window.showInputBox({
      placeHolder: "Enter the region",
      ignoreFocusOut: true
    });
    if (!region) {
      return;
    }
    const accessKey = await vscode.window.showInputBox({
      placeHolder: "Enter the access key",
      ignoreFocusOut: true,
      password: true
    });
    if (!accessKey) {
      return;
    }
    const secretKey = await vscode.window.showInputBox({
      placeHolder: "Enter the secret key",
      ignoreFocusOut: true,
      password: true
    });

    const providerConnectionString = `provider=aws-s3;bucket=${bucketName};region=${region};access_key=${accessKey};secret_key=${secretKey}`;
    resolve(providerConnectionString);
  });
}

async function generateAzureProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const containerName = await vscode.window.showInputBox({
      placeHolder: "Enter the container name",
      ignoreFocusOut: true
    });
    if (!containerName) {
      return;
    }
    const storageAccountName = await vscode.window.showInputBox({
      placeHolder: "Enter the storage account name",
      ignoreFocusOut: true
    });
    if (!storageAccountName) {
      return;
    }
    const storageAccountKey = await vscode.window.showInputBox({
      placeHolder: "Enter the storage account key",
      ignoreFocusOut: true,
      password: true
    });
    if (!storageAccountKey) {
      return;
    }

    const providerConnectionString = `provider=azure-storage-account;container_name=${containerName};storage_account_name=${storageAccountName};storage_account_key=${storageAccountKey}`;
    resolve(providerConnectionString);
  });
}

async function generateArtifactoryProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const url = await vscode.window.showInputBox({
      placeHolder: "Enter the url",
      ignoreFocusOut: true
    });
    if (!url) {
      return;
    }
    const port = await vscode.window.showInputBox({
      placeHolder: "Enter the port, press enter to use default port",
      ignoreFocusOut: true,
      value: url.startsWith("http") ? "80" : "443"
    });
    const repository = await vscode.window.showInputBox({
      placeHolder: "Enter the repository",
      ignoreFocusOut: true
    });
    if (!repository) {
      return;
    }
    const accessKey = await vscode.window.showInputBox({
      placeHolder: "Enter the access key",
      ignoreFocusOut: true,
      password: true
    });
    if (!accessKey) {
      return;
    }

    const providerConnectionString = `provider=artifactory;url=${url};${
      port !== "" ? `port=${port}` : ""
    };repo=${repository};access_key=${accessKey}`;
    resolve(providerConnectionString);
  });
}

export const DevOpsPushVmToCatalogProviderManifestCommand: DevOpsCatalogCommand = {
  register: registerDevOpsPushVmToCatalogProviderManifestCommand
};
