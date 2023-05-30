import {VirtualMachineDetails} from "../models/virtual_machine_details";
import {MachineSnapshot} from "./../snapshot";
import * as cp from "child_process";

export class Commands {
  constructor(private workspaceRoot: string) {}

  static isParallelsDesktopInstalled(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      cp.exec("prlctl --version", (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return resolve(false);
        }
        return resolve(true);
      });
    });
  }

  static getMachineStatus(machineId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cp.exec(`prlctl status ${machineId}`, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        if (stdout.includes("running")) {
          resolve("running");
        }
        if (stdout.includes("stopped")) {
          resolve("stopped");
        }
        if (stdout.includes("suspended")) {
          resolve("suspended");
        }
        if (stdout.includes("paused")) {
          resolve("paused");
        }

        resolve("unknown");
      });
    });
  }

  static getMachineSnapshot(machineId: string): Promise<MachineSnapshot[]> {
    return new Promise((resolve, reject) => {
      const result: MachineSnapshot[] = [];
      cp.exec(`prlctl snapshot-list ${machineId} -j`, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }

        if (stdout === "") {
          return resolve(result);
        }

        const snapshots = JSON.parse(stdout);
        for (const snapshot in snapshots) {
          const machineSnapshot = snapshots[snapshot] as MachineSnapshot;
          machineSnapshot.id = snapshot.replace("{", "").replace("}", "");
          machineSnapshot.parent = machineSnapshot.parent.replace("{", "").replace("}", "");
          result.push(machineSnapshot);
        }

        return resolve(result);
      });
    });
  }

  static getMachineDetails(machineId: string): Promise<VirtualMachineDetails | null> {
    return new Promise((resolve, reject) => {
      //   let result: VirtualMachineDetails[] = [];
      cp.exec(`prlctl list -i ${machineId} -j`, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return reject(err);
        }

        if (stdout === "") {
          return resolve(null);
        }

        const details = JSON.parse(stdout);
        if (details.length !== 1) {
          return resolve(null);
        }

        return resolve(details[0] as VirtualMachineDetails);
      });
    });
  }
}
