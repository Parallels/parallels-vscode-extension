import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtual_machine";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../virtual_machine_item";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";

const registerGetContainerLogsCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerGetContainerLogs, async (item: VirtualMachineTreeItem) => {
      if (item) {
        const config = Provider.getConfiguration();
        const vm = config.getVirtualMachine((item.item as VirtualMachine).ID);
        if (vm === undefined) {
          return;
        }

        LogService.sendTelemetryEvent(
          TelemetryEventIds.VirtualMachineAction,
          `Get Container ${item.name} logs for ${vm.Name}`
        );
        const terminal = vscode.window.createTerminal(`Parallels Desktop: ${item.name} Logs`);
        terminal.show();
        terminal.sendText(`prlctl exec "${vm.ID}" sudo docker logs ${item.id.replace(vm.ID, "")} --follow -t`);
      }
    })
  );
};

export const GetContainerLogsCommand: VirtualMachineCommand = {
  register: registerGetContainerLogsCommand
};
