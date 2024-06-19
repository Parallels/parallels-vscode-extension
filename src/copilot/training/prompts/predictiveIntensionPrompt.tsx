
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';
import { PredictivePromptProps } from '../properties/predictivePromptProps';

export class PredictiveIntensionPrompt extends PromptElement<PredictivePromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          I want you to act as data analyst and looking at the following list of comma separated values:
        
          {this.props.values.join(",\n")}

          I want you to choose the most likely value that the user is referring to, based on the user input,
          the user input can be a single word or multiple words, so make sure you extract the correct target,
          it also can be abbreviated or not, so make sure you extract the correct target

          you need to output the selected string using the following structure:
          ```{'{'}value{'}'}```
          The format is extremely important, make sure you output the value in the correct format, you should not
          output anything else other than the value on that format
          think very carefully on your choice, generate the output in the selected format.
          
          please be careful and only update the value as a string, do not add any additional characters or spaces,
          this is important as the output needs to be used by a variable for a software program.
        </UserMessage>
        <UserMessage>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}