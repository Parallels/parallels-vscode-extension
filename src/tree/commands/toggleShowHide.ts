import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, SettingsFlags} from "../../constants/flags";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {Provider} from "../../ioc/provider";
import {LogService} from "../../services/logService";

export function registerToggleShowHiddenCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.coreEnableShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(`Toggling show hidden to true`, "TreeViewCommand");
      Provider.getConfiguration().showHidden =true;
      console.log(Provider.getSettings().get<boolean>(SettingsFlags.treeShowHiddenItems));
      vscode.commands.executeCommand("setContext", "parallels-desktop:enableShowHidden", true);
      vscode.commands.executeCommand("setContext", "parallels-desktop:disableShowHidden", false);
      vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
    }),
    vscode.commands.registerCommand(CommandsFlags.coreDisableShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(`Toggling show hidden to false`, "TreeViewCommand");
      Provider.getConfiguration().showHidden =false;
      vscode.commands.executeCommand("setContext", "parallels-desktop:enableShowHidden", false);
      vscode.commands.executeCommand("setContext", "parallels-desktop:disableShowHidden", true);
      vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
    }),
    vscode.commands.registerCommand(CommandsFlags.coreToggleShowHiddenItems, async (item: VirtualMachineTreeItem) => {
      LogService.debug(`Toggling show hidden to ${!Provider.getSettings().get<boolean>(SettingsFlags.treeShowHiddenItems)}`, "TreeViewCommand");
      const newValue = !Provider.getConfiguration().showHidden
      Provider.getConfiguration().showHidden =newValue;
      vscode.commands.executeCommand(
        "setContext",
        "parallels-desktop:enableShowHidden",
        newValue
      );
      vscode.commands.executeCommand(
        "setContext",
        "parallels-desktop:disableShowHidden",
        !newValue
      );
      vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
    }),
    vscode.commands.registerCommand(CommandsFlags.treeShowItem, async (item: VirtualMachineTreeItem) => {
      if (item) {
        if (item.type === "Group") {
          LogService.debug(`Toggling group item ${item.name} visibility to true`, "TreeViewCommand");
          Provider.getConfiguration().showVirtualMachineGroup(item.name);
          vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        }
        if (item.type === "VirtualMachine") {
          LogService.debug(`Toggling vm item ${item.name} visibility to $false`, "TreeViewCommand");
          Provider.getConfiguration().showVm(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        }
      }
    }),
    vscode.commands.registerCommand(CommandsFlags.treeHideItem, async (item: VirtualMachineTreeItem) => {
      if (item) {
        if (item.type === "Group") {
          LogService.debug(`Toggling group item ${item.name} visibility to false`, "TreeViewCommand");
          Provider.getConfiguration().hideVirtualMachineGroup(item.name);
          vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        }
        if (item.type === "VirtualMachine") {
          LogService.debug(`Toggling vm item ${item.name} visibility to false`, "TreeViewCommand");
          Provider.getConfiguration().hideVm(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        }
      }
    })
  );
}
