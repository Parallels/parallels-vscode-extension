import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {CommonCommand} from "../BaseCommand";
import {TELEMETRY_PARALLELS_CATALOG} from "../../../telemetry/operations";
import {Provider} from "../../../ioc/provider";

const registerBuyProLicenseCommonCommand = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.buyProLicenseCommonCommand, async (item: any) => {
      const telemetry = Provider.telemetry();
      telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "BUY_PRO_LICENSE_COMMAND_CLICK", {
        description: `Parallels Catalog Buy License Clicked`
      });
      vscode.env.openExternal(vscode.Uri.parse("https://www.parallels.com/products/desktop/pro/"));
    })
  );
};

export const BuyProLicenseCommonCommand: CommonCommand = {
  register: registerBuyProLicenseCommonCommand
};
