import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerPauseVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treePauseVm, async item => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "PAUSE_VM_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pausing virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "pausing...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.pauseVm(item.id).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });
          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_VM, `Failed to pause virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "paused") {
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} paused`
              );
              LogService.info(`Virtual machine ${item.name} paused`, "PauseVirtualMachineCommand");
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to pause`, "PauseVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to pause`
              );
              ShowErrorMessage(
                TELEMETRY_VM,
                `Failed to check if the machine ${item.name} paused, please check the logs`,
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

export const PauseVirtualMachineCommand: VirtualMachineCommand = {
  register: registerPauseVirtualMachineCommand
};
