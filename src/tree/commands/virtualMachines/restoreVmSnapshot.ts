import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import { Provider } from "../../../ioc/provider";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { ShowErrorMessage } from "../../../helpers/error";

const registerRestoreVmSnapshotCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRestoreVmSnapshot, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "RESTORE_VM_SNAPSHOT_COMMAND_CLICK");
      if (item) {
        const vm = item.item as VirtualMachine;
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Restoring snapshot ${item.name} for vm ${vm.Name}`
          },
          async () => {
            const result = await ParallelsDesktopService.restoreVmSnapshot(vm.ID, item.id).catch(reject => {
              ShowErrorMessage(TELEMETRY_VM, `Snapshot ${item.name} for vm ${vm.Name} failed to restore: ${reject}`, true);
              return;
            });
            if (!result) {
              ShowErrorMessage(TELEMETRY_VM, `Snapshot ${item.name} for vm ${vm.Name} failed to restore`, true);
              LogService.error(`Snapshot ${item.name} for vm ${vm.Name} failed to restore`, "RestoreVmSnapshotCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Snapshot ${item.name} for vm ${vm.Name} failed to restore`
              );
              return;
            }
              
            vscode.window.showInformationMessage(`Snapshot ${item.name} for vm ${vm.Name} restored`);
            vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            LogService.info(`Snapshot ${item.name} for vm ${vm.Name} restored`, "RestoreVmSnapshotCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Snapshot ${item.name} for vm ${vm.Name} restored`
            );
            telemetry.sendOperationEvent(TELEMETRY_VM, "RESTORE_VM_SNAPSHOT_COMMAND_SUCCESS");
          }
        );
      }
    })
  );
};

export const RestoreVmSnapshotCommand: VirtualMachineCommand = {
  register: registerRestoreVmSnapshotCommand
};
