import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";

const registerDevOpsManagementProviderRemoveUserRoleCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementRemoveUserRole, async (item: any) => {
      if (!item) {
        return;
      }
      const confirmation = await YesNoQuestion(`Are you sure you want to remove ${item.name} role from user?`);

      if (confirmation !== ANSWER_YES) {
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
        vscode.window.showErrorMessage(`Remote Host Provider User ${item.name} not found`);
        return;
      }

      const user = provider.users?.find(u => u.id === userId);
      if (!user) {
        vscode.window.showErrorMessage(`Remote Host Provider user ${item.name} not found`);
        return;
      }

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.removeRemoteHostUserRole(provider, userId, item.name).catch(() => {
            vscode.window.showErrorMessage(
              `Failed to remove role ${item.name} for user ${user.name} on the remote provider ${
                provider?.name ?? "Unknown"
              }`
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Role ${item.name} for user ${user.name} was deleted successfully on the remote provider ${
              provider?.name ?? "Unknown"
            }`
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
          vscode.window.showErrorMessage(`Failed to connect to Remote Host ${user.name}, err:\n ${error}`);
        });
    })
  );
};

export const DevOpsManagementProviderRemoveUserRoleCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderRemoveUserRoleCommand
};
