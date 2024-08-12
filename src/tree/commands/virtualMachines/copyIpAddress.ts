import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {VirtualMachineCommand} from "../BaseCommand";
import { TELEMETRY_VM } from "../../../telemetry/operations";
import { Provider } from "../../../ioc/provider";

const registerCopyIpAddressCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeCopyIpAddress, async (item: VirtualMachine) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "COPY_IP_ADDRESS_COMMAND_CLICK");
      if (!item) {
        return;
      }

      if (item.configuredIpAddress !== undefined && item.configuredIpAddress !== "-") {
        // clipboardy.default.writeSync(item.configuredIpAddress);
        vscode.window.showInformationMessage(`Copied ${item.configuredIpAddress} to clipboard`);
        return;
      }
    })
  );
};

export const CopyIpAddressCommand: VirtualMachineCommand = {
  register: registerCopyIpAddressCommand
};
