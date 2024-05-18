import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";

const registerDeleteVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRemoveVm, async (item: VirtualMachineTreeItem) => {
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
            vscode.window.showErrorMessage(`${reject}`);
            return;
          });
          if (!result) {
            LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Failed to delete vm ${item.name}`);
            vscode.window.showErrorMessage(`Failed to delete vm ${item.name}.`);
            return;
          }

          LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Successfully deleted vm ${item.name}`);
          vscode.window.showInformationMessage(`Successfully deleted vm ${item.name}`);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
      );
    })
  );
};

export const DeleteVMCommand: VirtualMachineCommand = {
  register: registerDeleteVmCommand
};
