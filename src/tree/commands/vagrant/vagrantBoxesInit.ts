import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {VagrantBoxProvider} from "../../vagrantBoxProvider/vagrantBoxProvider";
import {VagrantBoxTreeItem} from "../../treeItems/vagrantBoxItem";
import {VagrantService} from "../../../services/vagrantService";
import {VagrantCommand} from "../BaseCommand";
import {ANSWER_NO, ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_VAGRANT} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerVagrantBoxInitCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantProviderInit, async (item: VagrantBoxTreeItem) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VAGRANT, "VAGRANT_BOX_INIT_COMMAND_CLICK");
      if (!item) {
        return;
      }
      if (item.name !== "") {
        let machineName = item.name;
        const machineNamePrompt = await vscode.window.showInputBox({
          prompt: "Name of the Virtual Machine?",
          placeHolder: machineName
        });

        if (machineNamePrompt) {
          machineName = machineNamePrompt;
        }

        let isWindowsMachine = await YesNoQuestion("Is this a Windows machine?");

        if (!isWindowsMachine) {
          isWindowsMachine = ANSWER_NO;
        }

        if (machineName && isWindowsMachine) {
          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Initializing Vagrant box ${item.name}`
            },
            async progress => {
              await VagrantService.init(item.name, machineName, isWindowsMachine === ANSWER_YES ? true : false, context)
                .then(
                  value => {
                    if (!value) {
                      ShowErrorMessage(TELEMETRY_VAGRANT, `Error initializing Vagrant box ${item.name}`);
                    }
                    vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
                  },
                  reason => {
                    ShowErrorMessage(TELEMETRY_VAGRANT, `Error initializing Vagrant box ${item.name}: ${reason}`);
                  }
                )
                .catch(reason => {
                  ShowErrorMessage(
                    TELEMETRY_VAGRANT,
                    `Error initializing Vagrant box ${item.name}: vagrant exited with code ${reason}`,
                    true
                  );
                });
            }
          );
        }
      }
    })
  );
};

export const VagrantBoxesInitCommand: VagrantCommand = {
  register: registerVagrantBoxInitCommand
};
