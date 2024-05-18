import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {
  CommandsFlags,
  FLAG_DISABLE_SHOW_HIDDEN,
  FLAG_ENABLE_SHOW_HIDDEN,
  FLAG_TREE_SHOW_HIDDEN,
  TelemetryEventIds
} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerToggleRosettaLinuxCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeEnableRosetta, async (item: VirtualMachineTreeItem) => {
      if (!item || item.status !== "stopped") {
        return;
      }

      LogService.debug(`Enabling Rosetta Linux on ${item.name} `, "ToggleRosettaLinuxCommand");
      await ParallelsDesktopService.setVmConfig(item.id, "rosetta-linux", "on")
        .then(result => {
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Enabled Rosetta Linux on ${item.name}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Enabling Rosetta Linux on ${item.name}`
          );
        })
        .catch(reject => {
          LogService.error(`Failed Enabling Rosetta Linux on ${item.name}: ${reject}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed Enabling Rosetta Linux on ${item.name}`
          );
        });
    }),
    vscode.commands.registerCommand(CommandsFlags.treeDisableRosetta, async (item: VirtualMachineTreeItem) => {
      if (!item || item.status !== "stopped") {
        return;
      }

      LogService.debug(`Disabling Rosetta Linux on ${item.name} `, "ToggleRosettaLinuxCommand");
      await ParallelsDesktopService.setVmConfig(item.id, "rosetta-linux", "off")
        .then(result => {
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Disabled Rosetta Linux on ${item.name}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Disabling Rosetta Linux on ${item.name}`
          );
        })
        .catch(reject => {
          LogService.error(`Failed Disabling Rosetta Linux on ${item.name}: ${reject}`, "ToggleRosettaLinuxCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed Disabling Rosetta Linux on ${item.name}`
          );
        });
    })
  );
};

export const ToggleRosettaLinuxCommand: VirtualMachineCommand = {
  register: registerToggleRosettaLinuxCommand
};
