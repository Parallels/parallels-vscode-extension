import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtual_machine";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../virtual_machine_item";
import {DockerContainerOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/virtualMachine";

export function registerPauseDockerContainerCommand(
  context: vscode.ExtensionContext,
  provider: VirtualMachineProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerPauseContainer, async (item: VirtualMachineTreeItem) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pausing docker container ${item.name} on ${
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

            await DockerService.containerOp(DockerContainerOperation.Pause, currentVm.ID, item.id)
              .then(result => {
                if (result) {
                  vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  LogService.info(`Docker container ${item.name} paused`);
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Docker container ${item.name} paused`
                  );
                } else {
                  vscode.window.showErrorMessage(`Failed to pause docker container ${item.name}`);
                  LogService.error(`Failed to pause docker container ${item.name}`, "PauseDockerContainerCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to pause docker container ${item.name}`
                  );
                }
              })
              .catch(reject => {
                vscode.window.showErrorMessage(`Failed to pause docker container ${item.name}`);
                LogService.error(
                  `Failed to pause docker container ${item.name}: ${reject}`,
                  "PauseDockerContainerCommand"
                );
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to pause docker container ${item.name}`
                );
              });
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to pause docker container ${item.name}`);
            LogService.error(`Failed to pause docker container ${item.name}: ${error}`, "StartDockerContainerCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to pause docker container ${item.name}`
            );
          }
        }
      );
    })
  );
}
