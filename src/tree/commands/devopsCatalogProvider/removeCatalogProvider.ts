import { config } from 'process';
import { DevOpsCatalogProvider } from '../../devopsCatalogProvider/devopsCatalogProvider';
import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, FLAG_DEVOPS_CATALOG_HAS_ITEMS, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsCatalogCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsCatalogHostProvider } from '../../../models/devops/catalogHostProvider';
import { cleanString } from '../../../helpers/strings';
import { ANSWER_YES, YesNoQuestion } from '../../../helpers/ConfirmDialog';

const registerDevOpsRemoveCatalogProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveCatalogProvider, async (item: any) => {
      if (!item) {
        return;
      }
      const confirmation = await YesNoQuestion(
        `Are you sure you want to delete the catalog provider ${item.name}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[1];
      const provider = config.findCatalogProviderByIOrName(providerId);
      if (!provider) {
        vscode.window.showErrorMessage(`Catalog Provider ${item.name} not found`);
        return;
      }

      if (config.removeCatalogProvider(providerId)) {
        if (config.allCatalogProviders.length === 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, false);
        }
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        await DevOpsService.refreshCatalogProviders(true)
        vscode.window.showInformationMessage(`Catalog Provider ${item.name} removed successfully`);
      } else {
        vscode.window.showErrorMessage(`Error removing Catalog Provider ${item.name}`);
      }
    })
  );
};

export const DevOpsRemoveCatalogProviderCommand: DevOpsCatalogCommand = {
  register: registerDevOpsRemoveCatalogProviderCommand
};
