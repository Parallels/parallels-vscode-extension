import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import { DevOpsRemoteHostsTreeItem } from "../../devops_remote/remote_hosts_tree_item";
import { DevOpsRemoteHostsTreeProvider } from "../../devops_remote/remote_hosts_tree_provider";
import { DevOpsService } from "../../../services/devopsService";
import { ANSWER_YES, YesNoQuestion } from "../../../helpers/ConfirmDialog";

const registerDevOpRemoveVirtualMachineCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveRemoteProviderHostVm, async (item: DevOpsRemoteHostsTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Removing virtual machine ${item.name}`
        },
        async () => {
          if (!item) {
            return;
          }
          const confirmation = await YesNoQuestion(
            `Are you sure you want to remove the virtual machine ${item.name}?`
          );
    
          if (confirmation !== ANSWER_YES) {
            return;
          }
          const config = Provider.getConfiguration();
          const providerId = item.id.split("%%")[0];
          const machineId = item.id.split("%%")[2];
          const machine = config.findRemoteHostProviderVirtualMachine(providerId, machineId);
          if (!machine) {
            vscode.window.showErrorMessage(`Machine ${item.name} not found`);
            return;
          }

          let foundError = false;

          const provider = config.findRemoteHostProviderById(providerId);
          if (!provider) {
            vscode.window.showErrorMessage(`Provider for ${item.name} not found`);
            return;
          }
          if (!machineId) {
            vscode.window.showErrorMessage(`Machine ${item.name} not found`);
            return;
          }

          const ok = await DevOpsService.removeRemoteHostVm(provider, machineId).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            vscode.window.showErrorMessage(`Failed to remove virtual machine ${item.name}`);
            return;
          }

          DevOpsService.refreshRemoteHostProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        }
      );
    })
  );
};

export const DevOpsRemoveVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpRemoveVirtualMachineCommand
};
