import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";

const registerDevOpsDisableRemoteProviderOrchestratorHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsDisableRemoteProviderHost, async (item: any) => {
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const hostId = item.id.split("%%")[2];
      const provider = config.findRemoteHostProviderById(providerId);
      const host = config.findRemoteHostProviderHostById(providerId, hostId);
      if (!provider || !host) {
        vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
        return;
      }
      const confirmation = await YesNoQuestion(`Are you sure you want to disable remote host ${item.name}?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      DevOpsService.disableRemoteHostOrchestratorHost(provider, host.id)
        .then(async () => {
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          await DevOpsService.refreshRemoteHostProviders(true);
          vscode.window.showInformationMessage(`Remote Host Provider ${item.name} disabled successfully`);
        })
        .catch(error => {
          vscode.window.showErrorMessage(`Error disabling Remote Host provider ${item.name}`);
        });
    })
  );
};

export const DevOpsDisableRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsDisableRemoteProviderOrchestratorHostCommand
};
