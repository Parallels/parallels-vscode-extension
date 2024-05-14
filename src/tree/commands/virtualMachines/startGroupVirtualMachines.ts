import * as vscode from "vscode";

import {VirtualMachineProvider} from "../../virtual_machine";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import {Provider} from "../../../ioc/provider";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineGroup} from "../../../models/parallels/virtualMachineGroup";
import {LogService} from "../../../services/logService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerStartGroupVirtualMachinesCommand = (
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.treeStartGroupVms, async item => {
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          title: `Starting Vms on ${item.name}`,
          location: vscode.ProgressLocation.Notification
        },
        async () => {
          const group = item.item as VirtualMachineGroup;
          const promises = [];

          for (const vm of group.getAllVms()) {
            if (vm.State === "stopped") {
              promises.push(startVm(provider, vm));
            }
            if (vm.State === "suspended" || vm.State === "paused") {
              promises.push(resumeVm(provider, vm));
            }
          }

          await Promise.all(promises)
            .then(() => {
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
            })
            .catch(() => {
              vscode.window.showErrorMessage(`Failed to start one or more VMs for ${group.name}`);
              vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
              return;
            });
        }
      );
    })
  );
};

function startVm(provider: VirtualMachineProvider, item: VirtualMachine): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // refreshing the vm state in the config
    const config = Provider.getConfiguration();
    config.setVmStatus(item.ID, "starting...");
    provider.refresh();

    let foundError = false;
    const ok = await ParallelsDesktopService.startVm(item.ID).catch(reject => {
      vscode.window.showErrorMessage(`${reject}`);
      foundError = true;
      return reject(reject);
    });
    if (!ok || foundError) {
      vscode.window.showErrorMessage(`Failed to start virtual machine ${item.Name}`);
      return reject(`Failed to start virtual machine ${item.Name}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(item.ID);
      if (result === "running") {
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Virtual machine ${item.Name} started`);
        LogService.info(`Virtual machine ${item.Name} started`);
        break;
      }
      if (retry === 0) {
        LogService.error(`Virtual machine ${item.Name} failed to start`);
        LogService.sendTelemetryEvent(
          TelemetryEventIds.VirtualMachineAction,
          `Virtual machine ${item.Name} failed to start`
        );

        vscode.window.showErrorMessage(`Failed to check if the machine ${item.Name} started, please check the logs`);
        break;
      }
      retry--;
    }

    provider.refresh();
    return resolve();
  });
}

function resumeVm(provider: VirtualMachineProvider, item: VirtualMachine): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // refreshing the vm state in the config
    const config = Provider.getConfiguration();
    config.setVmStatus(item.ID, "resuming...");
    provider.refresh();

    let foundError = false;
    const ok = await ParallelsDesktopService.resumeVm(item.ID).catch(reject => {
      vscode.window.showErrorMessage(`${reject}`);
      foundError = true;
      return reject(reject);
    });
    if (!ok && !foundError) {
      vscode.window.showErrorMessage(`Failed to resume virtual machine ${item.Name}`);
      return reject(`Failed to resume virtual machine ${item.Name}`);
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      provider.refresh();
      const result = await ParallelsDesktopService.getVmStatus(item.ID);
      if (result === "running") {
        LogService.info(`Virtual machine ${item.Name} resumed`);
        break;
      }
      if (retry === 0) {
        LogService.error(`Virtual machine ${item.Name} failed to resume`);
        vscode.window.showErrorMessage(`Failed to check if the machine ${item.Name} resumed, please check the logs`);
        break;
      }
      retry--;
    }

    provider.refresh();
    return resolve();
  });
}

export const StartGroupVirtualMachinesCommand: VirtualMachineCommand = {
  register: registerStartGroupVirtualMachinesCommand
};
