import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags } from "../../../constants/flags";
import { DevOpsRemoteProviderManagementCommand } from "../BaseCommand";
import { DevOpsRemoteHostsProvider } from '../../devopsRemoteHostProvider/devOpsRemoteHostProvider';
import { DevOpsCatalogProvider } from "../../devopsCatalogProvider/devopsCatalogProvider";
import { DevOpsRemoteHostProvider } from "../../../models/devops/remoteHostProvider";
import { DevOpsCatalogHostProvider } from "../../../models/devops/catalogHostProvider";
import { YesNoQuestion, ANSWER_YES } from "../../../helpers/ConfirmDialog";

const registerDevOpsManagementProviderRenameProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementRenameProvider, async (item: any) => {
      if (!item) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[1];
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

      const newName = await vscode.window.showInputBox({
        prompt: `Rename to?`,
        placeHolder: `Enter the new provider name`,
        ignoreFocusOut: true,
        value: provider.name
      });
      if (!newName) {
        vscode.window.showErrorMessage(`New Name is required`);
        return;
      }

      const confirmation = await YesNoQuestion(
        `Are you sure you want to rename provider ${item.name} to ${newName}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }

      const ok = config.renameRemoteProvider(provider, newName);
      if (ok) {
        vscode.window.showInformationMessage(`Provider ${item.name} renamed to ${newName}`);
      } else {
        vscode.window.showErrorMessage(`Error renaming provider ${item.name} to ${newName}`);
      }
      if (item.className === 'DevOpsRemoteHostProvider') {
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
      }
      if (item.className === 'DevOpsCatalogHostProvider') {
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
      }
    })
  );
};

export const DevOpsManagementProviderRenameProviderCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderRenameProviderCommand
};
