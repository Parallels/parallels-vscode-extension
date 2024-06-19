import * as vscode from "vscode";

import {CopilotOperation} from "../models";
import {getChatHistory, processChatResponse} from "../helpers";
import {renderPrompt} from "@vscode/prompt-tsx";
import {LogIntensionPrompt} from "./debug";
import {ChatAgentResponsePrompt} from "./prompts/chatAgentResponse";

export async function processChatAgentResponse(
  copilotOperations: CopilotOperation[],
  context: vscode.ChatContext,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const {messages} = await renderPrompt(
        ChatAgentResponsePrompt,
        {operations: copilotOperations.map(op => op.operation), history: getChatHistory(context.history)},
        {modelMaxPromptTokens: model.maxInputTokens},
        model
      );

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse);
      LogIntensionPrompt(messages, data);
      resolve(data);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
