# CentOS 7 升级 GCC 11

## 设置yum源

首先设置SCLO yum源为阿里云的yum源

```bash
vim /etc/yum.repos.d/CentOS-SCLo-rh.repo
```

内容如下：

```text
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

然后执行下面的命令更新`yum`源：

```bash
yum update -y
yum makecache
```





## 卸载旧的gcc

执行下面的命令会将`gcc`,`g++`,`gdb`都卸载掉。

```bash
yum remove gcc
```

卸载之后可以执行下面的命令查看是否卸载成功。

```bash
[root@gpu01 ~]# gcc -v
-bash: /bin/gcc: No such file or directory
[root@gpu01 ~]# g++ -v
-bash: /bin/g++: No such file or directory
[root@gpu01 ~]# gdb -v
-bash: gdb: command not found
```





## 安装新的gcc

首先通过`yum`查看 SCL 软件源提供了哪些软件集：

```bash
yum list all --enablerepo='centos-sclo-rh' | grep "devtoolset-11"
```

![image-20240118105035096](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240118105035096.png)

安装需要的工具链（**如果需要安装gcc 11，就下devtoolset-11-toolchain；如果需要安装gcc10，就下devtoolset-10-toolchain；gcc 9、gcc 8等以此类推**

```bash
# 直接下载开发的工具链，它会自动把 gcc, gcc-c++, make, gdb 等依赖也都完整下载下来 
sudo yum install -y devtoolset-11-toolchain
```

启用高版本 gcc

```bash
# 启用对应版本的工具链
sudo scl enable devtoolset-11 bash
# 查看版本信息
gcc -v
```

查看版本信息结果如下：

```
# 查看 GCC 版本
(dis) [root@gpu01 ~]# gcc -v
Using built-in specs.
COLLECT_GCC=gcc
COLLECT_LTO_WRAPPER=/opt/rh/devtoolset-11/root/usr/libexec/gcc/x86_64-redhat-linux/11/lto-wrapper
Target: x86_64-redhat-linux
Configured with: ../configure --enable-bootstrap --enable-languages=c,c++,fortran,lto --prefix=/opt/rh/devtoolset-11/root/usr --mandir=/opt/rh/devtoolset-11/root/usr/share/man --infodir=/opt/rh/devtoolset-11/root/usr/share/info --with-bugurl=http://bugzilla.redhat.com/bugzilla --enable-shared --enable-threads=posix --enable-checking=release --enable-multilib --with-system-zlib --enable-__cxa_atexit --disable-libunwind-exceptions --enable-gnu-unique-object --enable-linker-build-id --with-gcc-major-version-only --with-linker-hash-style=gnu --with-default-libstdcxx-abi=gcc4-compatible --enable-plugin --enable-initfini-array --with-isl=/builddir/build/BUILD/gcc-11.2.1-20220127/obj-x86_64-redhat-linux/isl-install --enable-gnu-indirect-function --with-tune=generic --with-arch_32=x86-64 --build=x86_64-redhat-linux
Thread model: posix
Supported LTO compression algorithms: zlib
gcc version 11.2.1 20220127 (Red Hat 11.2.1-9) (GCC) 

# 查看 G++ 版本
(dis) [root@gpu01 ~]# g++ -v
Using built-in specs.
COLLECT_GCC=g++
COLLECT_LTO_WRAPPER=/opt/rh/devtoolset-11/root/usr/libexec/gcc/x86_64-redhat-linux/11/lto-wrapper
Target: x86_64-redhat-linux
Configured with: ../configure --enable-bootstrap --enable-languages=c,c++,fortran,lto --prefix=/opt/rh/devtoolset-11/root/usr --mandir=/opt/rh/devtoolset-11/root/usr/share/man --infodir=/opt/rh/devtoolset-11/root/usr/share/info --with-bugurl=http://bugzilla.redhat.com/bugzilla --enable-shared --enable-threads=posix --enable-checking=release --enable-multilib --with-system-zlib --enable-__cxa_atexit --disable-libunwind-exceptions --enable-gnu-unique-object --enable-linker-build-id --with-gcc-major-version-only --with-linker-hash-style=gnu --with-default-libstdcxx-abi=gcc4-compatible --enable-plugin --enable-initfini-array --with-isl=/builddir/build/BUILD/gcc-11.2.1-20220127/obj-x86_64-redhat-linux/isl-install --enable-gnu-indirect-function --with-tune=generic --with-arch_32=x86-64 --build=x86_64-redhat-linux
Thread model: posix
Supported LTO compression algorithms: zlib
gcc version 11.2.1 20220127 (Red Hat 11.2.1-9) (GCC) 

# 查看 GDB 版本
(dis) [root@gpu01 ~]# gdb -v
GNU gdb (GDB) Red Hat Enterprise Linux 10.2-6.el7
Copyright (C) 2021 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
```

