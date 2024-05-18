export interface AddOrchestratorHostRequest {
  host: string;
  description?: string;
  tags?: string[];
  authentication: AddOrchestratorHostRequestAuthentication;
}

export interface AddOrchestratorHostRequestAuthentication {
  username: string;
  password: string;
}
