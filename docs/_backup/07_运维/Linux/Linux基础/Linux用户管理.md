# Linux用户管理

## 新建用户

useradd命令用于新建用户,参数如下:

- -m 创建用户主目录, 如果不存在会自动创建
- -s 指定用户的 shell
- -g 指定用户初始组
- -G 指定用户附加组,多个组用逗号分隔,没有空格
- -p 指定用户的密码

```bash
# 新建用户user1,密码为123456,用户主目录为/home/user1,用户初始组为root,用户附加组为root
useradd -m -s /bin/bash -g root -G root -p $(openssl passwd -1 '123456') user1

```

## 设置用户sudo不输入密码

首先需要登录到 `root` 用户,将用户加入 `sudoers`, 编辑 `/etc/sudoers` 文件

```bash
vi /etc/sudoers

```

移动光标，到 `root ALL=(ALL) ALL`的下一行，按 `a`，进入 `append` 模式，输入
```
your_user_name ALL=(ALL) NOPASSWD: ALL
```
然后修改`%wheel  ALL=(ALL)       ALL`为下面的内容
```
%wheel  ALL=(ALL) NOPASSWD: ALL
```

然后按 `Esc`，再输入 `:wq!` 保存并退出文件
这样就把自己加入了sudo组，可以使用sudo命令不需要密码了。


## 设置用户su免密
创建 `wheel` 组,并将用户加入 `wheel` 组

```bash
usermod -G wheel your_user_name
```

然后修改`su`的配置文件`/etc/pam.d/su`：
```bash
vi /etc/pam.d/su
```
将`#auth            sufficient      pam_wheel.so trust use_uid`的注释取消掉
```
auth            sufficient      pam_wheel.so trust use_uid
```
至此你可以使用su root命令且不需要输入密码。



