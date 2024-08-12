import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {VagrantBoxProvider} from "../../vagrantBoxProvider/vagrantBoxProvider";
import {VagrantService} from "../../../services/vagrantService";
import {VagrantCommand} from "../BaseCommand";
import {TELEMETRY_VAGRANT} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerVagrantSearchAndDownloadCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantSearchAndDownload, async () => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VAGRANT, "VAGRANT_SEARCH_AND_DOWNLOAD_COMMAND_CLICK");
      return new Promise((resolve, reject) => {
        try {
          const config = Provider.getConfiguration();
          vscode.window
            .showInputBox({
              prompt: "Search for a Vagrant Box",
              placeHolder: "e.g. ubuntu, centos, etc."
            })
            .then(async query => {
              if (query) {
                const quickPick = vscode.window.createQuickPick();
                quickPick.title = "Select a Vagrant Box";
                quickPick.show();
                const response = await VagrantService.searchBoxFromCloud(query);
                quickPick.items = response.boxes.map(box => {
                  return {
                    label: box.tag,
                    description: box.current_version.version,
                    detail: box.short_description
                  };
                });
                quickPick.onDidChangeSelection(async selection => {
                  quickPick.hide();
                  if (selection.length === 0 || !selection[0]) {
                    ShowErrorMessage(TELEMETRY_VAGRANT, `Failed to download and create Vagrant Box from cloud`);
                    return;
                  }
                  vscode.window
                    .showInputBox({
                      prompt: "Enter a name for the Vagrant Box",
                      placeHolder: "e.g. ubuntu, centos, etc."
                    })
                    .then(async boxName => {
                      if (!boxName) {
                        ShowErrorMessage(TELEMETRY_VAGRANT, `Failed to download and create Vagrant Box from cloud`);
                        return;
                      }
                      vscode.window.withProgress(
                        {
                          location: vscode.ProgressLocation.Notification,
                          title: `Creating Vagrant Box ${boxName ?? "unknown"}`
                        },
                        async () => {
                          const box = await VagrantService.init(
                            selection[0].label,
                            boxName ?? selection[0].label,
                            false,
                            context
                          ).catch(reject => {
                            LogService.error(
                              `Failed to create Vagrant Box ${boxName}: ${reject}`,
                              "CreateDockerContainerCommand"
                            );
                            LogService.sendTelemetryEvent(
                              TelemetryEventIds.VirtualMachineAction,
                              `Failed to create Vagrant Box ${boxName}`
                            );
                            ShowErrorMessage(TELEMETRY_VAGRANT, `${reject}`);
                            return;
                          });
                          if (!box) {
                            LogService.sendTelemetryEvent(
                              TelemetryEventIds.VirtualMachineAction,
                              `Failed to create Vagrant Box ${boxName}`
                            );
                            ShowErrorMessage(TELEMETRY_VAGRANT, `Failed to create Vagrant Box ${boxName}`, true);
                            return;
                          }

                          LogService.sendTelemetryEvent(
                            TelemetryEventIds.VirtualMachineAction,
                            `Successfully created Vagrant Box ${boxName}`
                          );
                          vscode.window.showInformationMessage(`Successfully created Vagrant Box ${boxName}`);
                          vscode.commands.executeCommand(CommandsFlags.vagrantBoxProviderRefresh);
                          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                        }
                      );
                    });
                });
              }
            });
        } catch (error) {
          ShowErrorMessage(TELEMETRY_VAGRANT, `Failed to download and create Vagrant Box from cloud`);
          LogService.error(
            `Failed to download and create Vagrant Box from cloud: ${error}`,
            "CreateDockerContainerCommand"
          );
          LogService.sendTelemetryEvent(
            TelemetryEventIds.VirtualMachineAction,
            `Failed to download and create Vagrant Box from cloud`
          );
        }
      });
    })
  );
};

export const SearchAndDownloadBoxesCommand: VagrantCommand = {
  register: registerVagrantSearchAndDownloadCommand
};
