import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerSuspendVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeSuspendVm, async item => {
      if (!item) {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "SUSPEND_VM_COMMAND_CLICK");
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
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            foundError = true;
            return;
          });
          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_VM, `Failed to suspend virtual machine ${item.name}`, true);
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
              telemetry.sendOperationEvent(TELEMETRY_VM, "SUSPEND_VM_COMMAND_SUCCESS", {
                operationValue: `${item.id}_${item.name}`
              });
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to suspend`, "SuspendVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to suspend`
              );
              ShowErrorMessage(
                TELEMETRY_VM,
                `Failed to check if the machine ${item.name} suspend, please check the logs`,
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

export const SuspendVirtualMachineCommand: VirtualMachineCommand = {
  register: registerSuspendVirtualMachineCommand
};
