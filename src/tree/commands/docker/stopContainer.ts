import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_NO_GROUP, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtual_machine";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../virtual_machine_item";
import {DockerContainerOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";

const registerStopDockerContainerCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerStopContainer, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Stopping docker container ${item.name} on ${
            (item.item as VirtualMachine)?.Name ?? "Virtual Machine"
          }...`
        },
        async () => {
          try {
            const config = Provider.getConfiguration();
            const currentVm = config.allMachines.find(vm => vm.ID === (item.item as VirtualMachine).ID);
            if (!currentVm || currentVm.State !== "running") {
              return;
            }

            await DockerService.containerOp(
              DockerContainerOperation.Stop,
              currentVm.ID,
              item.id.replace(currentVm.ID, "")
            )
              .then(result => {
                if (result) {
                  vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  LogService.info(`Docker container ${item.name} stopped`);
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Docker container ${item.name} stopped`
                  );
                } else {
                  vscode.window.showErrorMessage(`Failed to stop docker container ${item.name}`);
                  LogService.error(`Failed to stop docker container ${item.name}`, "StopDockerContainerCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to stop docker container ${item.name}`
                  );
                }
              })
              .catch(reject => {
                vscode.window.showErrorMessage(`Failed to stop docker container ${item.name}`);
                LogService.error(
                  `Failed to stop docker container ${item.name}: ${reject}`,
                  "StopDockerContainerCommand"
                );
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to stop docker container ${item.name}`
                );
              });
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop docker container ${item.name}`);
            LogService.error(`Failed to stop docker container ${item.name}: ${error}`, "StopDockerContainerCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to stop docker container ${item.name}`
            );
          }
        }
      );
    })
  );
};

export const StopContainerCommand: VirtualMachineCommand = {
  register: registerStopDockerContainerCommand
};
