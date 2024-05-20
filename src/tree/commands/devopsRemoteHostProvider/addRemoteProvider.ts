import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {cleanString} from "../../../helpers/strings";

const registerDevOpsAddRemoteProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddRemoteProvider, async (item: any) => {
      LogService.info("pressed the add remote provider button");
      const currentItems: vscode.QuickPickItem[] = [
        {
          label: "Orchestrator"
        },
        {
          label: "Remote Host"
        }
      ];

      const selectedType = await vscode.window.showQuickPick(currentItems, {
        placeHolder: "Select the type of remote provider you want to add",
        ignoreFocusOut: true,
        title: "What type of provider?"
      });

      const type = selectedType?.label ?? "Orchestrator";
      const typeName = type === currentItems[0].label ? "Orchestrator" : "Remote";
      let host = await vscode.window.showInputBox({
        prompt: `${typeName} host?`,
        placeHolder: `Enter the ${typeName} host, example http://localhost:8080`,
        ignoreFocusOut: true
      });
      if (!host) {
        vscode.window.showErrorMessage(`${typeName} host is required`);
        return;
      }
      if (!host.startsWith("http://") && !host.startsWith("https://")) {
        host = `https://${host}`;
      }

      const name = await vscode.window.showInputBox({
        prompt: `${typeName} host Name?`,
        placeHolder: `Enter the ${typeName} host Name`,
        ignoreFocusOut: true
      });
      if (!name) {
        vscode.window.showErrorMessage(`${typeName} name is required`);
        return;
      }

      const remoteHostProvider: DevOpsRemoteHostProvider = {
        class: "DevOpsRemoteHostProvider",
        ID: cleanString(name),
        type: type === currentItems[0].label ? "orchestrator" : "remote_host",
        rawHost: host ?? "",
        name: name ?? "",
        username: "",
        password: "",
        state: "unknown",
        virtualMachines: []
      };

      let hostname: URL;
      try {
        hostname = new URL(host);
      } catch (error) {
        vscode.window.showErrorMessage("Invalid Catalog Provider Host");
        return;
      }
      remoteHostProvider.host = hostname.hostname;
      remoteHostProvider.port = parseInt(hostname.port);
      remoteHostProvider.scheme = hostname.protocol.replace(":", "");

      let retry = 3;
      let foundError = false;
      while (true) {
        const username = await vscode.window.showInputBox({
          prompt: `${typeName} Username?`,
          placeHolder: `Enter the ${typeName} Username`,
          ignoreFocusOut: true
        });
        if (!username) {
          if (retry < 3) {
            vscode.window.showErrorMessage(`Failed to add ${typeName} Provider`);
          } else {
            vscode.window.showErrorMessage(`${typeName} Username is required`);
          }
          return;
        }

        const password = await vscode.window.showInputBox({
          prompt: `${typeName} Password?`,
          placeHolder: `Enter the ${typeName} Password`,
          password: true,
          ignoreFocusOut: true
        });
        if (!password) {
          if (retry < 3) {
            vscode.window.showErrorMessage(`Failed to add ${typeName} Provider`);
          } else {
            vscode.window.showErrorMessage(`${typeName} Password is required`);
          }
          return;
        }

        remoteHostProvider.username = username;
        remoteHostProvider.password = password;

        const auth = await DevOpsService.authorize(remoteHostProvider).catch(error => {
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
        vscode.window.showErrorMessage(`Failed to connect to ${typeName} Host ${host}`);

        retry--;
      }

      if (foundError) {
        vscode.window.showErrorMessage(`Failed to add ${typeName} Provider`);
        return;
      }

      const config = Provider.getConfiguration();
      const ok = config.addRemoteHostProvider(remoteHostProvider);
      if (!ok) {
        vscode.window.showErrorMessage(`Failed to add ${typeName} Provider`);
        return;
      }

      vscode.window.showInformationMessage(`${typeName} Host was added successfully`);

      await DevOpsService.refreshRemoteHostProviders(true);
      vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
    })
  );
};

export const DevOpsAddRemoteProviderCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsAddRemoteProviderCommand
};
