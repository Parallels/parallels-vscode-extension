import * as vscode from "vscode";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";

export function registerDeleteVmCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vmTreeRemoveVm, async (item: VirtualMachineTreeItem) => {
      const options: string[] = ["Yes", "No"];
      if (item) {
        const confirmation = await vscode.window.showQuickPick(options, {
          placeHolder: `Are you sure you want to delete vm ${item?.name ?? "unknown"}?`
        });
        if (confirmation === "Yes") {
          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Deleting vm ${item?.name ?? "unknown"}`
            },
            async () => {
              const result = await ParallelsDesktopService.deleteVm(item.id).catch(reject => {
                vscode.window.showErrorMessage(`${reject}`);
                return;
              });
              if (!result) {
                vscode.window.showErrorMessage(`Failed to delete vm ${item.name}.`);
                return;
              }

              vscode.window.showInformationMessage(`Successfully deleted vm ${item.name}`);
              vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
            }
          );
        }
      }
    })
  );
}
