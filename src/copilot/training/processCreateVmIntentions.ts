import * as vscode from 'vscode';

import { CopilotUserIntension, CreateCatalogMachine } from "../models"
import { extractJsonFromMarkdownCodeBlock, getChatHistory, processChatResponse } from '../helpers';
import { renderPrompt, Cl100KBaseTokenizer } from '@vscode/prompt-tsx';
import { LogIntensionPrompt } from './debug';
import { CreateVmsIntensionPrompt } from './prompts/createVmsPrompt';


export async function processCreateVmIntentions(userPrompt: string, catalogNames: string[], context: vscode.ChatContext, model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<CreateCatalogMachine> {
  return new Promise(async (resolve, reject) => {
    try {
      const { messages } = await renderPrompt(
        CreateVmsIntensionPrompt,
        { userQuery: userPrompt, history: getChatHistory(context.history), targetNames: catalogNames},
        { modelMaxPromptTokens: model.maxInputTokens },
        new Cl100KBaseTokenizer())

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse)
      
      // extracting the json from the markdown code block
      const rawJsonBlock = extractJsonFromMarkdownCodeBlock(data);
      if (rawJsonBlock === '{}') {
        reject('No JSON block found in the response')
      }

      LogIntensionPrompt(messages, data, rawJsonBlock)
      const jsonBlock: CreateCatalogMachine = JSON.parse(rawJsonBlock);
      resolve(jsonBlock)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}