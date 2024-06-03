import * as vscode from 'vscode';

import { CopilotOperation, CopilotUserIntension, CreateCatalogMachine } from "../models"
import { extractJsonFromMarkdownCodeBlock, processChatResponse } from '../helpers';

export function getDeductedValueResponse(userPrompt: string, valuesToDeductFrom: string[]): vscode.LanguageModelChatMessage[] {
  const message = `as a super deductive developer giving this list of strings:
${valuesToDeductFrom}
and the user input is:
${userPrompt}

select the most appropriate string from the list above to complete the user input
the user can abbreviate the string or use the full string it can also use spaces and in the list they might be underscores or dashes

try to use common sense to select it and always select the most appropriate string from the list above
if you cannot find a string that fits the user input you should return an empty string

always return just the string and do not add any other information to the response,even if you cannot find a string that fits the user input you should return an empty string
this is very important, you should only return the string and nothing else

Also ignore the case of the strings and the user input

the output should be in the following format: \`\`\`value\`\`\`

for example if the list of strings is:
ubuntu-github-action-runner
Windows 10
Windows_11
mac os sonoma 14
demo 1
demo5
and the user input is:
demo
you should return:
demo 1
and if the user input is:
windows
you should return:
windows 10
and if the user input is:
mac os
you should return:
mac os sonoma 14
and if the user input is:
ubuntu action runner
you should return:
ubuntu-github-action-runner
`

  return [vscode.LanguageModelChatMessage.User(message)];
}

export async function processDeductedValueResponse(userPrompt: string, valuesToDeductFrom: string[], model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const selectedValue = getDeductedValueResponse(userPrompt, valuesToDeductFrom);
    const resumeMsgResponse = await model.sendRequest(selectedValue, {}, token);

    const data = await processChatResponse(resumeMsgResponse)
    try {
      console.log(data)
      const response = data.replace(/`/g, '')
      resolve(response)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}