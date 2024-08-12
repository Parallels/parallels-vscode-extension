import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerResumeVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeResumeVm, async item => {
      if (!item) {
        return;
      }

      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "RESUME_VM_COMMAND_CLICK");
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Resuming virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "resuming...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.resumeVm(item.id).catch(reject => {
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            foundError = true;
            return;
          });
          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_VM, `Failed to resume virtual machine ${item.name}`, true);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "running") {
              LogService.info(`Virtual machine ${item.name} resumed`, "ResumeVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} resumed`
              );
              telemetry.sendOperationEvent(TELEMETRY_VM, "RESUME_VM_COMMAND_SUCCESS", {
                operationValue: `${item.id}_${item.os}`
              });
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to resume`, "ResumeVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to resume`
              );
              ShowErrorMessage(
                TELEMETRY_VM,
                `Failed to check if the machine ${item.name} resumed, please check the logs`,
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

export const ResumeVirtualMachineCommand: VirtualMachineCommand = {
  register: registerResumeVirtualMachineCommand
};
