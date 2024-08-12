import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_NO_GROUP, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {DockerContainerOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";
import {ShowErrorMessage} from "../../../helpers/error";
import {TELEMETRY_DOCKER} from "../../../telemetry/operations";

const registerRestartDockerContainerCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerRestartContainer, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "RESTART_DOCKER_CONTAINER_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Restarting docker container ${item.name} on ${
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
              DockerContainerOperation.Restart,
              currentVm.ID,
              item.id.replace(currentVm.ID, "")
            )
              .then(result => {
                if (result) {
                  vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  LogService.info(`Docker container ${item.name} restart`);
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Docker container ${item.name} restart`
                  );
                } else {
                  ShowErrorMessage(TELEMETRY_DOCKER, `Failed to restart docker container ${item.name}`, true);
                  LogService.error(`Failed to restart docker container ${item.name}`, "RestartDockerContainerCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to resume docker container ${item.name}`
                  );
                }
              })
              .catch(reject => {
                ShowErrorMessage(TELEMETRY_DOCKER, `Failed to restart docker container ${item.name}`, true);
                LogService.error(
                  `Failed to restart docker container ${item.name}: ${reject}`,
                  "RestartDockerContainerCommand"
                );
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to restart docker container ${item.name}`
                );
              });
          } catch (error) {
            ShowErrorMessage(TELEMETRY_DOCKER, `Failed to restart docker container ${item.name}`, true);
            LogService.error(
              `Failed to restart docker container ${item.name}: ${error}`,
              "RestartDockerContainerCommand"
            );
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to restart docker container ${item.name}`
            );
          }
        }
      );
    })
  );
};

export const RestartContainerCommand: VirtualMachineCommand = {
  register: registerRestartDockerContainerCommand
};
