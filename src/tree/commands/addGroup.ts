import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {VirtualMachineGroup} from "../../models/virtualMachineGroup";
import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {LogService} from "../../services/logService";

export function registerAddGroupCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeAddGroup, async () => {
      const config = Provider.getConfiguration();
      const groupName = await vscode.window.showInputBox({
        prompt: "Group Name?",
        placeHolder: "Enter the name for the group"
      });
      if (groupName) {
        LogService.sendTelemetryEvent(TelemetryEventIds.AddGroup, "Group Added");
        config.addVirtualMachineGroup(new VirtualMachineGroup(groupName));
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Group ${groupName} added`, "AddGroupCommand");
      }
    })
  );
}
