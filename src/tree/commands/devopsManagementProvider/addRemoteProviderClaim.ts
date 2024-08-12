import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRolesAndClaimsCreateRequest} from "../../../models/devops/rolesAndClaims";
import {cleanString} from "../../../helpers/strings";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsManagementProviderAddClaimCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementAddClaim, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "ADD_PROVIDER_CLAIM_COMMAND_CLICK");
      if (!item) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const userId = item.id.split("%%")[3];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(providerId);
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(providerId);
      }
      if (!provider) {
        ShowErrorMessage(providerName, `Provider ${item.name} not found`);
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: `Claim Name?`,
        placeHolder: `Enter the Claim name, example EXAMPLE_CLAIM`,
        ignoreFocusOut: true
      });
      if (!name) {
        ShowErrorMessage(providerName, `Claim Name is required`);
        return;
      }

      const request: DevOpsRolesAndClaimsCreateRequest = {
        name: cleanString(name).toUpperCase()
      };

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.createRemoteHostClaim(provider, request).catch(() => {
            ShowErrorMessage(
              providerName,
              `Failed to add claim ${name} to the remote host ${provider?.name ?? "Unknown"}`,
              true
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Claim ${name} was added successfully to the remote host ${provider?.name ?? "Unknown"}`
          );
          if (item.className === "DevOpsRemoteHostProvider") {
            await DevOpsService.refreshRemoteHostProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          }
          if (item.className === "DevOpsCatalogHostProvider") {
            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          }
        })
        .catch(error => {
          ShowErrorMessage(
            providerName,
            `Failed to connect to Remote Host ${provider?.name ?? "Unknown"}, err:\n ${error}`,
            true
          );
        });
    })
  );
};

export const DevOpsManagementProviderAddClaimCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderAddClaimCommand
};
