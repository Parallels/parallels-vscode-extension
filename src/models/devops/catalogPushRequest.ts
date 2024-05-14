export interface CatalogPushRequest {
  catalog_id:      string;
  version:         string;
  architecture:    string;
  connection:      string;
  local_path:      string;
  required_roles:  string[];
  required_claims: string[];
}
