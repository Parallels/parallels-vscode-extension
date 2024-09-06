import * as vscode from "vscode";
import {CommandsFlags, FLAG_PARALLELS_CATALOG_SHOW_ONBOARD} from "../../../constants/flags";
import {LogService} from "../../../services/logService";
import {ParallelsCatalogCommand} from "../BaseCommand";
import {ParallelsCatalogProvider} from "../../parallelsCatalogProvider/parallelsCatalogProvider";
import {Provider} from "../../../ioc/provider";
import {DevOpsService} from "../../../services/devopsService";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";

const registerParallelsCatalogCloseOnboardingCommand = (
  context: vscode.ExtensionContext,
  provider: ParallelsCatalogProvider
) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.parallelsCatalogCloseOnboarding, async () => {
      LogService.debug("Close Onboard Panel", "ParallelsCatalogCloseOnboardingCommand");
      const telemetry = Provider.telemetry();
      const config = Provider.getConfiguration();
      config.setShowOnboarding(false);
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "CLOSE_ONBOARDING_COMMAND_CLICK");
      vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_SHOW_ONBOARD, false);

      await DevOpsService.refreshParallelsCatalogProvider(true);
      provider.refresh();
    })
  );
};

export const ParallelsCatalogCloseOnboardingCommand: ParallelsCatalogCommand = {
  register: registerParallelsCatalogCloseOnboardingCommand
};
