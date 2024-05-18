import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {DevOpsRemoteHostsCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {randomUUID} from "crypto";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {cleanString} from "../../../helpers/strings";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";

const registerDevOpsEnableRemoteProviderOrchestratorHostCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.devopsEnableRemoteProviderHost, async (item: any) => {
      if (!item) {
        return;
      }
      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      const hostId = item.id.split("%%")[2];
      const provider = config.findRemoteHostProviderById(providerId);
      const host = config.findRemoteHostProviderHostById(providerId, hostId);
      if (!provider || !host) {
        vscode.window.showErrorMessage(`Remote Host Provider ${item.name} not found`);
        return;
      }

      const confirmation = await YesNoQuestion(`Are you sure you want to enable remote host ${item.name}?`);

      if (confirmation !== ANSWER_YES) {
        return;
      }

      DevOpsService.enableRemoteHostOrchestratorHost(provider, host.id)
        .then(async () => {
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          await DevOpsService.refreshRemoteHostProviders(true);
          vscode.window.showInformationMessage(`Remote Host Provider ${item.name} enabled successfully`);
        })
        .catch(error => {
          vscode.window.showErrorMessage(`Error enabling Remote Host Provider ${item.name}`);
        });
    })
  );
};

export const DevOpsEnableRemoteProviderOrchestratorHostCommand: DevOpsRemoteHostsCommand = {
  register: registerDevOpsEnableRemoteProviderOrchestratorHostCommand
};
