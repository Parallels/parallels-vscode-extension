import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {VagrantBoxProvider} from "../../vagrant_boxes";
import {VagrantService} from "../../../services/vagrantService";
 
function getVagrantBoxes(context: vscode.ExtensionContext, query: string, order: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const response = await VagrantService.searchBoxFromCloud(query, order);

    const result = response.boxes.map(box => {
      return {
        label: box.tag,
        description: box.current_version.version,
        detail: box.short_description,
        iconPath: {
          dark: vscode.Uri.file(context.asAbsolutePath("img/dark/vagrant_boxes.svg")),
          light: vscode.Uri.file(context.asAbsolutePath("img/light/vagrant_boxes.svg"))
        },
      };
    });

    resolve( result);
  });
}
export function registerVagrantSearchAndDownloadCommand(
  context: vscode.ExtensionContext,
  provider: VagrantBoxProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantSearchAndDownload, async () => {
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
                let order = "created";
                quickPick.onDidTriggerButton(async (btn: vscode.QuickInputButton) => {
                  quickPick.items = [];
                  if (btn.tooltip === "Sort by Date Created") {
                    order = "created";
                  }
                  if (btn.tooltip === "Sort by Downloads") {
                    order = "downloads";
                  }
                  quickPick.items = await getVagrantBoxes(context, query, order);
                });
                
                quickPick.buttons = [
                  {
                    iconPath: {
                      dark: vscode.Uri.file(context.asAbsolutePath("img/dark/vagrant_boxes.svg")),
                      light: vscode.Uri.file(context.asAbsolutePath("img/light/vagrant_boxes.svg"))
                    },
                    tooltip: "Sort by Date Created",
                  },
                  {
                    iconPath: {
                      dark: vscode.Uri.file(context.asAbsolutePath("img/dark/vagrant_boxes.svg")),
                      light: vscode.Uri.file(context.asAbsolutePath("img/light/vagrant_boxes.svg"))
                    },
                    tooltip: "Sort by Downloads",
                  }
                ];
                quickPick.items = await getVagrantBoxes(context, query, order);

                quickPick.onDidChangeSelection(async selection => {
                  console.log(JSON.stringify(selection));
                  quickPick.hide();
                  if (selection.length === 0 || !selection[0]) {
                    vscode.window.showErrorMessage(`Failed to download and create Vagrant Box from cloud`);
                    return;
                  }
                  vscode.window
                    .showInputBox({
                      prompt: "Enter a name for the Vagrant Box",
                      placeHolder: "e.g. ubuntu, centos, etc."
                    })
                    .then(async boxName => {
                      if (!boxName) {
                        vscode.window.showErrorMessage(`Failed to download and create Vagrant Box from cloud`);
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
                            vscode.window.showErrorMessage(`${reject}`);
                            return;
                          });
                          if (!box) {
                            LogService.sendTelemetryEvent(
                              TelemetryEventIds.VirtualMachineAction,
                              `Failed to create Vagrant Box ${boxName}`
                            );
                            vscode.window.showErrorMessage(`Failed to create Vagrant Box ${boxName}.`);
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
          vscode.window.showErrorMessage(`Failed to download and create Vagrant Box from cloud`);
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
}
