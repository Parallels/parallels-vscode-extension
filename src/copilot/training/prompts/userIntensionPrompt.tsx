
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { PromptProps } from '../properties/promptProps';

export class UserIntensionPrompt extends PromptElement<PromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          As a senior developer and knowing the following:
          - Create Virtual Machines
          - Get Status of a Virtual Machine
          - Setup a Virtual Machine
          - Know how many Virtual Machines are in a certain state

          think carefully and detect the user intentions from his input and then generate a json file with the following structure:
          [
          {"{"}
          "intension": "CREATE",
          "operation": "",
          "operation_value": "",
          "target": "",
          "VM": "VM NAME",
          "intension_description": "Create a new Virtual Machine"
          {"}"}
          ]

          The type of intentions can be CREATE, STATUS, SET, COUNT_STATUS, CATALOG_PROVIDER, ORCHESTRATOR_PROVIDER, REMOTE_HOST
          If The intension is just status or create the operation field should be omitted
          
          If the user asks to start, stop, resume, pause, suspend, restart or delete, this will be an operation of the set.
          Some operations require a value please add it to the operation_value field but if this is not needed please omit the field

          if the user asks for the status of more than one VM please add each as a separate item in the array
          If the user asks for a count of a certain state, the intension should be COUNT_STATUS and the operation field should be the state, in this case the state can only be, running, stopped, paused or suspended
          also if there is any CREATE intension, this should be the first item in the array

          if the user asks for the list, count, status, pull, push or count of any manifest or golden image, in a catalog or catalog provider, the intension should be CATALOG_PROVIDER, the operation should be the operation
          requested and the operation_value should be the value of the operation and the target should be the catalog or catalog provider name

          for example:
          list me all of the manifests in the local build catalog
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "list",
          "operation_value": "all",
          "target": "local build catalog",
          "intension_description": "List all of the manifests in the local build catalog"
          {"}"}
          ]
          another example:
          pull the golden image ubuntu-test-machine from the local build catalog
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "pull",
          "operation_value": "ubuntu-test-machine",
          "target": "local build catalog",
          "intension_description": "Pull the golden image 'ubuntu-test-machine' from the local build catalog"
          {"}"}
          ]
          another example:
          how many catalog providers are active
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "active",
          "target": "",
          "intension_description": "Count how many catalog providers are active"
          {"}"}
          ]
        
          so every time that the user asks for anything related to a catalog or catalog provider, the intension should be CATALOG_PROVIDER
          with the exception of the create operation, this should be CREATE

          if the user asks to list, status, count for the orchestrator or orchestrator provider, the intension should be ORCHESTRATOR_PROVIDER,
          the operation should be the operation and the operation_value should be the value of the operation and the target should be the orchestrator or orchestrator provider name.

          For the target be careful when extracting the orchestrator or orchestrator provider name, it can be a single word or multiple words, so make sure you extract the correct target,
          for example if the user input is:
          list me all of the hosts in the orchestrator test
          should generate the json object:
          [
          {"{"}
          "intension": "ORCHESTRATOR_PROVIDER",
          "operation": "list",
          "operation_value": "hosts",
          "target": "test",
          "intension_description": "List all of the hosts in the orchestrator 'test'"
          {"}"}
          ]
          another example is:
          status the orchestrator test orchestrator
          should generate the json object:
          [
          {"{"}
          "intension": "ORCHESTRATOR_PROVIDER",
          "operation": "status",
          "operation_value": "",
          "target": "test orchestrator",
          "intension_description": "Get the status of the orchestrator 'test orchestrator'"
          {"}"}
          ]

          if the user asks to list, status, count for the remote host or remote host provider, the intension should be REMOTE_HOST_PROVIDER,
          the operation should be the operation and the operation_value should be the value of the operation and the target should be the remote host or remote host provider name.

          For the target be careful when extracting the remote host or remote host provider name, it can be a single word or multiple words, so make sure you extract the correct target,
          for example if the user input is:
          list me all of the hosts in the remote host test
          should generate the json object:
          [
          {"{"}
          "intension": "REMOTE_HOST_PROVIDER",
          "operation": "list",
          "operation_value": "hosts",
          "target": "test",
          "intension_description": "List all of the hosts in the remote host 'test'"
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

          Your response should only be the json output, even if there is just one intension detected you should create an json array.
          The array is very important and you should not generate anything else, just the json output.
          make sure the json output is valid and fits the structure above

          You also cannot have a CREATE intension with an operation from the SET type, this is not allowed
          You should then create two intensions one for CREATE and one for the SET operation

          for each intention detected you should create an intension_description field that describes what the user is asking for
          so it can be used by chatbots to respond to the user

          if the user asks for list of vms you should set the intension as COUNT_STATUS and the operation as all

          if you cannot find an intension from the user input you should set the intension as CHAT and the operation as the user input

          as an example if the user input is:
          Create a new Virtual Machine named demo1 from the golden image ubuntu-github-action-runner in the catalog local build catalog
          you should generate the json object:
          [
          {"{"}
          "intension": "CREATE",
          "operation": "",
          "operation_value": "",
          "VM": "demo1",
          "intension_description": "Create a new Virtual Machine named 'demo1' from the golden image 'ubuntu-github-action-runner' in the catalog 'local build catalog'"
          {"}"}
          ]
          and if the user input is:
          stop demo1
          you should generate the json object:
          [
          {"{"}
          "intension": "SET",
          "operation": "stop",
          "operation_value": "",
          "VM": "demo1",
          "intension_description": "Stop the Virtual Machine 'demo1'"
          {"}"}
          ]
          and if the user input is:
          status demo1
          you should generate the json object:
          {"{"}
          "intension": "STATUS",
          "operation": "",
          "operation_value": "",
          "VM": "demo1",
          "intension_description": "Get the status of the Virtual Machine 'demo1'"
          {"}"}

          if the user asks for all the virtual machines then the VM field should be 'all'
          for example:
          resume all virtual machines
          you should generate the json object:
          [
          {"{"}
          "intension": "SET",
          "operation": "resume",
          "operation_value": "",
          "VM": "all",
          "intension_description": "Resume all Virtual Machines"
          {"}"}
          ]
          another example:
          start all
          you should generate the json object:
          [
          {"{"}
          "intension": "SET",
          "operation": "start",
          "operation_value": "",
          "VM": "all",
          "intension_description": "Start all Virtual Machines"
          {"}"}
          ]
          one more example:
          resume all suspended vms
          you should generate the json object:
          [
          {"{"}
          "intension": "SET",
          "operation": "resume",
          "operation_value": "",
          "VM": "all",
          "intension_description": "Resume all suspended Virtual Machines"
          {"}"}
          ]
        
          if the user asks anything else that does not fit one of the intensions then we should set the intension as CHAT and the operation as the user input
          for example:
          how do I go to the moon
          you should generate the json object:
          [
          {"{"}
          "intension": "CHAT",
          "operation": "how do I go to the moon",
          "operation_value": "",
          "VM": "",
          "intension_description": "how do I go to the moon"
          {"}"}
          ]
          another example:
          what is the time
          you should generate the json object:
          [
          {"{"}
          "intension": "CHAT",
          "operation": "what is the time",
          "operation_value": "",
          "VM": "",
          "intension_description": "what is the time"
          {"}"}
          ]
          A CREATE should never have a start, stop, resume, pause, suspend, restart or delete operation, this would be a SET operation

          and the golden rule is, if you have multiple intensions detected, you should create an array of objects, even if there is just one intension detected
          if the user asks what you can do you should respond:
          I can help you with the following:
          - Create Virtual Machines
          - Get Status of a Virtual Machine
          - Setup a Virtual Machine
          - Know how many Virtual Machines are in a certain state
          - List, count, status, pull, push or count of any manifest or golden image in a catalog or catalog provider
          - List, count, status, or count of any host in the orchestrator or orchestrator provider
          - List, count, status, or count of any host in the remote host or remote host provider

        </UserMessage>
        <UserMessage>
          Also take into account the user conversation context when detecting the intension
          for example if the user asks:
          start it
          and the previous conversation was:
          what is the status of the demo1 virtual machine
          you should generate the json object:
          [
          {"{"}
          "intension": "SET",
          "operation": "start",
          "operation_value": "",
          "VM": "demo1",
          "intension_description": "Start the Virtual Machine 'demo1'"
          {"}"}
          ]
          for example if the user asks:
          and how many are inactive
          and the previous conversation was:
          how many active hosts are in the orchestrator demo1
          you should generate the json object:
          [
          {"{"}
          "intension": "ORCHESTRATOR_PROVIDER",
          "operation": "count",
          "operation_value": "inactive",
          "VM": "",
          "intension_description": "Count how many inactive hosts are in the orchestrator 'demo1'"
          {"}"}
          ]
          for example if the user asks:
          and how many are inactive
          and the previous conversation was:
          how many catalog providers are active
          you should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "inactive",
          "VM": "",
          "intension_description": "Count how many catalog providers are inactive"
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