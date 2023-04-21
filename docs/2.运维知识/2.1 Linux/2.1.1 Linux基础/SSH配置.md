# SSH配置

SSH 配置文件位于 `/etc/ssh/sshd_config`，修改后需要重启 SSH 服务才能生效。

内容如下:

```bash

#	$OpenBSD: ssh_config,v 1.30 2016/02/20 23:06:23 sobrado Exp $

# This is the ssh client system-wide configuration file.  See
# ssh_config(5) for more information.  This file provides defaults for
# users, and the values can be changed in per-user configuration files
# or on the command line.

# Configuration data is parsed as follows:
#  1. command line options
#  2. user-specific file
#  3. system-wide file
# Any configuration value is only changed the first time it is set.
# Thus, host-specific definitions should be at the beginning of the
# configuration file, and defaults at the end.

# Site-wide defaults for some commonly used options.  For a comprehensive
# list of available options, their meanings and defaults, please see the
# ssh_config(5) man page.

# Host *
#   ForwardAgent no
#   ForwardX11 no
#   RhostsRSAAuthentication no
#   RSAAuthentication yes
#   PasswordAuthentication yes
#   HostbasedAuthentication no
#   GSSAPIAuthentication no
#   GSSAPIDelegateCredentials no
#   GSSAPIKeyExchange no
#   GSSAPITrustDNS no
#   BatchMode no
#   CheckHostIP yes
#   AddressFamily any
#   ConnectTimeout 0
#   StrictHostKeyChecking ask
#   IdentityFile ~/.ssh/identity
#   IdentityFile ~/.ssh/id_rsa
#   IdentityFile ~/.ssh/id_dsa
#   IdentityFile ~/.ssh/id_ecdsa
#   IdentityFile ~/.ssh/id_ed25519
#   Port 22
#   Protocol 2
#   Cipher 3des
#   Ciphers aes128-ctr,aes192-ctr,aes256-ctr,arcfour256,arcfour128,aes128-cbc,3des-cbc
#   MACs hmac-md5,hmac-sha1,umac-64@openssh.com,hmac-ripemd160
#   EscapeChar ~
#   Tunnel no
#   TunnelDevice any:any
#   PermitLocalCommand no
#   VisualHostKey no
#   ProxyCommand ssh -q -W %h:%p gateway.example.com
#   RekeyLimit 1G 1h
#
# Uncomment this if you want to use .local domain
# Host *.local
#   CheckHostIP no

Host *
	GSSAPIAuthentication yes
# If this option is set to yes then remote X11 clients will have full access
# to the original X11 display. As virtually no X11 client supports the untrusted
# mode correctly we set this to yes.
	ForwardX11Trusted yes
# Send locale-related environment variables
	SendEnv LANG LC_CTYPE LC_NUMERIC LC_TIME LC_COLLATE LC_MONETARY LC_MESSAGES
	SendEnv LC_PAPER LC_NAME LC_ADDRESS LC_TELEPHONE LC_MEASUREMENT
	SendEnv LC_IDENTIFICATION LC_ALL LANGUAGE
	SendEnv XMODIFIERS

```

其中一些配置项的含义如下:
```
Port 22:设置sshd监听的端口号。
ListenAddress 192.168.2.1 ：设置sshd服务器绑定的IP地址。
HostKey /etc/ssh/ssh_host_key:设置包含计算机私人密钥的文件。
ServerKeyBits  1024：定义服务器密钥的位数。
LoginGraceTime 600：设置如果用户不能成功登入，再断开之前服务器需要等待的时间（秒）。
KeyRegenerationInterval  3600：设置在多少秒之后自动重新生成服务器的密钥
PermitRootLogin no ：设置root能不能用ssh登入。这个选项设成yes表示不允许root登录。
IgnoreRhosts yes：设置验证的时候是否使用“rhosts”和“shosts”文件。
IgnoreuserKnownHosts yes ：设置ssh daemon是否在进行RhostsRSAAAuthentication安全认证的时候忽略用户的“￥HOME/.ssh/known_hosts”
StrictModes yes：设置ssh在接收登入请求之前是否检查用户家目录和rhosts文件的权限和所有权，这通常是必要的，因为新手经常会把自己的目录和文件设成任何人都有写的权限。
X11Forwarding no：设置是否允许X11转发
PrintMotd yes：设置sshd是否在用户登入的时候显示“/etc/motd”中的信息。
SyslogFacility AUTH：设置在记录来着sshd的消息的时候，是否给出“facility code”。
LogLevel INFO 设置记录sshd日志消息的层次。INFO是一个好的选择，查看sshd的man帮助页。
以获得更多的信息。
RhostsAuthentication no ：设置只用rhosts或/etc/hosts.equiv进行验证是否已经足够了。
RhostsRSAAuthentication no：设置是否rhosts或/etc/hosts.equiv加上RSA进行安全验证。
RSAAuthentication yes ：设置是否预先只有RSA安全验证。
PasswordAuthentication yes：设置是否预先口令验证。
PermitEmptyPasswords no：设置是否允许用口令为空的账号登入。
AllowUsers admin：后面可以跟着任意的数量的用户名的匹配窜（patterns）或user@host这样的匹配串，这些字符串用空格隔开。主机名可以是DNS名或IP地址。

```