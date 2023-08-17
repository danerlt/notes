# JupyterLab教程

## 安装

在Linux上安装jupyterhub,JupyterLab

首先需要使用`root`用户安装`anaconda`，然后切换到`base`环境。

安装`jupyterlab`：

```bash 
conda activate base
conda install jupyterhub jupyterlab notebook
```

## 启动服务

Jupyterhub在Linux上安装好后若要修改配置并启动有两种方式：

1. 通过命令行添加配置参数运行
2. 通过修改配置文件参数运行

使用命令行需要添加大量参数并且终端关闭服务就停止了，所有使用第二种方式。

生成配置文件：

```bash
jupyterhub --generate-config
```

会在当前目录下生成`jupyterhub_config.py`文件。

修改配置文件，（重要，默认直接启动的话只有root能够登录）

```bash
vim jupyterhub_config.py
```

在文件末尾添加以下内容，其它字段根据需要增添：

```python
c.JupyterHub.ip = "0.0.0.0"
c.JupyterHub.port = 9999
c.PAMAuthenticator.encoding = 'utf-8'
c.LocalAuthenticator.create_system_users = True
c.Authenticator.allowed_users = {'shuke', 'tangnn', 'litao', 'ailun', 'liyi'}
c.Authenticator.admin_users = {'root', 'shuke', 'tangnn', 'litao', 'ailun', 'liyi'}
c.Application.log_level = 'DEBUG'
c.JupyterHub.hub_bind_url = 'http://127.0.0.1:9081'
```

- `c.JupyterHub.ip`是服务的IP地址
- `c.JupyterHub.port`是服务的端口
- `c.Authenticator.allowed_users`是允许登录的用户列表，
- `c.Authenticator.admin_users`是管理员用户列表
- `c.LocalAuthenticator.create_system_users = True`是允许创建系统用户
- `c.Application.log_level` 是日志级别
- `c.JupyterHub.hub_bind_url` 是hub的地址，这里是设置的9081端口是因为默认端口8081被占用了，所以改成了9081端口

### 调用 Anaconda 环境依赖

通过 `conda create` 创建的环境并不会默认显示在 `JupyterHub` 的 `kernel` 选项中，需要安装依赖。

```bash
conda install nb_conda_kernels

```

如果登录之后切换`conda`环境，找不到对应的环境，需要在对应的用户`conda`的`base`环境安装`ipykernel`。

```bash
conda activate base
conda install ipykernel
```

### 注册成Linux服务

新建服务文件：

```bash 
vim /usr/lib/systemd/system/jupyterhub.service 
```

将下面的内容复制进去，注意修改`ExecStart`的路径为`jupyterhub`的路径。

```
[Unit]
Description=JupyterHub Server
Requires=network-online.target
After=network-online.target

[Service]
Restart=on-success
Environment="PATH=/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/miniconda3/bin"
ExecStart=/root/miniconda3/bin/jupyterhub -f /root/jupyterhub_config.py >> /var/log/jupyterhub.log 2>&1
User=root

[Install]
WantedBy=multi-user.target

```

加载服务，启动服务，设置开机自启动：

```bash
systemctl daemon-reload
systemctl start jupyterhub
systemctl enable jupyterhub
systemctl status jupyterhub
```

服务启动成功打印如下, 可以通过`http://ip:port/`访问：

```text
● jupyterhub.service - JupyterHub Server
   Loaded: loaded (/usr/lib/systemd/system/jupyterhub.service; enabled; vendor preset: disabled)
   Active: active (running) since Thu 2023-08-17 18:03:14 CST; 6s ago
 Main PID: 158352 (jupyterhub)
    Tasks: 8
   Memory: 76.7M
   CGroup: /system.slice/jupyterhub.service
           ├─158352 /root/miniconda3/bin/python /root/miniconda3/bin/jupyterhub -f /root/jupyterhub_config.py >> /var/log/jupyterhub.log 2>&1
           └─158407 node /root/miniconda3/bin/configurable-http-proxy --ip 0.0.0.0 --port 9999 --api-ip 127.0.0.1 --api-port 8001 --error-target http://127.0.0.1:9081/hub/error --log-level info

Aug 17 18:03:15 host jupyterhub[158352]: 18:03:15.448 [ConfigProxy] info: 200 GET /api/routes
Aug 17 18:03:15 host jupyterhub[158352]: [D 2023-08-17 18:03:15.448 JupyterHub proxy:880] Proxy: Fetching GET http://127.0.0.1:8001/api/routes
Aug 17 18:03:15 host jupyterhub[158352]: 18:03:15.452 [ConfigProxy] info: 200 GET /api/routes
Aug 17 18:03:15 host jupyterhub[158352]: [D 2023-08-17 18:03:15.452 JupyterHub proxy:392] Checking routes
Aug 17 18:03:15 host jupyterhub[158352]: [I 2023-08-17 18:03:15.453 JupyterHub proxy:477] Adding route for Hub: / => http://127.0.0.1:9081
Aug 17 18:03:15 host jupyterhub[158352]: [D 2023-08-17 18:03:15.453 JupyterHub proxy:880] Proxy: Fetching POST http://127.0.0.1:8001/api/routes/
Aug 17 18:03:15 host jupyterhub[158352]: 18:03:15.457 [ConfigProxy] info: Adding route / -> http://127.0.0.1:9081
Aug 17 18:03:15 host jupyterhub[158352]: 18:03:15.458 [ConfigProxy] info: 201 POST /api/routes/
Aug 17 18:03:15 host jupyterhub[158352]: [I 2023-08-17 18:03:15.458 JupyterHub app:3197] JupyterHub is now running at http://0.0.0.0:9999/
Aug 17 18:03:15 host jupyterhub[158352]: [D 2023-08-17 18:03:15.459 JupyterHub app:2803] It took 0.626 seconds for the Hub to start

```
