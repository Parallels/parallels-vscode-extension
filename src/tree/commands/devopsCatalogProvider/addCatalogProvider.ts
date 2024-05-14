import { config } from 'process';
import { DevOpsCatalogProvider } from '../../devops_catalog/devops_catalog';
import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsCatalogCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsCatalogHostProvider } from '../../../models/devops/catalogHostProvider';
import { cleanString } from '../../../helpers/strings';

const registerDevOpsAddCatalogProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddCatalogProvider, async (item: any) => {
      const host = await vscode.window.showInputBox({
        prompt: "Catalog Provider Host?",
        placeHolder: "Enter the Catalog Provider Host, example http://localhost:8080",
        ignoreFocusOut: true
      });
      if (!host) {
        vscode.window.showErrorMessage("Catalog Provider Host is required");
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: "Catalog Provider Name?",
        placeHolder: "Enter the Catalog Provider Name",
        ignoreFocusOut: true
      });
      if (!name) {
        vscode.window.showErrorMessage("Catalog Provider Name is required");
        return;
      }

      const username = await vscode.window.showInputBox({
        prompt: "Catalog Provider Username?",
        placeHolder: "Enter the Catalog Provider Username",
        ignoreFocusOut: true
      });
      if (!username) {
        vscode.window.showErrorMessage("Catalog Provider Username is required");
        return;
      }

      const password = await vscode.window.showInputBox({
        prompt: "Catalog Provider Password?",
        placeHolder: "Enter the Catalog Provider Password",
        password: true,
        ignoreFocusOut: true,
      });
      if (!password) {
        vscode.window.showErrorMessage("Catalog Provider Password is required");
        return;
      }

      const catalogHostProvider: DevOpsCatalogHostProvider = {
        class: "DevOpsCatalogHostProvider",
        ID: cleanString(name),
        rawHost: host ?? "",
        name: name ?? "",
        username: username ?? "",
        password: password ?? "",
        state: "unknown",
        manifests: []
      }

      DevOpsService.testHost(catalogHostProvider).then(async () => {
        const config = Provider.getConfiguration();
        const ok = config.addCatalogProvider(catalogHostProvider);
        if (!ok) {
          vscode.window.showErrorMessage(`Failed to add Catalog Provider ${host}`);
          return;
        }
        
        vscode.window.showInformationMessage(`Catalog Provider ${host} was added successfully`);
        await DevOpsService.refreshCatalogProviders(true)
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
      }).catch((error) => {
        vscode.window.showErrorMessage(`Failed to connect to Catalog Provider Host ${host}, err:\n ${error}`);
      })
    })
  );
};

export const DevOpsAddCatalogProviderCommand: DevOpsCatalogCommand = {
  register: registerDevOpsAddCatalogProviderCommand
};
