# Linux常用命令

## screen 命令

Linux screen命令用于多重视窗管理程序，主要是用来避免 xshll 连接断掉之后执行的命令执行失败的问题。

安装 `screen` 命令

```bash
# CentOS
sudo yum install screen -y
```

### 用法
```bash

# 创建 screen 终端
screen -S <name>

# 创建 screen 终端 并执行任务
# 示例： screen vi ~/main.c //创建 screen 终端 ，并执行 vi命令

# 离开 screen 终端
# 在 screen 终端 下 按下 Ctrl+a d键

# 显示已创建的screen终端 
screen -ls

# 连接 screen_id 为 2276 的 screen终端
screen -r 2276
```

## tree 命令
`tree` 是一个命令行工具，用于以可视化树状结构的方式显示目录的内容。您可以使用 `tree` 命令来查看目录中的所有文件和子目录。默认情况下，`tree` 命令会显示目录中的所有文件和子目录的完整结构。

安装 `tree` 命令

```bash
# CentOS
sudo yum install tree -y
```


要指定 `tree` 命令显示的目录层级，可以使用 `-L` 选项，然后后接数字值，表示要显示的目录的深度，例如：

```bash
# 显示当前目录下两层的树状结构
tree -L 2
```

上面的命令将显示当前目录下的所有一级子目录和文件，以及子目录中的所有文件和子目录，但不会显示它们的子目录。

要显示所有子目录和文件，可以将 `-L` 选项的值设置为 `0`，如下所示：

```bash
# 显示当前目录下的所有目录和文件
tree 
```

如果您只想显示当前目录中的子目录，可以将 `-L` 选项的值设置为 `1`，如下所示：

```bash
# 显示当前目录下所有文件和子目录，但不显示子目录中的子目录
tree -L 1
```

除了 `-L` 选项，`tree` 命令还有许多其他选项，以定制输出并控制显示。可以使用 `man tree` 命令或 `tree --help` 命令来查看更多选项和使用方法。