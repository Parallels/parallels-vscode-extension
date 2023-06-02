import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";
import {VirtualMachineGroup} from "../../models/groups";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";

export function registerAddGroupCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewAddGroup, async () => {
      const config = Provider.getConfiguration();
      const groupName = await vscode.window.showInputBox({
        prompt: "Group Name?",
        placeHolder: "Enter the name for the group"
      });
      if (groupName) {
        config.addVirtualMachineGroup(new VirtualMachineGroup(groupName));
        provider.refresh();
        parallelsOutputChannel.appendLine(`Group ${groupName} added`);
      }
    })
  );
}
