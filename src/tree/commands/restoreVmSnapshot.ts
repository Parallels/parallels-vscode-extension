import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {VirtualMachine} from "../../models/virtualMachine";

export function registerRestoreVmSnapshotCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewRestoreVmSnapshot, async (item: VirtualMachineTreeItem) => {
      if (item) {
        const vm = item.item as VirtualMachine;
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Restoring snapshot ${item.name} for vm ${vm.Name}`
          },
          async () => {
            const result = await ParallelsDesktopService.restoreVmSnapshot(vm.ID, item.id).catch(reject => {
              vscode.window.showErrorMessage(`${reject}`);
              return;
            });
            if (!result) {
              vscode.window.showErrorMessage(`Snapshot ${item.name} for vm ${vm.Name} failed to restore`);
              return;
            }

            vscode.window.showInformationMessage(`Snapshot ${item.name} for vm ${vm.Name} restored`);
            vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
            parallelsOutputChannel.appendLine(`Snapshot ${item.name} for vm ${vm.Name} restored`);
          }
        );
      }
    })
  );
}
