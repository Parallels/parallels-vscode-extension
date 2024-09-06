import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {VagrantService} from "../../../services/vagrantService";
import {CommonCommand} from "../BaseCommand";
import {TELEMETRY_VAGRANT} from "../../../telemetry/operations";

const registerVagrantInstallCommand = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.vagrantProviderInstall, async () => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_VAGRANT, "VAGRANT_INSTALL_COMMAND_CLICK");
      if (!(await VagrantService.isInstalled())) {
        const ok = await VagrantService.install(context);
        if (!ok) {
          vscode.window.showErrorMessage(`Error installing Hashicorp Vagrant Service`);
          return;
        }
      }
    })
  );
};

export const VagrantInstallCommand: CommonCommand = {
  register: registerVagrantInstallCommand
};
