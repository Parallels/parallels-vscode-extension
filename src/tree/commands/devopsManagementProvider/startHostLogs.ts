import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import WebSocket from "ws";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand, VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE, TELEMETRY_DOCKER} from "../../../telemetry/operations";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {ShowErrorMessage} from "../../../helpers/error";
import {LogService} from "../../../services/logService";
import {DevOpsService} from "../../../services/devopsService";
import {getLogChannelById, openChannelById} from "../../../services/logChannelService";

const registerDevOpsManagementStartLogsCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.remoteProviderStartLogs, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        provider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "START_REMOTE_PROVIDER_LOGS_COMMAND_CLICK");
      if (item) {
        const config = Provider.getConfiguration();
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

        if (!localProvider.rawHost) {
          ShowErrorMessage("Remote Provider", `Provider ${localProvider.name} not found`);
        }

        const channelId = `${providerId}%%logs`;

        if (!channelId) {
          vscode.window.showErrorMessage("Channel ID is required!");
          return;
        }

        const channelIdSocket = getLogChannelById(channelId);
        if (channelIdSocket) {
          vscode.window.showErrorMessage("Channel ID is already in use!");
          return;
        }

        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Get Remote Host ${item.name} logs`);
        const outputChannel = vscode.window.createOutputChannel(`Remote Host: ${localProvider.name} Logs`);
        let protocol = "ws";
        if (localProvider.scheme === "https") {
          protocol = "wss";
        }
        let websocketAddress = `${protocol}://${localProvider.host}`;
        if (localProvider.port) {
          websocketAddress += `:${localProvider.port}`;
        }
        websocketAddress += `/api/logs/stream`;
        openChannelById(localProvider, outputChannel, websocketAddress).catch(error => {
          ShowErrorMessage("Remote Provider", error);
        });

        outputChannel.show(true);
      }
    })
  );
};

export const DevOpsManagementOpenLogsCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementStartLogsCommand
};
