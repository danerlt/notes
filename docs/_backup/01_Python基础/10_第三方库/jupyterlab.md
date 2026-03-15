# JupyterLab教程

## 安装
在Linux上安装 `jupyterlab`

首先需要使用`root`用户安装`anaconda`，然后切换到`base`环境。

安装`jupyterlab`：

```bash
conda activate base
pip install jupyterlab
```

## 启动服务

Jupyterhub在Linux上安装好后若要修改配置并启动有两种方式：

1. 通过命令行添加配置参数运行
2. 通过修改配置文件参数运行

使用命令行需要添加大量参数并且终端关闭服务就停止了，所有使用第二种方式。

生成配置文件：

```bash
jupyter lab --generate-config
```

默认生成的路径为`/root/.jupyter/jupyter_lab_config.py`文件。

修改配置文件，（重要，默认直接启动的话只有root能够登录）

```bash
vim /root/.jupyter/jupyter_lab_config.py
```

在文件末尾添加以下内容，其它字段根据需要增添，注意要将`your_token`替换为你的token。

```python
c.ServerApp.open_browser = False
c.JupyterApp.answer_yes=True
c.ServerApp.allow_remote_access=True
c.ServerApp.allow_root=True
c.ServerApp.root_dir = "/workspace/jupyterlab"
c.ServerApp.token = 'your_token'
c.ServerApp.port = 8888
c.ServerApp.ip = '0.0.0.0'
```

- `c.ServerApp.open_browser`: 防止在浏览器中打开默认url
- `c.JupyterApp.answer_yes`: 对任何问题回答是而不是提示
- `c.ServerApp.allow_remote_access`: 是是否允许远程访问
- `c.ServerApp.allow_root`: 是是否允许root用户登录
- `c.ServerApp.root_dir`: 是jupyter的根目录
- `c.ServerApp.token`: 是用户登录的token
- `c.ServerApp.port`: 是服务的端口
- `c.ServerApp.ip`: 服务的IP地址

### 安装依赖

```bash
conda install nb_conda_kernels ipykernel -y
```

### 注册成Linux服务

新建服务文件：

```bash 
vim /etc/systemd/system/jupyterlab.service 
```

将下面的内容复制进去，注意修改`ExecStart`的路径为`jupyterhub`的路径。

```
[Unit]
Description=JupyterLab Server
Requires=network-online.target
After=network-online.target

[Service]
Restart=on-success
ExecStart=/root/miniconda3/bin/jupyter lab --config=/root/.jupyter/jupyter_lab_config.py > /var/log/jupyterlab.log
User=root

[Install]
WantedBy=multi-user.target

```

加载服务，启动服务，设置开机自启动：

```bash
systemctl daemon-reload
systemctl start jupyterlab
systemctl enable jupyterlab
systemctl status jupyterlab
```

服务启动成功打印如下, 可以通过`http://ip:port/`访问：

```text

```