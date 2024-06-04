
import {
	BasePromptElementProps} from '@vscode/prompt-tsx';

export interface CreateVmsPromptProps extends BasePromptElementProps {
  targetNames: string[];
  history: string;
	userQuery: string;
}