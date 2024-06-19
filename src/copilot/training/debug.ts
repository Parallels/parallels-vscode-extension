import {LanguageModelChatMessage} from "@vscode/prompt-tsx/dist/base/vscodeTypes";

interface LogObject {
  chatMessages: string[];
  rawResponse: string;
  rawJsonBlock: string;
}

export function LogIntensionPrompt(chatMessage: LanguageModelChatMessage[], rawResponse: string, rawJsonBlock = "") {
  if (process.env.PARALLELS_DESKTOP_DEBUG === "true") {
    const logObject: LogObject = {
      chatMessages: [],
      rawResponse: rawResponse,
      rawJsonBlock: rawJsonBlock
    };

    for (const message of chatMessage) {
      logObject.chatMessages.push(message.content);
    }

    const objectString = JSON.stringify(logObject, null, 2);
    console.log(objectString);
  }
}
