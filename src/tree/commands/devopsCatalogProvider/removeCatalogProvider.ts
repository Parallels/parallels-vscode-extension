import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, FLAG_DEVOPS_CATALOG_HAS_ITEMS} from "../../../constants/flags";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {ShowErrorMessage} from "../../../helpers/error";
import {TELEMETRY_DEVOPS_CATALOG} from "../../../telemetry/operations";

const registerDevOpsRemoveCatalogProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoveCatalogProvider, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_CATALOG, "REMOVE_CATALOG_PROVIDER_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const confirmation = await YesNoQuestion(`Are you sure you want to delete the catalog provider ${item.name}?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[1];
      const provider = config.findCatalogProviderByIOrName(providerId);
      if (!provider) {
        ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Catalog Provider ${item.name} not found`);
        return;
      }

      if (config.removeCatalogProvider(providerId)) {
        if (config.allCatalogProviders.length === 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, false);
        }
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        await DevOpsService.refreshCatalogProviders(true);
        vscode.window.showInformationMessage(`Catalog Provider ${item.name} removed successfully`);
      } else {
        ShowErrorMessage(TELEMETRY_DEVOPS_CATALOG, `Error removing Catalog Provider ${item.name}`, true);
      }
    })
  );
};

export const DevOpsRemoveCatalogProviderCommand: DevOpsCatalogCommand = {
  register: registerDevOpsRemoveCatalogProviderCommand
};
