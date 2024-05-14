export interface Host {
  hostname: string;
  schema: string;
  port: string;
}

export function parseHost(host: string): Host {
  const result: Host = {
    hostname: "",
    schema: "",
    port: ""
  }

  if (host.includes("://")) {
    const [schema, hostname] = host.split("://");
    result.schema = schema;
    if (hostname.includes(":")) {
      const [hostUrl, port] = hostname.split(":");
      result.hostname = hostUrl;
      result.port = port;
    } else {
      result.hostname = hostname;
    }
  } else {
    result.schema = "http";
    if (host.includes(":")) {
      const [hostUrl, port] = host.split(":");
      result.hostname = hostUrl;
      result.port = port;
    } else {
      result.hostname = host;
    }
  }

  return result;
}

function getHost(host: Host): string {
  let result = ""
  if (host.schema) {
    result += `${host.schema}://`;
  }
  result += host.hostname;
  if (host.port) {
    result += `:${host.port}`;
  }
  return result;
}