import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import { Provider } from "../../../ioc/provider";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { ShowErrorMessage } from "../../../helpers/error";

const registerTakeSnapshotCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeTakeVmSnapshot, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "TAKE_SNAPSHOT_COMMAND_CLICK");
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
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            return;
          }
        );
        if (!result) {
          ShowErrorMessage(TELEMETRY_VM, `Failed to create snapshot ${snapshotName}`, true);
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
            telemetry.sendOperationEvent(TELEMETRY_VM, "TAKE_SNAPSHOT_COMMAND_SUCCESS", { operationValue: snapshotName });
            break;
          }
          if (retry === 0) {
            LogService.error(`Virtual machine ${item.name} failed to take the snapshot`, "TakeSnapshotCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Virtual machine ${item.name} failed to take the snapshot`
            );
            ShowErrorMessage(TELEMETRY_VM, `Failed to take the snapshot for ${item.name}`, true);
            break;
          }
          retry--;
        }

        vscode.window.showInformationMessage(`Snapshot ${snapshotName} created`);
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Snapshot ${snapshotName} created`, "TakeSnapshotCommand");
        telemetry.sendOperationEvent(TELEMETRY_VM, "TAKE_SNAPSHOT_COMMAND_SUCCESS", { operationValue: snapshotName });
      }
    })
  );
};

export const TakeSnapshotCommand: VirtualMachineCommand = {
  register: registerTakeSnapshotCommand
};
