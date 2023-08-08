import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {VirtualMachineTreeItem} from "../virtual_machine_item";

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
        vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        parallelsOutputChannel.appendLine(`Group ${groupName} added`);
      }
    })
  );
}
