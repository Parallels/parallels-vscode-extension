import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "../../../services/devopsService";

const registerDevOpsRefreshRemoteHostsProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRefreshRemoteHostProvider, async () => {
      LogService.info("Refreshing remote hosts provider tree", "RefreshRemoteHostProviderCommand");
      provider.refresh();
    })
  );
};

export const DevOpsRefreshRemoteHostsProviderCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsRefreshRemoteHostsProviderCommand
};
