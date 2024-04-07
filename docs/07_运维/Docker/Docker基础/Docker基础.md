# Docker基础

## Docker的发展

### 容器为什么会出现？

在没有 Docker 出现之前，业务都是基于应用的。大部分应用都是运行在服务器上的。业务部门需要添加新的应用，就得采购新的服务器来运行新的应用。

大部分情况下，采购的时候都会采购性能大于需求的的服务器。而大部分服务器的长期负载都在 5%-10% 的水平。 导致资源严重的浪费。

后面 Vmware 公司 发布了虚拟机，虚拟机可以在一个服务器上运行多个虚拟的操作系统。虚拟机可能共享服务器的资源。新增应用的时候就不需要采购新的服务器。直接新增一个虚拟机就可以了。

但是虚拟机每一个虚拟机都是一个完整的操作系统，操作系统会占用额外的CPU，内存，存储等资源。并且虚拟机的启动时间比较久。可移植性较差。

所有再后来就出现了容器技术。Docker 是其中最流行的技术。

### 容器的优点

- 容器启动快： 容器的启动速度是秒级别的，虚拟机启动的时间是分钟级别。
- 资源占用少：同一个宿主机上的容器共享CPU，内存，硬盘等资源，容器占用的资源小
- 可植性好：容器镜像构建好之后，可以快速的部署到其他的服务器上，可以减少环境依赖不同带来的BUG。


## Docker介绍

Docker 开源项目地址为: [https://github.com/moby/moby](https://github.com/moby/moby)

### Docker架构

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/Geo4tq.png)

Docker 使用客户端-服务器架构。 Docker 客户端与 Docker 守护进程通信，后者负责构建、运行和分发 Docker 容器的繁重工作。

Docker 客户端和守护进程可以在同一系统上运行，也可以将 Docker 客户端连接到远程 Docker 守护进程。 

Docker 客户端和守护进程使用 REST API 通过 UNIX 套接字或网络接口进行通信。

另一个 Docker 客户端是 Docker Compose，它允许您使用由一组容器组成的应用程序。

#### Docker daemon ( dockerd )

Docker 守护进程 ( dockerd ) 侦听 Docker API 请求并管理 Docker 对象，例如映像、容器、网络和卷。守护进程还可以与其他守护进程通信来管理 Docker 服务。

#### Docker client ( docker )

Docker 客户端 ( docker ) 是许多 Docker 用户与 Docker 交互的主要方式。当您使用 docker run 等命令时，客户端会将这些命令发送到 dockerd ，由后者执行这些命令。 docker 命令使用 Docker API。 Docker 客户端可以与多个守护进程通信。

#### Docker registries (Docker注册中心)

Docker 注册中心，一般叫做Docker仓库，用来存储 Docker 镜像。 Docker Hub 是任何人都可以使用的公共注册中心，Docker 默认在 Docker Hub 上查找镜像。可以使用 [Harbor](https://github.com/goharbor/harbor) 搭建私有的 Docker 仓库。

#### Docker 对象

当使用 Docker 时，您正在创建和使用镜像(image)、容器(container)、网络(network)、卷(volumes)、插件(plugin)和其他对象。

- 镜像(image)：镜像是一个只读模板，其中包含用于创建 Docker 容器的指令。通常，镜像基于某个镜像，并带有额外的自定义内容。
- 容器(container): 容器是一个镜像的可运行实例。可以使用 Docker API 或 CLI 创建、启动、停止、移动或删除容器。可以将容器连接到一个或多个网络，添加存储，甚至可以基于其当前状态创建新的镜像。

### Docker Engine

Docker 引擎是运行管理Docker容器的核心软件。

Docker Engine 是一种开源容器化技术，用于构建和容器化应用程序。 Docker Engine 充当客户端-服务器应用程序，具有：

- 具有长时间运行的守护进程 `dockerd` 。
- 与 Docker 守护进程通信的APIs
- 命令行接口 (CLI) 客户端 `docker`。

CLI 使用 Docker API 通过脚本或命令来控制Docker 守护程序或与之交互。守护进程创建并管理 Docker 对象，例如映像、容器、网络和卷。



### Docker 工作流程

1. 编写Dockerfile
2. 构建Docker镜像
3. 运行Docker容器
4. 推送镜像到仓库/保存镜像为tar包