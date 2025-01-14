import {DevOpsRemoteHostReverseProxyHost} from "./remoteHost";

export interface DevOpsReverseProxy {
  reverse_proxy_config?: ReverseProxyConfig;
  reverse_proxy_hosts?: DevOpsRemoteHostReverseProxyHost[];
}

export interface ReverseProxyConfig {
  id: string;
  enabled: boolean;
  host: string;
  port: string;
}

export function createEmptyDevOpsReverseProxy(): DevOpsReverseProxy {
  return {
    reverse_proxy_config: {
      id: "",
      enabled: false,
      host: "",
      port: ""
    },
    reverse_proxy_hosts: []
  };
}

export function updateCurrentDevOpsReverseProxyItems(
  existingItems: DevOpsRemoteHostReverseProxyHost[],
  newItems: DevOpsRemoteHostReverseProxyHost[]
): DevOpsRemoteHostReverseProxyHost[] {
  const updatedManifestsMap = new Map<string, DevOpsRemoteHostReverseProxyHost>();

  newItems.forEach(manifest => {
    const key = `${manifest.host_id}-${manifest.host}-${manifest.port}`;
    updatedManifestsMap.set(key, manifest);
  });

  existingItems.forEach(manifest => {
    const key = `${manifest.host_id}-${manifest.host}-${manifest.port}`;
    if (updatedManifestsMap.has(key)) {
      updatedManifestsMap.set(key, {...manifest, ...updatedManifestsMap.get(key)});
    }
  });

  return Array.from(updatedManifestsMap.values());
}

export function updateCurrentDevOpsReverseProxy(
  existingReverseProxy: DevOpsReverseProxy,
  newReverseProxy: DevOpsReverseProxy
): DevOpsReverseProxy {
  return {
    reverse_proxy_config: newReverseProxy.reverse_proxy_config ?? existingReverseProxy.reverse_proxy_config,
    reverse_proxy_hosts: updateCurrentDevOpsReverseProxyItems(
      existingReverseProxy.reverse_proxy_hosts ?? [],
      newReverseProxy.reverse_proxy_hosts ?? []
    )
  };
}
