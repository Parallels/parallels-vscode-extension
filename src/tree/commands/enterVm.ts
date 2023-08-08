import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {VirtualMachineTreeItem} from "../virtual_machine_item";

export function registerEnterVmCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vmTreeEnterVm, async (item: VirtualMachineTreeItem) => {
      if (item && item.status === "running") {
        const terminal = vscode.window.createTerminal(`Parallels Desktop: ${item.name}`);
        terminal.sendText(`prlctl enter "${item.id}"`);
        terminal.show();
      }
    })
  );
}
