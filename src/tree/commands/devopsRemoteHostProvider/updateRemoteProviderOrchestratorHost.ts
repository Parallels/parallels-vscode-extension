import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {UpdateOrchestratorHostRequest} from "../../../models/devops/updateOrchestratorHostRequest";
import {YesNoQuestion, ANSWER_YES} from "../../../helpers/ConfirmDialog";
import {TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsUpdateRemoteProviderOrchestratorHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsUpdateRemoteProviderOrchestratorHost, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_DEVOPS_REMOTE, "UPDATE_REMOTE_PROVIDER_ORCHESTRATOR_HOST_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const hostId = item.id.split("%%")[2];
      const provider = config.findRemoteHostProviderById(providerId);
      const host = config.findRemoteHostProviderHostById(providerId, hostId);
      if (!provider || !host) {
        ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Remote Host Provider ${item.name} not found`);
        return;
      }

      if (!host) {
        ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Remote host is required`);
        return;
      }

      const selectedOptions = await vscode.window.showQuickPick(
        [
          {
            label: "Name"
          },
          {
            label: "Host"
          },
          {
            label: "Credentials"
          }
        ],
        {
          placeHolder: "Select the type of changes you want to make",
          ignoreFocusOut: true,
          title: "What do you want to update?"
        }
      );

      if (!selectedOptions) {
        ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `No option selected`);
        return;
      }

      const request: UpdateOrchestratorHostRequest = {};
      switch (selectedOptions.label.toUpperCase()) {
        case "NAME": {
          const description = await vscode.window.showInputBox({
            prompt: `Remote host Description?`,
            placeHolder: `Enter the a description for the remote host`,
            value: host.description,
            ignoreFocusOut: true
          });
          request.description = description;

          const confirmation = await YesNoQuestion(
            `Are you sure you want to rename provider ${item.name} to ${description}?`
          );

          if (confirmation !== ANSWER_YES) {
            return;
          }
          break;
        }
        case "HOST": {
          const hostname = await vscode.window.showInputBox({
            prompt: `Remote host?`,
            placeHolder: `Enter the remote host url, example http://localhost:8080`,
            value: host.host,
            ignoreFocusOut: true
          });
          request.host = hostname;
          const confirmation = await YesNoQuestion(
            `Are you sure you want to update provider ${item.name} host to ${hostname}?`
          );

          if (confirmation !== ANSWER_YES) {
            return;
          }
          break;
        }
        case "CREDENTIALS": {
          const username = await vscode.window.showInputBox({
            prompt: `Remote Host Username?`,
            placeHolder: `Enter the Remote Host Username`,
            ignoreFocusOut: true
          });
          if (!username) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Remote Host Username is required`);
            return;
          }

          const password = await vscode.window.showInputBox({
            prompt: `Remote Host Password?`,
            placeHolder: `Enter the Remote Host Password`,
            password: true,
            ignoreFocusOut: true
          });
          if (!password) {
            ShowErrorMessage(TELEMETRY_DEVOPS_REMOTE, `Remote Host Password is required`);
            return;
          }
          request.authentication = {
            username: username,
            password: password
          };

          const confirmation = await YesNoQuestion(
            `Are you sure you want to update provider ${item.name} credentials?`
          );

          if (confirmation !== ANSWER_YES) {
            return;
          }
          break;
        }
      }

      let foundError = false;
      await DevOpsService.updateRemoteHostOrchestratorHost(provider, hostId, request).catch(() => {
        ShowErrorMessage(
          TELEMETRY_DEVOPS_REMOTE,
          `Failed to update ${host.description} in the Orchestrator ${provider.name}`,
          true
        );
        foundError = true;
        return;
      });

      if (foundError) {
        return;
      }

      vscode.window.showInformationMessage(`Remote Host was updated successfully in the Orchestrator ${provider.name}`);
      await DevOpsService.refreshRemoteHostProviders(true);
      vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
    })
  );
};

export const DevOpsUpdateRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsUpdateRemoteProviderOrchestratorHostCommand
};
