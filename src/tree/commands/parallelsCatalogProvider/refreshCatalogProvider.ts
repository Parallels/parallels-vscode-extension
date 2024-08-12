import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {ParallelsCatalogCommand} from "../BaseCommand";
import {Provider} from "../../../ioc/provider";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";
import {ParallelsCatalogProvider} from "../../parallelsCatalogProvider/parallelsCatalogProvider";

const registerParallelsCatalogRefreshCommand = (
  context: vscode.ExtensionContext,
  provider: ParallelsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.parallelsCatalogRefreshProvider, async () => {
      LogService.debug("Refreshing Catalog Providers", "RefreshParallelsCatalogCommand");
      provider.refresh();
    })
  );
};

export const ParallelsCatalogRefreshCommand: ParallelsCatalogCommand = {
  register: registerParallelsCatalogRefreshCommand
};
