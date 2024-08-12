import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerStopVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeStopVm, async item => {
      if (!item) {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "STOP_VM_COMMAND_CLICK");
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
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            foundError = true;
          });

          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_VM, `Failed to stop virtual machine ${item.name}`, true);
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
              telemetry.sendOperationEvent(TELEMETRY_VM, "STOP_VM_COMMAND_SUCCESS", {
                operationValue: `${item.id}_${item.name}`
              });
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to stop`, "StopVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to stop`
              );
              ShowErrorMessage(
                TELEMETRY_VM,
                `Failed to check if the machine ${item.name} stopped, please check the logs`,
                true
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
