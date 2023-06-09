import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";

export function registerPauseVirtualMachineCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewPauseVm, async item => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pausing virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "pausing...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.pauseVm(item.id).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });
          if (!ok && !foundError) {
            vscode.window.showErrorMessage(`Failed to pause virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "paused") {
              parallelsOutputChannel.appendLine(`Virtual machine ${item.name} paused`);
              break;
            }
            if (retry === 0) {
              parallelsOutputChannel.appendLine(`Virtual machine ${item.name} failed to pause`);
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} paused, please check the logs`
              );
              break;
            }
            retry--;
          }
          vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
        }
      );
    })
  );
}
