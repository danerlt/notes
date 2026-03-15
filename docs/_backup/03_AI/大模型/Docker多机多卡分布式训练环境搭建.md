# Docker多机多卡分布式训练环境搭建

## 背景

众所周知，大模型的训练需要大量的显存资源，单卡很容易就爆了，于是就有了单机多卡、多机多卡的训练方案。

在训练大模型的时候，使用不同的项目进行训练的时候，不同项目（例如 [XuanYuan][1]，[Llama-Chinese][2]，[LLaMA-Factory][3]）所依赖的Python库和一些系统工具的版本不一致，使用Conda环境可以对Python相关的依赖做到很好的隔离，但是对于一些系统工具如`NCCL`的版本不能做到隔离，可能导致训练的时候出问题。而且使用Docker只需要在一台服务器上构建好Docker镜像即可，不需要每台服务器上都重新搭建一次环境，可以大大节约环境搭建的时间。并且 Nvidia 官方的Docker镜像中提供了PyTorch镜像，其对 GPU 加速进行了优化，并包含一组经过验证的库，可启用和优化 GPU 性能。该容器还包含用于加速 ETL（DALI、RAPIDS）、训练（cuDNN、NCCL）和推理（TensorRT）工作负载的软件。

但是deepspeed多机训练是通过ssh来通讯的，不同服务器的docker容器通讯是个麻烦事。还好，docker可以创建overlay网络来解决这个问题。



## 创建overlay共享网络

假设我们有两台主机，均已经在宿主机上安装完 Docker、NVIDIA 显卡驱动，NVIDIA Container Toolkit。

-   server A: 1.1.1.1
-   server B: 2.2.2.2

NVIDIA Container Toolkit 和 Docker Engine，CUDA Driver的关系如下图

![nvidia-container-stack](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/5b208976-b632-11e5-8406-38d379ec46aa.png)

宿主机的 IP 不太重要，Docker 多机多卡分布式训练的时候使用的是 Docker 容器 IP，让它们能跨服务器间通讯。

docker官方的 [network-tutorial-overlay ][6] 有详细的使用方法，下面是复现步骤，注意命令是分别在不同的节点上执行的：

-   On `host1`, initialize the node as a swarm (manager).
-   On `host2`, join the node to the swarm (worker).
-   On `host1`, create an attachable overlay network (test-net).
-   On `host1`, run an interactive alpine container (alpine1) on test-net.
-   On `host2`, run an interactive, and detached, alpine container (alpine2) on test-net.
-   On `host1`, from within a session of alpine1, ping alpine2.

### 1. 初始化集群

我们选择 server A 作为 `manager` 节点，在此服务器上执行初始化命令：

```bash
docker swarm init
```

执行报错`Error response from daemon: could not choose an IP address to advertise since this system has multiple addresses on different interfaces (1.1.1.1 on bond0 and 192.168.122.1 on virbr0) - specify one with --advertise-addr`。

这个错误是因为有多个网卡，必须使用 `--advertise-addr` 指定一个地址。

```bash
# IP 地址需要换成实际的IP地址
$ docker swarm init --advertise-addr 1.1.1.1
Swarm initialized: current node (h077aglfoegkmire6bwab47hv) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-xxxxx-yyyy 1.1.1.1:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

### 2.加入集群

将 server B 作为 `worker` 节点加入集群，进入 server B 执行上面的命令中输出的`docker swarm join`命令：

```bash
# 直接复制上面命令中的输出结果
$ docker swarm join --token SWMTKN-1-xxxxx-yyyy 1.1.1.1:2377
This node joined a swarm as a worker.
```

### 3.创建网络

在 `manager` 中创建 `overlay` 网络，执行命令

```bash
# 创建一个名叫 dis-train 的 overlay 网络
$ docker network create --driver=overlay --attachable dis-train
njhxlanigtonjuvm7k5at9qi1
# 查看当前网络列表
$ docker network ls=
NETWORK ID     NAME                           DRIVER    SCOPE
0965c4afa0dd   bridge                         bridge    local
njhxlanigton   dis-train                      overlay   swarm
3d2797c0dee1   docker_app-network             bridge    local
6889006291b2   docker_gwbridge                bridge    local
6bc9c3bfc570   host                           host      local
0alwsfkjhwgz   ingress                        overlay   swarm
a7f00d18da5a   none                           null      local
```

### 4.同步网络

接着进入 `worker` 节点执行命令查看会发现，看不到上一步创建的网络：

```bash
$ docker network ls
NETWORK ID     NAME              DRIVER    SCOPE
78f272bf635a   bridge            bridge    local
47de07982155   docker_gwbridge   bridge    local
d6c382283c9a   host              host      local
0alwsfkjhwgz   ingress           overlay   swarm
cf45ece5fda0   none              null      local
```

这时候我们只需要开启一个容器，强制指定网络为`dis-train`，docker就会自动同步对应网络了

```bash
 docker run -d -it --name test-network --network dis-train alpine
```

这个时候再来查看，`worker` 节点中就有了刚刚创建的网络了。

```bash
$ docker network ls
NETWORK ID     NAME              DRIVER    SCOPE
78f272bf635a   bridge            bridge    local
njhxlanigton   dis-train         overlay   swarm
47de07982155   docker_gwbridge   bridge    local
d6c382283c9a   host              host      local
0alwsfkjhwgz   ingress           overlay   swarm
cf45ece5fda0   none              null      local
```

## 运行容器搭建

进入`manager`节点，先创建一个 `llm`的文件夹，内部的文件列表如下：

```bash
.
├── code
├── docker-compose.yaml
├── Dockerfile
├── sources.list
└── sync.sh

1 directory, 4 files
```

### 1. 训练框架准备

训练框架使用的是 [LLaMA-Factory][3]  这个框架。

```bash
# 进入工作目录
$ cd llm

# 克隆项目到 code 目录
$ git clone https://github.com/hiyouga/LLaMA-Factory code
```

服务器环境如下：

-   显卡驱动版本： CUDA Version: 12.2
-   PyTorch版本： 2.2.0
-   Git Commit: e3d8fc75eb2cfc54efd35bfd9ad6c4ac5acc458c

修改 `code/requirements.txt` 内容如下：

```txt

```

[LLaMA-Factory][3]  这个框架的 Dockerfile 并没有考虑多机多卡，需要重新写 Dockerfile，内容如下：

```bash
FROM nvcr.io/nvidia/pytorch:24.01-py3

LABEL maintainer="danerlt001@gmail.com"

# 使用 root 用户
USER root

# 设置环境变量
# 防止 python 将 pyc 文件写入硬盘
ENV PYTHONDONTWRITEBYTECODE=1
# 防止 python 缓冲 (buffering) stdout 和 stderr, 以便更容易地进行容器日志记录
ENV PYTHONUNBUFFERED=1
# pip index 配置
ENV PIP_INDEX=" -i https://pypi.tuna.tsinghua.edu.cn/simple/ "
# 设置时区
ENV TZ UTC

# 设置apt源
COPY sources.list /etc/apt/

# 安装依赖
RUN apt-get update\
    && apt-get install -y --no-install-recommends \
        git \
        build-essential \
        zlib1g-dev \
        libncurses5-dev \
        libgdbm-dev \
        libnss3-dev \
        libssl-dev \
        libsqlite3-dev \
        libreadline-dev \ 
        libffi-dev \
        liblzma-dev \
        libbz2-dev \
        curl \
        wget \
        net-tools \
        iputils-ping \
        vim \
        locales \
        pdsh \
        openssh-server \
    && apt-get autoremove \
    && rm -rf /var/lib/apt/lists/* \
    && localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

# 设置语言
ENV LANG en_US.utf8
    
# 设置项目文件
WORKDIR /app

# 安装 Python 依赖
COPY code/requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt ${PIP_INDEX}

# 拷贝项目文件
COPY . /app/
RUN pip install -e .[deepspeed,metrics,bitsandbytes,qwen] ${PIP_INDEX}

# 设置卷
VOLUME [ "/root/.cache/huggingface/", "/data/models",  "/data/models/output", "/data/datasets" ]

EXPOSE 7860

CMD [ "python", "src/train_web.py" ]
```

`sources.list`内容如下：

```bash
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy main restricted
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy main restricted
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates main restricted
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates main restricted
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy universe
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy universe
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates universe
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates universe
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy multiverse
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy multiverse
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates multiverse
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-updates multiverse
deb http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-backports main restricted universe multiverse
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu/ jammy-backports main restricted universe multiverse
deb http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security main restricted
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security main restricted
deb http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security universe
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security universe
deb http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security multiverse
deb-src http://mirrors.cloud.aliyuncs.com/ubuntu jammy-security multiverse
```

`docker-compose.yaml`内容如下，其中的挂载目录和环境变量需要按照实际情况来配置。

```yaml
version: '3.8'

services:
  dis-train:
    build:
      dockerfile: Dockerfile
      context: .
    image: dis-train:v1
    container_name: dis
    volumes:
      - /data/cache/huggingface:/root/.cache/huggingface/
      - /data/models:/data/models
      - /data/models/output:/data/models
      - /data/datasets:/data/datasets
    environment:
      - CUDA_VISIBLE_DEVICES=0,1
      # 需要注意NCCL的配置,这里需要根据容器的情况指定NCCL的通讯网卡 
      # - NCCL_SOCKET_IFNAME=eth0
    ports:
      - "7860:7860"
    ipc: host
    deploy:
      resources:
        reservations:
          devices:
          - driver: nvidia
            count: "all"
            capabilities: [gpu]
    restart: unless-stopped

```

`sync.sh`脚本是用来将`llm`目录同步到 server B的，其中的路径和 IP 地址需要按照实际情况设置。示例如下：

```bash
rsync -avzh --delete \
--exclude '*.pyc' \
/data/workspace/llm/* root@server_b:/data/workspace/llm/
```

构建镜像

```bash
docker-compose build
```

保存镜像：

```bash
docker save -o llm.tar dis-train:v1
```

同步目录：

```bash
basy sync.sh
```

分别到 `manager` , `worker` 节点使用启动容器，：

```bash
docker-compose up -d
```







## 参考链接

[1]:https://github.com/Duxiaoman-DI/XuanYuan  "轩辕：度小满中文金融对话大模型"
[2]: https://github.com/LlamaFamily/Llama-Chinese	"Llama中文社区，最好的中文Llama大模型，完全开源可商用"
[3]: https://github.com/hiyouga/LLaMA-Factory	"Unify Efficient Fine-Tuning of 100+ LLMs"
[4]: https://catalog.ngc.nvidia.com/orgs/nvidia/containers/pytorch	"NVIDIA PyTorch容器"
[5]: https://juejin.cn/post/7304182487683923994	"docker容器中deepspeed多机多卡集群分布式训练大模型"
[6]: https://docs.docker.com/network/network-tutorial-overlay/#use-an-overlay-network-for-standalone-containers	"Use an overlay network for standalone containers"

