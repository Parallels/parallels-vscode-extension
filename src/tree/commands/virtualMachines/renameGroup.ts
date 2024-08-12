import * as vscode from "vscode";

import {Provider} from "../../../ioc/provider";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import { TELEMETRY_VM_GROUP } from "../../../telemetry/operations";

const registerRenameGroupCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRenameGroup, async (item: VirtualMachineTreeItem) => {
      let itemId: string | undefined;
      let itemName: string | undefined;
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "RENAME_GROUP_COMMAND_CLICK");
      if (!item) {
        const config = Provider.getConfiguration();
        const groups = config.allGroups;
        const options: string[] = [];
        groups.forEach(async group => {
          options.push(group.path ?? group.name);
        });
        const groupName = await vscode.window.showQuickPick(options, {
          placeHolder: `Select a Group`
        });
        groups.forEach(group => {
          if (group.path === groupName) {
            (itemId = group.uuid), (itemName = group.name);
          }
        });
      } else {
        itemId = item.id;
        itemName = item.name;
      }
      if (itemId && itemName) {
        const config = Provider.getConfiguration();
        const groupName = await vscode.window.showInputBox({
          prompt: `New Name for group ${itemName}?`,
          placeHolder: `Enter the new name for the group ${itemName}`,
          value: itemName
        });
        if (groupName) {
          config.renameVirtualMachineGroup(itemId, groupName);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Group ${itemName} renamed to ${groupName}`, "RenameGroupCommand");
          telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "RENAME_GROUP_COMMAND_SUCCESS");
          LogService.sendTelemetryEvent(TelemetryEventIds.GroupAction, `Group ${itemName} renamed to ${groupName}`);
        }
      }
    })
  );
};

export const RenameGroupCommand: VirtualMachineCommand = {
  register: registerRenameGroupCommand
};
