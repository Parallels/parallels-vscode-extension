import {BasePromptElementProps} from "@vscode/prompt-tsx";

export interface VmInfoPromptProps extends BasePromptElementProps {
  VmInfoObject: string;
  history: string;
  userQuery: string;
}
