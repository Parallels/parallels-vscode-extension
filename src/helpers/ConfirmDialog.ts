import * as vscode from "vscode";

export const ANSWER_YES = "Yes";
export const ANSWER_NO = "No";

const options: string[] = [ANSWER_YES, ANSWER_NO];

export const YesNoQuestion = (prompt: string) => {
  return vscode.window.showQuickPick(options, {
    placeHolder: prompt
  });
};

export const YesNoErrorMessage = (prompt: string) => {
  return vscode.window.showErrorMessage(prompt, ...options);
};
