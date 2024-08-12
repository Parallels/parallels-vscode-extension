import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsDisableRemoteProviderOrchestratorHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsDisableRemoteProviderHost, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "DISABLE_REMOTE_PROVIDER_HOST_COMMAND_CLICK");
      if (!item) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const hostId = item.id.split("%%")[2];
      const provider = config.findRemoteHostProviderById(providerId);
      const host = config.findRemoteHostProviderHostById(providerId, hostId);
      if (!provider || !host) {
        ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Remote Host Provider ${item.name} not found`);
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
          ShowErrorMessage(
            TELEMETRY_DEVOPS_REMOTE,
            `Error disabling Remote Host provider ${item.name}, err: ${error}`,
            true
          );
        });
    })
  );
};

export const DevOpsDisableRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsDisableRemoteProviderOrchestratorHostCommand
};
