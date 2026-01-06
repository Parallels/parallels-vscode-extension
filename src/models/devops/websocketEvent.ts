// WebSocket Event Models for DevOps Orchestrator Events

export enum WebSocketConnectionState {
  Connected = "connected",
  Reconnecting = "reconnecting",
  PollingFallback = "polling_fallback",
  NotSupported = "not_supported"
}

// Base WebSocket Event
export interface BaseWebSocketEvent {
  id: string;
  event_type: string;
  timestamp: string;
  message: string;
}

// Health Event (ping/pong)
export interface HealthEvent extends BaseWebSocketEvent {
  event_type: "health";
  message: "ping" | "pong";
  client_id?: string;
  ref_id?: string;
}

// Connection Subscription Event
export interface SubscriptionEvent extends BaseWebSocketEvent {
  event_type: "global";
  message: string;
  body: {
    client_id: string;
    subscriptions: string[];
  };
}

// Orchestrator Events
export interface OrchestratorEvent extends BaseWebSocketEvent {
  event_type: "orchestrator";
  message: "HOST_VM_STATE_CHANGED" | "HOST_VM_ADDED" | "HOST_VM_REMOVED" | "HOST_HEALTH_UPDATE";
  body: HostVmEvent | HostHealthUpdate;
}

// Host VM Event Base
export interface HostVmEvent {
  host_id: string;
  event: VmStateChange | VmAdded | VmRemoved;
}

// Host Health Update
export interface HostHealthUpdate {
  host_id: string;
  state: string;
}

// VM State Change Event
export interface VmStateChange {
  previous_state: string;
  current_state: string;
  vm_id: string;
}

// VM Added Event
export interface VmAdded {
  vm_id: string;
  new_vm?: {
    name: string;
    os_type: string;
    state: string;
    [key: string]: any;
  };
}

// VM Removed Event
export interface VmRemoved {
  vm_id: string;
}

// Type Guards
export function isHealthEvent(event: any): event is HealthEvent {
  return event?.event_type === "health" && (event?.message === "ping" || event?.message === "pong");
}

export function isSubscriptionEvent(event: any): event is SubscriptionEvent {
  return event?.event_type === "global" && event?.body?.client_id && event?.body?.subscriptions;
}

export function isOrchestratorEvent(event: any): event is OrchestratorEvent {
  return event?.event_type === "orchestrator" && event?.body;
}

export function isHostVmStateChanged(event: OrchestratorEvent): boolean {
  return event.message === "HOST_VM_STATE_CHANGED";
}

export function isHostVmAdded(event: OrchestratorEvent): boolean {
  return event.message === "HOST_VM_ADDED";
}

export function isHostVmRemoved(event: OrchestratorEvent): boolean {
  return event.message === "HOST_VM_REMOVED";
}

export function isHostHealthUpdate(event: OrchestratorEvent): boolean {
  return event.message === "HOST_HEALTH_UPDATE";
}
