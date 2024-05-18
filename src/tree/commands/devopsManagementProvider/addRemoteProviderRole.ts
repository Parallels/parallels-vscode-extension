import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRolesAndClaims, DevOpsRolesAndClaimsCreateRequest} from "../../../models/devops/rolesAndClaims";
import {cleanString} from "../../../helpers/strings";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";

const registerDevOpsManagementProviderAddRoleCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementAddRole, async (item: any) => {
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
        vscode.window.showErrorMessage(`Remote Host Provider User ${item.name} not found`);
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: `Role Name?`,
        placeHolder: `Enter the Role name, example ADMIN`,
        ignoreFocusOut: true
      });
      if (!name) {
        vscode.window.showErrorMessage(`Role Name is required`);
        return;
      }

      const request: DevOpsRolesAndClaimsCreateRequest = {
        name: cleanString(name).toUpperCase()
      };

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.createRemoteHostRole(provider, request).catch(() => {
            vscode.window.showErrorMessage(
              `Failed to add role ${name} to the remote host ${provider?.name ?? "Unknown"}`
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `Role ${name} was added successfully to the remote host ${provider?.name ?? "Unknown"}`
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
          vscode.window.showErrorMessage(
            `Failed to connect to Remote Host ${provider?.name ?? "Unknown"}, err:\n ${error}`
          );
        });
    })
  );
};

export const DevOpsManagementProviderAddRoleCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderAddRoleCommand
};
