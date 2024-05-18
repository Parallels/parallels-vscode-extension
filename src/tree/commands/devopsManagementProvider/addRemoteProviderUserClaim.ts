import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags } from "../../../constants/flags";
import { DevOpsRemoteProviderManagementCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsRemoteHostsProvider } from '../../devopsRemoteHostProvider/devOpsRemoteHostProvider';
import { DevOpsCatalogProvider } from "../../devopsCatalogProvider/devopsCatalogProvider";
import { DevOpsRolesAndClaims } from "../../../models/devops/rolesAndClaims";
import { DevOpsRemoteHostProvider } from "../../../models/devops/remoteHostProvider";
import { DevOpsCatalogHostProvider } from "../../../models/devops/catalogHostProvider";

const registerDevOpsManagementProviderAddUserClaimCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementAddUserClaim, async (item: any) => {
      if (!item) {
        return;
      }

      const providerId = item.id.split("%%")[0];
      const userId = item.id.split("%%")[3];
      const config = Provider.getConfiguration();
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === 'DevOpsRemoteHostProvider') {
        provider = config.findRemoteHostProviderById(providerId);
      }
      if (item.className === 'DevOpsCatalogHostProvider') {
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
      let existingClaims = provider.claims?.map((claim: DevOpsRolesAndClaims) => {
        return {
          label: claim.name,
        }
      });

      existingClaims = existingClaims?.filter((existingClaim) => {
        return !user.claims.includes(existingClaim.label);
      }) ??[];

      const selected = await vscode.window.showQuickPick(existingClaims, {
        placeHolder: `Select the claim to add to the user ${user.name}`,
        canPickMany: true
      });

      for (const claim of selected ?? []) {
        DevOpsService.testHost(provider).then(async () => {
          let foundError = false;
          await DevOpsService.addRemoteHostUserClaim(provider, userId, claim.label).catch(() => {
            vscode.window.showErrorMessage(`Failed to add claim ${claim.label} to ${user.name} on the remote host ${provider?.name ?? 'Unknown'}`);
            foundError = true;
            return;
          })

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(`Claim ${claim.label} was added successfully to ${user.name} on the remote host ${provider?.name ?? 'Unknown'}`);
        if (item.className === 'DevOpsRemoteHostProvider') {
          await DevOpsService.refreshRemoteHostProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        }
        if (item.className === 'DevOpsCatalogHostProvider') {
          await DevOpsService.refreshCatalogProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        }
        }).catch((error) => {
          vscode.window.showErrorMessage(`Failed to connect to Remote Host ${provider?.name ?? 'Unknown'}, err:\n ${error}`);
        })
      }
    })
  );
};

export const DevOpsManagementProviderAddUserClaimCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderAddUserClaimCommand
};
