# Docker 迁移目录

安装完Docker后，默认存储路径在 `/var/lib/docker` 目录，根目录挂载到一个硬盘，可能会造成资源不够用。这时候就需要迁移docker默认的目录。

可以使用下面的命令查看磁盘占用情况。
```bash
df -h
```

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-21-B1TsPr.png)


1. 停止Docker服务

```bash
systemctl stop docker
```

2. 创建docker新目录

```bash
mkdir -p /data/docker/lib
```

3. 安装迁移软件包

```bash
yum install rsync -y
```

4. 开始迁移

```bash
# 安装 screen 工具
yum install screen -y
# 打开一个新窗口 然后输入命令就不怕ssh连接中断了
screen -S sync
# 开始迁移
rsync -avzP /var/lib/docker /data/docker/lib/
```

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-21-HIPoiT.png)

5. 修改配置文件 

```bash
# 首先备份一下原来的配置文件
cp /lib/systemd/system/docker.service /lib/systemd/system/docker.service.bak
# 编辑配置文件
vim /lib/systemd/system/docker.service
```

在 `ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock` 后添加 `--graph=/data/docker/lib/docker`

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-PHOmQX.png)

6. 重启Docker

```bash
systemctl daemon-reload
systemctl restart docker
```

7. 确认docker没有问题，删除原目录

```bash
rm -rf /var/lib/docker
```

在删除的时候如果提示`cannot remove '/var/lib/docker/overlay2/xxxxxxx/merged': Device or resource busy`。需要先取消挂载再删除。

使用`df -h`命令查看发现有很多挂载。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-0Bhzkw.png)

执行下面的命令取消挂载
```bash
umount /var/lib/docker/overlay2/*/merged
```

再次执行删除命令，即可删除成功。
```bash
rm -rf /var/lib/docker
```
