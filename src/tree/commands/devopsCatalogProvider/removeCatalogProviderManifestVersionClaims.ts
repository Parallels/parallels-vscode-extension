import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {TELEMETRY_DEVOPS_CATALOG} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsRemoveClaimFromCatalogProviderManifestVersionCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CommandsFlags.devopsRemoveClaimFromCatalogProviderManifestVersion,
      async (item: any) => {
        const telemetry = Provider.telemetry();
        telemetry.sendOperationEvent(
          TELEMETRY_DEVOPS_CATALOG,
          "REMOVE_CATALOG_PROVIDER_MANIFEST_VERSION_CLAIM_COMMAND_CLICK"
        );
        if (!item) {
          return;
        }

        const config = Provider.getConfiguration();
        const providerId = item.id.split("%%")[0];
        const provider = config.findCatalogProviderByIOrName(providerId);
        if (!provider) {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Provider ${item.name} not found`);
          return;
        }
        const manifestId = item.id.split("%%")[2];
        const manifest = config.findCatalogProviderManifest(providerId, manifestId);
        if (!manifest) {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Manifest ${item.name} not found`);
          return;
        }
        const versionId = item.id.split("%%")[3];
        const manifestItem = manifest.items.find(m => m.id === versionId);
        if (!manifestItem) {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Manifest ${item.name} not found`);
          return;
        }

        const confirmation = await YesNoQuestion(
          `Are you sure you want to remove ${item.name} claim from catalog manifest ${manifestItem.catalog_id}?`
        );

        if (confirmation !== ANSWER_YES) {
          return;
        }

        const claims: string[] = [];
        claims.push(item.name);

        DevOpsService.testHost(provider)
          .then(async () => {
            let foundError = false;
            await DevOpsService.removeCatalogManifestClaims(
              provider,
              manifest.name,
              manifestItem.version,
              manifestItem.architecture,
              claims
            ).catch(() => {
              ShowErrorMessage(
                TELEMETRY_DEVOPS_CATALOG,
                `Failed to remove claim ${claims.join(",")} from the catalog manifest ${
                  manifestItem.catalog_id
                } version ${manifestItem.version} for ${manifestItem.architecture}`,
                true
              );

              foundError = true;
              return;
            });

            if (foundError) {
              return;
            }

            vscode.window.showInformationMessage(
              `Claim ${claims.join(",")} was removed successfully from the catalog manifest ${
                manifestItem.catalog_id
              } version ${manifestItem.version} for ${manifestItem.architecture}`
            );
            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          })
          .catch(error => {
            ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Failed to connect to catalog provider ${provider.name}`, true);
          });
      }
    )
  );
};

export const DevOpsRemoveClaimFromCatalogProviderManifestVersionCommand: DevOpsCatalogCommand = {
  register: registerDevOpsRemoveClaimFromCatalogProviderManifestVersionCommand
};
