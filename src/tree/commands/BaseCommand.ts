import * as vscode from "vscode";
import {VirtualMachineProvider} from "../virtual_machine";
import {VagrantBoxProvider} from "../vagrant_boxes";
import { DevOpsCatalogProvider } from "../devops_catalog/devops_catalog";
import { DevOpsRemoteHostsTreeProvider } from "../devops_remote/remote_hosts_tree_provider";

export type VirtualMachineCommand = {
  register: (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => void;
};

export type VagrantCommand = {
  register: (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => void;
};

export type DevOpsCatalogCommand = {
  register: (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => void;
};

export type DevOpsRemoteHostsCommand = {
  register: (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsTreeProvider) => void;
};

export type BaseCommand = VirtualMachineCommand | VagrantCommand | DevOpsCatalogCommand | DevOpsRemoteHostsCommand;
