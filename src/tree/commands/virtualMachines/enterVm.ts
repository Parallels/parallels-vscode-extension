import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_VM} from "../../../telemetry/operations";

const registerEnterVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeEnterVm, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "ENTER_VM_COMMAND_CLICK");
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
