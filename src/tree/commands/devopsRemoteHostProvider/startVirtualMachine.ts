import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import { DevOpsTreeItem } from "../../treeItems/devOpsTreeItem";
import { DevOpsRemoteHostsProvider } from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import { DevOpsService } from "../../../services/devopsService";

const registerDevOpStartVirtualMachineCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsStartRemoteProviderHostVm, async (item: DevOpsTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Starting virtual machine ${item.name}`
        },
        async () => {
          if (!item) {
            return;
          }
          const config = Provider.getConfiguration();
          const providerId = item.id.split("%%")[0];
          const machineId = item.id.split("%%")[3];
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

          const ok = await DevOpsService.startRemoteHostVm(provider, machineId).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            vscode.window.showErrorMessage(`Failed to start virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            const result = config.findRemoteHostProviderVirtualMachine(providerId, machineId)?.State ?? "unknown";
            if (result === "running") {
              LogService.info(`Virtual machine ${item.name} started`, "DevOpStartVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to start`, "DevOpStartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to start`
              );
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} started, please check the logs`
              );
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            retry--;
          }

          DevOpsService.refreshRemoteHostProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        }
      );
    })
  );
};

export const DevOpsStartVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpStartVirtualMachineCommand
};
