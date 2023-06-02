import * as vscode from "vscode";

import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";
import {CommandsFlags, FLAG_NO_GROUP} from "../../constants/flags";
import {VirtualMachineProvider} from "../virtual_machine";

export function registerRemoveGroupCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewRemoveGroup, async item => {
      const group = Provider.getConfiguration().getVirtualMachineGroup(item.name);
      if (group !== undefined) {
        const noGroup = Provider.getConfiguration().getVirtualMachineGroup(FLAG_NO_GROUP);
        group.machines.forEach(vm => {
          noGroup?.add(vm);
        });
        Provider.getConfiguration().deleteVirtualMachineGroup(item.name);
        provider.refresh();
        parallelsOutputChannel.appendLine(`Group ${item.name} removed`);
      }
    })
  );
}
