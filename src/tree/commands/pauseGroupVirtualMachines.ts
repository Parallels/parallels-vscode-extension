import * as vscode from "vscode";

import {VirtualMachineProvider} from "../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../constants/flags";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {Provider} from "../../ioc/provider";
import {VirtualMachine} from "../../models/virtualMachine";
import {VirtualMachineGroup} from "../../models/virtualMachineGroup";
import {LogService} from "../../services/logService";

export function registerPauseGroupVirtualMachinesCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treePauseGroupVms, async item => {
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          title: `Pausing Vms on ${item.name}`,
          location: vscode.ProgressLocation.Notification
        },
        async () => {
          const group = item.item as VirtualMachineGroup;
          const promises = [];

          for (const vm of group.machines) {
            if (vm.State === "running") {
              promises.push(pauseVm(provider, vm));
            }
          }

          await Promise.all(promises).then(
            () => {
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            },
            () => {
              vscode.window.showErrorMessage(`Failed to suspend one or more VMs for ${group.name}`);
            }
          );
        }
      );
    })
  );
}

async function pauseVm(provider: VirtualMachineProvider, item: VirtualMachine): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // refreshing the vm state in the config
    const config = Provider.getConfiguration();
    config.setVmStatus(item.ID, "pausing...");
    provider.refresh();

    let foundError = false;
    const ok = await ParallelsDesktopService.pauseVm(item.ID).catch(reject => {
      vscode.window.showErrorMessage(`${reject}`);
      foundError = true;
      return reject(reject);
    });
    if (!ok && !foundError) {
      vscode.window.showErrorMessage(`Failed to pause virtual machine ${item.Name}`);
      return reject(`Failed to pause virtual machine ${item.Name}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(item.ID);
      if (result === "paused") {
        LogService.info(`Virtual machine ${item.Name} paused`, "PauseVmCommand");
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Virtual machine ${item.Name} paused`);
        break;
      }
      if (retry === 0) {
        LogService.sendTelemetryEvent(
          TelemetryEventIds.VirtualMachineAction,
          `Virtual machine ${item.Name} failed to pause`
        );
        LogService.error(`Virtual machine ${item.Name} failed to pause`, "PauseVmCommand");
        vscode.window.showErrorMessage(`Failed to check if the machine ${item.Name} paused, please check the logs`);
        break;
      }
      retry--;
    }
    provider.refresh();
    return resolve();
  });
}
