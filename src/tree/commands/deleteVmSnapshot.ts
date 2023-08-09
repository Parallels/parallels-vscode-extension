import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {VirtualMachine} from "../../models/virtualMachine";
import {LogService} from "../../services/logService";

export function registerDeleteVmSnapshotCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeDeleteVmSnapshot, async (item: VirtualMachineTreeItem) => {
      const config = Provider.getConfiguration();
      const options: string[] = ["Yes", "No"];
      if (item) {
        const vm = item.item as VirtualMachine;
        const confirmation = await vscode.window.showQuickPick(options, {
          placeHolder: `Are you sure you want to delete snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}?`
        });
        if (confirmation === "Yes") {
          const deleteChildren = await vscode.window.showQuickPick(options, {
            placeHolder: "Delete all snapshot children?"
          });

          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Deleting snapshot ${item.name} for vm ${vm?.Name ?? "unknown"}`
            },
            async () => {
              const result = await ParallelsDesktopService.deleteVmSnapshot(
                vm.ID,
                item.id,
                deleteChildren === "Yes" ? true : false
              ).catch(reject => {
                vscode.window.showErrorMessage(`${reject}`);
                return;
              });
              if (!result) {
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Snapshot ${item.name} for vm ${vm.Name} failed to delete`
                );
                vscode.window.showErrorMessage(`Snapshot ${item.name} for vm ${vm.Name} failed to delete`);
                return;
              }

              vscode.window.showInformationMessage(`Snapshot ${item.name} for vm ${vm.Name} deleted`);
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Snapshot ${item.name} for vm ${vm.Name} deleted`
              );
              LogService.info(`Snapshot ${item.name} for vm ${vm.Name} deleted`, "DeleteVmSnapshotCommand");
            }
          );
        }
      }
    })
  );
}
