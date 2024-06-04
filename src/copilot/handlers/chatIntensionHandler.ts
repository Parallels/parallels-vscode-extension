import * as vscode from 'vscode';
import { CopilotOperation } from '../models';
import { processChatIntensions } from '../training/processChatIntensions';

export async function chatIntensionHandler(userPrompt: string,context: vscode.ChatContext, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      const chatResponse = await processChatIntensions(userPrompt, context, model, token);
      response.operation = chatResponse;
      response.state = 'success';
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to chatbot help`;
      response.state = 'failed';
      resolve(response);
    }
  });
}