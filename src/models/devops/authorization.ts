export interface AuthorizationRequest {
  email: string;
  password: string;
}

export interface AuthorizationResponse {
  email: string;
  token: string;
  expires_at: number;
}

export interface AuthorizationToken {
  claims?: string[];
  roles?: string[];
  email?: string;
  exp?: number;
  uid?: string;
}
