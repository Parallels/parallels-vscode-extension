import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineGroup} from "../../../models/parallels/virtualMachineGroup";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM_GROUP} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerSuspendGroupVirtualMachinesCommand = (
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeSuspendGroupVms, async item => {
      if (!item) {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "SUSPEND_VM_COMMAND_CLICK");
      vscode.window.withProgress(
        {
          title: `Suspending Vms on ${item.name}`,
          location: vscode.ProgressLocation.Notification
        },
        async () => {
          const group = item.item as VirtualMachineGroup;
          const promises = [];

          for (const vm of group.getAllVms()) {
            if (vm.State === "running") {
              promises.push(suspendVm(provider, vm));
            }
          }

          await Promise.all(promises)
            .then(() => {
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            })
            .catch(reason => {
              ShowErrorMessage(TELEMETRY_VM_GROUP, `Failed to suspend one or more VMs for ${group.name}`, true);
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
              return;
            });
        }
      );
    })
  );
};

function suspendVm(provider: VirtualMachineProvider, item: VirtualMachine): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // refreshing the vm state in the config
    const config = Provider.getConfiguration();
    const telemetry = Provider.telemetry();
    config.setVmStatus(item.ID, "suspending...");
    provider.refresh();

    let foundError = false;
    const ok = await ParallelsDesktopService.suspendVm(item.ID).catch(reject => {
      ShowErrorMessage(TELEMETRY_VM_GROUP, `${reject}`);
      foundError = true;
      return reject(reject);
    });
    if (!ok || foundError) {
      ShowErrorMessage(TELEMETRY_VM_GROUP, `Failed to suspend virtual machine ${item.Name}`, true);
      return reject(`Failed to suspend virtual machine ${item.Name}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(item.ID);
      if (result === "suspended") {
        LogService.info(`Virtual machine ${item.Name} suspended`);
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Virtual machine ${item.Name} suspended`);
        telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "SUSPEND_VM_COMMAND_SUCCESS", {
          operationValue: `${item.ID}_${item.Name}`
        });
        break;
      }
      if (retry === 0) {
        LogService.error(`Virtual machine ${item.Name} failed to suspend`);
        LogService.sendTelemetryEvent(
          TelemetryEventIds.VirtualMachineAction,
          `Virtual machine ${item.Name} failed to suspend`
        );
        ShowErrorMessage(
          TELEMETRY_VM_GROUP,
          `Failed to check if the machine ${item.Name} suspend, please check the logs`,
          true
        );
        break;
      }
      retry--;
    }
    provider.refresh();
    return resolve();
  });
}

export const SuspendGroupVirtualMachinesCommand: VirtualMachineCommand = {
  register: registerSuspendGroupVirtualMachinesCommand
};
