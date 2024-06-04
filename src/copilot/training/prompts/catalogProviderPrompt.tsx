
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { PromptProps } from '../properties/promptProps';

export class CatalogProviderIntensionPrompt extends PromptElement<PromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          As a senior developer and knowing this:
          think carefully and detect the user intentions from his input and then generate a json file with the following structure:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "",
          "operation_value": "",
          "target": "",
          "intension_description": "List all of remote hosts"
          {"}"}
          ]

          for each intention detected you should create an intension_description field that describes what the user is asking for
          so it can be used by chatbots to respond to the user.

          The intension will always be CATALOG_PROVIDER, the operation will be the operation.

          If the user intension is CATALOG_PROVIDER then these are the permitted operation field values:
          - list
          - status
          - count
          - pull
          - push

          if the user asks for the list, count, status, pull, push or count of any manifest or golden image, in a catalog or catalog provider, the intension should be CATALOG_PROVIDER, the operation should be the operation
          requested and the operation_value should be the value of the operation and the target should be the catalog or catalog provider name.

          The user can ask for a list of manifests or golden images or he can ask for a list of catalogs or catalog providers,
          take extra care when deciding what type of LIST operation the user is asking for. If the user asks for a list type operation,
          and he does not mention the golden images or manifests, the operation is a LIST, but if he mentions the golden images or manifests,
          the operation is a LIST_MANIFESTS.

          Make sure that the only valid values for the operation field are the ones listed above, this is extremely important.

          For the CATALOG_PROVIDER intension operation LIST we can only have the following operation_value values:
          - all
          - tainted
          - available
          - revoked

          For the CATALOG_PROVIDER intension operation STATUS we can only have the following operation_value values:
          - all

          For the CATALOG_PROVIDER intension operation COUNT we can only have the following operation_value values:
          - all

          For the CATALOG_PROVIDER intension operation PULL we can only have the following operation_value values:
          - the name of the golden image

          For the CATALOG_PROVIDER intension operation PUSH we can only have the following operation_value values:
          - the name of the local vm
        
          for example:
          list me all of the manifests in the local build catalog
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "list_manifests",
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

          For the target be careful when extracting the catalog or catalog provider name, it can be a single word or multiple words, so make sure you extract the correct target,
          for example if the user input is:

          list me all of the golden images in the catalog test
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "list_manifests",
          "operation_value": "all",
          "target": "test",
          "intension_description": "List all of the golden images in the catalog 'test'"
          {"}"}
          ]
          another example is:
          list me all catalogs
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "all",
          "target": "test",
          "intension_description": "List all of the golden images in the catalog 'test'"
          {"}"}
          ]
          another example is:
          get all active catalogs
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "active",
          "target": "test",
          "intension_description": "List all of the golden images in the catalog 'test'"
          {"}"}
          ]
          another example is:
          status the catalog test catalog
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "status",
          "operation_value": "",
          "target": "test catalog",
          "intension_description": "Get the status of the orchestrator 'test catalog'"
          {"}"}
          ]
          For the count operation you will need to set the target field as a filter, for example:
          count me the catalog providers that are active
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "active",
          "target": "",
          "intension_description": "Count the catalog providers that are active"
          {"}"}
          ]
          another example:
          how many catalog providers are available
          should generate the json object:
          [
          {"{"}
          "intension": "CATALOG_PROVIDER",
          "operation": "count",
          "operation_value": "available",
          "target": "",
          "intension_description": "Count the catalog providers that are available"
          {"}"}
          ]

          Make sure that the only valid values for the operation_value field are the ones listed above, this is extremely important
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