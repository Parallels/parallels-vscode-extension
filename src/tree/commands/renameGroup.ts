import * as vscode from "vscode";

import {Provider} from "../../ioc/provider";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {LogService} from "../../services/logService";

export function registerRenameGroupCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRenameGroup, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const groupName = await vscode.window.showInputBox({
        prompt: `New Name for group ${item.name}?`,
        placeHolder: `Enter the new name for the group ${item.name}`
      });
      if (groupName) {
        config.renameVirtualMachineGroup(item.name, groupName);
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Group ${item.name} renamed to ${groupName}`, "RenameGroupCommand");
        LogService.sendTelemetryEvent(TelemetryEventIds.AddGroup, `Group ${item.name} renamed to ${groupName}`);
      }
    })
  );
}
