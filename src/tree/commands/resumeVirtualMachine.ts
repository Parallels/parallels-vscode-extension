import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";

export function registerResumeVirtualMachineCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewResumeVm, async item => {
      // refreshing the vm state in the config
      const config = Provider.getConfiguration();
      config.setVmStatus(item.id, "resuming...");
      provider.refresh();

      let foundError = false;
      const ok = await ParallelsDesktopService.resumeVm(item.id).catch(reject => {
        vscode.window.showErrorMessage(`${reject}`);
        foundError = true;
        return;
      });
      if (!ok && !foundError) {
        vscode.window.showErrorMessage(`Failed to resume virtual machine ${item.name}`);
        return;
      }

      // awaiting for the status to be reported
      let retry = 40;
      while (true) {
        provider.refresh();
        const result = await ParallelsDesktopService.getVmStatus(item.id);
        if (result === "running") {
          parallelsOutputChannel.appendLine(`Virtual machine ${item.name} resumed`);
          break;
        }
        if (retry === 0) {
          parallelsOutputChannel.appendLine(`Virtual machine ${item.name} failed to resume`);
          vscode.window.showErrorMessage(`Failed to check if the machine ${item.name} resumed, please check the logs`);
          break;
        }
        retry--;
      }

      vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
    })
  );
}
