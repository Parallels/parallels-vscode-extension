import * as vscode from 'vscode';
import { PARALLELS_CHAT_ID } from '../constants/flags';

// Get a random topic that the cat has not taught in the chat history yet
export function getChatHistory(history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>): string {
  const topics = ['linked list', 'recursion', 'stack', 'queue', 'pointers'];
  // Filter the chat history to get only the responses from the cat
  const previousParallelsResponse = history.filter(h => {
      return h instanceof vscode.ChatResponseTurn && h.participant == PARALLELS_CHAT_ID
  }) as vscode.ChatResponseTurn[];
  const previousParallelsQueries = history.filter(h => {
      return h instanceof vscode.ChatRequestTurn && h.participant == PARALLELS_CHAT_ID
  } ) as vscode.ChatRequestTurn[];

  if (previousParallelsResponse.length === 0) {
      return 'there is no history';
  }
  const parts: vscode.ChatResponseMarkdownPart[] = [];
  const lastThreeResponses = previousParallelsResponse.slice(-3);
  const lastThreeQueries = previousParallelsQueries.slice(-3);

  for (let i = 0; i < lastThreeResponses.length; i++) {
      const response = lastThreeResponses[i];
      const query = lastThreeQueries[i];
      response.response.some(r => {
          if (r instanceof vscode.ChatResponseMarkdownPart) {
              parts.push(r);
          }
      })
  }

  // for (const response of lastThreeResponses) {
  //   response.response.some(r => {
  //     if (r instanceof vscode.ChatResponseMarkdownPart) {
  //       parts.push(r);
  //       console.log(r.value.value)
  //     }
  //   })
  // }
  
  return parts.map(p => p.value.value).join('\n');
}

export function extractJsonFromMarkdownCodeBlock(markdown: string): string {
  const codeBlockRegex = /```json\n([\s\S]+?)\n```/g;
  const match = codeBlockRegex.exec(markdown);
  let data = match ? match[1] : markdown;
  data = data?.replace(/\\n/g, '') ?? '';
  data = data?.replace(/```/g, '') ?? '';
  data = data.trim();
  // this does not seem to be a valid json, return an empty object
  if (!data.startsWith('{') && !data.startsWith('[')) {
    console.log('Invalid json object: \n' + data);
    data = '{}'
  }
  return data;
}

export async function processChatResponse(chatResponse: vscode.LanguageModelChatResponse): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let data = ''
    for await (const fragment of chatResponse.text) {
      const messageFragment = fragment;
      data += messageFragment
    }

    resolve(data)
  });
}