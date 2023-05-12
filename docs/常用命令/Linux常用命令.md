# Linux常用命令

## screen 命令

Linux screen命令用于多重视窗管理程序，主要是用来避免 xshll 连接断掉之后执行的命令执行失败的问题。

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