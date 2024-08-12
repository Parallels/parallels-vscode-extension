import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtualMachinesProvider/virtualMachineProvider";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../treeItems/virtualMachineTreeItem";
import {DockerImageOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_DOCKER} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerRemoveDockerImageCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerRemoveImage, async (item: VirtualMachineTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "REMOVE_DOCKER_IMAGE_COMMAND_CLICK");
      if (!item) {
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Removing docker image ${item.name} on ${(item.item as VirtualMachine)?.Name ?? "Virtual Machine"}...`
        },
        async () => {
          try {
            const config = Provider.getConfiguration();
            const currentVm = config.allMachines.find(vm => vm.ID === (item.item as VirtualMachine).ID);
            if (!currentVm || currentVm.State !== "running") {
              return;
            }

            await DockerService.imageOp(DockerImageOperation.Remove, currentVm.ID, item.id.replace(currentVm.ID, ""))
              .then(result => {
                if (result) {
                  vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  LogService.info(`Docker image ${item.name} removed`);
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Docker image ${item.name} removed`
                  );
                } else {
                  ShowErrorMessage(TELEMETRY_DOCKER, `Failed to remove docker image ${item.name}`, true);
                  LogService.error(`Failed to remove docker image ${item.name}`, "RemoveDockerImageCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to remove docker image ${item.name}`
                  );
                }
              })
              .catch(reject => {
                ShowErrorMessage(TELEMETRY_DOCKER, `Failed to remove docker image ${item.name}`, true);
                LogService.error(`Failed to remove docker image ${item.name}: ${reject}`, "RemoveDockerImageCommand");
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to remove docker image ${item.name}`
                );
              });
          } catch (error) {
            ShowErrorMessage(TELEMETRY_DOCKER, `Failed to remove docker image ${item.name}`, true);
            LogService.error(`Failed to remove docker image ${item.name}: ${error}`, "RemoveDockerImageCommand");
            LogService.sendTelemetryEvent(
              TelemetryEventIds.VirtualMachineAction,
              `Failed to remove docker image ${item.name}`
            );
          }
        }
      );
    })
  );
};

export const RemoveImageCommand: VirtualMachineCommand = {
  register: registerRemoveDockerImageCommand
};
