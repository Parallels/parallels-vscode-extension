import * as vscode from 'vscode';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { CopilotOperation } from '../models';
import { processChatOperation } from '../training/chat';

export async function chatIntensionHandler(userPrompt: string,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      const chatResponse = await processChatOperation(userPrompt, model, token);
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