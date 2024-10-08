import * as vscode from "vscode";
import {VirtualMachineProvider} from "../virtualMachinesProvider/virtualMachineProvider";
import {VagrantBoxProvider} from "../vagrantBoxProvider/vagrantBoxProvider";
import {DevOpsCatalogProvider} from "../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRemoteHostsProvider} from "../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {ParallelsCatalogProvider} from "../parallelsCatalogProvider/parallelsCatalogProvider";

export type CommonCommand = {
  register: (context: vscode.ExtensionContext) => void;
};

export type VirtualMachineCommand = {
  register: (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => void;
};

export type VagrantCommand = {
  register: (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => void;
};

export type DevOpsCatalogCommand = {
  register: (context: vscode.ExtensionContext, provider: DevOpsCatalogProvider) => void;
};

export type ParallelsCatalogCommand = {
  register: (context: vscode.ExtensionContext, provider: ParallelsCatalogProvider) => void;
};

export type DevOpsRemoteHostsCommand = {
  register: (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider) => void;
};

export type DevOpsRemoteProviderManagementCommand = {
  register: (context: vscode.ExtensionContext, provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider) => void;
};

export type BaseCommand =
  | VirtualMachineCommand
  | VagrantCommand
  | DevOpsCatalogCommand
  | DevOpsRemoteHostsCommand
  | DevOpsRemoteProviderManagementCommand
  | ParallelsCatalogCommand;
