export interface HostHardwareInfo {
  cpu_type: string;
  cpu_brand: string;
  devops_version: string;
  os_name: string;
  os_version: string;
  parallels_desktop_version: string;
  parallels_desktop_licensed: boolean;
  external_ip_address: string;
  is_reverse_proxy_enabled: boolean;
  reverse_proxy: HostHardwareInfoReverseProxy;
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

export function convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(
  devOpsRemoteHostResource: any
): HostHardwareInfoTotal {
  if (!devOpsRemoteHostResource) {
    return {
      logical_cpu_count: 0,
      memory_size: 0,
      disk_count: 0
    };
  }
  return {
    logical_cpu_count: devOpsRemoteHostResource.logical_cpu_count,
    memory_size: devOpsRemoteHostResource.memory_size,
    disk_count: devOpsRemoteHostResource.disk_size
  };
}

export interface HostHardwareInfoReverseProxy {
  enabled: boolean;
  host: string;
  port: string;
  hosts: HostHardwareInfoReverseProxyHost[];
}

export function convertFromDevOpsRemoteHostReverseProxyToHostHardwareInfoReverseProxy(
  devOpsRemoteHostReverseProxy: any
): HostHardwareInfoReverseProxy {
  if (!devOpsRemoteHostReverseProxy) {
    return {
      enabled: false,
      host: "",
      port: "",
      hosts: []
    };
  }
  return {
    enabled: devOpsRemoteHostReverseProxy.enabled,
    host: devOpsRemoteHostReverseProxy.host,
    port: devOpsRemoteHostReverseProxy.port,
    hosts: devOpsRemoteHostReverseProxy.hosts.map((host: any) =>
      convertFromDevOpsRemoteHostReverseProxyHostToHostHardwareInfoReverseProxyHost(host)
    )
  };
}

export function convertFromDevOpsRemoteHostReverseProxyHostToHostHardwareInfoReverseProxyHost(
  devOpsRemoteHostReverseProxyHost: any
): HostHardwareInfoReverseProxyHost {
  if (!devOpsRemoteHostReverseProxyHost) {
    return {
      id: "",
      host: "",
      port: "",
      tcp_route: undefined,
      cors: undefined,
      tls: undefined,
      http_routes: []
    };
  }
  return {
    id: devOpsRemoteHostReverseProxyHost.id || "",
    host: devOpsRemoteHostReverseProxyHost.host || "",
    port: devOpsRemoteHostReverseProxyHost.port || "",
    tcp_route: devOpsRemoteHostReverseProxyHost.tcp_route || undefined,
    cors: devOpsRemoteHostReverseProxyHost.cors || undefined,
    tls: devOpsRemoteHostReverseProxyHost.tls || undefined,
    http_routes: devOpsRemoteHostReverseProxyHost.http_routes || []
  };
}

export interface HostHardwareInfoReverseProxyHost {
  id: string;
  host: string;
  port: string;
  tcp_route?: HostHardwareInfoReverseProxyHostTCPRoute;
  cors?: HostHardwareInfoReverseProxyHostCors;
  tls?: HostHardwareInfoReverseProxyHostTLS;
  http_routes?: HostHardwareInfoReverseProxyHostHTTPRoute[];
}

export interface HostHardwareInfoReverseProxyHostCors {
  enabled: boolean;
  allowed_origins: string[];
  allowed_methods: string[];
  allowed_headers: string[];
}

export interface HostHardwareInfoReverseProxyHostTLS {
  enabled: boolean;
  cert: string;
  key: string;
}

export interface HostHardwareInfoReverseProxyHostHTTPRoute {
  id: string;
  path?: string;
  target_host: string;
  target_port: string;
  pattern: string;
  response_headers: {[key: string]: string};
  target_vm_id?: string;
  schema?: string;
  request_headers?: {[key: string]: string};
}

export interface HostHardwareInfoReverseProxyHostTCPRoute {
  target_port: string;
  target_host: string;
  target_vm_id: string;
}
