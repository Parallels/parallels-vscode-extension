import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";
import {Provider} from "../../ioc/provider";

export function registerSuspendVirtualMachineCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewSuspendVm, async item => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Suspending virtual machine ${item.name}`
        },
        async () => {
          // refreshing the vm state in the config
          const config = Provider.getConfiguration();
          config.setVmStatus(item.id, "suspending...");
          provider.refresh();

          let foundError = false;
          const ok = await ParallelsDesktopService.suspendVm(item.id).catch(reject => {
            vscode.window.showErrorMessage(`${reject}`);
            foundError = true;
            return;
          });
          if (!ok && !foundError) {
            vscode.window.showErrorMessage(`Failed to suspend virtual machine ${item.name}`);
            return;
          }

          // awaiting for the status to be reported
          let retry = 40;
          while (true) {
            provider.refresh();
            const result = await ParallelsDesktopService.getVmStatus(item.id);
            if (result === "suspended") {
              parallelsOutputChannel.appendLine(`Virtual machine ${item.name} suspended`);
              break;
            }
            if (retry === 0) {
              parallelsOutputChannel.appendLine(`Virtual machine ${item.name} failed to suspend`);
              vscode.window.showErrorMessage(
                `Failed to check if the machine ${item.name} suspend, please check the logs`
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
