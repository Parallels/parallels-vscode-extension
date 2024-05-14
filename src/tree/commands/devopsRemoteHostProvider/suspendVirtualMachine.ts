import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import { DevOpsRemoteHostsTreeItem } from "../../devops_remote/remote_hosts_tree_item";
import { DevOpsRemoteHostsTreeProvider } from "../../devops_remote/remote_hosts_tree_provider";
import { DevOpsService } from "../../../services/devopsService";

const registerDevOpSuspendVirtualMachineCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsSuspendRemoteProviderHostVm, async (item: DevOpsRemoteHostsTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Suspending virtual machine ${item.name}`
        },
        async () => {
          if (!item) {
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

          const ok = await DevOpsService.suspendRemoteHostVm(provider, machineId).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            vscode.window.showErrorMessage(`Failed to suspend virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            const result = config.findRemoteHostProviderVirtualMachine(providerId, machineId)?.State ?? "unknown";
            if (result === "suspended") {
              LogService.info(`Virtual machine ${item.name} suspend`, "DevOpStartVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to suspend`, "DevOpStartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to suspend`
              );
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} suspended, please check the logs`
              );
              break;
            }
            retry--;
          }

          DevOpsService.refreshRemoteHostProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        }
      );
    })
  );
};

export const DevOpsSuspendVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpSuspendVirtualMachineCommand
};
