import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {Provider} from "../../ioc/provider";
import {LogService} from "../../services/logService";

export function registerSuspendVirtualMachineCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeSuspendVm, async item => {
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Suspending virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "suspending...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.suspendVm(item.id).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });
          if (!ok && !foundError) {
            vscode.window.showErrorMessage(`Failed to suspend virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "suspended") {
              LogService.info(`Virtual machine ${item.name} suspended`, "SuspendVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} suspended`
              );
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to suspend`, "SuspendVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to suspend`
              );
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} suspend, please check the logs`
              );
              break;
            }
            retry--;
          }
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
      );
    })
  );
}
