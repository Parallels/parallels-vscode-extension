import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_NO_GROUP, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtual_machine";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../virtual_machine_item";
import {DockerImageOperation, DockerService} from "../../../services/dockerService";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {VirtualMachineCommand} from "../BaseCommand";

const registerRemoveDockerImageCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerRemoveImage, async (item: VirtualMachineTreeItem) => {
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
                  vscode.window.showErrorMessage(`Failed to remove docker image ${item.name}`);
                  LogService.error(`Failed to remove docker image ${item.name}`, "RemoveDockerImageCommand");
                  LogService.sendTelemetryEvent(
                    TelemetryEventIds.VirtualMachineAction,
                    `Failed to remove docker image ${item.name}`
                  );
                }
              })
              .catch(reject => {
                vscode.window.showErrorMessage(`Failed to remove docker image ${item.name}`);
                LogService.error(`Failed to remove docker image ${item.name}: ${reject}`, "RemoveDockerImageCommand");
                LogService.sendTelemetryEvent(
                  TelemetryEventIds.VirtualMachineAction,
                  `Failed to remove docker image ${item.name}`
                );
              });
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove docker image ${item.name}`);
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
