import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {ParallelsCatalogCommand} from "../BaseCommand";
import {ParallelsCatalogProvider} from "../../parallelsCatalogProvider/parallelsCatalogProvider";
import { Provider } from "../../../ioc/provider";
import { TELEMETRY_PARALLELS_CATALOG } from "../../../telemetry/operations";

const registerParallelsCatalogShowAiFaqCommand = (
  context: vscode.ExtensionContext,
  provider: ParallelsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.parallelsCatalogShowAiFaq, async () => {
      LogService.debug("Show AI FAQ", "ParallelsCatalogShowAiFaqCommand");
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "SHOW_AI_FAQ_COMMAND_CLICK");
      const aiFaqUrl = "https://www.parallels.com/products/desktop/use-cases/developers/";
      vscode.env.openExternal(vscode.Uri.parse(aiFaqUrl));
    })
  );
};

export const ParallelsCatalogShowAiFaqCommand: ParallelsCatalogCommand = {
  register: registerParallelsCatalogShowAiFaqCommand
};
