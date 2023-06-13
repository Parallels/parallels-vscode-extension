#cloud-config
autoinstall:
  version: 1
  identity:
    hostname: ${hostname}
    username: ${username}
    password: '${password}'
  early-commands:
    # otherwise packer tries to connect and exceed max attempts:
    - systemctl stop ssh.service
    - systemctl stop ssh.socket
  ssh:
    install-server: yes
    allow-pw: yes
  late-commands:
    - 'sed -i "s/dhcp4: true/&\n      dhcp-identifier: mac/" /target/etc/netplan/00-installer-config.yaml'
    - echo '${username} ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/${username}