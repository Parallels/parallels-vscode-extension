
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { PromptProps } from '../properties/promptProps';

export class RemoteHostProviderIntensionPrompt extends PromptElement<PromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          As a senior developer and knowing this:
          think carefully and detect the user intentions from his input and then generate a json file with the following structure:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list",
          "operation_value": "all",
          "target": "",
          "intension_description": "List all of remote hosts"
          {"}"}
          ]
        
          The intension will always be REMOTE_HOST_PROVIDER, the operation will be the operation and the operation_value will be the value of the operation and the target will be the remote host or remote host provider name.
        
          for each intention detected you should create an intension_description field that describes what the user is asking for
          so it can be used by chatbots to respond to the user

          if the user asks to list, status or count in the remote host or remote host provider, the intension should be REMOTE_HOST_PROVIDER,
          the operation should be the operation and the operation_value should be the value of the operation and the target should be the remote host or remote host provider name.

          For the target be careful when extracting the remote host or remote host provider name, it can be a single word or multiple words, so make sure you extract the correct target,
          for example if the user input is:

          list me all of the vms in the remote host test

          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list",
          "operation_value": "",
          "target": "test",
          "intension_description": "List all of the virtual machines in the remote host 'test'"
          {"}"}
          ]

          another example is:
          status the remote host test remote host

          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "status",
          "operation_value": "",
          "target": "test remote host",
          "intension_description": "Get the status of the remote host 'test remote host'"
          {"}"}
          ]

          another example is:
          get me all of the active remote hosts

          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "count",
          "operation_value": "active",
          "target": "",
          "intension_description": "List all of the active remote hosts"
          {"}"}
          ]

          The operation field can only be one of the following values:
          - list_vms
          - status
          - count

          For the REMOTE_HOST_PROVIDER intension operation LIST we can only have the following operation_value values:
          - active
          - inactive
          - all
          - running
          - stopped
          - paused
          - suspended

          for example:
          list me all of the vms in the remote host test
          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list_vms",
          "operation_value": "all",
          "target": "test",
          "intension_description": "List all of the virtual machines in the remote host 'test'"
          {"}"}
          ]
          another example:
          list me all running vms in the remote host test
          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list_vms",
          "operation_value": "running",
          "target": "test",
          "intension_description": "List all running virtual machines in the remote host 'test'"
          {"}"}
          ]
          another example:
          list me all paused virtual machines in the remote host aws builder
          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list_hosts",
          "operation_value": "active",
          "target": "aws builder",
          "intension_description": "List all active hosts in the remote host 'aws builder'"
          {"}"}
          ]

          For the REMOTE_HOST_PROVIDER intension operation STATUS we should not add any operation_value

          For the REMOTE_HOST_PROVIDER intension operation COUNT is used when asking for any enumeration of the remote hosts and only talking about it,
          so if the user requests a count or a list of any sorts where vms or virtual machines are mentioned this is not a COUNT but a LIST operation
          otherwise if the user only states remote hosts or remote hosts provider then this is a COUNT operation
          also words like 'show me' or 'get me' should be considered as a count operation if there is no mention of any virtual machine or the words that mean virtual machine

          for example:

          get me all of the active remote hosts

          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "count",
          "operation_value": "active",
          "target": "",
          "intension_description": "List all of the active remote hosts"
          {"}"}
          ]

          Another example is:
          how many remote hosts are available
          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "count",
          "operation_value": "available",
          "target": "",
          "intension_description": "List all of the available remote hosts"
          {"}"}
          ]

          When user asks for count or status of a virtual machine make sure you deduct the intension correctly, the intension might be COUNT_STATUS or REMOTE_HOST_PROVIDER or REMOTE_HOST_PROVIDER
          depending if the user then states the remote host or remote  in the request, the only exception being for the CREATE intention

          for example if the user asks for:
          how many virtual machines are running in the remote host test
          you should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "count",
          "operation_value": "running",
          "target": "test",
          "intension_description": "Count the virtual machines that are running in the remote host 'test'"
          {"}"}
          ]
          or if the user asks for:
          how many remote hosts are available
          you should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "count",
          "operation_value": "available",
          "target": "",
          "intension_description": "List all of the available remote hosts"
          {"}"}
          ]

          this can also be something like:
          get me all the vms that are suspended
          you should generate the json object:
          [
          {"{"}
          "intension": "COUNT_STATUS",
          "operation": "suspended",
          "operation_value": "",
          "VM": "",
          "intension_description": "Count the virtual machines that are suspended"
          {"}"}
          ]
        </UserMessage>
        <UserMessage>
          Also take into account the user conversation context when detecting the intension
          for example if the user asks:
          and the revoked ones
          and the previous conversation was:
          list all tainted golden images from the catalog test
          you should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "list",
          "operation_value": "revoked",
          "target": "demo1",
          "intension_description": "List all revoked golden images from the catalog 'test'"
          {"}"}
          ]
          if the user asks:
          and how many are inactive
          and the previous conversation was:
          how many active catalog providers
          you should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "status",
          "operation_value": "inactive",
          "VM": "",
          "intension_description": "Count how many inactive catalog providers"
          {"}"}
          ]

          this is the history of the user conversation, you should use it to detect the intension

          {this.props.history}
        </UserMessage>
        <UserMessage>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}