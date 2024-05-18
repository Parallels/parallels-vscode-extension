import * as vscode from "vscode";

import {CommandsFlags} from "../../../constants/flags";
import {VagrantBoxProvider} from "../../vagrantBoxProvider/vagrantBoxProvider";
import {VagrantBoxTreeItem} from "../../treeItems/vagrantBoxItem";
import {VagrantService} from "../../../services/vagrantService";
import {VagrantCommand} from "../BaseCommand";

const registerVagrantBoxRemoveCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantBoxProviderDelete, async (item: VagrantBoxTreeItem) => {
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
                    vscode.window.showErrorMessage(`Error removing Vagrant box ${item.name}`);
                  }
                  vscode.commands.executeCommand(CommandsFlags.vagrantBoxProviderRefresh);
                },
                reason => {
                  vscode.window.showErrorMessage(
                    `Error removing Vagrant box ${item.name}: vagrant exited with code ${reason}`
                  );
                }
              )
              .catch(reason => {
                vscode.window.showErrorMessage(
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
