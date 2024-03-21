# Docker命令

## 常用

```bash
# 修改docker域名配置
vim /etc/systemd/system/docker.service.d/docker-options.conf
# 添加参数 --insecure-registry参数具体设置那些根据实际情况来设置
--insecure-registry=registry-1.docker.io

# 修改完需要重启docker
systemctl daemon-reload 
systemctl restart docker


# harbor登陆
docker login -u 用户名 -p 密码 harbor域名:habor端口

# 拉取镜像
docker pull 镜像url
# 删除镜像
docker rmi 镜像url

# 导出镜像 镜像url可以是多个，多个镜像URL用空格分隔
docker save -o xxx.tar 镜像url
# 加载镜像
docker load -i xxx.tar

# docker 查看内存数
docker stats --no-stream 容器名 --format "table {{.MemPerc}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Name}}" | sed "s/%//g" | awk 'NR>1 {print $3}'

# docker 替换容器启动命令 使用  --entrypoint 指定
docker run -i -t --entrypoint bash harbor.xxx.com/yyy/imageclassification-custom-tf-preserver:release-1.0


# docker复制容器的到本地
docker cp  容器ID:/tmp/foo /tmp/bar

# docker 运行MySQL
docker run -p 33306:3306 --name mysql \
-v /usr/local/docker/mysql/conf:/etc/mysql \
-v /usr/local/docker/mysql/logs:/var/log/mysql \
-v /usr/local/docker/mysql/data:/var/lib/mysql \
-e MYSQL_ROOT_PASSWORD=123456 \
-d mysql:8.0

# k8s进入 MySQL 容器中文乱码问题
docker run --rm -it mysql:8.0 env LANG=C.UTF-8 /bin/bash

# 清理Docker
docker system purne

# 查看网络
docker network ls

# 查看docker 网络详情
docker network inspect 

# 创建网络 使用bridge模式 网络名称为 localnet
docker create network create -d bridge localnet

# 查看容器端口映射
docker port 容器名

# 服务管理
docker service 

# 卷管理
docker volume
# 查看卷
docker volume ls
# 查看卷详细信息
docker volume inspect 卷名称
# 删除卷
docker volume prune # 这个会删除未被使用的卷，慎用
docker volume rm 卷名称 # 删除指定的卷，如果卷在使用中会提示卷在使用中，无法删除


```



## 查看命令

| 命令                |           解释           |
| :------------------ | :----------------------: |
| docker ps           |    查看正在运行的容器    |
| docker ps -a        |  查看所有已经创建的容器  |
| docker images       |       列出镜像列表       |
| docker container ls | 效果同ps命令(加-a效果同) |

### docker ps 详细参数

```
-a :显示所有的容器，包括未运行的。

-f :根据条件过滤显示的内容。

--format :指定返回值的模板文件。

-l :显示最近创建的容器。

-n :列出最近创建的n个容器。

--no-trunc :不截断输出。

-q :静默模式，只显示容器编号。

-s :显示总的文件大小。
```

### docker images 详细参数

等价于 `docker image ls` 和 `docker image list`
```
-a :列出本地所有的镜像（含中间映像层，默认情况下，过滤掉中间映像层）；

--digests :显示镜像的摘要信息；

-f :显示满足条件的镜像；

--format :指定返回值的模板文件；

--no-trunc :显示完整的镜像信息；

-q :只显示镜像ID。
```

## 删除命令

| 命令       |   解释   |
| :--------- | :------: |
| docker rm  | 删除容器 |
| docker rmi | 删除镜像 |

### docker rm 详细参数

```
-f :强制删除一个运行中的容器

-l :移除容器间的网络连接，而非容器本身

-v :-v 删除与容器关联的卷
```

### docker rmi 详细参数

```
-f :强制删除；

--no-prune :不移除该镜像的过程镜像，默认移除；
```

## 宿-主操作

| 命令      |           解释           |
| :-------- | :----------------------: |
| docker cp | 容器与主机之间的数据拷贝 |

### docker cp 实例

```
docker cp  nginx:/www /tmp/    #将nginx容器的/www 拷贝到本地/tmp下
```

## 生命周期

| 命令           |              解释              |
| :------------- | :----------------------------: |
| docker start   |            启动容器            |
| docker stop    |            停止容器            |
| docker restart |            重启容器            |
| docker exec    |     在运行的容器中执行命令     |
| docker run     | 创建一个新的容器并运行一个命令 |

### docker exec 详细参数

```
-d :分离模式: 在后台运行

-i :即使没有附加也保持STDIN 打开

-t :分配一个伪终端

#实例
docker exec -it nginx /bin/bash
```

### docker run 详细参数

```
-i, --interactive=false   打开STDIN，用于控制台交互
-t, --tty=false            分配tty设备，该可以支持终端登录，默认为false
-d, --detach=false         指定容器运行于前台还是后台，默认为false
-u, --user=""              指定容器的用户
-a, --attach=[]            登录容器（必须是以docker run -d启动的容器）
-w, --workdir=""           指定容器的工作目录
-c, --cpu-shares=0        设置容器CPU权重，在CPU共享场景使用
-e, --env=[]               指定环境变量，容器中可以使用该环境变量
-m, --memory=""            指定容器的内存上限
-P, --publish-all=false    指定容器暴露的端口
-p, --publish=[]           指定容器暴露的端口 格式为： 主机端口:容器端口
-h, --hostname=""          指定容器的主机名
-v, --volume=[]            给容器挂载存储卷，挂载到容器的某个目录    顺序：主机：容器
--volumes-from=[]          给容器挂载其他容器上的卷，挂载到容器的某个目录
--cap-add=[]               添加权限，权限清单详见：http://linux.die.net/man/7/capabilities
--cap-drop=[]              删除权限，权限清单详见：http://linux.die.net/man/7/capabilities
--cidfile=""               运行容器后，在指定文件中写入容器PID值，一种典型的监控系统用法
--cpuset=""                设置容器可以使用哪些CPU，此参数可以用来容器独占CPU
--device=[]                添加主机设备给容器，相当于设备直通
--dns=[]                   指定容器的dns服务器
--dns-search=[]            指定容器的dns搜索域名，写入到容器的/etc/resolv.conf文件
--entrypoint=""            覆盖image的入口点
--env-file=[]              指定环境变量文件，文件格式为每行一个环境变量
--expose=[]                指定容器暴露的端口，即修改镜像的暴露端口
--link=[]                  指定容器间的关联，使用其他容器的IP、env等信息
--lxc-conf=[]              指定容器的配置文件，只有在指定--exec-driver=lxc时使用
--name=""                  指定容器名字，后续可以通过名字进行容器管理，links特性需要使用名字
--net="bridge"             容器网络设置:
                            bridge 使用docker daemon指定的网桥
                            host    //容器使用主机的网络
                            container:NAME_or_ID  >//使用其他容器的网路，共享IP和PORT等网络资源
                            none 容器使用自己的网络（类似--net=bridge），但是不进行配置
--privileged=false         指定容器是否为特权容器，特权容器拥有所有的capabilities
--restart="no"             指定容器停止后的重启策略:
                            no：容器退出时不重启
                            on-failure：容器故障退出（返回值非零）时重启
                            always：容器退出时总是重启
--rm=false                 指定容器停止后自动删除容器(不支持以docker run -d启动的容器)
--sig-proxy=true           设置由代理接受并处理信号，但是SIGCHLD、SIGSTOP和SIGKILL不能被代理
```

## 镜像仓库

| 命令          |         解释         |
| :------------ | :------------------: |
| docker pull   |       拉取镜像       |
| docker search | 从Docker Hub查找镜像 |

## docker环境信息

| 命令           |         解释         |
| :------------- | :------------------: |
| docker info    |  查看docker系统信息  |
| docker version | 显示 Docker 版本信息 |



## 参考链接

[Docker 命令](https://www.kancloud.cn/xuthus/mynote/636478)
