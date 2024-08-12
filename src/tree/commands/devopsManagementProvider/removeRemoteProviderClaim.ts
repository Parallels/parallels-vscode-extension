import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsManagementProviderRemoveClaimCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementRemoveClaim, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "REMOVE_PROVIDER_CLAIM_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const confirmation = await YesNoQuestion(`Are you sure you want to remove ${item.name} claim from the host?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const claimId = item.id.split("%%")[3];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(providerId);
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(providerId);
      }
      if (!provider) {
        ShowErrorMessage(providerName, `Remote Host Provider User ${item.name} not found`);
        return;
      }

      const claim = provider.claims?.find(u => u.id === claimId);
      if (!claim) {
        ShowErrorMessage(providerName, `Remote Host Provider claim ${item.name} not found`);
        return;
      }

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.removeRemoteHostClaim(provider, claimId).catch(() => {
            ShowErrorMessage(
              providerName,
              `Failed to remove claim ${item.name} from the remote provider ${provider?.name ?? "Unknown"}`,
              true
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Claim ${item.name} was deleted successfully from the remote provider ${provider?.name ?? "Unknown"}`
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
          ShowErrorMessage(providerName, `Failed to connect to Remote Host ${claim.name}, err:\n ${error}`, true);
        });
    })
  );
};

export const DevOpsManagementProviderRemoveClaimCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderRemoveClaimCommand
};
