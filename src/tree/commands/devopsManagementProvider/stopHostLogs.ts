import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags, TelemetryEventIds} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand, VirtualMachineCommand} from "../BaseCommand";
import {TELEMETRY_DOCKER} from "../../../telemetry/operations";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {closeLogChannelById, getLogChannelById, openChannelById} from "../../../services/logChannelService";
import {LogService} from "../../../services/logService";

const registerDevOpsManagementStopLogsCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.remoteProviderCloseLogs, async (item: any) => {
      const telemetry = Provider.telemetry();

      telemetry.sendOperationEvent(TELEMETRY_DOCKER, "STOP_REMOTE_PROVIDER_LOGS_COMMAND_CLICK");
      if (item) {
        const providerId = item.id.split("%%")[0];
        const channelId = `${providerId}%%logs`;

        LogService.sendTelemetryEvent(TelemetryEventIds.VirtualMachineAction, `Stop Remote Host ${item.name} logs`);

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
