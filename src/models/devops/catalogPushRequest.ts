import {cp} from "fs";
export interface CatalogPushRequest {
  catalog_id: string;
  version: string;
  architecture: string;
  connection: string;
  description?: string;
  local_path: string;
  required_roles: string[];
  required_claims: string[];
  specs: {
    cpu: number;
    memory: number;
    disk: number;
  };
  tags: string[];
}
