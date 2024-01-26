# 安装Nvidia显卡驱动和CUDA Toolkit

## 安装Nvidia显卡驱动
### 查看系统和显卡信息

#### 查看操作系统信息

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

#### 查看内核版本

CUDA 驱动程序要求在安装驱动程序时以及重建驱动程序时安装内核运行版本的内核头文件和开发包。例如，如果您的系统运行内核版本 3.17.4-301，则还必须安装 3.17.4-301 内核头文件和开发包。

```bash
$ uname -r
3.10.0-1160.el7.x86_64
```

#### 查看显卡型号

```bash
$ lspci | grep -i nvidia
3b:00.0 3D controller: NVIDIA Corporation GV100GL [Tesla V100S PCIe 32GB] (rev a1)
86:00.0 3D controller: NVIDIA Corporation GV100GL [Tesla V100S PCIe 32GB] (rev a1)
```

如果提示 `lspci: command not found`，需要安装`pciutils`工具包

```
yum install pciutils -y
```

如果您没有看到任何设置，在命令行输入 `update-pciids `（通常在 `/sbin` 中找到）来更新 Linux 维护的 PCI 硬件数据库，然后重新运行之前的 `lspci`。

### 下载Nvidia 驱动安装文件

首先在 [https://www.nvidia.cn/Download/index.aspx?lang=cn](https://www.nvidia.cn/Download/index.aspx?lang=cn) 上输入显卡型号、操作系统、CUDA Toolkit版本，然后搜索：

!![image-20240126110700869](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126110700869.png)

然后点击下载

![image-20240126110620782](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126110620782.png)

下载链接为： [https://cn.download.nvidia.com/tesla/535.154.05/NVIDIA-Linux-x86_64-535.154.05.run](https://cn.download.nvidia.com/tesla/535.154.05/NVIDIA-Linux-x86_64-535.154.05.run)

### 安装依赖

```bash
yum install -y gcc gcc-c++ kernel-devel-$(uname -r) kernel-headers-$(uname -r)
```

![image-20231212140932040](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20231212140932040.png)

### 停止GPU上的任务和卸载旧的驱动

```bash
#准备工作 kill 所有与nvidia 有关的服务
$: su root # 切换到管理员杼下

$: sudo service ligthdm stop

#在安装驱动前，应保证没有相应的CUDA的程序在运行
$: fuser -v /dev/nvidia*
$: kill -9 [PID]

# 卸载旧的驱动
$: /usr/bin/nvidia-uninstall
```

卸载旧的驱动，弹出的提示框默认为`No`，这里不需要修改，直接按Enter即可。

![image-20240126104835447](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126104835447.png)

接着回车

![image-20240126105002072](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126105002072.png)



### 禁用 nouveau 驱动

Nouveau 是一个开源的 Nvidia 显卡驱动程序项目，旨在为 Linux 系统提供对 Nvidia 显卡的支持。在安装 Nvidia的驱动之前需要将 Nouveau 的驱动禁用掉。

**如果已经禁用过 nouveau 驱动这一步不需要再执行。**

编辑 `/etc/modprobe.d/blacklist.conf` 文件，添加以下内容：

```text
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

### 安装 Nvidia 驱动

执行下载的驱动安装文件`NVIDIA-Linux-x86_64-535.154.05.run`，默认情况下如果 检测到 `X server` 在运行中停止安装，需要设置  `-no-x-check` 参数是当 `X server` 运行中的时候可以继续安装。

```bash
sh NVIDIA-Linux-x86_64-535.154.05.run -no-x-check 
```

![image-20240126110346799](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126110346799.png)

提示没有`cc`命令，需要安装`devtoolset-8-toolchain`，首先在`/etc/yum.repos.d/CentOS-SCLo-rh.repo`中添加内容：

```tex
# CentOS-SCLo-rh.repo
#
# Please see http://wiki.centos.org/SpecialInterestGroup/SCLo for more
# information

[centos-sclo-rh]
name=CentOS-7 - SCLo rh
baseurl=http://mirrors.aliyun.com/centos/7/sclo/$basearch/rh/
gpgcheck=1
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo

[centos-sclo-rh-testing]
name=CentOS-7 - SCLo rh Testing
baseurl=http://mirrors.aliyun.com/centos/7/sclo/$basearch/rh/
gpgcheck=0
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo

[centos-sclo-rh-source]
name=CentOS-7 - SCLo rh Sources
baseurl=http://vault.centos.org/centos/7/sclo/Source/rh/
gpgcheck=1
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo

[centos-sclo-rh-debuginfo]
name=CentOS-7 - SCLo rh Debuginfo
baseurl=http://debuginfo.centos.org/centos/7/sclo/$basearch/
gpgcheck=1
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-SIG-SCLo
```

然后执行：

```bash
sudo yum install -y devtoolset-11-toolchain
sudo scl enable devtoolset-11 bash
```

可以通过下面的命令来查询安装的版本：

```bash
# 查看cc的版本
cc -v
# 查看gcc的版本
gcc -v
# 查看g++的版本
g++ -v
```

![image-20240126111417294](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126111417294.png)

再次执行安装命令：

```bash
sh NVIDIA-Linux-x86_64-535.154.05.run -no-x-check 
```

安装过程中的提示直接使用默认选择即可，一路回车就可以了。

显示`WARNING: nvidia-installer was forced to guess the X library path '/usr/lib64' and X module path '/usr/lib64/xorg/modules'; these paths were not queryable from the system.  If X fails to find    
   the NVIDIA X driver module, please install the `pkg-config` utility and the X.Org SDK/development package for your distribution and reinstall the driver.`直接回车。

![image-20240126111708640](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126111708640.png)

显示`Install NVIDIA's 32-bit compatibility libraries?  `默认选择为`Yes`，直接回车。

![image-20240126111750373](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126111750373.png)

显示`WARNING: This NVIDIA driver package includes Vulkan components, but no Vulkan ICD loader was detected on this system. The NVIDIA Vulkan ICD will not function without the loader. Most 
  distributions package the Vulkan loader; try installing the "vulkan-loader", "vulkan-icd-loader", or "libvulkan1" package.`默认选择为 `OK`，直接回车。

显示`Installation of the NVIDIA Accelerated Graphics Driver for Linux-x86_64 (version: 535.154.05) is now complete.`默认选择为`OK`直接回车。

![image-20240126112108407](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126112108407.png)



### 验证安装结果

使用 `nvidia-smi` 命令验证：

```bash
nvidia-smi
```

![image-20240126112254452](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126112254452.png)


## 安装CUDA Toolkit文档

CUDA Toolkit是由NVIDIA提供的用于GPU计算的软件开发工具包。它包括了一系列用于GPU加速计算的库、编译器、调试器和其他工具，以便开发者能够利用NVIDIA的GPU进行并行计算和高性能计算任务。CUDA Toolkit通常用于加速科学计算、深度学习、机器学习和其他需要大规模并行计算的应用程序。

通过 [https://developer.nvidia.com/cuda-12-2-2-download-archive](https://developer.nvidia.com/cuda-12-2-2-download-archive) 下载对应的安装包，注意要和Nvidia Driver的版本一致。

![image-20240126112416528](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126112416528.png)

下载命令：

```bash
wget https://developer.download.nvidia.com/compute/cuda/12.2.2/local_installers/cuda_12.2.2_535.104.05_linux.run
```

安装命令：

```bash
sudo sh cuda_12.2.2_535.104.05_linux.run
```



接受协议输入`accept`

![image-20240126145825849](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126145825849.png)

在 Driver 选项按空格取消选择，然后使用方向键移动到 `Install`选项回车。

![image-20240126145846880](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126145846880.png)

安装完成输出：

![image-20240126150131205](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240126150131205.png)

设置环境变量，编辑 `/etc/profile`文件，追加下面的内容：

```bash
export PATH=/usr/local/cuda-12.2/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda-12.2/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
```


## 参考链接

-   [英伟达官网安装文档](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/)
-   [CentOS 7安装Nvidia驱动](https://yinguobing.com/install-nvidia-driver-centos-7/)
