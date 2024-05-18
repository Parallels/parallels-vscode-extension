import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogCommand, DevOpsRemoteHostsCommand} from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsRemoteHostsProvider } from '../../devopsRemoteHostProvider/devOpsRemoteHostProvider';

const registerDevOpsInstallFromRemoteCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsInstallFromRemoteProvider, async (item: any) => {
      DevOpsService.install().then(() => {
        const config = Provider.getConfiguration();
        config.initDevOpsService();
      })
    })
  );
};

export const DevOpsInstallFromRemoteCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsInstallFromRemoteCommand
};
