import {CatalogCacheResponse} from "../parallels/catalog_cache_response";
import {VirtualMachine} from "../parallels/virtualMachine";
import {HostHardwareInfo} from "./hardwareInfo";
import {DevOpsRemoteHost} from "./remoteHost";
import {DevOpsRemoteHostResource} from "./remoteHostResource";
import {DevOpsRolesAndClaims} from "./rolesAndClaims";
import {DevOpsUser} from "./users";

export interface DevOpsRemoteHostProvider {
  class: "DevOpsRemoteHostProvider";
  authToken?: string;
  user?: DevOpsUser;
  ID: string;
  name: string;
  host?: string;
  port?: number;
  scheme?: string;
  rawHost: string;
  username: string;
  password: string;
  type: "remote_host" | "orchestrator";
  state: "active" | "inactive" | "disabled" | "unknown";
  createdAt?: string;
  updatedAt?: string;
  needsTreeRefresh?: boolean;
  virtualMachines: VirtualMachine[];
  resources?: DevOpsRemoteHostResource[];
  hosts?: DevOpsRemoteHost[];
  users?: DevOpsUser[];
  roles?: DevOpsRolesAndClaims[];
  claims?: DevOpsRolesAndClaims[];
  hardwareInfo?: HostHardwareInfo;
  catalogCache?: CatalogCacheResponse;
  lastUpdatedHardwareInfo?: string;
}
