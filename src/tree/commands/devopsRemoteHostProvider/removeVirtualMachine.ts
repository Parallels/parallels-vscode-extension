import * as vscode from "vscode";

import {CommandsFlags} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsTreeItem} from "../../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "../../../services/devopsService";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpRemoveVirtualMachineCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveRemoteProviderHostVm, async (item: DevOpsTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "REMOVE_VIRTUAL_MACHINE_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Removing virtual machine ${item.name}`
        },
        async () => {
          const confirmation = await YesNoQuestion(`Are you sure you want to remove the virtual machine ${item.name}?`);

          if (confirmation !== ANSWER_YES) {
            return;
          }
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
          if (machine.State === "invalid") {
            const ok = await DevOpsService.unregisterRemoteHostVm(provider, machineId).catch(reject => {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `${reject}`);
              foundError = true;
              return;
            });

            if (!ok || foundError) {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to remove virtual machine ${item.name}`, true);
              return;
            }
          } else {
            const ok = await DevOpsService.removeRemoteHostVm(provider, machineId).catch(reject => {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `${reject}`);
              foundError = true;
              return;
            });

            if (!ok || foundError) {
              ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Failed to remove virtual machine ${item.name}`, true);
              return;
            }
          }

          DevOpsService.refreshRemoteHostProviders(true);
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          vscode.window.showInformationMessage(
            `Remote Host virtual machine ${item.name} was removed successfully removed from the Orchestrator ${provider.name}`
          );
        }
      );
    })
  );
};

export const DevOpsRemoveVirtualMachineCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpRemoveVirtualMachineCommand
};
