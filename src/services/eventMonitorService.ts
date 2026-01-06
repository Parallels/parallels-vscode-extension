import * as cp from "child_process";
import * as vscode from "vscode";
import WebSocket from "ws";
import { LogService } from "./logService";
import { Provider } from "../ioc/provider";
import { VirtualMachine } from "../models/parallels/virtualMachine";
import { ParallelsDesktopService } from "./parallelsDesktopService";
import { FLAG_NO_GROUP, FLAG_PARALLELS_DESKTOP_PATH, CommandsFlags } from "../constants/flags";
import { DevOpsRemoteHostProvider } from "../models/devops/remoteHostProvider";
import {
  WebSocketConnectionState,
  isHealthEvent,
  isSubscriptionEvent,
  isOrchestratorEvent,
  isHostVmStateChanged,
  isHostVmAdded,
  isHostVmRemoved,
  isHostHealthUpdate,
  OrchestratorEvent,
  HostVmEvent,
  HostHealthUpdate
} from "../models/devops/websocketEvent";
import { DevOpsService } from "./devopsService";

interface ParallelsServiceEvent {
  Timestamp: string;
  "VM ID": string;
  "Event name": string;
  "Additional info"?: any;
}

interface VmStateChange {
  "Vm state name": string;
}

interface VmAdded {
  vm_id: string;
  new_vm: VirtualMachine;
}

interface VmRemoved {
  vm_id: string;
}

export class EventMonitorService {
  private static process: cp.ChildProcess | undefined;
  private static onUpdateCallback: (() => void) | undefined;

  // WebSocket connections for DevOps orchestrators
  private static websocketConnections: Map<
    string,
    {
      socket: WebSocket;
      provider: DevOpsRemoteHostProvider;
      heartbeatInterval?: NodeJS.Timeout;
      reconnectTimeout?: NodeJS.Timeout;
      refreshDebounceTimeout?: NodeJS.Timeout;
      missedPongs: number;
    }
  > = new Map();

  private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private static readonly MAX_MISSED_PONGS = 3;
  private static readonly MAX_RETRY_ATTEMPTS = 10;
  private static readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  private static readonly REFRESH_DEBOUNCE_MS = 100; // 100ms debounce for tree refresh

  static start(onUpdate: () => void) {
    if (this.process) {
      return;
    }
    this.onUpdateCallback = onUpdate;
    LogService.info("Starting Parallels Desktop Event Monitor", "EventMonitorService");

    try {
      const settings = Provider.getSettings();
      const prlctlPath = settings.get<string>(FLAG_PARALLELS_DESKTOP_PATH) || "prlctl";

      this.process = this.spawnEventMonitorProcess(prlctlPath);

      if (this.process.stdout) {
        this.process.stdout.on("data", data => {
          const output = data.toString();
          const lines = output.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event: ParallelsServiceEvent = JSON.parse(line);
              this.processEvent(event);
            } catch (e) {
              LogService.error(`Failed to parse Event Monitor output line: ${line}`, "EventMonitorService");
              // Ignore non-JSON lines
            }
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on("data", data => {
          LogService.error(`Event Monitor Error: ${data.toString()}`, "EventMonitorService");
        });
      }

      this.process.on("exit", code => {
        LogService.info(`Event Monitor exited with code ${code}`, "EventMonitorService");
        this.process = undefined;
      });
    } catch (e) {
      LogService.error(`Failed to start Event Monitor: ${e}`, "EventMonitorService");
    }
  }

  private static spawnEventMonitorProcess(prlctlPath: string): cp.ChildProcess {
    // macOS: 'prlctl' buffers output when not in a TTY.
    // We use 'expect' to create a PTY, forcing line-buffering.
    // 'set timeout -1' prevents the default 10s timeout.
    const script = `set timeout -1; spawn "${prlctlPath}" monitor-events --json; expect eof`;
    LogService.info(`Spawning Event Monitor (macOS/expect)`, "EventMonitorService");
    return cp.spawn("expect", ["-c", script]);
  }

  static stop() {
    if (this.process) {
      LogService.info("Stopping Parallels Desktop Event Monitor", "EventMonitorService");
      this.process.kill();
      this.process = undefined;
    }
  }

  private static async processEvent(event: ParallelsServiceEvent) {
    const config = Provider.getConfiguration();
    let shouldRefresh = false;
    LogService.info(`Processing event: ${event["Event name"]}`, "EventMonitorService");

    switch (event["Event name"]) {
      case "vm_state_changed":
        shouldRefresh = await this.processVmStateChanged(event, config);
        break;
      case "vm_added":
        shouldRefresh = await this.processVmAdded(event, config);
        break;
      case "vm_unregistered":
        shouldRefresh = await this.processVmUnregistered(event, config);
        break;
      case "vm_snapshots_tree_changed":
        shouldRefresh = await this.processSnapshotsTreeChanged(event, config);
        break;
      // case "vm_config_changed":
      //     shouldRefresh = await this.processVmConfigChanged(event, config);
      //     break;
      default:
        LogService.debug(`Unhandled event: ${event["Event name"]}`, "EventMonitorService");
        break;
    }

    if (shouldRefresh && this.onUpdateCallback) {
      config.save();
      this.onUpdateCallback();
    }
  }

  private static async processVmStateChanged(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const info = event["Additional info"] as VmStateChange;
    const vmId = event["VM ID"];
    if (!info || !vmId) return false;

    const vm = config.getVirtualMachine(vmId);
    if (vm) {
      const newState = info["Vm state name"];
      LogService.info(`Updating VM ${vm.Name} state to ${newState}`, "EventMonitorService");
      vm.State = newState;
      if (newState === "running") {
        this.fetchAndSetVmIp(vmId, config);
      } else if (newState === "stopped" || newState === "suspended") {
        vm.configuredIpAddress = undefined;
      }
      return true;
    }
    return false;
  }

  private static async fetchAndSetVmIp(vmId: string, config: any) {
    try {
      const isReady = await this.waitForVmReady(vmId);
      if (!isReady) {
        LogService.warning(`Timeout waiting for VM ${vmId} to be ready`, "EventMonitorService");
        return;
      }

      const detailsArray = await ParallelsDesktopService.getVmsRunningDetails(vmId);
      const details = detailsArray[0];
      const vm = config.getVirtualMachine(vmId);
      if (vm && details && details.ip_configured) {
        LogService.debug(`Updating IP for VM ${vm.Name} to ${details.ip_configured}`, "EventMonitorService");
        vm.configuredIpAddress = details.ip_configured;
        config.save();
        if (this.onUpdateCallback) {
          this.onUpdateCallback();
        }
      }
    } catch (error) {
      LogService.error(`Failed to fetch IP for VM ${vmId}: ${error}`, "EventMonitorService");
    }
  }

  private static async waitForVmReady(vmId: string, maxRetries = 60, interval = 400): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await ParallelsDesktopService.executeOnVm(vmId, "date");
        LogService.debug(`VM ${vmId} is ready after ${i + 1} attempts`, "EventMonitorService");
        return true;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    return false;
  }

  private static async processVmAdded(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (!vmId) {
      LogService.error("VM Added event missing VM ID", "EventMonitorService");
      return false;
    }
    LogService.info(`VM Added event for ID: ${vmId}.`, "EventMonitorService");
    return await this.updateVmInConfig(vmId, config);
  }

  private static async processVmUnregistered(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (vmId) {
      LogService.info(`VM Unregistered: ${vmId}`, "EventMonitorService");
      config.removeMachine(vmId);
      return true;
    }
    return false;
  }

  private static async processSnapshotsTreeChanged(event: ParallelsServiceEvent, config: any): Promise<boolean> {
    const vmId = event["VM ID"];
    if (vmId) {
      LogService.info(`Snapshots tree changed for VM: ${vmId}`, "EventMonitorService");
      return await this.updateVmInConfig(vmId, config);
    }
    return false;
  }

  private static async updateVmInConfig(vmId: string, config: any): Promise<boolean> {
    LogService.info(`Fetching details for VM ${vmId}...`, "EventMonitorService");
    try {
      // We need to execute prlctl list to get the full VM details
      const fullVm = await ParallelsDesktopService.getVmPath(vmId);
      const noGroup = config.getVirtualMachineGroup(FLAG_NO_GROUP);

      if (fullVm && noGroup) {
        // Check if the VM is already known
        const existingVm = config.getVirtualMachine(vmId);
        if (existingVm) {
          LogService.info(`VM ${vmId} already exists in config, updating...`, "EventMonitorService");
          // Preserve group if it exists, otherwise use default
          fullVm.group = existingVm.group || noGroup.uuid;
          // Remove old object to ensure clean update
          config.removeMachine(vmId);
        } else {
          fullVm.group = noGroup.uuid;
        }

        fullVm.hidden = false;
        // Add the new/updated VM object
        const targetGroup = config.getVirtualMachineGroup(fullVm.group) || noGroup;
        targetGroup.addVm(fullVm);

        LogService.info(`Updated/Added VM ${fullVm.Name} to group ${targetGroup.uuid}`, "EventMonitorService");
        return true;
      }
    } catch (e) {
      LogService.error(`Failed to fetch details for VM ${vmId}: ${e}`, "EventMonitorService");
    }
    return false;
  }

  // ===== WebSocket Event Monitoring for DevOps Orchestrators =====

  static async connectWebSocket(provider: DevOpsRemoteHostProvider): Promise<void> {
    if (this.websocketConnections.has(provider.ID)) {
      LogService.info(`WebSocket already connected for provider ${provider.name}`, "EventMonitorService");
      return;
    }

    LogService.info(`Attempting WebSocket connection for orchestrator: ${provider.name}`, "EventMonitorService");

    try {
      const url = await DevOpsService.getHostUrl(provider);
      const auth = await DevOpsService.authorize(provider);

      // Construct WebSocket URL (ws:// for http, wss:// for https)
      let protocol = "ws";
      if (provider.scheme === "https") {
        protocol = "wss";
      }
      const wsUrl = `${protocol}://${provider.host}:${provider.port}/api/v1/ws/subscribe?event_types=orchestrator,health`;

      LogService.info(`Connecting to WebSocket: ${wsUrl}`, "EventMonitorService");

      const ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${auth?.token}`
        }
      });

      const connectionData = {
        socket: ws,
        provider: provider,
        missedPongs: 0
      };

      this.websocketConnections.set(provider.ID, connectionData);
      provider.websocketRetryCount = 0;
      provider.websocketState = WebSocketConnectionState.Connected;

      ws.onopen = () => {
        LogService.info(`WebSocket connected for ${provider.name}`, "EventMonitorService");
        provider.websocketState = WebSocketConnectionState.Connected;

        // Stop polling if it was running
        if (provider.pollingIntervalId) {
          clearInterval(provider.pollingIntervalId);
          provider.pollingIntervalId = undefined;
          LogService.info(`Stopped polling for ${provider.name} - using WebSocket`, "EventMonitorService");
        }

        // Start heartbeat
        this.startHeartbeat(provider.ID);
      };

      ws.onmessage = (event: WebSocket.MessageEvent) => {
        this.handleWebSocketMessage(provider.ID, event.data.toString());
      };

      ws.onerror = (error: WebSocket.ErrorEvent) => {
        LogService.error(`WebSocket error for ${provider.name}: ${error.message}`, "EventMonitorService");
      };

      ws.onclose = () => {
        LogService.info(`WebSocket closed for ${provider.name}`, "EventMonitorService");
        this.cleanupWebSocketConnection(provider.ID, true);
      };
    } catch (error) {
      LogService.error(`Failed to connect WebSocket for ${provider.name}: ${error}`, "EventMonitorService");
      provider.websocketState = WebSocketConnectionState.PollingFallback;

      // Immediately start polling as fallback
      this.startPollingFallback(provider);
    }
  }

  private static startHeartbeat(providerId: string): void {
    const connection = this.websocketConnections.get(providerId);
    if (!connection) return;

    // Clear any existing heartbeat
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }

    connection.heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        // Send ping
        const pingMessage = JSON.stringify({
          event_type: "health",
          message: "ping"
        });

        connection.socket.send(pingMessage);
        connection.missedPongs++;

        // Check if too many pongs missed
        if (connection.missedPongs >= this.MAX_MISSED_PONGS) {
          LogService.warning(
            `Missed ${connection.missedPongs} pongs from ${connection.provider.name}, closing connection`,
            "EventMonitorService"
          );
          connection.socket.close();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private static handleWebSocketMessage(providerId: string, data: string): void {
    const connection = this.websocketConnections.get(providerId);
    if (!connection) return;

    try {
      const event = JSON.parse(data);

      // Handle health events (pong)
      if (isHealthEvent(event)) {
        if (event.message === "pong") {
          connection.missedPongs = 0; // Reset missed pong counter
          LogService.debug(`Received pong from ${connection.provider.name}`, "EventMonitorService");
        }
        return;
      }

      // Handle subscription confirmation
      if (isSubscriptionEvent(event)) {
        LogService.info(
          `Subscribed to channels: ${event.body.subscriptions.join(", ")} for ${connection.provider.name}`,
          "EventMonitorService"
        );
        return;
      }

      // Handle orchestrator events
      if (isOrchestratorEvent(event)) {
        this.processOrchestratorEvent(connection.provider, event);
      }
    } catch (error) {
      LogService.error(
        `Failed to parse WebSocket message from ${connection.provider.name}: ${error}. Data: ${data}`,
        "EventMonitorService"
      );
      // On malformed event, disconnect and fall back to polling
      connection.socket.close();
    }
  }

  private static processOrchestratorEvent(provider: DevOpsRemoteHostProvider, event: OrchestratorEvent): void {
    LogService.info(`Processing orchestrator event: ${event.message} for ${provider.name}`, "EventMonitorService");

    const config = Provider.getConfiguration();
    let needsRefresh = false;

    if (isHostVmStateChanged(event)) {
      const body = event.body as HostVmEvent;
      const vmId = (body.event as any).vm_id;
      const currentState = (body.event as any).current_state;

      // Find and update VM state
      const vm = provider.virtualMachines.find(v => v.ID === vmId);
      if (vm) {
        LogService.info(`Updating VM ${vm.Name} state to ${currentState}`, "EventMonitorService");
        vm.State = currentState;
        needsRefresh = true;
      }
    } else if (isHostVmAdded(event)) {
      const body = event.body as HostVmEvent;
      const vmId = (body.event as any).vm_id;

      LogService.info(`VM added event for ${vmId}, fetching full VM data`, "EventMonitorService");

      // Fetch full VM data from API
      DevOpsService.getRemoteHostVms(provider)
        .then(vms => {
          const newVm = vms.find(v => v.ID === vmId);
          if (newVm && !provider.virtualMachines.find(v => v.ID === vmId)) {
            provider.virtualMachines.push(newVm);
            config.save();
            this.debounceTreeRefresh(provider.ID);
          }
        })
        .catch(error => {
          LogService.error(`Failed to fetch VM data for ${vmId}: ${error}`, "EventMonitorService");
        });
    } else if (isHostVmRemoved(event)) {
      const body = event.body as HostVmEvent;
      const vmId = (body.event as any).vm_id;

      LogService.info(`VM removed event for ${vmId}`, "EventMonitorService");

      const index = provider.virtualMachines.findIndex(v => v.ID === vmId);
      if (index !== -1) {
        provider.virtualMachines.splice(index, 1);
        needsRefresh = true;
      }
    } else if (isHostHealthUpdate(event)) {
      const body = event.body as HostHealthUpdate;

      LogService.info(`Host health update: ${body.host_id} -> ${body.state}`, "EventMonitorService");

      // Update host state in provider's hosts array
      if (provider.hosts) {
        const host = provider.hosts.find(h => h.id === body.host_id);
        if (host) {
          host.state = body.state;
          needsRefresh = true;
        }
      }
    }

    if (needsRefresh) {
      config.save();
      this.debounceTreeRefresh(provider.ID);
    }
  }

  private static debounceTreeRefresh(providerId: string): void {
    const connection = this.websocketConnections.get(providerId);
    if (!connection) return;

    // Clear existing debounce timeout
    if (connection.refreshDebounceTimeout) {
      clearTimeout(connection.refreshDebounceTimeout);
    }

    // Set new debounce timeout
    connection.refreshDebounceTimeout = setTimeout(() => {
      vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
      connection.refreshDebounceTimeout = undefined;
    }, this.REFRESH_DEBOUNCE_MS);
  }

  private static cleanupWebSocketConnection(providerId: string, shouldReconnect: boolean): void {
    const connection = this.websocketConnections.get(providerId);
    if (!connection) return;

    // Clear heartbeat interval
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }

    // Clear reconnect timeout
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
    }

    // Clear refresh debounce timeout
    if (connection.refreshDebounceTimeout) {
      clearTimeout(connection.refreshDebounceTimeout);
    }

    this.websocketConnections.delete(providerId);

    if (shouldReconnect) {
      this.attemptReconnect(connection.provider);
    }
  }

  private static attemptReconnect(provider: DevOpsRemoteHostProvider): void {
    const retryCount = provider.websocketRetryCount ?? 0;

    if (retryCount >= this.MAX_RETRY_ATTEMPTS) {
      LogService.warning(
        `Max reconnect attempts (${this.MAX_RETRY_ATTEMPTS}) reached for ${provider.name}, falling back to polling`,
        "EventMonitorService"
      );
      provider.websocketState = WebSocketConnectionState.PollingFallback;
      this.startPollingFallback(provider);
      return;
    }

    provider.websocketRetryCount = retryCount + 1;
    provider.websocketState = WebSocketConnectionState.Reconnecting;

    // Calculate exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s
    const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, retryCount);

    LogService.info(
      `Scheduling reconnect attempt ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS} for ${provider.name} in ${backoffMs}ms`,
      "EventMonitorService"
    );

    // Start polling immediately while waiting for reconnect
    if (!provider.pollingIntervalId) {
      this.startPollingFallback(provider);
    }

    setTimeout(() => {
      this.connectWebSocket(provider);
    }, backoffMs);
  }

  private static startPollingFallback(provider: DevOpsRemoteHostProvider): void {
    if (provider.pollingIntervalId) {
      return; // Already polling
    }

    LogService.info(`Starting polling fallback for ${provider.name}`, "EventMonitorService");

    const pollInterval = 15000; // 15 seconds

    provider.pollingIntervalId = setInterval(async () => {
      try {
        const vms = await DevOpsService.getRemoteHostVms(provider);

        // Simple comparison - if VM count or states changed, update
        if (vms.length !== provider.virtualMachines.length) {
          provider.virtualMachines = vms;
          provider.needsTreeRefresh = true;
          Provider.getConfiguration().save();
          vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        } else {
          // Check for state changes
          let hasChanges = false;
          for (const newVm of vms) {
            const existingVm = provider.virtualMachines.find(v => v.ID === newVm.ID);
            if (!existingVm || existingVm.State !== newVm.State) {
              hasChanges = true;
              break;
            }
          }

          if (hasChanges) {
            provider.virtualMachines = vms;
            provider.needsTreeRefresh = true;
            Provider.getConfiguration().save();
            vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
          }
        }
      } catch (error) {
        LogService.error(`Polling failed for ${provider.name}: ${error}`, "EventMonitorService");
      }
    }, pollInterval);
  }

  static disconnectWebSocket(providerId: string): void {
    const connection = this.websocketConnections.get(providerId);
    if (!connection) return;

    LogService.info(`Disconnecting WebSocket for ${connection.provider.name}`, "EventMonitorService");

    // Stop polling if running
    if (connection.provider.pollingIntervalId) {
      clearInterval(connection.provider.pollingIntervalId);
      connection.provider.pollingIntervalId = undefined;
    }

    // Close socket
    if (connection.socket.readyState === WebSocket.OPEN || connection.socket.readyState === WebSocket.CONNECTING) {
      connection.socket.close();
    }

    this.cleanupWebSocketConnection(providerId, false);
  }

  static disconnectAllWebSockets(): void {
    LogService.info("Disconnecting all WebSocket connections", "EventMonitorService");

    const providerIds = Array.from(this.websocketConnections.keys());
    for (const providerId of providerIds) {
      this.disconnectWebSocket(providerId);
    }
  }
}

