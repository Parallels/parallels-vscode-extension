import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {YesNoQuestion, ANSWER_YES} from "../../../helpers/ConfirmDialog";
import {DevOpsService} from "../../../services/devopsService";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsManagementProviderUpdateProviderCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementUpdateProvider, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "UPDATE_PROVIDER_COMMAND_CLICK");
      if (!item) {
        return;
      }

      let providerType = "";
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[1];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(providerId);
        switch (provider?.type) {
          case "remote_host":
            providerType = "Remote Host";
            break;
          case "orchestrator":
            providerType = "Orchestrator";
            break;
        }
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(providerId);
        providerType = "Catalog";
      }
      if (!provider) {
        ShowErrorMessage(providerName, `Remote Host Provider User ${item.name} not found`);
        return;
      }

      const selectedOptions = await vscode.window.showQuickPick(
        [
          {
            label: "Name"
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
        ShowErrorMessage(providerName, `No option selected`);
        return;
      }

      switch (selectedOptions.label.toUpperCase()) {
        case "NAME": {
          const newName = await vscode.window.showInputBox({
            prompt: `Rename ${providerType} provider to?`,
            placeHolder: `Enter the new ${providerType} provider name`,
            ignoreFocusOut: true,
            value: provider.name
          });
          if (!newName) {
            ShowErrorMessage(providerName, `New Name is required`);
            return;
          }

          const confirmation = await YesNoQuestion(
            `Are you sure you want to rename provider ${item.name} to ${newName}?`
          );

          if (confirmation !== ANSWER_YES) {
            return;
          }

          const ok = config.renameRemoteProvider(provider, newName);
          if (ok) {
            vscode.window.showInformationMessage(`Provider ${item.name} renamed to ${newName}`);
          } else {
            ShowErrorMessage(providerName, `Error renaming provider ${item.name} to ${newName}`);
          }
          if (item.className === "DevOpsRemoteHostProvider") {
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          }
          if (item.className === "DevOpsCatalogHostProvider") {
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          }
          break;
        }
        case "CREDENTIALS": {
          let retry = 3;
          let foundError = false;

          const confirmation = await YesNoQuestion(
            `Are you sure you want to update the credentials for provider ${item.name}?`
          );

          if (confirmation !== ANSWER_YES) {
            return;
          }

          while (true) {
            const username = await vscode.window.showInputBox({
              prompt: `${providerType} Provider Name?`,
              placeHolder: `Enter the ${providerType} Provider Name`,
              value: provider.username,
              ignoreFocusOut: true
            });
            if (!username) {
              ShowErrorMessage(providerName, `${providerType} Provider Name is required`);
              return;
            }

            const password = await vscode.window.showInputBox({
              prompt: `${providerType} Provider Password?`,
              placeHolder: `Enter the ${providerType} Provider Password`,
              value: provider.password,
              password: true,
              ignoreFocusOut: true
            });
            if (!password) {
              ShowErrorMessage(providerName, `${providerType} Provider Password is required`);
              return;
            }

            provider.username = username;
            provider.password = password;

            const auth = await DevOpsService.authorize(provider).catch(error => {
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

            ShowErrorMessage(providerName, `Failed to connect to ${providerType} provider ${provider.host}`);

            retry--;
          }
          if (foundError) {
            ShowErrorMessage(providerName, `Failed to connect to ${providerType} provider ${provider.host}`);
            return;
          }

          const config = Provider.getConfiguration();
          if (!config.updateRemoteProvider(provider)) {
            ShowErrorMessage(providerName, `Failed to update ${providerType} Provider ${provider.host}`);
            return;
          }

          vscode.window.showInformationMessage(`Provider Credentials ${provider.name} updated`);
          break;
        }
      }
    })
  );
};

export const DevOpsManagementProviderUpdateProviderCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderUpdateProviderCommand
};
