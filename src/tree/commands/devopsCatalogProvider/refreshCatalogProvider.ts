import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsCatalogCommand} from "../BaseCommand";

const registerDevOpsRefreshCatalogProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRefreshCatalogProvider, async () => {
      LogService.debug("Refreshing Catalog Providers", "RefreshCatalogProviderCommand");

      provider.refresh();
    })
  );
};

export const DevOpsRefreshCatalogProviderCommand: DevOpsCatalogCommand = {
  register: registerDevOpsRefreshCatalogProviderCommand
};
