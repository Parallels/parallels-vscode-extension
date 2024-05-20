import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsUpdateUserRequest} from "../../../models/devops/users";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";

const registerDevOpsManagementProviderUpdateUserCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsRemoteProviderManagementUpdateUser, async (item: any) => {
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
        vscode.window.showErrorMessage(`Remote Host Provider User ${item.name} not found`);
        return;
      }
      const userId = item.id.split("%%")[3];

      const user = provider.users?.find(u => u.id === userId);
      if (!user) {
        vscode.window.showErrorMessage(`Remote Host Provider user ${item.name} not found`);
        return;
      }

      const selectedOptions = await vscode.window.showQuickPick(
        [
          {
            label: "Name"
          },
          {
            label: "Password"
          },
          {
            label: "Email"
          }
        ],
        {
          placeHolder: "Select the type of changes you want to make",
          ignoreFocusOut: true,
          title: "What do you want to update?"
        }
      );

      if (!selectedOptions) {
        vscode.window.showErrorMessage(`No option selected`);
        return;
      }

      const request: DevOpsUpdateUserRequest = {};

      let name: string | undefined;
      if (selectedOptions.label === "Name") {
        name = await vscode.window.showInputBox({
          prompt: `User Name?`,
          placeHolder: `Enter the user name, example John Doe`,
          ignoreFocusOut: true,
          value: user.name
        });

        if (!name) {
          vscode.window.showErrorMessage(`User Name is required`);
          return;
        }

        request.name = name;
      }

      let email: string | undefined;
      if (selectedOptions.label === "Password") {
        email = await vscode.window.showInputBox({
          prompt: `User Email?`,
          placeHolder: `Enter the user email, example johndoe@example.com`,
          ignoreFocusOut: true,
          value: user.email
        });
        if (!email) {
          vscode.window.showErrorMessage(`User Username is required`);
          return;
        }
        request.email = email;
      }

      let password: string | undefined;
      if (selectedOptions.label === "Password") {
        password = await vscode.window.showInputBox({
          prompt: `User Password?`,
          placeHolder: `Enter the User Password, it needs to be at least 12 characters long with numbers and special characters`,
          password: true,
          ignoreFocusOut: true
        });
        if (!password) {
          vscode.window.showErrorMessage(`User Password is required`);
          return;
        }
        if (password.length < 12) {
          vscode.window.showErrorMessage(`User Password needs to be at least 12 characters long`);
          return;
        }
        if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)) {
          vscode.window.showErrorMessage(
            `User Password needs to have at least one uppercase, one lowercase, one number and one special character`
          );
          return;
        }
        request.password = password;
      }

      DevOpsService.testHost(provider)
        .then(async () => {
          let foundError = false;
          await DevOpsService.updateRemoteHostUsers(provider, user.id, request).catch(() => {
            vscode.window.showErrorMessage(
              `Failed to update user ${name} on the Orchestrator ${provider?.name ?? "Unknown"}`
            );
            foundError = true;
            return;
          });

          if (foundError) {
            return;
          }

          vscode.window.showInformationMessage(
            `User ${name} was updated successfully on the Orchestrator ${provider?.name ?? "Unknown"}`
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
          vscode.window.showErrorMessage(`Failed to connect to Remote Host ${name}, err:\n ${error}`);
        });
    })
  );
};

export const DevOpsManagementProviderUpdateUserCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementProviderUpdateUserCommand
};
