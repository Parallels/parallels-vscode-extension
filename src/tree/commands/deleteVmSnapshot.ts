import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {VirtualMachine} from "../../models/virtualMachine";

export function registerDeleteVmSnapshotCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewDeleteVmSnapshot, async (item: VirtualMachineTreeItem) => {
      const config = Provider.getConfiguration();
      const options: string[] = ["Yes", "No"];
      const deleteChildren = await vscode.window.showQuickPick(options, {
        placeHolder: "Delete all snapshot children?"
      });
      if (item) {
        const vm = item.item as VirtualMachine;
        const confirmation = await vscode.window.showQuickPick(options, {
          placeHolder: `Are you sure you want to delete snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}?`
        });
        if (confirmation !== "Yes") {
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deleting snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}`
          }, async () => {
            const result = await ParallelsDesktopService.deleteVmSnapshot(
              vm.ID,
              item.id,
              deleteChildren === "Yes" ? true : false
            ).catch(reject => {
              vscode.window.showErrorMessage(`${reject}`);
              return;
            });
            if (!result) {
              vscode.window.showErrorMessage(`Snapshot ${item.name} for vm ${vm.Name} failed to delete`);
              return;
            }

            vscode.window.showInformationMessage(`Snapshot ${item.name} for vm ${vm.Name} deleted`);
            vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
            parallelsOutputChannel.appendLine(`Snapshot ${item.name} for vm ${vm.Name} deleted`);
          });
        }
      }
    })
  );
}
