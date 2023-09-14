[{
    id: 'windows',
    name: 'Windows',
    platforms: [
      {
    id: 'arm64',
    name: 'ARM64',
    distros: [
      
    ],
    images: [
      {
    id: 'windows_11',
    name: 'Windows 11 ARM',
    distro: 'windows',
    type: 'packer',
    requireIsoDownload: true,
    description: 'This will install Windows 11 ARM64 on a Parallels VM using automated Packer scripts.',
    isoUrl: '',
    
isoHelp: {
    prefixText: 'Please follow the instructions on the ',
    urlText: 'packer-examples repo',
    url: 'https://github.com/Parallels/packer-examples/blob/main/windows/README.md#windows-11-on-arm-iso',
    suffixText: ' to download the Windows 11 ARM64 ISO'
  },
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'docker-desktop','name':'Docker Desktop','deploy':false},{'id':'dotnet-framework-6-sdk','name':'Dotnet Framework 6 SDK','deploy':false},{'id':'dotnet-framework-7-sdk','name':'Dotnet Framework 7 SDK','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'golang','name':'Go','deploy':false},{'id':'vcredist','name':'Visual Studio Redistributables','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'visual-studio-professional-2019','name':'Visual Studio 2019 Professional Edition','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'visual-studio-community-2022','name':'Visual Studio 2019 Community Edition','deploy':false},{'id':'podman','name':'Podman','deploy':false},{'id':'visual-studio-community-2019','name':'Visual Studio 2019 Community Edition','deploy':false},{'id':'visual-studio-professional-2022','name':'Visual Studio 2019 Community Edition','deploy':false}],
    requiredVariables: [],
defaults: {
    specs: {
    cpus: 2,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'vagrant',
    password: 'vagrant',
    encryptedPassword: 'undefined'
  }
  }
  }
    ]
  }
    ]
  },{
    id: 'linux',
    name: 'Linux',
    platforms: [
      {
    id: 'arm64',
    name: 'ARM64',
    distros: [
      {
    id: 'generic-linux',
    name: 'Generic Linux',
    images: [
      {
    id: 'generic-iso',
    name: 'Generic Iso',
    distro: 'linux',
    type: 'iso',
    requireIsoDownload: true,
    description: 'You can use this to install any compatible Linux distro using the arm64 ISO.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: false,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 2,
    memory: 2048,
    diskSize: '65536'
  },
    user: undefined
  }
  }
    ]
  },
{
    id: 'ubuntu',
    name: 'Ubuntu',
    images: [
      {
    id: 'ubuntu-server-22.04',
    name: 'Ubuntu Server 22.04.3 LTS',
    distro: 'ubuntu',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Ubuntu Server 22.04.3 LTS VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'desktop','name':'Ubuntu Desktop','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'ubuntu-server-23.04',
    name: 'Ubuntu Server 23.04',
    distro: 'ubuntu',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Ubuntu Server 23.04 VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'desktop','name':'Ubuntu Desktop','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  }
    ]
  },
{
    id: 'kali',
    name: 'Kali Linux',
    images: [
      {
    id: 'kali-linux-2023.3-gnome',
    name: 'Kali Linux 2023.3 (Gnome)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.3 with the Gnome UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'kali-linux-2023.3-xfce',
    name: 'Kali Linux 2023.3 (xfce)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.3 with the XFCE UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'kali-linux-2023.2-gnome',
    name: 'Kali Linux 2023.2 (Gnome)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.2 with the Gnome UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'kali-linux-2023.2-xfce',
    name: 'Kali Linux 2023.2 (xfce)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.2 with the XFCE UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'kali-linux-2023.1-gnome',
    name: 'Kali Linux 2023.1 (Gnome)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.1 with the Gnome UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'kali-linux-2023.1-xfce',
    name: 'Kali Linux 2023.1 (xfce)',
    distro: 'kali',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a Kali Linux 2023.1 with the XFCE UI VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  }
    ]
  },
{
    id: 'photon',
    name: 'Photon OS',
    images: [
      {
    id: 'photon-5.0',
    name: 'Photon OS 5.0 GA',
    distro: 'linux',
    type: 'iso',
    requireIsoDownload: false,
    description: 'This will create a Photon OS 5.0 GA VM, this will need user input to complete the installation.',
    isoUrl: 'https://packages.vmware.com/photon/5.0/GA/iso/photon-5.0-dde71ec57.aarch64.iso',
    
    isoChecksum: 'sha256:06f4b20d3097fcebc3ea067e41e4fb64ffe41828bdb9fa96cebc7a49f290c0d9',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: false,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 2,
    memory: 2048,
    diskSize: '65536'
  },
    user: undefined
  }
  }
    ]
  },
{
    id: 'redhat',
    name: 'Redhat',
    images: [
      {
    id: 'redhat-9.2',
    name: 'Redhat 9.2',
    distro: 'rhel',
    type: 'packer',
    requireIsoDownload: true,
    description: 'This will create a Redhat 9.2 VM, you will need to source the ISO and will need user input to complete the installation.',
    isoUrl: '',
    
isoHelp: {
    prefixText: 'Please download the RedHat DVD iso from ',
    urlText: 'Redhat Downloads',
    url: 'https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux',
    suffixText: ' for arm64, please make sure you download the correct version'
  },
    isoChecksum: 'sha256:c0d6dc21f157c2c8a4a0ebba0f5e2899f6cbb986d5f0bdd3cef1909b55fe25a8',
    requiredVariables: [
{
  'id': 'redhat_username',
  'text': 'Redhat Username',
  'hint': 'Please enter your Redhat username'
},
{
  'id': 'redhat_password',
  'text': 'Redhat Password',
  'hint': 'Please enter your Redhat password'
}
],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [],
    requiredVariables: [{'id':'redhat_username','text':'Redhat Username','hint':'Please enter your Redhat username'},{'id':'redhat_password','text':'Redhat Password','hint':'Please enter your Redhat password'}],
    ,
defaults: {
    specs: {
    cpus: 2,
    memory: 2048,
    diskSize: '65536'
  },
    user: undefined
  }
  }
    ]
  },
{
    id: 'parrot-security',
    name: 'ParrotOS',
    images: [
      {
    id: 'parrot-os-5.3',
    name: 'Parrot OS 5.3 Architect',
    distro: 'linux',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a ParrotOS 5.3 Architect VM using automated Packer scripts.',
    isoUrl: '',
    
    isoChecksum: '',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'startHeadless',
  'name': 'Start Machine in Headless Mode',
  'enabled': true
},
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
},
{
  'code': 'enableRosetta',
  'name': 'Use Rosetta to run x86 binaries',
  'enabled': false
}
],
    addons: [{'id':'go','name':'Golang','deploy':false},{'id':'developer','name':'Developer Bundle','deploy':false},{'id':'flutter','name':'Flutter','deploy':false},{'id':'python3','name':'Python 3','deploy':false},{'id':'mariadb','name':'MariaDB (MySql)','deploy':false},{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false},{'id':'podman','name':'Podman','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 4096,
    diskSize: '65536'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  }
    ]
  }
    ],
    images: [
      
    ]
  }
    ]
  },{
    id: 'macos',
    name: 'macOS',
    platforms: [
      {
    id: 'arm64',
    name: 'ARM64',
    distros: [
      
    ],
    images: [
      {
    id: 'macos13_22G74',
    name: 'macOS 13.5',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.5 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023SummerFCS/fullrestores/032-69606/D3E05CDF-E105-434C-A4A1-4E3DC7668DD0/UniversalMac_13.5_22G74_Restore.ipsw',
    
    isoChecksum: 'sha256:a42a5ba126a4a35bae9f3dcd64565abc2232e9f3954c658cf5cab5bd92f9d191',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22G74_ipsw',
    name: 'macOS 13.5 (Manual Setup)',
    distro: '',
    type: 'macos',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.5 VM using a downloaded IPSW file, this will need user input to complete the installation.',
    isoUrl: 'https://updates.cdn-apple.com/2023SummerFCS/fullrestores/032-69606/D3E05CDF-E105-434C-A4A1-4E3DC7668DD0/UniversalMac_13.5_22G74_Restore.ipsw',
    
    isoChecksum: 'sha256:a42a5ba126a4a35bae9f3dcd64565abc2232e9f3954c658cf5cab5bd92f9d191',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: false,
    allowAddons: false,
    allowedFlags: [],
    addons: [],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: undefined
  }
  },
{
    id: 'macos13_22F82',
    name: 'macOS 13.4.1',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.4.1 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023SpringFCS/fullrestores/042-01877/2F49A9FE-7033-41D0-9D0C-64EFCE6B4C22/UniversalMac_13.4.1_22F82_Restore.ipsw',
    
    isoChecksum: 'sha256:5ac144d1661614806d765bc0466d719152e2594c2db3888f1ac02276f5638e98',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22F66',
    name: 'macOS 13.4',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.4 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023SpringFCS/fullrestores/032-84884/F97A22EE-9B5E-4FD5-94C1-B39DCEE8D80F/UniversalMac_13.4_22F66_Restore.ipsw',
    
    isoChecksum: 'sha256:472192932e4152d20d0504641df4c8574929903f2f3244f45b46af7d5b2e4606',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22E261',
    name: 'macOS 13.3.1',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.3.1 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-66602/418BC37A-FCD9-400A-B4FA-022A19576CD4/UniversalMac_13.3.1_22E261_Restore.ipsw',
    
    isoChecksum: 'sha256:6e9d9b30528ec951d8a377173b355932647194c326347efc5e54ade1fe71cbc8',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22E252',
    name: 'macOS 13.3',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.3 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023WinterSeed/fullrestores/002-75537/8250FA0E-0962-46D6-8A90-57A390B9FFD7/UniversalMac_13.3_22E252_Restore.ipsw',
    
    isoChecksum: 'sha256:91fe1d55843925f242b4a94ce1069073f9a22f22a40eb77a5618b877e0ec9f24',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22D68',
    name: 'macOS 13.2.1',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.2.1 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-48346/EFF99C1E-C408-4E7A-A448-12E1468AF06C/UniversalMac_13.2.1_22D68_Restore.ipsw',
    
    isoChecksum: 'sha256:6e9d9b30528ec951d8a377173b355932647194c326347efc5e54ade1fe71cbc8',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22D68',
    name: 'macOS 13.2',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.2 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-35688/0350BB21-2B4B-4850-BF77-70B830283B28/UniversalMac_13.2_22D49_Restore.ipsw',
    
    isoChecksum: 'sha256:ba80732efcc0fc9ac84c57f504ced09dbc431c49e2b633b9abd4730e55ac66a5',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22C65',
    name: 'macOS 13.1',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.1 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2023WinterFCS/fullrestores/032-48346/EFF99C1E-C408-4E7A-A448-12E1468AF06C/UniversalMac_13.2.1_22D68_Restore.ipsw',
    
    isoChecksum: 'sha256:98dd167fb42b345efbadc62c8bf74faa98ec3d7e6079085dc92ef98c7797b14b',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22C65',
    name: 'macOS 13.0.1',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.0.1 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2022FallFCS/fullrestores/012-93802/A7270B0F-05F8-43D1-A9AD-40EF5699E82C/UniversalMac_13.0.1_22A400_Restore.ipsw',
    
    isoChecksum: 'sha256:58dc6614947cdcc971cc7d1ae882b3daee5c34b8c721d51139a0cff46d3b543f',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  },
{
    id: 'macos13_22A380',
    name: 'macOS 13.0',
    distro: '',
    type: 'packer',
    requireIsoDownload: false,
    description: 'This will create a macOS 13.0 VM using automated Packer scripts.',
    isoUrl: 'https://updates.cdn-apple.com/2022FallFCS/fullrestores/012-92188/2C38BCD1-2BFF-4A10-B358-94E8E28BE805/UniversalMac_13.0_22A380_Restore.ipsw',
    
    isoChecksum: 'sha256:537008900fe34eeb703d928ce613708bfbd6bf445289948058fc617be4f2d090',
    requiredVariables: [],
    allowMachineSpecs: true,
    allowUserOverride: true,
    allowAddons: true,
    allowedFlags: [
{
  'code': 'generateVagrantBox',
  'name': 'Generate Vagrant Box',
  'enabled': false
}
],
    addons: [{'id':'git','name':'Git','deploy':false},{'id':'vscode','name':'Visual Studio Code','deploy':false},{'id':'docker','name':'Docker','deploy':false}],
    requiredVariables: [],
    ,
defaults: {
    specs: {
    cpus: 4,
    memory: 8196,
    diskSize: 'undefined'
  },
    user: {
    username: 'parallels',
    password: 'parallels',
    encryptedPassword: 'undefined'
  }
  }
  }
    ]
  }
    ]
  },]