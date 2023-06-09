import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";

export function registerTakeSnapshotCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewTakeVmSnapshot, async (item: VirtualMachineTreeItem) => {
      const snapshotName = await vscode.window.showInputBox({
        prompt: "Snapshot Name?",
        placeHolder: "Enter the name for your snapshot"
      });
      const snapshotDescription = await vscode.window.showInputBox({
        prompt: "Snapshot Description?",
        placeHolder: "Enter a description for the snapshot, press enter to dismiss"
      });
      if (snapshotName) {
        const result = await ParallelsDesktopService.takeVmSnapshot(item.id, snapshotName, snapshotDescription).catch(
          reject => {
            vscode.window.showErrorMessage(`${reject}`);
            return;
          }
        );
        if (!result) {
          vscode.window.showErrorMessage(`failed to create snapshot ${snapshotName}`);
          return;
        }

        // awaiting for the status to be reported
        let retry = 40;
        while (true) {
          provider.refresh();
          const result = await ParallelsDesktopService.getVmStatus(item.id);
          if (result !== "snapshooting") {
            parallelsOutputChannel.appendLine(`Virtual machine ${item.name} finished snapshooting`);
            break;
          }
          if (retry === 0) {
            parallelsOutputChannel.appendLine(`Virtual machine ${item.name} failed to take the snapshoot`);
            vscode.window.showErrorMessage(
              `Virtual machine ${item.name} failed to take the snapshoot, please check the logs`
            );
            break;
          }
          retry--;
        }

        vscode.window.showInformationMessage(`Snapshot ${snapshotName} created`);
        vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        parallelsOutputChannel.appendLine(`Snapshot ${snapshotName} created`);
      }
    })
  );
}
