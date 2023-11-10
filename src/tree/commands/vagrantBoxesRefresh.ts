import * as vscode from "vscode";

import {CommandsFlags} from "../../constants/flags";
import {VagrantBoxProvider} from "../vagrant_boxes";
import {VagrantCommand} from "./BaseCommand";

const registerVagrantBoxRefreshCommand = (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantBoxProviderRefresh, async () => {
      provider.refresh();
    })
  );
};

export const VagrantBoxRefreshCommand: VagrantCommand = {
  register: registerVagrantBoxRefreshCommand
};
