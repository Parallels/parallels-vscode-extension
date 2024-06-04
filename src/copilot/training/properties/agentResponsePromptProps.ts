
import {
	BasePromptElementProps} from '@vscode/prompt-tsx';

export interface AgentResponsePromptProps extends BasePromptElementProps {
  operations: string[];
  history: string;
}