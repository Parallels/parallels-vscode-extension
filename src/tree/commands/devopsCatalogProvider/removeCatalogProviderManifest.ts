import * as vscode from "vscode";
import { DevOpsCatalogProvider } from '../../devops_catalog/devops_catalog';
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsCatalogCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { ANSWER_YES, YesNoQuestion } from '../../../helpers/ConfirmDialog';
import { DevOpsCatalogTreeItem } from '../../devops_catalog/devops_catalog_tree_item';


const registerDevOpsRemoveCatalogProviderManifestCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveCatalogProviderManifest, async (item: DevOpsCatalogTreeItem) => {
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const provider = config.findCatalogProviderByIOrName(providerId);
      if (!provider) {
        vscode.window.showErrorMessage(`Provider ${item.name} not found`);
        return;
      }
      const manifestId = item.id.split("%%")[1];
      const manifest = config.findCatalogProviderManifest(providerId, manifestId);
      if (!manifest) {
        vscode.window.showErrorMessage(`Manifest ${item.name} not found`);
        return;
      }

      let versionId = ''
      // if we selected the manifest item, we need to get the versions and display them on a quick pick
      if (item.contextValue === "devops.catalog.manifest.version") {
        versionId = item.id.split("%%")[2];
      }
      if (manifest.items.length === 1) {
        versionId = ''
      }

      const confirmation = await YesNoQuestion(
        `Are you sure you want to delete the catalog provider manifest${versionId !== '' ? ' version':''}? ${item.name}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deleting Manifest${versionId !== '' ? ' version':''} ${item.name} from provider ${provider.name}`
        },
        async () => {
          let foundError = false;
          await DevOpsService.removeCatalogManifest(provider, manifestId, versionId).catch((error) => {
            LogService.error(`Error removing manifest${versionId !== '' ? ' version':''} ${item.name} from provider ${provider.name}`, error);
            vscode.window.showErrorMessage(`Error removing manifest${versionId !== '' ? ' version':''} ${item.name} from provider ${provider.name}`);
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          vscode.window.showInformationMessage(`Manifest${versionId !== '' ? ' version':''} ${item.name} removed from provider ${provider.name}`);
        });
    })
  );
};

export const DevOpsRemoveCatalogProviderManifestCommand: DevOpsCatalogCommand = {
  register: registerDevOpsRemoveCatalogProviderManifestCommand
};
