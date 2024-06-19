import * as vscode from "vscode";
import {PARALLELS_CHAT_ID} from "./constants/flags";
import {LogService} from "./services/logService";
import {conversationHandler} from "./copilot/conversationHandler";

export function initializeCopilot(context: vscode.ExtensionContext) {
  LogService.info("Initializing Copilot");

  const parallelsBot = vscode.chat.createChatParticipant(PARALLELS_CHAT_ID, conversationHandler);
  parallelsBot.iconPath = vscode.Uri.joinPath(context.extensionUri, "img/logo/parallels_logo_copilot.png");
}
