import * as vscode from "vscode";
import WebSocket from "ws";
import {DevOpsRemoteHostProvider} from "../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../models/devops/catalogHostProvider";
import {DevOpsService} from "./devopsService";

interface ChannelSocket {
  id: string;
  channel: vscode.OutputChannel;
  socket: WebSocket;
}

const logChannels: ChannelSocket[] = [];

export function getLogChannelById(id: string): ChannelSocket | undefined {
  return logChannels.find(channel => channel.id === id);
}

export function closeLogChannelById(id: string): void {
  const channel = getLogChannelById(id);
  if (channel) {
    channel.socket.close();
    channel.channel.clear();
    channel.channel.hide();
    channel.channel.dispose();
    logChannels.splice(logChannels.indexOf(channel), 1);
  }
}

export function openChannelById(
  provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider,
  outputChannel: vscode.OutputChannel,
  url: string,
  id = ""
): Promise<WebSocket | undefined> {
  return new Promise(async (resolve, reject) => {
    let channelId = `${provider.ID}%%logs`;
    if (id) {
      channelId = `${id}%%logs`;
      url = `${url}/api/v1/orchestrator/hosts/${id}/logs/stream`;
    } else {
      url = `${url}/api/v1/logs/stream`;
    }

    if (!channelId) {
      vscode.window.showErrorMessage("Channel ID is required!");
      return resolve(undefined);
    }

    const channelIdSocket = getLogChannelById(channelId);
    if (channelIdSocket) {
      vscode.window.showErrorMessage("Channel ID is already in use!");
      return resolve(undefined);
    }

    const authResponse = await DevOpsService.authorize(provider);
    if (!authResponse) {
      return reject(`Failed to authorize with ${provider.name}`);
    }

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${authResponse.token}`
      }
    });

    ws.onopen = () => {
      outputChannel.appendLine("Connection to the service logs opened.");
      outputChannel.show(true); // Show the output channel
    };
    ws.onmessage = (event: WebSocket.MessageEvent) => {
      let line = event.data.toString();
      if (!line.endsWith("\n")) {
        line = line.concat("\n");
      }
      outputChannel.append(line); // Stream log data
    };

    ws.onerror = (error: WebSocket.ErrorEvent) => {
      outputChannel.appendLine(`There was an error connecting to the service logs: ${JSON.stringify(error)}`);
    };

    ws.onclose = () => {
      outputChannel.appendLine("Connection to the service logs closed.");
      closeLogChannelById(channelId);
    };

    logChannels.push({id: channelId, channel: outputChannel, socket: ws});
    resolve(ws);
  });
}
