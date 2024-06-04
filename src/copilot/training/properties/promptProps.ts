
import {
	BasePromptElementProps} from '@vscode/prompt-tsx';

export interface PromptProps extends BasePromptElementProps {
  history: string;
	userQuery: string;
}