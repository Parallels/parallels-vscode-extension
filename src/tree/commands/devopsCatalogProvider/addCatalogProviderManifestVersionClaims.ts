import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRolesAndClaims} from "../../../models/devops/rolesAndClaims";
import {TELEMETRY_DEVOPS_CATALOG} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsAddClaimsToCatalogProviderManifestVersionCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddClaimToCatalogProviderManifestVersion, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(
        TELEMETRY_DEVOPS_CATALOG,
        "ADD_CLAIMS_TO_CATALOG_PROVIDER_MANIFEST_VERSION_COMMAND_CLICK"
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

      let existingClaims = provider.claims?.map((claim: DevOpsRolesAndClaims) => {
        return {
          label: claim.name
        };
      });

      existingClaims =
        existingClaims?.filter(existingRoles => {
          return !manifestItem?.required_claims?.includes(existingRoles.label);
        }) ?? [];

      const selectedClaims = await vscode.window.showQuickPick(existingClaims, {
        placeHolder: `Select the claim to add to the catalog manifest ${manifestItem.catalog_id} version ${manifestItem.version} for ${manifestItem.architecture}`,
        canPickMany: true
      });

      const claims = selectedClaims?.map(claim => claim.label) ?? [];

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.addCatalogManifestClaims(
            provider,
            manifest.name,
            manifestItem.version,
            manifestItem.architecture,
            claims
          ).catch(() => {
            ShowErrorMessage(
              TELEMETRY_DEVOPS_CATALOG,
              `Failed to add claims ${claims.join(",")} to the catalog manifest ${manifestItem.catalog_id} version ${
                manifestItem.version
              } for ${manifestItem.architecture}`,
              true
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Claims ${claims.join(",")} was added successfully to the catalog manifest ${
              manifestItem.catalog_id
            } version ${manifestItem.version} for ${manifestItem.architecture}`
          );
          await DevOpsService.refreshCatalogProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        })
        .catch(error => {
          ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Failed to connect to catalog provider ${provider.name}`, true);
        });
    })
  );
};

export const DevOpsAddClaimsToCatalogProviderManifestVersionCommand: DevOpsCatalogCommand = {
  register: registerDevOpsAddClaimsToCatalogProviderManifestVersionCommand
};
