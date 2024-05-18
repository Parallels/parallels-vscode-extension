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
import {VirtualMachineCommand} from "../BaseCommand";

const registerToggleShowHiddenCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.coreEnableShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(`Toggling show hidden to true`, "TreeViewCommand");
      Provider.getConfiguration().showHidden = true;
      vscode.commands.executeCommand("setContext", FLAG_ENABLE_SHOW_HIDDEN, true);
      vscode.commands.executeCommand("setContext", FLAG_DISABLE_SHOW_HIDDEN, false);
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
      LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Show All Items`);
    }),
    vscode.commands.registerCommand(CommandsFlags.coreDisableShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(`Toggling show hidden to false`, "TreeViewCommand");
      Provider.getConfiguration().showHidden = false;
      vscode.commands.executeCommand("setContext", FLAG_ENABLE_SHOW_HIDDEN, false);
      vscode.commands.executeCommand("setContext", FLAG_DISABLE_SHOW_HIDDEN, true);
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
      LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Hide All Items`);
    }),
    vscode.commands.registerCommand(CommandsFlags.coreToggleShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(
        `Toggling show hidden to ${!Provider.getSettings().get<boolean>(FLAG_TREE_SHOW_HIDDEN)}`,
        "TreeViewCommand"
      );
      const newValue = !Provider.getConfiguration().showHidden;
      Provider.getConfiguration().showHidden = newValue;
      vscode.commands.executeCommand("setContext", FLAG_ENABLE_SHOW_HIDDEN, newValue);
      vscode.commands.executeCommand("setContext", FLAG_DISABLE_SHOW_HIDDEN, !newValue);
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
      LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Toggled Show/Hide all Items`);
    }),
    vscode.commands.registerCommand(CommandsFlags.treeShowItem, async (item: VirtualMachineTreeItem) => {
      if (item) {
        if (item.type === "Group") {
          LogService.debug(`Toggling group item ${item.name} visibility to true`, "TreeViewCommand");
          Provider.getConfiguration().showVirtualMachineGroup(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
        if (item.type === "VirtualMachine") {
          LogService.debug(`Toggling vm item ${item.name} visibility to $false`, "TreeViewCommand");
          Provider.getConfiguration().showVm(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Show Item ${item.name}`);
      }
    }),
    vscode.commands.registerCommand(CommandsFlags.treeHideItem, async (item: VirtualMachineTreeItem) => {
      if (item) {
        if (item.type === "Group") {
          LogService.debug(`Toggling group item ${item.name} visibility to false`, "TreeViewCommand");
          Provider.getConfiguration().hideVirtualMachineGroup(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
        if (item.type === "VirtualMachine") {
          LogService.debug(`Toggling vm item ${item.name} visibility to false`, "TreeViewCommand");
          Provider.getConfiguration().hideVm(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        }
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Hide Item ${item.name}`);
      }
    })
  );
};

export const ToggleShowHideCommand: VirtualMachineCommand = {
  register: registerToggleShowHiddenCommand
};
