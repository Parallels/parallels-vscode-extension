import {config} from "process";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsCatalogCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {cleanString} from "../../../helpers/strings";

const registerDevOpsAddCatalogProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddCatalogProvider, async (item: any) => {
      let host = await vscode.window.showInputBox({
        prompt: "Catalog Provider Host?",
        placeHolder: "Enter the Catalog Provider Host, example http://localhost:8080",
        ignoreFocusOut: true
      });
      if (!host) {
        vscode.window.showErrorMessage("Catalog Provider Host is required");
        return;
      }
      if (!host.startsWith("http://") && !host.startsWith("https://")) {
        host = `https://${host}`;
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

      const catalogHostProvider: DevOpsCatalogHostProvider = {
        class: "DevOpsCatalogHostProvider",
        ID: cleanString(name),
        rawHost: host ?? "",
        name: name ?? "",
        username: "",
        password: "",
        state: "unknown",
        manifests: []
      };

      let hostname: URL;
      try {
        hostname = new URL(host);
      } catch (error) {
        vscode.window.showErrorMessage("Invalid Catalog Provider Host");
        return;
      }

      catalogHostProvider.host = hostname.hostname;
      catalogHostProvider.port = parseInt(hostname.port);
      catalogHostProvider.scheme = hostname.protocol.replace(":", "");

      let retry = 3;
      let foundError = false;
      while (true) {
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
          ignoreFocusOut: true
        });
        if (!password) {
          vscode.window.showErrorMessage("Catalog Provider Password is required");
          return;
        }

        catalogHostProvider.username = username;
        catalogHostProvider.password = password;

        const auth = await DevOpsService.authorize(catalogHostProvider).catch(error => {
          foundError = true;
        });
        if (auth && auth.token && !foundError) {
          break;
        }
        if (!auth || !foundError) {
          foundError = true;
        }

        if (retry === 0) {
          break;
        }
        vscode.window.showErrorMessage(`Failed to connect to catalog provider ${host}`);

        retry--;
      }
      if (foundError) {
        vscode.window.showErrorMessage(`Failed to add Catalog Provider ${host}`);
        return;
      }

      const config = Provider.getConfiguration();
      const ok = config.addCatalogProvider(catalogHostProvider);
      if (!ok) {
        vscode.window.showErrorMessage(`Failed to add Catalog Provider ${host}`);
        return;
      }

      vscode.window.showInformationMessage(`Catalog Provider ${host} was added successfully`);
      await DevOpsService.refreshCatalogProviders(true);
      vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
    })
  );
};

export const DevOpsAddCatalogProviderCommand: DevOpsCatalogCommand = {
  register: registerDevOpsAddCatalogProviderCommand
};
