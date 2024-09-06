import * as vscode from "vscode";

import {CommandsFlags} from "../../../constants/flags";
import {VagrantBoxProvider} from "../../vagrantBoxProvider/vagrantBoxProvider";
import {VagrantBoxTreeItem} from "../../treeItems/vagrantBoxItem";
import {VagrantService} from "../../../services/vagrantService";
import {VagrantCommand} from "../BaseCommand";
import {TELEMETRY_VAGRANT} from "../../../telemetry/operations";
import {Provider} from "../../../ioc/provider";
import {ShowErrorMessage} from "../../../helpers/error";

const registerVagrantBoxRemoveCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantProviderDelete, async (item: VagrantBoxTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VAGRANT, "VAGRANT_BOX_REMOVE_COMMAND_CLICK");
      if (!item) {
        return;
      }
      if (item.name !== "") {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Removing Vagrant box ${item.name}`
          },
          async progress => {
            await VagrantService.remove(item.name)
              .then(
                value => {
                  if (!value) {
                    ShowErrorMessage(TELEMETRY_VAGRANT, `Failed to remove Vagrant box ${item.name}`);
                  }
                  vscode.commands.executeCommand(CommandsFlags.vagrantProviderRefresh);
                },
                reason => {
                  ShowErrorMessage(
                    TELEMETRY_VAGRANT,
                    `Error removing Vagrant box ${item.name}: vagrant exited with code ${reason}`
                  );
                }
              )
              .catch(reason => {
                ShowErrorMessage(
                  TELEMETRY_VAGRANT,
                  `Error removing Vagrant box ${item.name}: vagrant exited with code ${reason}`
                );
              });
          }
        );
      }
    })
  );
};

export const VagrantBoxesRemoveCommand: VagrantCommand = {
  register: registerVagrantBoxRemoveCommand
};
