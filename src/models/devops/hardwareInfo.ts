export interface HostHardwareInfo {
  cpu_type: string;
  cpu_brand: string;
  devops_version?: string;
  parallels_desktop_version?: string;
  parallels_desktop_licensed?: boolean;
  system_reserved: HostHardwareInfoTotal;
  total: HostHardwareInfoTotal;
  total_available: HostHardwareInfoTotal;
  total_in_use: HostHardwareInfoTotal;
  total_reserved: HostHardwareInfoTotal;
}

export interface HostHardwareInfoTotal {
  logical_cpu_count: number;
  memory_size: number;
  disk_count: number;
}
