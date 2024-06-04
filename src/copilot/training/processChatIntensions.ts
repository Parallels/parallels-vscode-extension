import * as vscode from 'vscode';

import { getChatHistory, processChatResponse } from '../helpers';
import { renderPrompt, Cl100KBaseTokenizer } from '@vscode/prompt-tsx';
import { ChatIntensionPrompt } from './prompts/chatIntensionPrompt';
import { LogIntensionPrompt } from './debug';

export async function processChatIntensions(userPrompt: string, context: vscode.ChatContext, model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const { messages } = await renderPrompt(
        ChatIntensionPrompt,
        { userQuery: userPrompt, history: getChatHistory(context.history)},
        { modelMaxPromptTokens: model.maxInputTokens },
        new Cl100KBaseTokenizer())

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse)
      LogIntensionPrompt(messages, data)
      resolve(data)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}