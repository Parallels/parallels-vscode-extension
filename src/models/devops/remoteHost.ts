import {CatalogCacheResponse} from "../parallels/catalog_cache_response";
import {DevOpsReverseProxy} from "./reverse_proxy_hosts";

export interface DevOpsRemoteHost {
  id: string;
  enabled: boolean;
  host: string;
  architecture: string;
  cpu_model: string;
  os_version: string;
  os_name: string;
  external_ip_address: string;
  devops_version: string;
  description: string;
  tags: string[];
  state: string;
  parallels_desktop_version: string;
  parallels_desktop_licensed: boolean;
  is_reverse_proxy_enabled: boolean;
  reverse_proxy: DevOpsRemoteHostReverseProxy;
  reverse_proxy_hosts: DevOpsRemoteHostReverseProxyHost[];
  resources: DevOpsRemoteHostResources;
  detailed_resources: DevOpsRemoteHostDetailedResources;
  catalogCache?: CatalogCacheResponse;
  reverseProxy?: DevOpsReverseProxy;
  has_websocket_events?: boolean;
}

export interface DevOpsRemoteHostResources {
  logical_cpu_count: number;
  memory_size: number;
  disk_size: number;
}

export interface DevOpsRemoteHostReverseProxy {
  host: string;
  port: string;
  hosts: DevOpsRemoteHostReverseProxyHost[];
}

export interface DevOpsRemoteHostReverseProxyHost {
  id: string;
  host_id: string;
  host: string;
  port: string;
  tcp_route?: DevOpsRemoteHostReverseProxyHostTCPRoute;
  cors?: DevOpsRemoteHostReverseProxyHostCors;
  tls?: DevOpsRemoteHostReverseProxyHostTLS;
  http_routes?: DevOpsRemoteHostReverseProxyHostHTTPRoute[];
}

export interface DevOpsRemoteHostReverseProxyHostCors {
  enabled: boolean;
  allowed_origins: string[];
  allowed_methods: string[];
  allowed_headers: string[];
}

export interface DevOpsRemoteHostReverseProxyHostTLS {
  enabled: boolean;
  cert: string;
  key: string;
}

export interface DevOpsRemoteHostReverseProxyHostHTTPRoute {
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

export interface DevOpsRemoteHostReverseProxyHostTCPRoute {
  target_port: string;
  target_host: string;
  target_vm_id: string;
}

export interface DevOpsRemoteHostDetailedResources {
  system_reserved: DevOpsRemoteHostResources;
  total: DevOpsRemoteHostResources;
  total_available: DevOpsRemoteHostResources;
  total_in_use: DevOpsRemoteHostResources;
  total_reserved: DevOpsRemoteHostResources;
}
