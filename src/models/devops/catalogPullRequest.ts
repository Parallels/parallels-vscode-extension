export interface CatalogPullRequest {
  catalog_id: string;
  version: string;
  architecture: string;
  machine_name: string;
  connection: string;
  path: string;
  start_after_pull: boolean;
}
