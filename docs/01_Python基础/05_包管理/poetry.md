# poetry

## 引言
Poetry 是 Python 中用于依赖管理和打包的工具。它允许你声明项目所依赖的库，并为你管理（安装/更新）这些库。Poetry 提供了一个锁定文件以确保可重复安装，并且能够构建你的项目以便分发。

## 安装

Poetry 应始终安装在专用的虚拟环境中，以将其与系统的其余部分隔离开来。在任何情况下，它都不应安装在要由 Poetry 管理的项目环境中。这确保了 Poetry 自己的依赖项不会被意外升级或卸载。（以下每种安装方法都可确保将 Poetry 安装到隔离环境中。此外，不应激活安装 Poetry 的隔离虚拟环境来运行 Poetry 命令。

```bash
curl -sSL https://install.python-poetry.org | python3 -
```


## Dockerfile中使用

下面的代码参考自[MaxKb项目](https://github.com/1Panel-dev/MaxKB/blob/main/installer/Dockerfile)
```
RUN python3 -m venv /opt/py3 && \
    pip install poetry --break-system-packages && \
    poetry config virtualenvs.create false && \
    . /opt/py3/bin/activate && \
    if [ "$(uname -m)" = "x86_64" ]; then sed -i 's/^torch.*/torch = {version = "^2.2.1+cpu", source = "pytorch"}/g' pyproject.toml; fi && \
    poetry install

ENV LANG=en_US.UTF-8 \
    PATH=/opt/py3/bin:$PATH    
```

## 参考链接

- [poetry 官方文档](https://python-poetry.org/docs/)
- [poetry Github](https://github.com/python-poetry/poetry)