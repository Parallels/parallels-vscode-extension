import * as fs from "fs";
import * as vscode from "vscode";
import {Provider} from "../ioc/provider";
import {getDownloadFolder} from "../helpers/helpers";
import {CommandsFlags} from "../constants/flags";
import {ANSWER_YES, YesNoQuestion} from "../helpers/ConfirmDialog";

export function registerClearDownloadCacheCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.clearDownloadCache, async () => {
      const config = Provider.getConfiguration();
      const confirm = await YesNoQuestion("Delete all download cache?");
      if (confirm === ANSWER_YES) {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Deleting all snapshot children..."
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
