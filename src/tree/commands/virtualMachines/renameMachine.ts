import * as vscode from "vscode";

import {Provider} from "../../../ioc/provider";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerRenameVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRenameVm, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "RENAME_VM_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const newVmName = await vscode.window.showInputBox({
        prompt: `New Name for VM ${item.name}?`,
        placeHolder: `Enter the new name for the VM ${item.name}`,
        value: item.name
      });
      if (newVmName) {
        config.renameVirtualMachine(item.id, newVmName);
        await ParallelsDesktopService.renameVm(item.id, newVmName)
          .then(result => {
            if (!result) {
              ShowErrorMessage(TELEMETRY_VM, `Failed to rename ${item.name} to ${newVmName}`, true);
              LogService.error(`Failed to rename ${item.name} to ${newVmName}`, "RenameVmCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Failed to rename ${item.name} to ${newVmName}`
              );
              config.renameVirtualMachine(item.id, item.name);
              return;
            }
            vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            LogService.info(`Virtual Machine ${item.name} renamed to ${newVmName}`, "RenameVmCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Virtual Machine ${item.name} renamed to ${newVmName}`
            );
            telemetry.sendOperationEvent(TELEMETRY_VM, "RENAME_VM_COMMAND_SUCCESS");
          })
          .catch(reject => {
            ShowErrorMessage(TELEMETRY_VM, `Failed to rename ${item.name} to ${newVmName}`, true);
            LogService.error(`Failed to rename ${item.name} to ${newVmName}: ${reject}`, "RenameVmCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to rename ${item.name} to ${newVmName}`
            );
            return;
          });
      }
    })
  );
};

export const RenameMachineCommand: VirtualMachineCommand = {
  register: registerRenameVmCommand
};
