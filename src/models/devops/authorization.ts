export interface AuthorizationRequest {
  email:    string;
  password: string;
}

export interface AuthorizationResponse {
  email:      string;
  token:      string;
  expires_at: number;
}
