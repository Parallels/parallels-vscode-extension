import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_NO_GROUP, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {VirtualMachineCommand} from "../BaseCommand";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {TELEMETRY_VM_GROUP} from "../../../telemetry/operations";

const registerRemoveGroupCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRemoveGroup, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "REMOVE_GROUP_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const group = Provider.getConfiguration().getVirtualMachineGroup(item.id);
      if (group !== undefined) {
        const confirmation = await YesNoQuestion(`Are you sure you want to remove group ${item.name}?`);
        if (confirmation === ANSWER_YES) {
          const noGroup = Provider.getConfiguration().getVirtualMachineGroup(FLAG_NO_GROUP);
          group.machines.forEach(vm => {
            noGroup?.addVm(vm);
          });
          Provider.getConfiguration().deleteVirtualMachineGroup(item.id);
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          LogService.info(`Group ${item.name} removed`);
          telemetry.sendOperationEvent(TELEMETRY_VM_GROUP, "REMOVE_GROUP_COMMAND_SUCCESS");
          LogService.sendTelemetryEvent(TelemetryEventIds.GroupAction, `Group ${item.name} removed`);
        }
      }
    })
  );
};

export const RemoveGroupCommand: VirtualMachineCommand = {
  register: registerRemoveGroupCommand
};
