

## Pip 镜像源

```bash
# 豆瓣pip源
https://pypi.douban.com/simple/

# 腾讯云pip源
https://mirrors.cloud.tencent.com/pypi/simple/

# 阿里云pip源
https://mirrors.aliyun.com/pypi/simple/

# 清华大学pip源
https://pypi.tuna.tsinghua.edu.cn/simple/

# 本地devpi源
http://127.0.0.1:3141/admin/pypi/+simple/ 

```

永久设置 pip 镜像源，以阿里云为例

Linux上
```bash
mkdir ~/.pip

cat > ~/.pip/pip.conf <<EOF
[global]
index-url = https://pypi.douban.com/simple/
EOF
 
```
windows上

新建一个`pip.ini`文件，文件路径为`C:\ProgramData\pip\pip.ini`，内容如下：
```ini
[global]
index-url =https://pypi.douban.com/simple/
```

## 常用命令
### pip
```bash
# 升级pip版本
python3 -m pip install --upgrade pip

# 查看pip版本
pip3 --version

# 查看配置文件路径
pip -v config list

# 使用pip的时候打印详细信息
pip3 install -vvv xxx

# 使用pip源的时候,如果不是https的,需要加上 --trusted-host
pip3 install Flask -i http://127.0.0.1:3141/admin/pypi/+simple/   --trusted-host 127.0.0.1

# 不使用缓存, 需要加上 --no-cache-dir
pip3 --no-cache-dir install Flask -i http://127.0.0.1:3141/admin/pypi/+simple/   --trusted-host 127.0.0.1

```

### pip install
从以下位置安装软件包：

- PyPI（和其他索引）
- VCS 项目网址
- 本地项目目录
- 本地或远程源存档

pip 还支持从文件进行安装

```bash
# 从文件安装
pip3 install -r requirements.txt

# 安装Flask 最新版本
pip3 install Flask

# 安装Flask, 指定版本
pip3 install Flask==1.1.2

# 安装Flask, 指定源, 需要加上 -i 参数, 例如豆瓣云
pip3 install Flask==1.1.2 -i https://pypi.douban.com/simple/

# 使用pep517安装,pip依赖包有的包是tar.gz格式的,这种格式的包需要加上 --use-pep517
# 参考: https://github.com/lm-sys/FastChat/issues/333
pip3 install --use-pep517 fschat -i https://pypi.douban.com/simple/

# 升级已安装的包到最新版本, 需要加上 --upgrade
pip3 install --upgrade Flask

# 从git仓库安装
pip3 install 'SomeProject@git+https://git.repo/some_pkg.git@1.3.1'

# 从压缩包安装
pip3 install '/path/to/some_project-1.4.1-py2.py3-none-any.whl'
pip3 install '/path/to/some_project-1.4.1.tar.gz'
pip3 install 'http://my.package.repo/SomePackage-1.0.4.zip'

# pip重装软件包, 需要加上 --ignore-installed 或 -I
pip3 install --ignore-installed Flask
pip3 install -I flask
```

### pip uninstall
卸载软件包
```bash
# 卸载包 -y 表示不需要直接卸载,不需要再确认
pip3 uninstall -y Flask
```

### pip download
下载软件包
```bash
# 从文件下载
pip3 download -r requirements.txt

# 下载 最新版本
pip3 download Flask

# 下载 Flask, 指定版本
pip3 download Flask==1.1.2

# 下载 Flask, 指定源, 需要加上 -i 参数, 例如豆瓣云
pip3 download Flask==1.1.2 -i https://pypi.douban.com/simple/

# 从git仓库下载
pip3 download 'SomeProject@git+https://git.repo/some_pkg.git@1.3.1'

# 使用http/https下载
pip3 download 'http://my.package.repo/SomePackage-1.0.4.zip'

```

### pip list
列出已安装的软件包，包括可编辑的软件包。
软件包按不区分大小写的排序顺序列出。
```bash
pip3 list
```

### pip show
显示有关一个或多个已安装软件包的信息。
输出格式符合RFC邮件头格式。
```bash
$ pip3 show flask
Name: Flask
Version: 2.0.3
Summary: A simple framework for building complex web applications.
Home-page: https://palletsprojects.com/p/flask
Author: Armin Ronacher
Author-email: armin.ronacher@active-4.com
License: BSD-3-Clause
Location: /usr/local/lib/python3.6/site-packages
Requires: click, itsdangerous, Jinja2, Werkzeug
Required-by: 
```

### pip freeze
以 requirements 格式输出已安装的软件包。
软件包按不区分大小写的排序顺序列出。
```bash
# 生成requirements.txt
pip3 freeze > requirements.txt
```



## 参考链接:

- [pip官网](https://pip.pypa.io/en/stable/user_guide/)
- [pip install](https://pip.pypa.io/en/stable/cli/pip_install/)