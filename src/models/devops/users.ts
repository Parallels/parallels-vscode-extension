export interface DevOpsUser {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: string[];
  claims: string[];
  isSuperUser: boolean;
}

export interface DevOpsCreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  is_super_user: boolean;
}

export interface DevOpsUpdateUserRequest {
  name?: string;
  password?: string;
  email?: string;
}
