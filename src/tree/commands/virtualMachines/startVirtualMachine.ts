import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, FLAG_START_VMS_HEADLESS_DEFAULT, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";
import { ShowErrorMessage } from "../../../helpers/error";
import { TELEMETRY_VM } from "../../../telemetry/operations";

const registerStartVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeStartVm, async (item: VirtualMachineTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Starting virtual machine ${item.name}`
        },
        async () => {
          if (!item) {
            return;
          }
          const telemetry = Provider.telemetry();
          telemetry.sendOperationEvent(TELEMETRY_VM, "START_VM_COMMAND_CLICK");

          const settings = Provider.getSettings();
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "starting...");
          provider.refresh();
          let foundError = false;
          // Checking how should we start the VM
          if (settings.get<boolean>(FLAG_START_VMS_HEADLESS_DEFAULT)) {
            const vm = item.item as VirtualMachine;
            if (vm && vm["Startup and Shutdown"]["Startup view"] !== "headless") {
              await ParallelsDesktopService.setVmConfig(item.id, "startup-view", "headless");
            }
          } else {
            const vm = item.item as VirtualMachine;
            if (vm && vm["Startup and Shutdown"]["Startup view"] !== "window") {
              await ParallelsDesktopService.setVmConfig(item.id, "startup-view", "window");
            }
          }
          const ok = await ParallelsDesktopService.startVm(item.id).catch(reject => {
            ShowErrorMessage(TELEMETRY_VM, `${reject}`);
            foundError = true;
            return;
          });

          if (!ok || foundError) {
            ShowErrorMessage(TELEMETRY_VM, `Failed to start virtual machine ${item.name}`, true);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "running") {
              LogService.info(`Virtual machine ${item.name} started`, "StartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} started`
              );
              telemetry.sendOperationEvent(TELEMETRY_VM, "START_VM_COMMAND_SUCCESS", {
                operationValue: `${item.id}_${item.name}`
              });
              break;
            }
            if (retry === 0) {
              LogService.error(`Virtual machine ${item.name} failed to start`, "StartVirtualMachineCommand");
              LogService.sendTelemetryEvent(
                TelemetryEventIds.VirtualMachineAction,
                `Virtual machine ${item.name} failed to start`
              );
              ShowErrorMessage(TELEMETRY_VM, `Failed to check if the machine ${item.name} started, please check the logs`, true);
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

export const StartVirtualMachineCommand: VirtualMachineCommand = {
  register: registerStartVirtualMachineCommand
};
