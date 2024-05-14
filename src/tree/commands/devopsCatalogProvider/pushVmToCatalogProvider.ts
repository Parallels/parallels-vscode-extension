import * as vscode from "vscode";

import { DevOpsCatalogProvider } from '../../devops_catalog/devops_catalog';
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, FLAG_DEVOPS_CATALOG_HAS_ITEMS, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsCatalogCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { ANSWER_YES, YesNoQuestion } from '../../../helpers/ConfirmDialog';
import { DevOpsCatalogTreeItem } from '../../devops_catalog/devops_catalog_tree_item';
import { ParallelsDesktopService } from '../../../services/parallelsDesktopService';
import { HelperService } from '../../../services/helperService';
import { VirtualMachine } from '../../../models/parallels/virtualMachine';
import { CatalogPushRequest } from '../../../models/devops/catalogPushRequest';
import { cleanString } from "../../../helpers/strings";

const registerDevOpsPushVmToCatalogProviderManifestCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsPushVmToCatalogProviderManifest, async (item: DevOpsCatalogTreeItem) => {
      if (!item) {
        return;
      }
      if (!(await DevOpsService.isInstalled())) {
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
      
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const architecture = await HelperService.getArchitecture();
      const provider = config.findCatalogProviderByIOrName(providerId);
      if (!provider) {
        vscode.window.showErrorMessage(`Provider ${item.name} not found`);
        return;
      }

      let localMachines: VirtualMachine[] = [];
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Getting virtual Machines`
      }, async () => {

        localMachines = config.allMachines.filter(m => m.State === 'stopped');
        if (localMachines.length === 0) {
          vscode.window.showErrorMessage('No local machines found');
          return;
        }
      });

      const vms: vscode.QuickPickItem[] = localMachines.map(vm => (
        {
          label: vm.Name,
          description: vm.Description,
          detail: vm.ID
        }
      ));
      vms.sort((a, b) => a.label.localeCompare(b.label));
      vms.push({ label: 'Local Virtual Machine', description: 'Virtual Machine from path' });

      const selectedVm = await vscode.window.showQuickPick(vms, {
        placeHolder: 'Select the local machine to push',
        ignoreFocusOut: true
      });

      if (!selectedVm) {
        return;
      }
      let machinePath = '';

      if (selectedVm.label === 'Local Virtual Machine') {
        const vmPath = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Select the virtual machine',
          filters: {
            'Virtual Machines': ['pvm', "macvm"]
          }
        });

        if (!vmPath) {
          return;
        }

        machinePath = vmPath[0].fsPath;
      } else {
        const vm = await ParallelsDesktopService.getVmPath(selectedVm.detail?.toString() ?? '');
        machinePath = vm.Home;
        machinePath = machinePath.slice(0, machinePath.lastIndexOf('/'));
      }
      let catalogId = await vscode.window.showInputBox({
        placeHolder: 'Enter the catalog id',
        ignoreFocusOut: true
      });

      if (!catalogId) {
        return;
      }

      const version = await vscode.window.showInputBox({
        placeHolder: 'Enter the version',
        ignoreFocusOut: true,
        value: 'latest'
      });

      catalogId = cleanString(catalogId).toLowerCase();

      //remote providers
      const remoteProviders: vscode.QuickPickItem[] = []
      if ((await DevOpsService.getHostUrl(provider)).indexOf('localhost') !== -1) {
        remoteProviders.push({ label: 'Local Storage', description: 'Local Storage' });
      }
      remoteProviders.push({ label: 'AWS', description: 'Amazon S3 Bucket' });
      remoteProviders.push({ label: 'Azure', description: 'Azure Blob Storage' });
      remoteProviders.push({ label: 'Artifactory', description: 'JFrog Artifactory' });

      const selectedRemoteProvider = await vscode.window.showQuickPick(remoteProviders, {
        placeHolder: 'Select the remote provider to push',
        ignoreFocusOut: true
      });

      let providerConnectionString = '';
      switch (selectedRemoteProvider?.label) {
        case 'Local Storage': {
          providerConnectionString = await generateLocalStorageProviderConnectionString();
          break;
        }
        case 'AWS': {
          providerConnectionString = await generateAwsS3ProviderConnectionString();
          break;
        }
        case 'Azure': {
          providerConnectionString = await generateAzureProviderConnectionString();
          break;
        }
        case 'Artifactory': {
          providerConnectionString = await generateArtifactoryProviderConnectionString();
          break;
        }
        default:
          break;
      }
      if (!providerConnectionString) {
        return;
      }

      const request: CatalogPushRequest = {
        catalog_id: catalogId,
        version: version ?? 'latest',
        architecture: architecture,
        connection: providerConnectionString,
        local_path: machinePath,
        required_roles: [],
        required_claims: []
      }

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Pushing machine ${request.local_path}`
      }, async () => {
        await DevOpsService.pushManifestFromCatalogProvider(provider, request).catch(reject => {
          LogService.error(`Error pulling manifest from provider ${provider.name}`, reject);
          vscode.window.showErrorMessage(`Error pulling manifest from provider ${provider.name}`);
        return;
        });

        vscode.window.showInformationMessage(`Machine ${request.local_path} pushed successfully`);
      });
    })
  );
};

async function generateLocalStorageProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const localPath = await vscode.window.showInputBox({
      placeHolder: 'Enter the local path to push the machine',
      ignoreFocusOut: true
    });
    if (!localPath) {
      resolve('');
    }

    const providerConnectionString = `provider=local-storage;catalog_path=${localPath}`;
    resolve(providerConnectionString);
  });
}

async function generateAwsS3ProviderConnectionString(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const bucketName = await vscode.window.showInputBox({
      placeHolder: 'Enter the bucket name',
      ignoreFocusOut: true
    });
    if (!bucketName) {
      return;
    }
    const region = await vscode.window.showInputBox({
      placeHolder: 'Enter the region',
      ignoreFocusOut: true
    });
    if (!region) {
      return;
    }
    const accessKey = await vscode.window.showInputBox({
      placeHolder: 'Enter the access key',
      ignoreFocusOut: true,
      password: true
    });
    if (!accessKey) {
      return;
    }
    const secretKey = await vscode.window.showInputBox({
      placeHolder: 'Enter the secret key',
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
      placeHolder: 'Enter the container name',
      ignoreFocusOut: true
    });
    if (!containerName) {
      return;
    }
    const storageAccountName = await vscode.window.showInputBox({
      placeHolder: 'Enter the storage account name',
      ignoreFocusOut: true
    });
    if (!storageAccountName) {
      return;
    }
    const storageAccountKey = await vscode.window.showInputBox({
      placeHolder: 'Enter the storage account key',
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
      placeHolder: 'Enter the url',
      ignoreFocusOut: true
    });
    if (!url) {
      return;
    }
    const port = await vscode.window.showInputBox({
      placeHolder: 'Enter the port, press enter to use default port',
      ignoreFocusOut: true,
      value: url.startsWith('http') ? '80' : '443'
    });
    const repository = await vscode.window.showInputBox({
      placeHolder: 'Enter the repository',
      ignoreFocusOut: true
    });
    if (!repository) {
      return;
    }
    const accessKey = await vscode.window.showInputBox({
      placeHolder: 'Enter the access key',
      ignoreFocusOut: true,
      password: true
    });
    if (!accessKey) {
      return;
    }

    const providerConnectionString = `provider=artifactory;url=${url};${port !== '' ? `port=${port}` : ""};repo=${repository};access_key=${accessKey}`;
    resolve(providerConnectionString);
  });
}


export const DevOpsPushVmToCatalogProviderManifestCommand: DevOpsCatalogCommand = {
  register: registerDevOpsPushVmToCatalogProviderManifestCommand
};
