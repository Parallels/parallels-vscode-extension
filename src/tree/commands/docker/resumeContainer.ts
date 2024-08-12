import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {DockerContainerOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_DOCKER} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerResumeDockerContainerCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerResumeContainer, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "RESUME_DOCKER_CONTAINER_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Resuming docker container ${item.name} on ${
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
              DockerContainerOperation.Resume,
              currentVm.ID,
              item.id.replace(currentVm.ID, "")
            )
              .then(result => {
                if (result) {
                  vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  LogService.info(`Docker container ${item.name} resumed`);
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Docker container ${item.name} resumed`
                  );
                } else {
                  ShowErrorMessage(TELEMETRY_DOCKER, `Failed to resume docker container ${item.name}`, true);
                  LogService.error(`Failed to resume docker container ${item.name}`, "ResumeDockerContainerCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to resume docker container ${item.name}`
                  );
                }
              })
              .catch(reject => {
                ShowErrorMessage(TELEMETRY_DOCKER, `Failed to resume docker container ${item.name}`, true);
                LogService.error(
                  `Failed to resume docker container ${item.name}: ${reject}`,
                  "ResumeDockerContainerCommand"
                );
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to resume docker container ${item.name}`
                );
              });
          } catch (error) {
            ShowErrorMessage(TELEMETRY_DOCKER, `Failed to resume docker container ${item.name}`, true);
            LogService.error(`Failed to pause docker container ${item.name}: ${error}`, "ResumeDockerContainerCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to pause docker container ${item.name}`
            );
          }
        }
      );
    })
  );
};

export const ResumeContainerCommand: VirtualMachineCommand = {
  register: registerResumeDockerContainerCommand
};
