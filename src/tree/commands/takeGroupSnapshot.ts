import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {VirtualMachineGroup} from "../../models/virtualMachineGroup";
import {VirtualMachine} from "../../models/virtualMachine";

export function registerTakeGroupSnapshotCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewTakeGroupSnapshot, async (item: VirtualMachineTreeItem) => {
      const snapshotName = await vscode.window.showInputBox({
        prompt: "Snapshot Name?",
        placeHolder: "Enter the name for your snapshot"
      });
      const snapshotDescription = await vscode.window.showInputBox({
        prompt: "Snapshot Description?",
        placeHolder: "Enter a description for the snapshot, press enter to dismiss"
      });
      if (snapshotName) {
        vscode.window.withProgress(
          {
            title: `Taking snapshot ${snapshotName}`,
            location: vscode.ProgressLocation.Notification
          },
          async () => {
            const group = item.item as VirtualMachineGroup;
            const promises = [];
            for (const vm of group.machines) {
              promises.push(takeSnapshot(provider, vm, snapshotName, snapshotDescription));
            }

            await Promise.all(promises).then(
              () => {
                vscode.window.showInformationMessage(`Snapshot ${snapshotName} created for ${group.name}`);
                vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
                parallelsOutputChannel.appendLine(`Snapshot ${snapshotName} created for ${group.name}`);
              },
              () => {
                vscode.window.showErrorMessage(`Snapshot ${snapshotName} failed to create for ${group.name}`);
              }
            );
          }
        );
      }
    })
  );
}

function takeSnapshot(
  provider: VirtualMachineProvider,
  vm: VirtualMachine,
  snapshotName: string,
  snapshotDescription: string | undefined
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const result = await ParallelsDesktopService.takeVmSnapshot(vm.ID, snapshotName, snapshotDescription).catch(
      reject => {
        vscode.window.showErrorMessage(`${reject}`);
        return reject(reject);
      }
    );
    if (!result) {
      vscode.window.showErrorMessage(`failed to create snapshot ${snapshotName}`);
      return reject(`failed to create snapshot ${snapshotName}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(vm.ID);
      if (result !== "snapshooting") {
        parallelsOutputChannel.appendLine(`Virtual machine ${vm.Name} finished snapshooting`);
        break;
      }
      if (retry === 0) {
        parallelsOutputChannel.appendLine(`Virtual machine ${vm.Name} failed to take the snapshoot`);
        vscode.window.showErrorMessage(
          `Virtual machine ${vm.Name} failed to take the snapshoot, please check the logs`
        );
        break;
      }
      retry--;
    }
    provider.refresh();
    return resolve();
  });
}
