import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpPauseVirtualMachineCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsPauseRemoteProviderHostVm, async (item: DevOpsTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "PAUSE_VIRTUAL_MACHINE_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pausing virtual machine ${item.name}`
        },
        async () => {
          const config = Provider.getConfiguration();
          const idParts = item.id.split("%%");
          const providerId = idParts[0];
          const machineId = idParts[idParts.length - 1];
          const machine = config.findRemoteHostProviderVirtualMachine(providerId, machineId);
          if (!machine) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Machine ${item.name} not found`);
            return;
          }

          let foundError = false;

          const provider = config.findRemoteHostProviderById(providerId);
          if (!provider) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Provider for ${item.name} not found`);
            return;
          }
          if (!machineId) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Machine ${item.name} not found`);
            return;
          }

          const ok = await DevOpsService.pauseRemoteHostVm(provider, machineId).catch(reject => {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to pause virtual machine ${item.name}`, true);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            const result = config.findRemoteHostProviderVirtualMachine(providerId, machineId)?.State ?? "unknown";
            if (result === "paused") {
              LogService.info(`Virtual machine ${item.name} paused`, "DevOpStartVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to pause`, "DevOpStartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to pause`
              );
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to pause virtual machine ${item.name}`, true);
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

export const DevOpsPauseVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpPauseVirtualMachineCommand
};
