import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsRemoteHostsCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsCatalogHostProvider } from '../../../models/devops/catalogHostProvider';
import { randomUUID } from 'crypto';
import { DevOpsRemoteHostsTreeProvider } from '../../devops_remote/remote_hosts_tree_provider';
import { DevOpsRemoteHostProvider } from "../../../models/devops/remoteHostProvider";
import { cleanString } from "../../../helpers/strings";

const registerDevOpsEnableRemoteProviderOrchestratorHostCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsEnableRemoteProviderHost, async (item: any) => {
      if (item) {
        const config = Provider.getConfiguration();
        const providerId = item.id.split("%%")[0];
        const hostId = item.id.split("%%")[1];
        const provider = config.findRemoteHostProviderById(providerId);
        const host = config.findRemoteHostProviderHostById(providerId, hostId);
        if(!provider || !host) {
          vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
          return;
        }

        DevOpsService.enableRemoteHostOrchestratorHost(provider, host.id).then(async () => {
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          await DevOpsService.refreshRemoteHostProviders(true);
          vscode.window.showInformationMessage(`Remote Host Provider ${item.name} enabled successfully`);
        }).catch((error) => {
          vscode.window.showErrorMessage(`Error enabling Remote Host Provider ${item.name}`);
        });
      }
    }));
};

export const DevOpsEnableRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsEnableRemoteProviderOrchestratorHostCommand
};
