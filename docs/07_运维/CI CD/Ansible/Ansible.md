# Ansible

Ansible是一款IT自动化工具。它可以配置系统、部署软件，并编排更高级的IT任务，如持续部署或零停机滚动更新。

Ansible的主要目标是简单易用。它还专注于安全性和可靠性，采用最少的移动部件，使用OpenSSH进行传输（其他传输和拉取模式作为替代方案），并设计了一种语言以便人类审计——即使那些不熟悉该程序的人也能轻松理解。

我们认为简单适用于所有规模的环境，因此我们面向各种类型繁忙用户进行设计：开发人员、系统管理员、发布工程师、IT经理以及介于其中的所有人。
Ansible适合管理所有环境，从只有几个实例的小型设置到拥有数千个实例的企业环境。

您可以在由Red Hat主办且针对所有Ansible贡献者、用户和客户举办年度活动“AnsibleFest”中了解更多信息。
AnsibleFest是与他人联系、学习新技能并找到新朋友自动化交流之地。

Ansible以无代理方式管理机器。永远不会出现如何升级远程守护程序或无法管理系统因为守护程序已被卸载等问题。此外，由于Ansible使用OpenSSH（用于SSH（Secure
Shell）协议的开源连接工具），安全风险大大降低。

Ansible是分散式的——它依赖于您现有的操作系统凭据来控制对远程机器的访问权限。如果需要，Ansible可以轻松连接Kerberos、LDAP和其他集中身份验证管理系统。

本文档涵盖了本页面左上角所示版本的Ansible。我们维护多个版本的Ansible和Ansible文档，请确保您正在使用覆盖您正在使用的Ansible版本的文档版本。对于最近添加功能，我们会注明添加该功能时所需求的
Ansible 版本。

每年约发布两次新版主要更新。核心应用程序在语言设计和设置方面相对保守地发展演变，并且自2.10以来贡献者更快地开发并更改托管在集合中模块和插件。

## 开始使用Ansible

Ansible自动化管理远程系统并控制其所需状态。一个基本的Ansible环境有三个主要组件：

- 控制节点(Control node)
  安装了Ansible的系统。您在控制节点上运行诸如ansible或ansible-inventory之类的命令。

- 托管节点(Managed node)
  由Ansible控制的远程系统或主机。

- 清单(Inventory)
  逻辑上组织的受管节点列表。您在控制节点上创建清单，以描述对Ansible进行主机部署。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-05-29-hu0loU.png)

1. 安装Ansible

```bash
python3 -m pip install ansible
```

1. 通过将一个或多个远程系统的IP地址或完全限定域名（FQDN）添加到`/etc/ansible/hosts`中来创建清单。以下示例将KVM中三台虚拟机的IP地址添加到清单中：

```text
[myvirtualmachines]
192.0.2.50
192.0.2.51
192.0.2.52
```

1. 验证您清单中的主机。

```bash
ansible all --list-hosts 
```

```text
hosts (1):
  192.0.2.50
  192.0.2.51
  192.0.2.52
```

1. 设置SSH连接，以便Ansible可以连接到托管节点。
    - 将您的公共SSH密钥添加到每个远程系统上的authorized_keys文件中。
    - 测试SSH连接，例如：
   ```bash
   ssh username@192.0.2.50
   ```
   如果控制节点上的用户名与主机上不同，则需要在ansible命令中传递-u选项。

1. 对managed nodes进行 Ping 测试

```bash
ansible all -m ping
```

```text
192.0.2.50 | SUCCESS => {
  "ansible_facts": {
    "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
    }
192.0.2.51 | SUCCESS => {
  "ansible_facts": {
    "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
    }
192.0.2.52 | SUCCESS => {
  "ansible_facts": {
    "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
    }
```
   

## 构建清单(Building an inventory)


## 参考链接

- [Ansibl中文官方文档](https://cn-ansibledoc.readthedocs.io/zh_CN/latest/)