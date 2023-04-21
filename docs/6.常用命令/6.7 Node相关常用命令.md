# Node相关常用命令

## nvm
nvm 它是一个 Node 版本管理器，可以让你在不同的 Node 版本之间切换。类似于 Python 中的 Anaconda.

```bash
# 安装 nvm 
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# 查看 nvm 的版本
nvm -v

# 查看可用的远程 Node 版本
nvm list available

# 下载、编译和安装最新版本的 Node
nvm install node

# 安装特定版本的 Node
nvm install 14.17.6  # 安装 14.17.6 版本的 Node
nvm install 16.3 # 安装 16.3.x 版本的 Node

# 选择已安装的 Node 版本
nvm use 14.7.6  # 使用 14.7.6 版本的 Node

# 列出所有已安装的 Node 版本  
nvm ls
nvm list installed

# 删除已安装的 Node 版本
nvm uninstall 14.7.6  # 删除 14.7.6 版本的 Node

```

## node

## npm
```bash
# 查看 npm 版本
npm -v

# npm 设置镜像源为淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证：通过以下方式验证结果
npm config get registry

# 使用：以 events 依赖包为例
npm install events --save

# npm 设置镜像源为官方镜像 
npm config set registry https://registry.npmjs.org/

# 安装依赖
npm install

# 启动dev
npm run dev

```
## yarn

## pnpm

```bash
# 安装 pnpm
# Windows 使用 PowerShell 执行以下命令
iwr https://get.pnpm.io/install.ps1 -useb | iex

# 使用 npm 安装 pnpm
npm install -g pnpm 
# 或者
install -g @pnpm/exe

# 安装依赖
pnpm install

# 添加依赖
pnpm add <package>[@<version>]

# 启动dev
pnpm dev
```