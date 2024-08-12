import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {VirtualMachineGroup} from "../../../models/parallels/virtualMachineGroup";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM_GROUP} from "../../../telemetry/operations";

const registerAddGroupCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  const telemetry = Provider.telemetry();
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeAddGroup, async () => {
      const config = Provider.getConfiguration();
      const groupName = await vscode.window.showInputBox({
        prompt: "Group Name?",
        placeHolder: "Enter the name for the group"
      });
      if (groupName) {
        const group = config.getVirtualMachineGroup(`/${groupName}`);
        if (group) {
          telemetry.sendErrorEvent(TELEMETRY_VM_GROUP, `Group ${groupName} already exists`);
          vscode.window.showErrorMessage(`Group ${groupName} already exists on the root`);
          LogService.error(`Group ${groupName} already exists`, "AddGroupCommand");
          LogService.sendTelemetryEvent(TelemetryEventIds.GroupAction, `Group ${groupName} already exists`);
          return;
        }

        telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "ADD_GROUP_COMMAND_SUCCESS" , {description: `Group ${groupName} added`});
        LogService.sendTelemetryEvent(TelemetryEventIds.GroupAction, "Group Added");
        config.addVirtualMachineGroup(new VirtualMachineGroup(groupName));
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Group ${groupName} added`, "AddGroupCommand");
      }
    })
  );
};

export const AddGroupCommand: VirtualMachineCommand = {
  register: registerAddGroupCommand
};
