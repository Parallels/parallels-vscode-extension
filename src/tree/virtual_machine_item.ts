import path = require("path");
import * as vscode from "vscode";
import {VirtualMachine} from "../models/virtualMachine";
import {MachineSnapshot} from "../models/virtualMachineSnapshot";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";

export enum VirtualMachineTreeItemType {
  Vagrant = "vagrant",
  Packer = "packer"
}

export class VirtualMachineTreeItem extends vscode.TreeItem {
  name: string;
  status: string;
  item: VirtualMachine | VirtualMachineGroup | MachineSnapshot | undefined;
  vmId: string | undefined;

  constructor(
    item: VirtualMachine | VirtualMachineGroup | MachineSnapshot | undefined,
    public type: "Group" | "VirtualMachine" | "Snapshot" | "DockerContainerRoot" | "DockerImageRoot"| "DockerContainer" | "DockerImage" | "Empty",
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
      light: path.join(__filename, "..", "..", "img", "light", `${iconName}.svg`),
      dark: path.join(__filename, "..", "..", "img", "dark", `${iconName}.svg`)
    };
    this.label = label;
    this.status = version;
    this.description = description ?? version;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
