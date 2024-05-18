import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRolesAndClaims} from "../../../models/devops/rolesAndClaims";

const registerDevOpsAddTagsToCatalogProviderManifestVersionCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddTagToCatalogProviderManifestVersion, async (item: any) => {
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
      const manifestId = item.id.split("%%")[2];
      const manifest = config.findCatalogProviderManifest(providerId, manifestId);
      if (!manifest) {
        vscode.window.showErrorMessage(`Manifest ${item.name} not found`);
        return;
      }
      const versionId = item.id.split("%%")[3];
      const manifestItem = manifest.items.find(m => m.id === versionId);
      if (!manifestItem) {
        vscode.window.showErrorMessage(`Manifest ${item.name} not found`);
        return;
      }

      const tagsInput = await vscode.window.showInputBox({
        placeHolder: "Enter Tags separated by comma",
        ignoreFocusOut: true,
        value: "latest"
      });

      const tags = tagsInput?.split(",").map(t => t.trim()) ?? [];

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.addCatalogManifestTags(
            provider,
            manifest.name,
            manifestItem.version,
            manifestItem.architecture,
            tags
          ).catch(() => {
            vscode.window.showErrorMessage(
              `Failed to add tags ${tags.join(",")} to the catalog manifest ${manifestItem.catalog_id} version ${
                manifestItem.version
              } for ${manifestItem.architecture}`
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Tags ${tags.join(",")} was added successfully to the catalog manifest ${manifestItem.catalog_id} version ${
              manifestItem.version
            } for ${manifestItem.architecture}`
          );
          await DevOpsService.refreshCatalogProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        })
        .catch(error => {
          vscode.window.showErrorMessage(`Failed to connect to Remote Host ${provider.name}, err:\n ${error}`);
        });
    })
  );
};

export const DevOpsAddTagsToCatalogProviderManifestVersionCommand: DevOpsCatalogCommand = {
  register: registerDevOpsAddTagsToCatalogProviderManifestVersionCommand
};
