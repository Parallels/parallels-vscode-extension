import * as vscode from 'vscode';

import { CopilotOperation, CopilotUserIntension, CreateCatalogMachine } from "../models"
import { extractJsonFromMarkdownCodeBlock, processChatResponse } from '../helpers';

export function getChatRequestResponse(userPrompt: string): vscode.LanguageModelChatMessage[] {
  const message = `as a very knowledgeable support engineer you should be able to generate a useful response to the user response for any queries related to Parallels Desktop software for the user prompt here:
${userPrompt}`

  return [vscode.LanguageModelChatMessage.User(message)];
}

export async function processChatOperation(userPrompt: string, model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const resumeMsg = getChatRequestResponse(userPrompt);
    const resumeMsgResponse = await model.sendRequest(resumeMsg, {}, token);

    const data = await processChatResponse(resumeMsgResponse)
    try {
      console.log(data)
      resolve(data)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}