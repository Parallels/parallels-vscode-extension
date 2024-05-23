import {CatalogPullRequest} from "../../../models/devops/catalogPullRequest";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {HelperService} from "../../../services/helperService";

const registerDevOpsPullCatalogProviderManifestCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CommandsFlags.devopsPullCatalogManifestMachineOnHost,
      async (item: DevOpsTreeItem) => {
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
          vscode.window.showErrorMessage("Could not find Parallels Desktop DevOps Service");
          return;
        }

        const config = Provider.getConfiguration();
        const providerId = item.id.split("%%")[0];
        const architecture = await HelperService.getArchitecture();
        const provider = config.findCatalogProviderByIOrName(providerId);
        if (!provider) {
          vscode.window.showErrorMessage(`Provider ${item.name} not found`);
          return;
        }
        const manifestId = item.id.split("%%")[2];
        const manifest = config.findCatalogProviderManifest(providerId, manifestId);
        let version = "";
        // if we selected the manifest item, we need to get the versions and display them on a quick pick
        if (item.contextValue === "devops.catalog.manifest") {
          if (!manifest) {
            vscode.window.showErrorMessage(`Manifest ${item.name} not found`);
            return;
          }

          if (manifest?.items.length === 1) {
            version = manifest.items[0].version;
          } else {
            const versions: vscode.QuickPickItem[] = [];
            for (const item of manifest.items) {
              versions.push({label: item.version, description: item.description});
            }
            versions.sort((a, b) => a.label.localeCompare(b.label));
            const selectedVersion = await vscode.window.showQuickPick(versions, {
              placeHolder: `Select the version to pull`
            });
            if (!selectedVersion) {
              return;
            }
            version = selectedVersion.label;
          }
        } else {
          version = item.label?.toString() ?? "latest";
        }
        if (!version) {
          vscode.window.showErrorMessage(`Version is required`);
          return;
        }

        let architectureExists = false;
        for (const item of manifest?.items ?? []) {
          if (item.architecture.toLowerCase() === architecture.toLowerCase()) {
            architectureExists = true;
            break;
          }
        }

        if (!architectureExists) {
          vscode.window.showErrorMessage(`Your architecture ${architecture} not found in manifest ${manifestId}`);
          return;
        }

        const machineName = await vscode.window.showInputBox({
          placeHolder: `Enter the machine name you want to create`,
          prompt: `Machine name`
        });
        if (!machineName) {
          vscode.window.showErrorMessage(`Machine name is required`);
          return;
        }

        const info = await ParallelsDesktopService.getServerInfo();
        const defaultMachinePath = info["VM home"];
        const machinePath = await vscode.window.showInputBox({
          placeHolder: `Enter the machine path you want to create`,
          prompt: `Machine path`,
          value: defaultMachinePath
        });
        if (!machinePath) {
          vscode.window.showErrorMessage(`Machine path is required`);
          return;
        }

        const confirmation = await YesNoQuestion(`Do you want the machine ${machineName} to start after pull?`);

        const providerUrl = await DevOpsService.getHostUrl(provider);
        const request: CatalogPullRequest = {
          catalog_id: manifestId,
          version: version,
          architecture: architecture,
          machine_name: machineName,
          path: machinePath,

          connection: `host=${provider.username}:${provider.password}@${providerUrl}`,
          start_after_pull: confirmation === ANSWER_YES ? true : false
        };

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Pulling Manifest ${request.catalog_id} from provider ${provider.name}`
          },
          async () => {
            let foundError = false;
            await DevOpsService.pullManifestFromCatalogProvider(provider, request).catch(error => {
              LogService.error(`Error pulling manifest from provider ${provider.name}`, error);
              vscode.window.showErrorMessage(`Error pulling manifest from provider ${provider.name}`);
              foundError = true;
              return;
            });

            if (foundError) {
              return;
            }
            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);

            vscode.window.showInformationMessage(`Manifest ${manifestId} pulled from provider ${provider.name}`);
          }
        );
      }
    )
  );
};

export const DevOpsPullCatalogProviderManifestCommand: DevOpsCatalogCommand = {
  register: registerDevOpsPullCatalogProviderManifestCommand
};
