import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { ShowErrorMessage } from "../../../helpers/error";

const registerDeleteVmSnapshotCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeDeleteVmSnapshot, async (item: VirtualMachineTreeItem) => {
      const config = Provider.getConfiguration();
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "DELETE_VM_SNAPSHOT_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const vm = item.item as VirtualMachine;
      const confirmation = await YesNoQuestion(
        `Are you sure you want to delete snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }
      const deleteChildren = await YesNoQuestion("Delete all snapshot children?");

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deleting snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}`
        },
        async () => {
          const result = await ParallelsDesktopService.deleteVmSnapshot(
            vm.ID,
            item.id,
            deleteChildren === ANSWER_YES ? true : false
          ).catch(reject => {
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            return;
          });
          if (!result) {
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Snapshot ${item.name} for vm ${vm.Name} failed to delete`
            );
            ShowErrorMessage(TELEMETRY_VM, `Snapshot ${item.name} for vm ${vm.Name} failed to delete`, true);
            return;
          }

          vscode.window.showInformationMessage(`Snapshot ${item.name} for vm ${vm.Name} deleted`);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Snapshot ${item.name} for vm ${vm.Name} deleted`
          );
          telemetry.sendOperationEvent(TELEMETRY_VM, "DELETE_VM_SNAPSHOT_COMMAND_SUCCESS", { operationValue: item.name });
          LogService.info(`Snapshot ${item.name} for vm ${vm.Name} deleted`, "DeleteVmSnapshotCommand");
        }
      );
    })
  );
};

export const DeleteVmSnapshotCommand: VirtualMachineCommand = {
  register: registerDeleteVmSnapshotCommand
};
