export interface Tool {
  name: string;
  version: string;
  isInstalled: boolean;
}

export interface Tools {
  git: Tool;
  brew: Tool;
  packer: Tool;
  vagrant: Tool;
  parallelsDesktop: Tool;
}
