import * as fs from "fs";
import * as vscode from "vscode";
import {Provider} from "../ioc/provider";
import {getDownloadFolder} from "../helpers/helpers";
import {CommandsFlags} from "../constants/flags";

export function registerClearDownloadCacheCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.clearDownloadCache, async () => {
      const config = Provider.getConfiguration();
      const options: string[] = ["Yes", "No"];
      const confirm = await vscode.window.showQuickPick(options, {
        placeHolder: "Delete all download cache?"
      });
      if (confirm == "Yes") {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Deleting all snapshot children..."
          },
          async () => {
            const downloadDir = getDownloadFolder(context);
            if (fs.existsSync(downloadDir)) {
              fs.rmdirSync(downloadDir, {recursive: true});
            }
          }
        );
      }
    })
  );
}
