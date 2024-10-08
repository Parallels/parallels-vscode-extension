import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachineGroup} from "../../../models/parallels/virtualMachineGroup";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM_GROUP} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerResumeGroupVirtualMachinesCommand = (
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeResumeGroupVms, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "RESUME_GROUP_VMS_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          title: `Resuming Vms on ${item.name}`,
          location: vscode.ProgressLocation.Notification
        },
        async () => {
          const group = item.item as VirtualMachineGroup;
          const promises = [];

          for (const vm of group.getAllVms()) {
            if (vm.State === "suspended" || vm.State === "paused") {
              promises.push(resumeVm(provider, vm));
            }
          }

          await Promise.all(promises)
            .then(() => {
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            })
            .catch(() => {
              ShowErrorMessage(TELEMETRY_VM_GROUP, `Failed to resume one or more VMs for ${group.name}`, true);
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
              return;
            });
        }
      );
    })
  );
};

function resumeVm(provider: VirtualMachineProvider, item: VirtualMachine): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const telemetry = Provider.telemetry();
    // refreshing the vm state in the config
    const config = Provider.getConfiguration();
    config.setVmStatus(item.ID, "resuming...");
    provider.refresh();

    let foundError = false;
    const ok = await ParallelsDesktopService.resumeVm(item.ID).catch(reject => {
      vscode.window.showErrorMessage(`${reject}`);
      foundError = true;
      return reject(reject);
    });
    if (!ok || foundError) {
      ShowErrorMessage(TELEMETRY_VM_GROUP, `Failed to resume virtual machine ${item.Name}`, true);
      return reject(`Failed to resume virtual machine ${item.Name}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(item.ID);
      if (result === "running") {
        LogService.info(`Virtual machine ${item.Name} resumed`);
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Virtual machine ${item.Name} resumed`);
        telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "RESUME_VM_COMMAND_SUCCESS", {
          operationValue: `${item.ID}_${item.OS}`
        });
        break;
      }
      if (retry === 0) {
        LogService.error(`Virtual machine ${item.Name} failed to resume`, "ResumeVmCommand");
        LogService.sendTelemetryEvent(
          TelemetryEventIds.VirtualMachineAction,
          `Virtual machine ${item.Name} failed to resume`
        );
        ShowErrorMessage(
          TELEMETRY_VM_GROUP,
          `Failed to check if the machine ${item.Name} resumed, please check the logs`,
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

export const ResumeGroupVirtualMachinesCommand: VirtualMachineCommand = {
  register: registerResumeGroupVirtualMachinesCommand
};
