import { config } from 'process';
import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {CommandsFlags} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerRefreshVirtualMachineCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeRefreshVms, async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Refreshing virtual machines"
        },
        async () => {
          LogService.info("Refreshing virtual machines", "RefreshVirtualMachineCommand");
          await ParallelsDesktopService.getVms();
          const groups = Provider.getConfiguration().virtualMachinesGroups;
          LogService.debug(`Found ${groups.length} groups`, "RefreshVirtualMachineCommand");
          LogService.debug(
            `Found ${groups.map(g => g.machines.length).reduce((a, b) => a + b, 0)} virtual machines`,
            "RefreshVirtualMachineCommand"
          );
          for (const group of groups) {
            for (const vm of group.machines) {
              LogService.debug(`Name: ${vm.Name}, State: ${vm.State}`, "RefreshVirtualMachineCommand");
            }
          }
          const config = Provider.getConfiguration();
          config.save();
          provider.refresh();
        }
      );
    })
  );
};

export const RefreshVirtualMachineCommand: VirtualMachineCommand = {
  register: registerRefreshVirtualMachineCommand
};
