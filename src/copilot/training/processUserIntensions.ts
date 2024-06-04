import * as vscode from 'vscode';
import { CopilotUserIntension } from './../models';
import { extractJsonFromMarkdownCodeBlock, getChatHistory, processChatResponse } from '../helpers';
import { renderPrompt, Cl100KBaseTokenizer } from '@vscode/prompt-tsx';
import { UserIntensionPrompt } from './prompts/userIntensionPrompt';
import { LogIntensionPrompt } from './debug';

export async function processUserIntensions(userPrompt: string, context: vscode.ChatContext, model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<CopilotUserIntension[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const { messages } = await renderPrompt(
        UserIntensionPrompt,
        { userQuery: userPrompt, history: getChatHistory(context.history)},
        { modelMaxPromptTokens: model.maxInputTokens },
        new Cl100KBaseTokenizer())

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse)

      // extracting the json from the markdown code block
      const rawJsonBlock = extractJsonFromMarkdownCodeBlock(data);
      if (rawJsonBlock === '{}') {
        const response: CopilotUserIntension[] = []
        const chatRequest: CopilotUserIntension = {
          intension: 'CHAT_OUTPUT',
          operation: data,
          operation_value: '',
          target: '',
          VM: '',
          intension_description: data
        }
        response.push(chatRequest)
        resolve(response)
      }

      LogIntensionPrompt(messages, data, rawJsonBlock)
      const jsonBlock: CopilotUserIntension[] = JSON.parse(rawJsonBlock);
      if (!Array.isArray(jsonBlock)) {
        console.log(`Returning an array for the object: ${jsonBlock}`)
        resolve([jsonBlock])
      }
      resolve(jsonBlock)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}