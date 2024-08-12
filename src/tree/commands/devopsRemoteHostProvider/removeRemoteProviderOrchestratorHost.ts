import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsRemoveRemoteProviderOrchestratorHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveRemoteProviderOrchestratorHost, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "REMOVE_REMOTE_PROVIDER_HOST_COMMAND_CLICK");
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

      const confirmation = await YesNoQuestion(`Are you sure you want to delete remote host ${item.name}?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      await DevOpsService.removeRemoteHostOrchestratorHost(provider, host.id).catch(() => {
        ShowErrorMessage(
          TELEMETRY_DEVOPS_REMOTE,
          `Failed to remove ${host.description} from the Orchestrator ${provider.name}`,
          true
        );
        return;
      });

      vscode.window.showInformationMessage(`Remote Host was removed successfully to the Orchestrator ${provider.name}`);
      await DevOpsService.refreshRemoteHostProviders(true);
      vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
    })
  );
};

export const DevOpsRemoveRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsRemoveRemoteProviderOrchestratorHostCommand
};
