import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import { DevOpsRemoteHostsProvider } from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import { DevOpsService } from "../../../services/devopsService";
import { DevOpsTreeItem } from "../../treeItems/devOpsTreeItem";

const registerDevOpCloneVirtualMachineCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsCloneRemoteProviderHostVm, async (item: DevOpsTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Cloning virtual machine ${item.name}`
        },
        async () => {
          if (!item) {
            return;
          }
          const cloneName = await vscode.window.showInputBox({
            prompt: "Enter the name of the new virtual machine",
            value: `${item.name}-clone`
          });
          if (!cloneName) {
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

          const ok = await DevOpsService.cloneRemoteHostVm(provider, machineId, cloneName).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            vscode.window.showErrorMessage(`Failed to clone virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            const result = config.findRemoteHostProviderVirtualMachine(providerId, machineId)?.State ?? "unknown";
            if (result !== "unknown") {
              LogService.info(`Virtual machine ${item.name} cloned`, "DevOpStartVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to clone`, "DevOpStartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to clone`
              );
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} cloned, please check the logs`
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

export const DevOpsCloneVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpCloneVirtualMachineCommand
};
