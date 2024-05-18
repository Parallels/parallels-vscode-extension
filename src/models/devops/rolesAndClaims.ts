export interface DevOpsRolesAndClaims {
  id:   string;
  name: string;
}

export interface DevOpsRolesAndClaimsCreateRequest {
  name: string;
}

export interface DevOpsCatalogRolesAndClaimsCreateRequest {
  required_roles?: string[];
  required_claims?: string[];
  tags?: string[];
}