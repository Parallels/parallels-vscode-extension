import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {VirtualMachineCommand} from "../BaseCommand";

const registerCopyIpAddressCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeCopyIpAddress, async (item: VirtualMachine) => {
      if (!item) {
        return;
      }

      if (item.configuredIpAddress !== undefined && item.configuredIpAddress !== "-") {
        vscode.window.showInformationMessage(`Copied ${item.configuredIpAddress} to clipboard`);
        return;
      }
    })
  );
};

export const CopyIpAddressCommand: VirtualMachineCommand = {
  register: registerCopyIpAddressCommand
};
