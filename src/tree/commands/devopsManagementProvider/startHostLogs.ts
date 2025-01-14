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
import {rm} from "fs";
import {getId} from "../../common/devops_common";
import {url} from "inspector";

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

        let orchestratorHostId = "";
        let channelId = `${localProvider.ID}%%logs`;
        if (item.type == "provider.remote_host.host.logs") {
          const id = item.id.split("%%")[2];
          const rmProvider = localProvider as DevOpsRemoteHostProvider;
          rmProvider.hosts?.find(rmHost => {
            if (rmHost.id === id) {
              orchestratorHostId = rmHost.id;
              channelId = `${rmHost.id}%%logs`;
            }
          });
        }

        const host = localProvider.host ?? "";
        const port = localProvider.port ?? -1;
        const schema = localProvider.scheme ?? "";

        if (!host) {
          ShowErrorMessage("Remote Provider", `Provider ${localProvider.name} not found`);
        }

        const channelIdSocket = getLogChannelById(channelId);
        if (channelIdSocket) {
          vscode.window.showErrorMessage("Channel ID is already in use!");
          return;
        }

        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Get Remote Host ${item.name} logs`);
        const outputChannel = vscode.window.createOutputChannel(`Remote Host: ${localProvider.name} Logs`);
        let protocol = "ws";
        if (schema === "https") {
          protocol = "wss";
        }
        let websocketAddress = `${protocol}://${host}`;
        if (port > 0) {
          websocketAddress += `:${port}`;
        }

        openChannelById(localProvider, outputChannel, websocketAddress, orchestratorHostId).catch(error => {
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
