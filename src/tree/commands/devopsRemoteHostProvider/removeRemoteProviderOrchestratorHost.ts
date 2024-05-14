import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsRemoteHostsCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsRemoteHostsTreeProvider } from '../../devops_remote/remote_hosts_tree_provider';
import { ANSWER_YES, YesNoQuestion } from "../../../helpers/ConfirmDialog";

const registerDevOpsRemoveRemoteProviderOrchestratorHostCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveRemoteProviderOrchestratorHost, async (item: any) => {
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const hostId = item.id.split("%%")[1];
      const provider = config.findRemoteHostProviderById(providerId);
      const host = config.findRemoteHostProviderHostById(providerId, hostId);
      if (!provider|| !host) {
        vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
        return;
      }

      const confirmation = await YesNoQuestion(
        `Are you sure you want to delete remote host ${item.name}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }

      await DevOpsService.removeRemoteHostOrchestratorHost(provider, host.id).catch(() => {
        vscode.window.showErrorMessage(`Failed to remove ${host.description} from the Orchestrator ${provider.name}`);
        return;
      })

        vscode.window.showInformationMessage(`Remote Host was added successfully to the Orchestrator ${provider.name}`);
        await DevOpsService.refreshRemoteHostProviders(true);
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
    })
  );
};

export const DevOpsRemoveRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsRemoveRemoteProviderOrchestratorHostCommand
};
