import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { Provider } from "../../../ioc/provider";
import { ShowErrorMessage } from "../../../helpers/error";

const registerDeleteVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRemoveVm, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "DELETE_VM_COMMAND_CLICK");
      if (!item) {
        return;
      }

      const confirmation = await YesNoQuestion(`Are you sure you want to delete vm ${item.name ?? "unknown"}?`);
      if (confirmation !== ANSWER_YES) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deleting vm ${item.name ?? "unknown"}`
        },
        async () => {
          const result = await ParallelsDesktopService.deleteVm(item.id).catch(reject => {
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            return;
          });
          if (!result) {
            LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Failed to delete vm ${item.name}`);
            ShowErrorMessage(TELEMETRY_VM, `Failed to delete vm ${item.name}`, true);
            return;
          }

          LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Successfully deleted vm ${item.name}`);
          vscode.window.showInformationMessage(`Successfully deleted vm ${item.name}`);
          telemetry.sendOperationEvent(TELEMETRY_VM, "DELETE_VM_COMMAND_SUCCESS");
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
      );
    })
  );
};

export const DeleteVMCommand: VirtualMachineCommand = {
  register: registerDeleteVmCommand
};
