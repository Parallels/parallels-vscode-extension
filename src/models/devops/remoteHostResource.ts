export interface DevOpsRemoteHostResource {
  cpu_type: string;
  total: DevOpsRemoteHostResourceTotal;
  total_available: DevOpsRemoteHostResourceTotal;
  total_in_use: DevOpsRemoteHostResourceTotal;
  total_reserved: DevOpsRemoteHostResourceTotal;
}

export interface DevOpsRemoteHostResourceTotal {
  logical_cpu_count: number;
  memory_size: number;
}
