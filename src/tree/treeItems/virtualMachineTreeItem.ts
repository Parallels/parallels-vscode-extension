import path = require("path");
import * as vscode from "vscode";
import {VirtualMachine} from "../../models/parallels/virtualMachine";
import {MachineSnapshot} from "../../models/parallels/virtualMachineSnapshot";
import {VirtualMachineGroup} from "../../models/parallels/virtualMachineGroup";
import {Uri} from "vscode";
export enum VirtualMachineTreeItemType {
  Vagrant = "vagrant",
  Packer = "packer"
}

export interface DragAndDropTreeItem {
  type:
    | "Group"
    | "VirtualMachine"
    | "Snapshot"
    | "DockerContainerRoot"
    | "DockerImageRoot"
    | "DockerContainer"
    | "DockerImage"
    | "IpAddress"
    | "Empty";
  id: string;
  name: string;
  group: string | undefined;
}

export class VirtualMachineTreeItem extends vscode.TreeItem {
  name: string;
  status: string;
  item: VirtualMachine | VirtualMachineGroup | MachineSnapshot | undefined;
  vmId: string | undefined;

  constructor(
    public extensionContext: vscode.ExtensionContext,
    item: VirtualMachine | VirtualMachineGroup | MachineSnapshot | undefined,
    public type:
      | "Group"
      | "VirtualMachine"
      | "Snapshot"
      | "DockerContainerRoot"
      | "DockerImageRoot"
      | "DockerContainer"
      | "DockerImage"
      | "IpAddress"
      | "Empty",
    public group: string | undefined,
    public id: string,
    vmId: string | undefined,
    name: string,
    label: string,
    public version: string,
    context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public description?: string,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.item = item;
    this.name = name;
    this.vmId = vmId;
    this.iconPath = {
      light: Uri.file(path.join(extensionContext.extensionPath, "img", "light", `${iconName}.svg`)),
      dark: Uri.file(path.join(extensionContext.extensionPath, "img", "dark", `${iconName}.svg`))
    };
    this.label = label;
    this.status = version;
    this.description = description ?? version;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
