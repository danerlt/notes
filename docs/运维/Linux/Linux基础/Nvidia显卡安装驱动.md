# 环境搭建

服务器信息：

```
CPU: Intel(R) Xeon(R) Gold 5218R CPU @ 2.10GHz * 2
GPU：NVIDIA Corporation GV100GL [Tesla V100S PCIe 32GB] * 2
内存：128G
硬盘: 1T 
```

## 安装显卡驱动

### 安装前的准备

### 验证是否有可用的GPU

```bash
$ lspci | grep -i nvidia
3b:00.0 3D controller: NVIDIA Corporation GV100GL [Tesla V100S PCIe 32GB] (rev a1)
86:00.0 3D controller: NVIDIA Corporation GV100GL [Tesla V100S PCIe 32GB] (rev a1)
```

如果提示 `lspci: command not found`，需要安装`pciutils`工具包

```bash
yum install pciutils -y
```

如果您没有看到任何设置，请通过在命令行输入 `update-pciids `（通常在 `/sbin` 中找到）来更新 Linux 维护的 PCI 硬件数据库，然后重新运行之前的 `lspci`

### 验证Linux版本

```bash
$ uname -m && cat /etc/*release
x86_64
CentOS Linux release 7.9.2009 (Core)
NAME="CentOS Linux"
VERSION="7 (Core)"
ID="centos"
ID_LIKE="rhel fedora"
VERSION_ID="7"
PRETTY_NAME="CentOS Linux 7 (Core)"
ANSI_COLOR="0;31"
CPE_NAME="cpe:/o:centos:centos:7"
HOME_URL="https://www.centos.org/"
BUG_REPORT_URL="https://bugs.centos.org/"

CENTOS_MANTISBT_PROJECT="CentOS-7"
CENTOS_MANTISBT_PROJECT_VERSION="7"
REDHAT_SUPPORT_PRODUCT="centos"
REDHAT_SUPPORT_PRODUCT_VERSION="7"

CentOS Linux release 7.9.2009 (Core)
CentOS Linux release 7.9.2009 (Core)
```

`x86_64` 表示在 64 位系统上运行。下面是 Linux 发行版的信息。

### 验证系统是否已安装 gcc

```bash
gcc --version
```

如果提示 `gcc: command not found`，需要安装 `gcc`:

```bash
yum install -y gcc gcc-c++ 
```

版本信息如下：

```bash
$ gcc --version
gcc (GCC) 4.8.5 20150623 (Red Hat 4.8.5-44)
Copyright (C) 2015 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

$ g++ --version
g++ (GCC) 4.8.5 20150623 (Red Hat 4.8.5-44)
Copyright (C) 2015 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

### 验证内核

CUDA 驱动程序要求在安装驱动程序时以及重建驱动程序时安装内核运行版本的内核头文件和开发包。例如，如果您的系统运行内核版本 3.17.4-301，则还必须安装 3.17.4-301 内核头文件和开发包。

可以通过运行以下命令找到系统正在运行的内核版本：

```bash
$ uname -r
3.10.0-1160.el7.x86_64
```

### 安装 GPUDirect 存储

如果您打算使用 GPUDirectStorage (GDS)，则必须安装 CUDA 包和 MLNX_OFED 包。

可以使用 CUDA 打包指南安装 GDS 包。请遵循 [MLNX_OFED 要求和安装](https://docs.nvidia.com/gpudirect-storage/troubleshooting-guide/index.html#mofed-req-install)中的说明。

### 选择安装方法

可以使用两种不同的安装机制之一来安装 CUDA 工具包：特定于发行版的包（RPM 和 Deb 包）或独立于发行版的包（runfile 包）。独立于发行版的软件包的优点是可以在更广泛的 Linux 发行版上工作，但不会更新发行版的本机包管理系统。特定于发行版的包与发行版的本机包管理系统交互。建议尽可能使用特定于发行版的软件包。

### 下载 NVIDIA CUDA 工具包

首先在 [https://www.nvidia.cn/Download/index.aspx?lang=cn](https://www.nvidia.cn/Download/index.aspx?lang=cn) 上输入显卡型号和操作系统，然后搜索：

![image-20231206102821613](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206102821613.png)

然后点击下载

![image-20231206102847233](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206102847233.png)

下载链接为： [https://cn.download.nvidia.com/tesla/470.223.02/NVIDIA-Linux-x86_64-470.223.02.run](https://cn.download.nvidia.com/tesla/470.223.02/NVIDIA-Linux-x86_64-470.223.02.run)

### Address Custom xorg.conf, If Applicable

该驱动程序依赖于`/etc/X11/xorg.conf` 自动生成的 `xorg.conf` 文件。如果存在自定义的 `xorg.conf` 文件，则此功能将被禁用，并且驱动程序可能无法工作。您可以尝试删除现有的 `xorg.conf `文件，或将 `/etc/X11/xorg.conf.d/00-nvidia.conf` 的内容添加到 `xorg.conf `文件中。对于具有重要 GPU 配置的系统， `xorg.conf`文件很可能需要手动调整。

### 处理冲突

在安装 CUDA 之前，应卸载任何可能发生冲突的先前安装。这不会影响之前未安装 CUDA 的系统，或已保留安装方法的系统（RPM/Deb 与 Runfile）。具体请看下面的图表。具体可查看链接：[https://docs.nvidia.com/cuda/cuda-installation-guide-linux/#handle-conflicting-installation-methods](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/#handle-conflicting-installation-methods)

![image-20231206111048986](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206111048986.png)

## 包管理安装

### 内核头文件

当前运行的内核的内核头文件和开发包可以通过以下方式安装：

```bash
yum install kernel-devel-$(uname -r) kernel-headers-$(uname -r) -y
```

### 第三方包依赖

满足 DKMS 依赖性：NVIDIA 驱动程序 RPM 包依赖于其他外部包，例如 DKMS 和 libvdpau 。这些软件包仅在第三方存储库中可用，例如 EPEL。在安装 NVIDIA 驱动程序 RPM 包之前，必须将任何此类第三方存储库添加到包管理器存储库数据库中，否则缺少依赖项将导致安装无法继续。

要启用 EPEL:

```bash
yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm -y
```

仅在 `RHEL 7 Linux` 上，执行以下步骤以启用可选存储库。

```
subscription-manager repos --enable=rhel-7-server-optional-rpms
```



## 禁用驱动

### 禁用nouveau驱动

Nouveau 是一个开源的 Nvidia 显卡驱动程序项目，旨在为 Linux 系统提供对 Nvidia 显卡的支持。在安装 Nvidia的驱动之前需要将 Nouveau 的驱动禁用掉。

编辑 `/etc/modprobe.d/blacklist.conf` 文件，添加以下内容：

```
blacklist nouveau
options nouveau modeset=0
```

使用 dracut重新建立 initramfs nouveau 并且备份 initramfs nouveau image镜像

```bash
mv /boot/initramfs-$(uname -r).img /boot/initramfs-$(uname -r).img.bak
```

重新建立新的 the initramfs file:

```bash
dracut -v /boot/initramfs-$(uname -r).img $(uname -r)
```

![image-20231206140439734](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206140439734.png)

然后重启：

```
sudo reboot
```

重启后，执行：

```
lsmod | grep nouveau
```

如果没有屏幕输出，说明禁用 `nouveau` 成功。

## 安装显卡驱动

### 本地安装

将`NVIDIA-Linux-x86_64-470.223.02.run`下载到服务器，然后执行：

```bash
chmod +x NVIDIA-Linux-x86_64-470.223.02.run
./NVIDIA-Linux-x86_64-470.223.02.run -no-x-check -no-nouveau-check -no-opengl-files
```

如果提示下这个错误

```
Unable to find the kernel source tree for the currently running kernel. Please make sure you have installed the kernel source files for your kernel and that they are properly configured; on Red Hat Linux systems, for example, be sure you have the 'kernel-source' or 'kernel-devel' RPM installed. If you know the correct kernel source files are installed, you may specify the kernel source path with the '--kernel-source-path' command line option.
```

需要安装 `kernel-headers` 和 `kernel-devel ` ，安装命令如下：

```bash
yum install kernel-headers kernel-devel -y
```

安装过程中的提示选择`yes`或者`OK`，具体截图可参考： [CentOS 7安装Nvidia驱动](https://yinguobing.com/install-nvidia-driver-centos-7/)

### 验证安装结果

使用 `nvidia-smi` 命令验证：

```bash
nvidia-smi
```

![image-20231206141510431](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206141510431.png)



## 安装CUDA ToolKit

通过 [https://developer.nvidia.com/cuda-11-4-0-download-archive](https://developer.nvidia.com/cuda-11-4-0-download-archive) 下载对应的安装包，注意要和Nvidia Driver的版本一致。

![image-20231206162705781](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206162705781.png)

下载命令：

```bash
wget https://developer.download.nvidia.com/compute/cuda/11.4.0/local_installers/cuda_11.4.0_470.42.01_linux.run
```

安装命令：

```bash
sudo sh cuda_11.4.0_470.42.01_linux.run
```

接受协议输入`accept`

![image-20231206172606863](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206172606863.png)

在 Driver 选项按空格取消选择，然后使用方向键移动到 `Install`选项回车。

![image-20231206172851336](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206172851336.png)

安装完成输出：

![image-20231206173155341](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231206173155341.png)

设置环境变量，编辑 `/etc/profile`文件，追加下面的内容：

```bash
export PATH=/usr/local/cuda-11.4/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda-11.4/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
```





## 安装conda

在 Anaconda 官网下载安装包，这里使用的下载链接为： [https://repo.anaconda.com/archive/Anaconda3-2023.09-0-Linux-x86_64.sh](https://repo.anaconda.com/archive/Anaconda3-2023.09-0-Linux-x86_64.sh)

下载命令为：

```bash
curl -o https://repo.anaconda.com/archive/Anaconda3-2023.09-0-Linux-x86_64.sh
```

安装 Anaconda：

```bash
bash Anaconda3-2023.09-0-Linux-x86_64.sh
```

阅读完协议之后输入`yes`,然后一路回车就行。



## 参考连接

-   [英伟达官网安装文档](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/)
-   [CentOS 7安装Nvidia驱动](https://yinguobing.com/install-nvidia-driver-centos-7/)
