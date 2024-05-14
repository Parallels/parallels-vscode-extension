import { CatalogManifest, CatalogManifestItem } from './../../models/devops/catalogManifest';
import path = require("path");
import * as vscode from "vscode";
import { DevOpsCatalogProvider } from "./devops_catalog";
import { DevOpsCatalogHostProvider } from "../../models/devops/catalogHostProvider";

export class DevOpsCatalogTreeItem extends vscode.TreeItem {
  name: string;
  status: string;
  parentId: string;
  type: "provider" | "manifest" | "version" | "architecture";

  constructor(
    public id: string,
    parentId: string,
    name: string,
    type: "provider" | "manifest" | "version" | "architecture",
    label: string,
    public version: string,
    context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public item?: DevOpsCatalogHostProvider | CatalogManifestItem | CatalogManifest,
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
    this.status = version;
    this.description = version;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
