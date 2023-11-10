import * as vscode from "vscode";
import {VirtualMachineProvider} from "../virtual_machine";
import {VagrantBoxProvider} from "../vagrant_boxes";

export type VirtualMachineCommand = {
  register: (context: vscode.ExtensionContext, provider: VirtualMachineProvider) => void;
};

export type VagrantCommand = {
  register: (context: vscode.ExtensionContext, provider: VagrantBoxProvider) => void;
};

export type BaseCommand = VirtualMachineCommand | VagrantCommand;
