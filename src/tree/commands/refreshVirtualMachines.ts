import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {Provider} from "../../ioc/provider";
import {parallelsOutputChannel} from "../../helpers/channel";

export function registerRefreshVirtualMachineCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewRefreshVms, async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing virtual machines"
        },
        async () => {
          parallelsOutputChannel.appendLine("Refreshing virtual machines");
          await ParallelsDesktopService.getVms();
          const groups = Provider.getConfiguration().virtualMachinesGroups;
          parallelsOutputChannel.appendLine(`Found ${groups.length} groups`);
          parallelsOutputChannel.appendLine(
            `Found ${groups.map(g => g.machines.length).reduce((a, b) => a + b, 0)} virtual machines`
          );
          for (const group of groups) {
            for (const vm of group.machines) {
              parallelsOutputChannel.appendLine(`Name: ${vm.Name}, State: ${vm.State}`);
            }
          }
          provider.refresh();
        }
      );
    })
  );
}
