
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { CreateVmsPromptProps } from '../properties/createVmsPromptProps';

export class CreateVmsIntensionPrompt extends PromptElement<CreateVmsPromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          As a senior developer and knowing this:
          think carefully and detect the user intentions from his input and then generate a json file with the following structure:
          {"{"}
          "name": "test machine",
          "architecture": "arm64",
          "startOnCreate": false,
          "catalog_manifest": {"{"}
          "catalog_id": "TEST_CATALOG",
          "version": "latest",
          "connection": "devops local build"
          {"}"}
          {"}"}

          and that the necessary information in order to achieve that will be:
          - the name of the machine
          - the catalog_manifest catalog_id
          - the catalog_manifest version
          - the catalog_manifest connection

          when the user input contains the words golden image they mean catalog_id
          when the user input contains the words manifest name they mean catalog_id
          when the user input contains the words image they mean catalog_id
          when the user input contains the words version they mean version
          when the user input contains the words connection they mean connection
          when the user input contains the words catalog they mean connection
          when the user input contains the words catalog provider they mean connection

          a catalog_id is a unique identifier for the golden image or manifest name and it does not contain spaces
          while the version is the version of the golden image so it is normally a single word and most of the times it starts with a v and then a number or latest but it can be any string
          the connection is the name of the catalog provider and it can contain spaces
          make sure you take this into account when generating the json object

          If the version is omitted in the user input you should not set it in the json object leave it as an empty string

          if you find the words golden image or manifest name this value should be set as the catalog_id
          if you find the words version this value should be set as the version
          if you find the words connection or catalog this value should be set as the connection
          never use the words in the catalog as the catalog_id

          as an example if the user input is:
          Create a new Virtual Machine named demo1 from the golden image ubuntu-github-action-runner in the catalog local build catalog
          you should generate the json object:
          {"{"}
          "name": "demo1",
          "architecture": "",
          "startOnCreate": false,
          "catalog_manifest": {"{"}
          "catalog_id": "ubuntu-github-action-runner",
          "version": "",
          "connection": "local build catalog"
          {"}"}
          {"}"}
          and if the user input is:
          Create a new Virtual Machine with name demo1 from the golden image ubuntu-github-action-runner in the catalog local build catalog for arm64 architecture
          you should generate the json object:
          {"{"}
          "name": "demo1",
          "architecture": "arm64",
          "startOnCreate": false,
          "catalog_manifest": {"{"}
          "catalog_id": "ubuntu-github-action-runner",
          "version": "",
          "connection": "local build catalog"
          {"}"}
          {"}"}
          and if the user input is:
          Create a new Virtual Machine named demo1 from the golden image ubuntu_github_action_runner in the catalog local-build catalog for arm64 architecture and version v1
          you should generate the json object:
          {"{"}
          "name": "demo1",
          "architecture": "arm64",
          "startOnCreate": false,
          "catalog_manifest": {"{"}
          "catalog_id": "ubuntu_github_action_runner",
          "version": "v1",
          "connection": "local-build catalog"
          {"}"}
          {"}"}


          For the catalog choose the most appropriate one from this list:
          {this.props.targetNames.join(', ')}
          Generate me only the json object with the necessary information to create a virtual machine, you should never ask anything else
          and the response should be a json object with the structure above, nothing else. if you cannot generate the json object return a { } empty object

          also validate if that json object is valid
          If we have more than one request for a virtual machine, we should check if the user set target and set the name of the machine as the target
        </UserMessage>
        <UserMessage>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}