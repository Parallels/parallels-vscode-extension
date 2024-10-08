import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachineGroup} from "../../../models/parallels/virtualMachineGroup";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_VM_GROUP} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerTakeGroupSnapshotCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeTakeGroupSnapshot, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "TAKE_SNAPSHOT_COMMAND_CLICK");
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
            for (const vm of group.getAllVms()) {
              promises.push(takeSnapshot(provider, vm, snapshotName, snapshotDescription));
            }

            await Promise.all(promises).then(
              () => {
                vscode.window.showInformationMessage(`Snapshot ${snapshotName} created for ${group.name}`);
                vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                LogService.info(`Snapshot ${snapshotName} created for ${group.name}`, "TakeGroupSnapshotCommand");
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Snapshot ${snapshotName} created for ${group.name}`
                );
                telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "TAKE_SNAPSHOT_COMMAND_SUCCESS", {
                  operationValue: snapshotName
                });
              },
              () => {
                LogService.error(
                  `Snapshot ${snapshotName} failed to create for ${group.name}`,
                  "TakeGroupSnapshotCommand"
                );
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Snapshot ${snapshotName} failed to create for ${group.name}`
                );
                ShowErrorMessage(TELEMETRY_VM_GROUP, `Failed to take snapshot ${snapshotName} for ${group.name}`, true);
              }
            );
          }
        );
      }
    })
  );
};

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
      ShowErrorMessage(TELEMETRY_VM_GROUP, `failed to create snapshot ${snapshotName}`, true);
      return reject(`failed to create snapshot ${snapshotName}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(vm.ID);
      if (result !== "snapshooting") {
        LogService.info(`Virtual machine ${vm.Name} finished snapshooting`);
        break;
      }
      if (retry === 0) {
        LogService.error(`Virtual machine ${vm.Name} failed to take the snapshoot`);
        ShowErrorMessage(
          TELEMETRY_VM_GROUP,
          `Failed to check if the machine ${vm.Name} snapshoot, please check the logs`,
          true
        );
        break;
      }
      retry--;
    }
    provider.refresh();
    return resolve();
  });
}

export const TakeGroupSnapshotCommand: VirtualMachineCommand = {
  register: registerTakeGroupSnapshotCommand
};
