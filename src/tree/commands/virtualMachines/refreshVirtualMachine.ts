import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_VM} from "../../../telemetry/operations";

const registerRefreshVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRefreshVm, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }

      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "REFRESH_VM_COMMAND_CLICK");

      try {
        LogService.debug(`Refreshing virtual machine ${item.name}`, "RefreshVirtualMachineCommand");

        // Refresh just this VM item in the tree
        await provider.refresh(item);

        LogService.info(`Virtual machine ${item.name} refreshed successfully`, "RefreshVirtualMachineCommand");
        telemetry.sendOperationEvent(TELEMETRY_VM, "REFRESH_VM_COMMAND_SUCCESS");
      } catch (error) {
        LogService.error(`Failed to refresh virtual machine ${item.name}: ${error}`, "RefreshVirtualMachineCommand");
        telemetry.sendOperationEvent(TELEMETRY_VM, "REFRESH_VM_COMMAND_FAILED");
        vscode.window.showErrorMessage(`Failed to refresh virtual machine ${item.name}`);
      }
    })
  );
};

export const RefreshVirtualMachineCommand: VirtualMachineCommand = {
  register: registerRefreshVirtualMachineCommand
};
