import { VirtualMachine } from "../parallels/virtualMachine";
import { DevOpsRemoteHost } from "./remoteHost";
import { DevOpsRemoteHostResource } from "./remoteHostResource";

export interface DevOpsRemoteHostProvider {
  class: "DevOpsRemoteHostProvider"
  ID: string;
  name: string;
  host?: string;
  port?: number;
  scheme?: string;
  rawHost: string;
  username: string;
  password: string;
  type: "remote_host" | "orchestrator"
  state: "active" | "inactive" | "disabled" | "unknown";
  createdAt?: string;
  updatedAt?: string;
  needsTreeRefresh?: boolean;
  virtualMachines: VirtualMachine[];
  resources?: DevOpsRemoteHostResource[];
  hosts?: DevOpsRemoteHost[];
}