import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerStopVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeStopVm, async item => {
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Stopping virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "stopping...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.stopVm(item.id).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
          });

          if (!ok || foundError) {
            vscode.window.showErrorMessage(`Failed to stop virtual machine ${item.name}`);
            vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "stopped") {
              LogService.info(`Virtual machine ${item.name} stopped`, "StopVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} stopped`
              );
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to stop`, "StopVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to stop`
              );
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} stopped, please check the logs`
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
};

export const StopVirtualMachineCommand: VirtualMachineCommand = {
  register: registerStopVirtualMachineCommand
};
