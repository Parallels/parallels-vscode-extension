import * as vscode from "vscode";

import {CommandsFlags} from "../../../constants/flags";
import {VagrantBoxProvider} from "../../vagrantBoxProvider/vagrantBoxProvider";
import {VagrantCommand} from "../BaseCommand";
import {LogService} from "../../../services/logService";

const registerVagrantBoxRefreshCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantProviderRefresh, async () => {
      LogService.info("Refreshing Vagrant Boxes");
      provider.refresh();
    })
  );
};

export const VagrantBoxRefreshCommand: VagrantCommand = {
  register: registerVagrantBoxRefreshCommand
};
