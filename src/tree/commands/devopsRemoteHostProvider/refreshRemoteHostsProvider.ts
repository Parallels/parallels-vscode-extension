import * as vscode from "vscode";
import { CommandsFlags } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsRemoteHostsCommand } from "../BaseCommand";
import { DevOpsRemoteHostsTreeProvider } from "../../devops_remote/remote_hosts_tree_provider";
import { DevOpsService } from "../../../services/devopsService";

const registerDevOpsRefreshRemoteHostsProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
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
