import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {VirtualMachineProvider} from "../../virtual_machine";
import {LogService} from "../../../services/logService";
import {VirtualMachineTreeItem} from "../../virtual_machine_item";
import {VirtualMachine} from "../../../models/parallels/virtualMachine";
import {DockerService} from "../../../services/dockerService";
import {VirtualMachineCommand} from "../BaseCommand";

const registerRunContainerCommand = (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.dockerRunContainer, async (item: VirtualMachineTreeItem) => {
      if (!item) {
        return;
      }
      return new Promise((resolve, reject) => {
        try {
          const config = Provider.getConfiguration();
          if (item && config.dockerRunItems && config.dockerRunItems.length > 0) {
            const currentItems = config.dockerRunItems.map(item => ({
              detail: item.details,
              description: item.description,
              label: item.label
            }));
            const vm = config.getVirtualMachine((item.item as VirtualMachine).ID);
            if (vm === undefined) {
              return;
            }

            const quickPick = vscode.window.createQuickPick();
            quickPick.ignoreFocusOut = true;
            quickPick.items = currentItems;
            quickPick.placeholder = "Select a docker run command, or type in your own";
            quickPick.title = "What docker do you want to run?";

            quickPick.onDidChangeValue(() => {
              // INJECT user values into proposed values
              if (!config.dockerRunItems.some(item => item.label == quickPick.value)) {
                const customItem = {
                  label: quickPick.value,
                  description: "Custom docker run command",
                  detail: `docker run ${quickPick.value}`
                };
                quickPick.items = [customItem, ...currentItems];
              }
            });

            quickPick.onDidAccept(async () => {
              const selection = quickPick.activeItems[0];
              let title = selection.label;
              let cmd = "sudo docker run ";
              if (selection.description == "Custom docker run command") {
                title = "Custom docker run command";
                const label = selection.label.replace("docker run ", "");
                cmd += label;
              } else {
                const dockerContainerItem = config.dockerRunItems.find(item => item.label == selection.label);
                title = dockerContainerItem?.label ?? selection.label;
                if (dockerContainerItem) {
                  cmd += dockerContainerItem.command;
                }
              }
              quickPick.hide();
              vscode.window.withProgress(
                {
                  location: vscode.ProgressLocation.Notification,
                  title: `Creating docker container ${title} on ${
                    (item.item as VirtualMachine)?.Name ?? "Virtual Machine"
                  }...`
                },
                async () => {
                  try {
                    await DockerService.runContainer(vm.ID, cmd)
                      .then(result => {
                        if (result) {
                          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                          LogService.info(`Docker container ${title} created`);
                          LogService.sendTelemetryEvent(
                            TelemetryEventIds.VirtualMachineAction,
                            `Docker container ${title} created`
                          );
                        } else {
                          vscode.window.showErrorMessage(`Failed to create docker container ${title}`);
                          LogService.error(
                            `Failed to create docker container ${title}`,
                            "CreateDockerContainerCommand"
                          );
                          LogService.sendTelemetryEvent(
                            TelemetryEventIds.VirtualMachineAction,
                            `Failed to create docker container ${title}`
                          );
                        }
                      })
                      .catch(reject => {
                        vscode.window.showErrorMessage(`Failed to create docker container ${title}`);
                        LogService.error(
                          `Failed to create docker container ${title}: ${reject}`,
                          "CreateDockerContainerCommand"
                        );
                        LogService.sendTelemetryEvent(
                          TelemetryEventIds.VirtualMachineAction,
                          `Failed to create docker container ${title}`
                        );
                      });
                  } catch (error) {
                    vscode.window.showErrorMessage(`Failed to create docker container ${selection.label}`);
                  }
                }
              );
              // resolve(cmd);
            });
            quickPick.show();
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to create docker container ${item.name}`);
          LogService.error(`Failed to create docker container ${item.name}: ${error}`, "CreateDockerContainerCommand");
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed to create docker container ${item.name}`
          );
        }
      });
    })
  );
};

export const RunContainerCommand: VirtualMachineCommand = {
  register: registerRunContainerCommand
};
