import {CatalogPullRequest} from "../../../models/devops/catalogPullRequest";
import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {ParallelsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {HelperService} from "../../../services/helperService";
import {ParallelsCatalogProvider} from "../../parallelsCatalogProvider/parallelsCatalogProvider";
import {ShowErrorMessage} from "../../../helpers/error";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";
import {generateDevOpsClient} from "../../../helpers/DevOpsClient";
import {injectAppId} from "./injectAppId";

const registerParallelsCatalogPullCatalogManifestCommand = (
  context: vscode.ExtensionContext,
  provider: ParallelsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.parallelsCatalogPullCatalogManifest, async (item: DevOpsTreeItem) => {
      const telemetry = Provider.telemetry();
      const config = Provider.getConfiguration();
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "PULL_CATALOG_MANIFEST_COMMAND_CLICK");
      if (!item) {
        return;
      }
      if (config.isDownloadingCatalog(item.id)) {
        vscode.window.showInformationMessage(
          `${item.label ? `Manifest ${item.label}` : "VM"} is already being downloaded`
        );
        return;
      }
      if (!(await DevOpsService.isInstalled())) {
        const options: string[] = [];
        if (Provider.getOs() === "darwin" || Provider.getOs() === "linux") {
          options.push("Install Parallels Desktop DevOps Service");
        }
        options.push("Download Parallels Desktop DevOps Service");
        const selection = await vscode.window.showInformationMessage(
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
        ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, "Could not find Parallels Desktop DevOps Service");
        return;
      }

      const providerId = item.id.split("%%")[0];
      const architecture = await HelperService.getArchitecture();
      const provider = config.parallelsCatalogProvider;
      if (!provider) {
        ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Provider ${item.name} not found`);
        return;
      }
      const manifestId = item.id.split("%%")[2];
      const manifest = provider.manifests.find(i => i.name === manifestId);
      let version = "";
      // if we selected the manifest item, we need to get the versions and display them on a quick pick
      if (item.contextValue === "devops.catalog.manifests.manifest") {
        if (!manifest) {
          ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Manifest ${item.name} not found`);
          return;
        }

        if (manifest?.items.length === 1) {
          version = manifest.items[0].version;
        } else {
          const versions: vscode.QuickPickItem[] = [];
          for (const item of manifest.items.filter(
            item => item.architecture.toLowerCase() === architecture.toLowerCase() && !item.revoked && !item.tainted
          )) {
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
        ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Version is required`);
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
        ShowErrorMessage(
          TELEMETRY_PARALLELS_CATALOG,
          `Your architecture ${architecture} not found in manifest ${manifestId}`
        );
        return;
      }

      const machineName = await vscode.window.showInputBox({
        placeHolder: `Enter the machine name you want to create`,
        prompt: `Machine name`,
        value: `${manifest?.description ? manifest.description : manifest?.name} ${version}`
      });
      if (!machineName) {
        ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Machine name is required`);
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
        ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Machine path is required`);
        return;
      }

      const providerUrl = await DevOpsService.getHostUrl(provider);

      const client = await generateDevOpsClient(manifestId, version);
      const request: CatalogPullRequest = {
        catalog_id: manifestId,
        version: version,
        architecture: architecture,
        machine_name: machineName,
        path: machinePath,
        connection: `host=${provider.username}:${provider.password}@${providerUrl}`,
        start_after_pull: true,
        client: client
      };

      config.addToDownloadCatalogs(item.id);
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `${manifest?.description ?? request.catalog_id}`
        },
        async progress => {
          progress.report({
            message: `Getting ready to pull from ${provider.name}`
          });
          let foundError = false;
          await DevOpsService.pullManifestFromCatalogProvider(provider, request, progress).catch(error => {
            LogService.error(`Error pulling manifest from provider ${provider.name}`, error);
            ShowErrorMessage(
              TELEMETRY_PARALLELS_CATALOG,
              `Error pulling manifest from provider ${provider.name}`,
              true
            );
            foundError = true;
            config.removeFromDownloadCatalogs(item.id);
            return;
          });

          if (foundError) {
            config.removeFromDownloadCatalogs(item.id);
            return;
          }
          progress.report({
            message: `Starting the virtual machine ${machineName}`
          });
          if (!(await injectAppId(`${manifestId}_${version}`, request.machine_name))) {
            ShowErrorMessage(TELEMETRY_PARALLELS_CATALOG, `Error starting the virtual machine`, true);
            config.removeFromDownloadCatalogs(item.id);
            return;
          }

          config.removeFromDownloadCatalogs(item.id);
          await DevOpsService.refreshCatalogProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);

          vscode.window.showInformationMessage(
            `Manifest ${manifest?.description ?? manifest?.name} created successfully`
          );
        }
      );
    })
  );
};

export const ParallelsCatalogPullCatalogManifestCommand: ParallelsCatalogCommand = {
  register: registerParallelsCatalogPullCatalogManifestCommand
};
