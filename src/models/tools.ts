export interface Tool {
  name: string;
  version: string;
  isInstalled: boolean;
  isReady: boolean;
  isCached?: boolean;
}

export interface Tools {
  git: Tool;
  brew: Tool;
  packer: Tool;
  vagrant: Tool;
  parallelsDesktop: Tool;
  devopsService: Tool;
}
