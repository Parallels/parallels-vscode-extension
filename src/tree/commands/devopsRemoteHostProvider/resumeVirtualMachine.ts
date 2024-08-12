import * as vscode from "vscode";

import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "../../../services/devopsService";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpResumeVirtualMachineCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsResumeRemoteProviderHostVm, async (item: DevOpsTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "RESUME_VIRTUAL_MACHINE_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Resuming virtual machine ${item.name}`
        },
        async () => {
          const config = Provider.getConfiguration();
          const providerId = item.id.split("%%")[0];
          const machineId = item.id.split("%%")[3];
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

          const ok = await DevOpsService.resumeRemoteHostVm(provider, machineId).catch(reject => {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to resume virtual machine ${item.name}`, true);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            const result = config.findRemoteHostProviderVirtualMachine(providerId, machineId)?.State ?? "unknown";
            if (result === "running") {
              LogService.info(`Virtual machine ${item.name} resumed`, "DevOpStartVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to resume`, "DevOpStartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to resume`
              );
              ShowErrorMessage(
                TELEMETRY_DEVOPS_REMOTE,
                `Failed to check if the machine ${item.name} resumed, please check the logs`,
                true
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

export const DevOpsResumeVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpResumeVirtualMachineCommand
};
