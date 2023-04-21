
# Miniconda
Miniconda是conda的免费最小安装程序。

它是Anaconda的一个小型引导版本，仅包括conda、Python、它们依赖的软件包以及一些其他有用的软件包，包括pip、zlib和少量其他软件包。

使用conda install命令从Anaconda存储库安装720多个额外的conda软件包。


官网地址: [https://docs.conda.io/en/main/miniconda.html](https://docs.conda.io/en/main/miniconda.html)

## 安装miniconda

下载安装脚本
```bash
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
```

执行安装脚本
```bash 
bash Miniconda3-latest-Linux-x86_64.sh
```

## 创建虚拟环境

创建虚拟环境, 下面的命令会创建一个名为docs的虚拟环境, 并且安装python3.11
```bash
conda create -n docs python=3.11
```

切换到虚拟环境, 下面的命令会切换到docs虚拟环境
```bash
conda activate docs
``` 
