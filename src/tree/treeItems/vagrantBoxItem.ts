import path = require("path");
import * as vscode from "vscode";

export class VagrantBoxTreeItem extends vscode.TreeItem {
  name: string;
  status: string;

  constructor(
    public type: "Group" | "Box",
    public group: string | undefined,
    public id: string,
    name: string,
    label: string,
    public version: string,
    context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.name = name;
    this.iconPath = {
      light: path.join(__filename, "..", "..", "img", "light", `${iconName}.svg`),
      dark: path.join(__filename, "..", "..", "img", "dark", `${iconName}.svg`)
    };
    this.label = label;
    this.status = version;
    this.description = version;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
