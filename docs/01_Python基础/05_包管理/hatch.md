# hatch

## hatch简介

Hatch 是一个用于 Python 项目的集成构建和环境管理工具，旨在简化和优化开发过程。它提供了广泛的功能，能够有效替代 setuptools、tox 和 nox 等工具。

**优点：**

- **集成度高：** 使用 Hatch 的所有功能后，许多其他工具变得不必要，因为它涵盖了项目开发所需的所有功能。
- **优化的默认设置：** 相较于 setuptools，Hatch 提供了更合理的默认设置，避免了无意中包含不需要的文件。
- **配置简单：** Hatch 使用与 Git 相同的 glob 模式语法，所有配置集中在一个文件中，便于管理。
- **可编辑安装：** 默认行为支持外部工具进行静态分析，无需额外配置。
- **可重现性高：** Hatch 默认构建的轮子包和源码分发是可重现的。
- **易于扩展：** Hatch 的插件系统简化了扩展和定制开发。

**缺点：**

- **构建扩展模块的局限：** 如果需要构建扩展模块，建议继续使用 setuptools 或其他专门用于与编译器接口的后端。
- **迁移复杂性：** 从 nox 迁移到 Hatch 时，某些特定配置可能需要重新设计。
- **补丁版本安装限制：** Hatch 不支持安装特定的补丁版本，只能使用最新补丁版本的小版本。


## 安装hatch

windows上安装命令，默认安装在`C:\Program Files\Hatch`目录:

```bash
msiexec /passive /i https://github.com/pypa/hatch/releases/latest/download/hatch-x64.msi
```
然后重新打开一个cmd查看版本:

```bash
$ hatch --version
Hatch, version 1.12.0
```

## 创建项目


使用`hatch new`创建一个项目：

```bash
hatch new "Hatch Demo"
```

这将为您当前的工作目录创建以下结构：

```bash
hatch-demo
├── src
│   └── hatch_demo
│       ├── __about__.py
│       └── __init__.py
├── tests
│   └── __init__.py
├── LICENSE.txt
├── README.md
└── pyproject.toml
```

要初始化现有项目，请进入包含该项目的目录并执行以下操作：

```bash
hatch new --init
```