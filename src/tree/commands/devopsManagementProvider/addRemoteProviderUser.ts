import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsCreateUserRequest} from "../../../models/devops/users";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";

const registerDevOpsManagementProviderAddUserCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementAddUser, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "ADD_PROVIDER_USER_COMMAND_CLICK");
      if (!item) {
        return;
      }
      const providerId = item.id.split("%%")[0];
      const config = Provider.getConfiguration();
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(providerId);
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(providerId);
      }
      if (!provider) {
        ShowErrorMessage(providerName, `Provider ${item.name} not found`);
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: `User Name?`,
        placeHolder: `Enter the user name, example John Doe`,
        ignoreFocusOut: true
      });
      if (!name) {
        ShowErrorMessage(providerName, `User Name is required`);
        return;
      }

      const username = await vscode.window.showInputBox({
        prompt: `User Username?`,
        placeHolder: `Enter the user username, example johndoe`,
        ignoreFocusOut: true
      });
      if (!username) {
        ShowErrorMessage(providerName, `User Username is required`);
        return;
      }

      const email = await vscode.window.showInputBox({
        prompt: `User Email?`,
        placeHolder: `Enter the user email, example johndoe@example.com`,
        ignoreFocusOut: true
      });
      if (!email) {
        ShowErrorMessage(providerName, `User Email is required`);
        return;
      }

      const password = await vscode.window.showInputBox({
        prompt: `User Password?`,
        placeHolder: `Enter the User Password, it needs to be at least 12 characters long with numbers and special characters`,
        password: true,
        ignoreFocusOut: true
      });
      if (!password) {
        ShowErrorMessage(providerName, `User Password is required`);
        return;
      }
      if (password.length < 12) {
        ShowErrorMessage(providerName, `User Password needs to be at least 12 characters long`);
        return;
      }
      if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)) {
        ShowErrorMessage(
          providerName,
          `User Password needs to have at least one uppercase, one lowercase, one number and one special character`
        );
        return;
      }

      let isSuperUser = false;
      if (provider.user?.isSuperUser) {
        const confirmation = await YesNoQuestion(`Do you want the user ${name} to be a super user?`);

        if (confirmation === ANSWER_YES) {
          isSuperUser = true;
        }
      }

      const request: DevOpsCreateUserRequest = {
        name: name,
        username: username,
        password: password,
        email: email,
        is_super_user: isSuperUser
      };

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.createRemoteHostUsers(provider, request).catch(() => {
            ShowErrorMessage(
              providerName,
              `Failed to create user ${name} on the Remote Host ${provider?.name ?? "Unknown"}`,
              true
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `User ${name} was created successfully on the Orchestrator ${provider?.name ?? "Unknown"}`
          );
          if (item.className === "DevOpsRemoteHostProvider") {
            await DevOpsService.refreshRemoteHostProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          }
          if (item.className === "DevOpsCatalogHostProvider") {
            await DevOpsService.refreshCatalogProviders(true);
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
          }
        })
        .catch(error => {
          ShowErrorMessage(
            providerName,
            `Failed to connect to Remote Host ${provider?.name ?? "Unknown"}, err:\n ${error}`,
            true
          );
        });
    })
  );
};

export const DevOpsManagementProviderAddUserCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderAddUserCommand
};
