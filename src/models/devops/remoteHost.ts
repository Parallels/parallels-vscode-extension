export interface DevOpsRemoteHost {
  id: string;
  enabled: boolean;
  host: string;
  architecture: string;
  cpu_model: string;
  description: string;
  tags: string[];
  state: string;
  resources: DevOpsRemoteHostResources;
}

export interface DevOpsRemoteHostResources {
  logical_cpu_count: number;
  memory_size: number;
  disk_size: number;
}
