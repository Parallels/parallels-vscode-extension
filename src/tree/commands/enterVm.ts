import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {VirtualMachineTreeItem} from "../virtual_machine_item";
import {LogService} from "../../services/logService";

export function registerEnterVmCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeEnterVm, async (item: VirtualMachineTreeItem) => {
      if (item && item.status === "running") {
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, ``);
        const terminal = vscode.window.createTerminal(`Parallels Desktop: ${item.name}`);
        terminal.sendText(`prlctl enter "${item.id}"`);
        terminal.show();
      }
    })
  );
}
