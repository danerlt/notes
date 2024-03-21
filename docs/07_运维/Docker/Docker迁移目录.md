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
