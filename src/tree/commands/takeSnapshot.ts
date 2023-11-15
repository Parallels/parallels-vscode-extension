import * as vscode from "vscode";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {LogService} from "../../services/logService";
import {VirtualMachineCommand} from "./BaseCommand";

const registerTakeSnapshotCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeTakeVmSnapshot, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
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
            LogService.info(`Virtual machine ${item.name} finished snapshooting`, "TakeSnapshotCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Virtual machine ${item.name} finished snapshooting`
            );
            break;
          }
          if (retry === 0) {
            LogService.error(`Virtual machine ${item.name} failed to take the snapshot`, "TakeSnapshotCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Virtual machine ${item.name} failed to take the snapshot`
            );
            vscode.window.showErrorMessage(
              `Virtual machine ${item.name} failed to take the snapshot, please check the logs`
            );
            break;
          }
          retry--;
        }

        vscode.window.showInformationMessage(`Snapshot ${snapshotName} created`);
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Snapshot ${snapshotName} created`, "TakeSnapshotCommand");
      }
    })
  );
};

export const TakeSnapshotCommand: VirtualMachineCommand = {
  register: registerTakeSnapshotCommand
};
