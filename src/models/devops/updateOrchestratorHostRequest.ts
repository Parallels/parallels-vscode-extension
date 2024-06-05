export interface UpdateOrchestratorHostRequest {
  host?: string;
  description?: string;
  authentication?: UpdateOrchestratorHostRequestAuthentication;
}

export interface UpdateOrchestratorHostRequestAuthentication {
  username: string;
  password: string;
}
