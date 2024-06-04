
import {
	BasePromptElementProps} from '@vscode/prompt-tsx';

export interface PredictivePromptProps extends BasePromptElementProps {
  values: string[];
	userQuery: string;
}