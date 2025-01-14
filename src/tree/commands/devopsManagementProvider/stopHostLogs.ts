import * as vscode from "vscode";
import {config, Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE, TELEMETRY_DOCKER} from "../../../telemetry/operations";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {closeLogChannelById, getLogChannelById} from "../../../services/logChannelService";
import {LogService} from "../../../services/logService";
import {ShowErrorMessage} from "../../../helpers/error";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";

const registerDevOpsManagementStopLogsCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.remoteProviderCloseLogs, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        provider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;

      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "STOP_REMOTE_PROVIDER_LOGS_COMMAND_CLICK");
      if (item) {
        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Stop Remote Host ${item.name} logs`);

        const providerId = item.id.split("%%")[0];
        let localProvider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
        if (item.className === "DevOpsRemoteHostProvider") {
          localProvider = config.findRemoteHostProviderById(providerId);
        }
        if (item.className === "DevOpsCatalogHostProvider") {
          localProvider = config.findCatalogProviderByIOrName(providerId);
        }
        if (!localProvider) {
          ShowErrorMessage(providerName, `Provider ${item.name} not found`);
          return;
        }

        let channelId = `${localProvider.ID}%%logs`;
        if (item.type == "provider.remote_host.host.logs") {
          const id = item.id.split("%%")[2];
          const rmProvider = localProvider as DevOpsRemoteHostProvider;
          rmProvider.hosts?.find(rmHost => {
            if (rmHost.id === id) {
              channelId = `${rmHost.id}%%logs`;
            }
          });
        }

        if (!channelId) {
          vscode.window.showErrorMessage("Channel ID is required!");
          return;
        }

        const channelIdSocket = getLogChannelById(channelId);
        if (!channelIdSocket) {
          return;
        }

        closeLogChannelById(channelId);
      }
    })
  );
};

export const DevOpsManagementCloseLogsCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementStopLogsCommand
};
