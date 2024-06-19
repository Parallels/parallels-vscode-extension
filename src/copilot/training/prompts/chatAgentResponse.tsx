
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { AgentResponsePromptProps } from '../properties/agentResponsePromptProps';

export class ChatAgentResponsePrompt extends PromptElement<AgentResponsePromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          act as a chat agent and taking the list of operations provided by the user, generate a response in 
          natural language using a pretty markdown format that resumes the operations.

          You need to build the response to take into account all of the operations provided by the user

          for example:
          if the user provides the following operations:
          5 machines are running
          2 machines are stopped
          0 machines are paused
          1 machine is suspended
          you should generate the following response:
          There are 5 machines running:
          - machine1
          - machine2
          - machine3
          - machine4
          - machine5
          There are 2 machines stopped:
          - machine6
          - machine7
          There are 0 machines paused
          There is 1 machine suspended:
          - machine8

        </UserMessage>
        <UserMessage>
          User operations:
        
          {this.props.operations.join('\n')}
        </UserMessage>
      </>
    );
  }
}