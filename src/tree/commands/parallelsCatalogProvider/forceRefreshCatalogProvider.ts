import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {ParallelsCatalogCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";
import {ParallelsCatalogProvider} from "../../parallelsCatalogProvider/parallelsCatalogProvider";
import {DevOpsService} from "../../../services/devopsService";

const registerParallelsCatalogForceRefreshCommand = (
  context: vscode.ExtensionContext,
  provider: ParallelsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.parallelsCatalogForceRefreshProvider, async () => {
      const telemetry = Provider.telemetry();
      LogService.debug("Refreshing Catalog Providers", "RefreshParallelsCatalogCommand");

      await DevOpsService.refreshParallelsCatalogProvider(true);
      provider.refresh();
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "REFRESH_COMMAND_CLICK", {
        description: `Parallels Catalog Refreshed`
      });
    })
  );
};

export const ParallelsCatalogForceRefreshCommand: ParallelsCatalogCommand = {
  register: registerParallelsCatalogForceRefreshCommand
};
