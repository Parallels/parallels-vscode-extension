import * as vscode from "vscode";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_VM} from "../../../telemetry/operations";
import {Provider} from "../../../ioc/provider";
import {ShowErrorMessage} from "../../../helpers/error";

const registerCloneVmCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeCloneVm, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VM, "CLONE_VM_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const cloneVM = await vscode.window.showInputBox({
        prompt: "New Vm Name?",
        value: item.name,
        placeHolder: "Enter the name for your new VM"
      });
      const cloneLocation = await vscode.window.showInputBox({
        prompt: "Where do you want to create it?",
        placeHolder: "Enter a location for the new vm or press enter to create it in the default location"
      });
      if (cloneVM) {
        const result = await ParallelsDesktopService.cloneVm(item.id, cloneVM, cloneLocation).catch(reject => {
          ShowErrorMessage(TELEMETRY_VM, `${reject}`);
          return;
        });
        if (!result) {
          ShowErrorMessage(TELEMETRY_VM, `failed to clone ${cloneVM}`, true);
          return;
        }

        vscode.window.showInformationMessage(`Vm ${item.name} was successfully cloned to ${cloneVM}`);
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
        LogService.info(`Vm ${item.name} was successfully cloned to ${cloneVM}`, "TakeSnapshotCommand");
      }
    })
  );
};

export const CloneVmCommand: VirtualMachineCommand = {
  register: registerCloneVmCommand
};
