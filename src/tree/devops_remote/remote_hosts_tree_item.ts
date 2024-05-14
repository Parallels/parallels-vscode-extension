import path = require("path");
import * as vscode from "vscode";
import { VirtualMachine } from "../../models/parallels/virtualMachine";
import { DevOpsRemoteHostProvider } from "../../models/devops/remoteHostProvider";

export class DevOpsRemoteHostsTreeItem extends vscode.TreeItem {

  constructor(
    public id: string,
    public parentId: string,
    public name: string,
    public type:
      | "orchestrator"
      | "remote_host"
      | "provider"
      | "resources"
      | "resources_architecture"
      | "resources_architecture_total"
      | "resources_architecture_used"
      | "resources_architecture_available"
      | "resources_architecture_reserved"
      | "virtualMachines"
      | "hosts"
      | "hosts_host"
      | "virtualMachine"
      | "empty",
    public label: string,
    public status: string,
    public description: string,
    public context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public item?: DevOpsRemoteHostProvider | VirtualMachine,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.parentId = parentId;
    this.name = name;
    this.type = type;
    this.iconPath = {
      light: path.join(__filename, "..", "..", "img", "light", `${iconName}.svg`),
      dark: path.join(__filename, "..", "..", "img", "dark", `${iconName}.svg`)
    };
    this.label = label;
    this.status = status;
    this.description = description;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
