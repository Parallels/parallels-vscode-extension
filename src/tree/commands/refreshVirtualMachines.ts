import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {Provider} from "../../ioc/provider";

export function registerRefreshVirtualMachineCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeViewRefreshVms, async () => {
      await ParallelsDesktopService.getVms();
      const groups = Provider.getConfiguration().virtualMachinesGroups;
      for (const group of groups) {
        for (const vm of group.machines) {
          console.log(`Name: ${vm.Name}, State: ${vm.State}`);
        }
      }
      provider.refresh();
    })
  );
}
