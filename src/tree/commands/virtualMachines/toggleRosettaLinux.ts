import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerToggleRosettaLinuxCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeEnableRosetta, async (item: VirtualMachineTreeItem) => {
      if (!item || item.status !== "stopped") {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "ENABLE_ROSETTA_LINUX_COMMAND_CLICK");
      LogService.debug(`Enabling Rosetta Linux on ${item.name} `, "ToggleRosettaLinuxCommand");
      await ParallelsDesktopService.setVmConfig(item.id, "rosetta-linux", "on")
        .then(result => {
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Enabled Rosetta Linux on ${item.name}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Enabling Rosetta Linux on ${item.name}`
          );
          telemetry.sendOperationEvent(TELEMETRY_VM, "ENABLE_ROSETTA_LINUX_COMMAND_SUCCESS", {
            operationValue: `${item.id}_${item.name}`
          });
        })
        .catch(reject => {
          LogService.error(`Failed Enabling Rosetta Linux on ${item.name}: ${reject}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed Enabling Rosetta Linux on ${item.name}`
          );
          ShowErrorMessage(TELEMETRY_VM, `Failed to enable Rosetta Linux on ${item.name}`, true);
        });
    }),

    vscode.commands.registerCommand(CommandsFlags.treeDisableRosetta, async (item: VirtualMachineTreeItem) => {
      if (!item || item.status !== "stopped") {
        return;
      }
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "ENABLE_ROSETTA_LINUX_COMMAND_CLICK");
      LogService.debug(`Disabling Rosetta Linux on ${item.name} `, "ToggleRosettaLinuxCommand");
      await ParallelsDesktopService.setVmConfig(item.id, "rosetta-linux", "off")
        .then(result => {
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Disabled Rosetta Linux on ${item.name}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Disabling Rosetta Linux on ${item.name}`
          );
          telemetry.sendOperationEvent(TELEMETRY_VM, "DISABLE_ROSETTA_LINUX_COMMAND_SUCCESS", {
            operationValue: `${item.id}_${item.name}`
          });
        })
        .catch(reject => {
          LogService.error(`Failed Disabling Rosetta Linux on ${item.name}: ${reject}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed Disabling Rosetta Linux on ${item.name}`
          );
          ShowErrorMessage(TELEMETRY_VM, `Failed to disable Rosetta Linux on ${item.name}`, true);
        });
    })
  );
};

export const ToggleRosettaLinuxCommand: VirtualMachineCommand = {
  register: registerToggleRosettaLinuxCommand
};
