import * as vscode from 'vscode';

import { CopilotUserIntension } from "../models"
import { extractJsonFromMarkdownCodeBlock, getChatHistory, processChatResponse } from '../helpers';

export function getIntensionsPrompt(context: vscode.ChatContext, userPrompt: string): vscode.LanguageModelChatMessage[] {
  const history = getChatHistory(context.history);
  const message = `Knowing that our operations can only be and acting as a developer:
- Create Virtual Machines
- Get Status of a Virtual Machine
- Setup a Virtual Machine
- Know how many Virtual Machines are in a certain state

Detect the user intentions from his input and then generate a json file with the following structure:
[
  {
    "intension": "CREATE",
    "operation": "",
    "operation_value": "",
    "VM": "VM NAME",
    "intension_description": "Create a new Virtual Machine"
  }
]

The type of intentions can be CREATE, STATUS, SET, COUNT_STATUS
IF The intension is just status or create the operation field should be omitted
If the user asks to start, stop, resume, pause, suspend, restart or delete, this will be an operation of the set.
Some operations require a value please add it to the operation_value field but if this is not needed please omit the field

if the user asks for the status of more than one VM please add each as a separate item in the array
If the user asks for a count of a certain state, the intension should be COUNT_STATUS and the operation field should be the state, in this case the state can only be, running, stopped, paused or suspended
also if there is any CREATE intension, this should be the first item in the array

Your response should only be the json output, even if there is just one intension detected you should create an json array.
The array is very important and you should not generate anything else, just the json output.
make sure the json output is valid and fits the structure above

You also cannot have a CREATE intension with an operation from the SET type, this is not allowed
You should then create two intensions one for CREATE and one for the SET operation

for each intention detected you should create an intension_description field that describes what the user is asking for
so it can be used by chatbots to respond to the user

if the user asks for list of vms you should set the intension as COUNT_STATUS and the operation as all

if you cannot find an intension from the user input you should set the intension as CHAT and the operation as the user input

as an example if the user input is:
Create a new Virtual Machine named demo1 from the golden image ubuntu-github-action-runner in the catalog local build catalog
you should generate the json object:
[
  {
    "intension": "CREATE",
    "operation": "",
    "operation_value": "",
    "VM": "demo1",
    "intension_description": "Create a new Virtual Machine named 'demo1' from the golden image 'ubuntu-github-action-runner' in the catalog 'local build catalog'"
  }
]
and if the user input is:
stop demo1
you should generate the json object:
[
  {
    "intension": "SET",
    "operation": "stop",
    "operation_value": "",
    "VM": "demo1",
    "intension_description": "Stop the Virtual Machine 'demo1'"
  }
]
and if the user input is:
status demo1
you should generate the json object:
{
    "intension": "STATUS",
    "operation": "",
    "operation_value": "",
    "VM": "demo1",
    "intension_description": "Get the status of the Virtual Machine 'demo1'"
}

and if the user input is:
how do I go to the moon
you should generate the json object:
[
  {
    "intension": "CHAT",
    "operation": "how do I go to the moon",
    "operation_value": "",
    "VM": "",
    "intension_description": "how do I go to the moon"
  }
]

if the user asks for all the virtual machines then the VM field should be 'all'
for example:
resume all virtual machines
you should generate the json object:
[
  {
    "intension": "SET",
    "operation": "resume",
    "operation_value": "",
    "VM": "all",
    "intension_description": "Resume all Virtual Machines"
  }
]
  another example:
    start all
you should generate the json object:
[
  {
    "intension": "SET",
    "operation": "start",
    "operation_value": "",
    "VM": "all",
    "intension_description": "Start all Virtual Machines"
  }
]
one more example:
resume all suspended vms
you should generate the json object:
[
  {
    "intension": "SET",
    "operation": "resume",
    "operation_value": "",
    "VM": "all",
    "intension_description": "Resume all suspended Virtual Machines"
  }
]

and the golden rule is, if you have multiple intensions detected, you should create an array of objects, even if there is just one intension detected

also take into account our chat history when generating the response some values like the name of the VM can be found in the chat history
this is the chat history:
${history}

the user says:
${userPrompt}`

  console.log(message)
  return [vscode.LanguageModelChatMessage.User(message)];
}

export async function processUserIntensions(userPrompt: string,context: vscode.ChatContext,  model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<CopilotUserIntension[]> {
  return new Promise(async (resolve, reject) => {
    const intensionMsg = getIntensionsPrompt(context, userPrompt);
    const intensionMsgResponse = await model.sendRequest(intensionMsg, {}, token);
    
    const data = await processChatResponse(intensionMsgResponse)
    try {
      console.log(data)
      // extracting the json from the markdown code block
      const rawJsonBlock = extractJsonFromMarkdownCodeBlock(data);
      console.log(rawJsonBlock)
      const jsonBlock: CopilotUserIntension[] = JSON.parse(rawJsonBlock);
      if (!Array.isArray(jsonBlock)) {
        resolve([jsonBlock])
      }
      resolve(jsonBlock)
    } catch (error) {
      console.error(error)
      reject(error)
    }
  });
}