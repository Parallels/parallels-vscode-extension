import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "../../../services/devopsService";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";

const registerDevOpsForceRefreshRemoteHostsProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsForceRefreshRemoteHostProvider, async () => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "REFRESH_REMOTE_HOSTS_PROVIDER_COMMAND_CLICK");

      LogService.info("Force Refreshing remote hosts provider tree", "RefreshRemoteHostProviderCommand");
      await DevOpsService.refreshRemoteHostProviders(true);
      provider.refresh();
    })
  );
};

export const DevOpsForceRefreshRemoteHostsProviderCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsForceRefreshRemoteHostsProviderCommand
};
