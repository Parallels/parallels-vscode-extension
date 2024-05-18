import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerEnterVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeEnterVm, async (item: VirtualMachineTreeItem) => {
      if (item && item.status === "running") {
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Enter VM ${item.name}`);
        const terminal = vscode.window.createTerminal(`Parallels Desktop: ${item.name}`);
        terminal.show();
        terminal.sendText(`prlctl enter "${item.id}"`);
      }
    })
  );
};

export const EnterVmCommand: VirtualMachineCommand = {
  register: registerEnterVmCommand
};
