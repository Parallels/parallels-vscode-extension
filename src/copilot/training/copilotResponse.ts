import * as vscode from 'vscode';

import { CopilotOperation, CopilotUserIntension, CreateCatalogMachine } from "../models"
import { extractJsonFromMarkdownCodeBlock, processChatResponse } from '../helpers';

export function getCopilotOperationResponse(userPrompt: string): vscode.LanguageModelChatMessage[] {
  const message = `as a knowledgeable support engineer you should be able to generate a useful response in natural language without using any code blocks to resume the json object that the user prompt is referring to
this is an example of the json object that the user prompt is referring to:
[
  {
      "operation": "virtual machine demo5 has been created",
      "state": "success"
  },
  {
      "operation": "virtual machine demo6 has not been created",
      "state": "failed"
  }
]
for this user prompt you should generate a response that can be used by a chatbot to inform the user that a virtual machine has been created successfully
if they are multiple items in the array, you should generate a response that contains both of them in a natural language

for example if the user prompt is:
[
  {
      "operation": "virtual machine demo5 has been created",
      "state": "success"
  },
  {
      "operation": "virtual machine demo6 has not been created",
      "state": "failed"
  },
  {
      "operation": "virtual machine demo7 has been deleted",
      "state": "success"
  }
]
you should generate the response:
I created 1 virtual machine successfully
  - demo5
 and 1 virtual machine failed to create
  - demo 6
 and I also deleted one machine
  - demo7

  another example:

[
  {
      "operation": "virtual machine demo5 has been resumed",
      "state": "success"
  },
      {
      "operation": "virtual machine demo6 has been resumed",
      "state": "success"
  },
      {
      "operation": "virtual machine demo7 has been resumed",
      "state": "success"
  }
]
you should generate the response:
I resumed 3 virtual machines successfully
  - demo5
  - demo6
  - demo7

  another example:
  
    [
      {
          "operation": "virtual machine demo5 has been started",
          "state": "success"
      },
          {
          "operation": "virtual machine demo6 has failed to start",
          "state": "failed"
      },
          {
          "operation": "virtual machine demo7 has been resumed",
          "state": "success"
      }
    ]

  you should generate the response:
  I started 1 virtual machine successfully
    - demo5
  and 1 virtual machine failed to start
    - demo6
  and I resumed one machine
    - demo7

do not add any code blocks to the response, just write the response in natural language as if you were a human support engineer responding to a user prompt
also do not mention the json object or any code, just write the response as if you were a human support engineer responding to a user prompt

  the user says:
  ${userPrompt}`

  return [vscode.LanguageModelChatMessage.User(message)];
}

export async function processCopilotOperationResponse(copilotOperations: CopilotOperation[], model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const copilotOperationsString = JSON.stringify(copilotOperations);
    const resumeMsg = getCopilotOperationResponse(copilotOperationsString);
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