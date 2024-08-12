import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {CommonCommand} from "../BaseCommand";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";
import {Provider} from "../../../ioc/provider";

const registerBuyBusinessLicenseCommonCommand = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.buyBusinessLicenseCommonCommand, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "BUY_BUSINESS_LICENSE_COMMAND_CLICK", {
        description: `Parallels Catalog Buy License Clicked`
      });
      vscode.env.openExternal(vscode.Uri.parse("https://www.parallels.com/products/business/"));
    })
  );
};

export const BuyBusinessLicenseCommonCommand: CommonCommand = {
  register: registerBuyBusinessLicenseCommonCommand
};
