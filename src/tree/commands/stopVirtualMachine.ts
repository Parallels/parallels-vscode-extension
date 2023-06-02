import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";

export function registerStopVirtualMachineCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewStopVm, async item => {
      // refreshing the vm state in the config
      const config = Provider.getConfiguration();
      config.setVmStatus(item.id, "stopping...");
      provider.refresh();

      let foundError = false;
      const ok = await ParallelsDesktopService.stopVm(item.id).catch(reject => {
        vscode.window.showErrorMessage(`${reject}`);
        foundError = true;
        return;
      });
      if (!ok && !foundError) {
        vscode.window.showErrorMessage(`Failed to stop virtual machine ${item.name}`);
        return;
      }

      // awaiting for the status to be reported
      let retry = 40;
      while (true) {
        provider.refresh();
        const result = await ParallelsDesktopService.getVmStatus(item.id);
        if (result === "stopped") {
          parallelsOutputChannel.appendLine(`Virtual machine ${item.name} stopped`);
          break;
        }
        if (retry === 0) {
          parallelsOutputChannel.appendLine(`Virtual machine ${item.name} failed to stop`);
          vscode.window.showErrorMessage(`Failed to check if the machine ${item.name} stopped, please check the logs`);
          break;
        }
        retry--;
      }

      provider.refresh();
    })
  );
}
