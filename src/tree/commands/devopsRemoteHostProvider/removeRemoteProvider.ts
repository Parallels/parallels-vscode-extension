import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS} from "../../../constants/flags";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";

const registerDevOpsRemoveRemoteProviderHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveRemoteHostProvider, async (item: any) => {
      if (!item) {
        return;
      }
      const confirmation = await YesNoQuestion(`Are you sure you want to delete remote host ${item.name}?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(providerId);
      if (!provider) {
        vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
        return;
      }

      if (config.removeRemoteHostProvider(providerId)) {
        if (config.remoteHostProviders.length === 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, false);
        }

        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        vscode.window.showInformationMessage(`Remote Host Provider ${item.name} removed successfully`);
      } else {
        vscode.window.showErrorMessage(`Error removing Remote Host Provider ${item.name}`);
      }
    })
  );
};

export const DevOpsRemoveRemoteProviderCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsRemoveRemoteProviderHostCommand
};
