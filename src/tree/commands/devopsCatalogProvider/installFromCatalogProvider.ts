import { DevOpsCatalogProvider } from '../../devopsCatalogProvider/devopsCatalogProvider';
import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogCommand} from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';

const registerDevOpsInstallFromCatalogCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsInstallFromCatalogProvider, async (item: any) => {
      DevOpsService.install().then(() => {
        const config = Provider.getConfiguration();
        config.initDevOpsService();
      })
    })
  );
};

export const DevOpsInstallFromCatalogCommand: DevOpsCatalogCommand = {
  register: registerDevOpsInstallFromCatalogCommand
};
