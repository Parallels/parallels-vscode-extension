import * as fs from "fs";
import * as vscode from "vscode";
import {CommandsFlags} from "../../../constants/flags";
import {Provider} from "../../../ioc/provider";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {getDownloadFolder} from "../../../helpers/helpers";

export function registerClearCatalogCacheCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.clearParallelsCacheFolder, async () => {
      const config = Provider.getConfiguration();
      const confirm = await YesNoQuestion("Delete all download cache?");
      if (confirm === ANSWER_YES) {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Deleting download cache..."
          },
          async () => {
            const downloadDir = getDownloadFolder();
            if (fs.existsSync(downloadDir)) {
              fs.rmSync(downloadDir, {recursive: true});
            }
          }
        );
      }
    })
  );
}
