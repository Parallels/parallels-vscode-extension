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
import { AddOrchestratorHostRequest } from "../../../models/devops/addOrchestratorHostRequest";

const registerDevOpsAddRemoteProviderOrchestratorHostCommand = (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsAddRemoteProviderOrchestratorHost, async (item: any) => {
      if (!item) {
        return;
      }
      const providerId = item.id.split("%%")[0];
      const provider = Provider.getConfiguration().findRemoteHostProviderById(providerId);
      if (!provider) {
        vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
        return;
      }

      const host = await vscode.window.showInputBox({
        prompt: `Remote host?`,
        placeHolder: `Enter the remote host url, example http://localhost:8080`,
        ignoreFocusOut: true
      });
      if (!host) {
        vscode.window.showErrorMessage(`Remote host is required`);
        return;
      }

      const description = await vscode.window.showInputBox({
        prompt: `Remote host Description?`,
        placeHolder: `Enter the a description for the remote host`,
        ignoreFocusOut: true
      });

      let tags: string[] = []
      const tagsString = await vscode.window.showInputBox({
        prompt: `Add tags to the Remote Host?`,
        placeHolder: `Add tags separated by comma, example: tag1,tag2`,
        ignoreFocusOut: true
      });
      if (tagsString) {
        tags =tagsString.split(",");
      }

      const username = await vscode.window.showInputBox({
        prompt: `Remote Host Username?`,
        placeHolder: `Enter the Remote Host Username`,
        ignoreFocusOut: true
      });
      if (!username) {
        vscode.window.showErrorMessage(`Remote Host Username is required`);
        return;
      }

      const password = await vscode.window.showInputBox({
        prompt: `Remote Host Password?`,
        placeHolder: `Enter the Remote Host Password`,
        password: true,
        ignoreFocusOut: true,
      });
      if (!password) {
        vscode.window.showErrorMessage(`Remote Host Password is required`);
        return;
      }

      const request: AddOrchestratorHostRequest = {
        host: host,
        description: description,
        tags: tags,
        authentication: {
          username: username,
          password: password
        }
      }
      const remoteHostProvider: DevOpsRemoteHostProvider = {
        class: "DevOpsRemoteHostProvider",
        ID: cleanString("tester"),
        type: "remote_host",
        rawHost: host ?? "",
        name:  "tester",
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
        await DevOpsService.addRemoteHostOrchestratorHost(provider, request).catch(() => {
          vscode.window.showErrorMessage(`Failed to add ${host} to the Orchestrator ${provider.name}`);
          return;
        })

        vscode.window.showInformationMessage(`Remote Host was added successfully to the Orchestrator ${provider.name}`);
        await DevOpsService.refreshRemoteHostProviders(true);
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
      }).catch((error) => {
        vscode.window.showErrorMessage(`Failed to connect to Remote Host ${host}, err:\n ${error}`);
      })
    })
  );
};

export const DevOpsAddRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsAddRemoteProviderOrchestratorHostCommand
};
