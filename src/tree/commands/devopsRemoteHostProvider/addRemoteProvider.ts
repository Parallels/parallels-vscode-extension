import * as vscode from "vscode";
import { Provider } from "../../../ioc/provider";
import { CommandsFlags, TelemetryEventIds } from "../../../constants/flags";
import { LogService } from "../../../services/logService";
import { DevOpsRemoteHostsCommand } from "../BaseCommand";
import { DevOpsService } from '../../../services/devopsService';
import { DevOpsCatalogHostProvider } from '../../../models/devops/catalogHostProvider';
import { randomUUID } from 'crypto';
import { DevOpsRemoteHostsTreeProvider } from '../../devops_remote/remote_hosts_tree_provider';
import { DevOpsRemoteHostProvider } from "../../../models/devops/remoteHostProvider";
import { cleanString } from "../../../helpers/strings";

const registerDevOpsAddRemoteProviderCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddRemoteProvider, async (item: any) => {
      const currentItems:  vscode.QuickPickItem[] = [
        {
          label: "Orchestrator"

        },
        {
          label: "Remote Host"
        }
      ];

      const quickPick = vscode.window.createQuickPick();
      quickPick.ignoreFocusOut = true;
      quickPick.items = currentItems;
      quickPick.placeholder = "Select the type of remote provider you want to add";
      quickPick.title = "What type of provider?";

      quickPick.onDidAccept(async () => {
        const type = quickPick.activeItems[0].label;
        const typeName = type === currentItems[0].label ? "Orchestrator" : "Remote";
        quickPick.hide();
        const host = await vscode.window.showInputBox({
          prompt:  `${typeName} host?`,
          placeHolder: `Enter the ${typeName} host, example http://localhost:8080`,
          ignoreFocusOut: true
        });
        if (!host) {
          vscode.window.showErrorMessage(`${typeName} host is required`);
          return;
        }

        const name = await vscode.window.showInputBox({
          prompt: `${typeName} host Name?`,
          placeHolder: `Enter the ${ typeName} host Name`,
          ignoreFocusOut: true
        });
        if (!name) {
          vscode.window.showErrorMessage(`${typeName} name is required`);
          return;
        }

        const username = await vscode.window.showInputBox({
          prompt: `${typeName} Username?`,
          placeHolder: `Enter the ${typeName} Username`,
          ignoreFocusOut: true
        });
        if (!username) {
          vscode.window.showErrorMessage(`${typeName} Username is required`);
          return;
        }

        const password = await vscode.window.showInputBox({
          prompt: `${typeName} Password?`,
          placeHolder: `Enter the ${typeName} Password`,
          password: true,
          ignoreFocusOut: true,
        });
        if (!password) {
          vscode.window.showErrorMessage(`${typeName} Password is required`);
          return;
        }

        const remoteHostProvider: DevOpsRemoteHostProvider = {
          class: "DevOpsRemoteHostProvider",
          ID: cleanString(name),
          type: type === currentItems[0].label ? "orchestrator" : "remote_host",
          rawHost: host ?? "",
          name: name ?? "",
          username: username ?? "",
          password: password ?? "",
          state: "unknown",
          virtualMachines: []
        }

        const hostname = new URL(host)
        remoteHostProvider.host = hostname.hostname;
        remoteHostProvider.port = parseInt(hostname.port);
        remoteHostProvider.scheme = hostname.protocol.replace(":", "");

        DevOpsService.testHost(remoteHostProvider).then(async () => {
          const config = Provider.getConfiguration();
          const ok = config.addRemoteHostProvider(remoteHostProvider);
          if (!ok) {
            vscode.window.showErrorMessage(`Failed to add ${typeName} Provider`);
            return;
          }
      
          vscode.window.showInformationMessage(`${typeName} Host was added successfully`);
          await DevOpsService.refreshRemoteHostProviders(true);

          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        }).catch((error) => {
          vscode.window.showErrorMessage(`Failed to connect to ${typeName} Host ${host}, err:\n ${error}`);
        })
      });

      quickPick.show();
    })
  );
};

export const DevOpsAddRemoteProviderCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsAddRemoteProviderCommand
};
