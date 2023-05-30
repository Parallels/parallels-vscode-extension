import * as vscode from "vscode";
import * as cp from "child_process";
import {ParallelsVirtualMachine} from "../models/virtual_machine";
import path = require("path");
import {Commands} from "../helpers/commands";

export class VirtualMachineProvider implements vscode.TreeDataProvider<ParallelsVirtualMachineItem> {
  constructor(private workspaceRoot: string) {}
  data: ParallelsVirtualMachineItem[] = [];

  getTreeItem(element: ParallelsVirtualMachineItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<ParallelsVirtualMachineItem | undefined | null | void> =
    new vscode.EventEmitter<ParallelsVirtualMachineItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ParallelsVirtualMachineItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: ParallelsVirtualMachineItem): Thenable<ParallelsVirtualMachineItem[]> {
    return new Promise((resolve, reject) => {
      this.data = [];

      if (element === undefined) {
        getMachines().then(vms => {
          vms.forEach(vm => {
            this.data.push(
              new ParallelsVirtualMachineItem(
                vm.uuid,
                vm.name,
                vm.status,
                vscode.TreeItemCollapsibleState.Collapsed,
                "desktop"
              )
            );
          });
          return resolve(this.data);
        });
      } else {
        console.log(`getChildren: ${element.label}`);
        Commands.getMachineSnapshot(element.id).then(snapshot => {
          const children: ParallelsVirtualMachineItem[] = [];
          snapshot.forEach(snap => {
            children.push(
              new ParallelsVirtualMachineItem(
                snap.id,
                snap.name,
                snap.state,
                vscode.TreeItemCollapsibleState.None,
                "images"
              )
            );
          });
          resolve(children);
        });
      }
    });
  }
}

function getMachines(): Promise<ParallelsVirtualMachine[]> {
  return new Promise((resolve, reject) => {
    cp.exec("prlctl list -a --json", (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
      const vms: ParallelsVirtualMachine[] = JSON.parse(stdout);
      vms.forEach(vm => {
        // console.log(`found vm: ${vm.name}`);
      });

      resolve(vms);
    });
  });
}

class ParallelsVirtualMachineItem extends vscode.TreeItem {
  constructor(
    public id: string,
    label: string,
    public version: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);

    this.iconPath = {
      light: path.join(__filename, "..", "..", "img", "light", `${iconName}.svg`),
      dark: path.join(__filename, "..", "..", "img", "dark", `${iconName}.svg`)
    };
    this.label = label;
    this.description = version;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = version;
  }
}
