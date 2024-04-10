# 全量训练 ATOM-7B 记录

 编译 deepspeed fuse_adam失败，升级到GCC 11.2 之后安装 deepspeed:

```bash
# 只编译 fuse_adam
DS_BUILD_FUSED_ADAM=1  pip install deepspeed 
# 编译 DS_BUILD_CPU_ADAM 
DS_BUILD_CPU_ADAM=1 pip install deepspeed
# 编译所有 模块
DS_BUILD_OPS=1  pip install deepspeed

# 加速构建
DS_BUILD_OPS=1 pip install deepspeed --global-option="build_ext" --global-option="-j96"

# 编译 fuse_adam cpu_adam
DS_BUILD_FUSED_ADAM=1   DS_BUILD_CPU_ADAM=1 pip install deepspeed  --global-option="build_ext" --global-option="-j96"
```

提示 CUDA 11.4 支持的GCC 版本必须大于等于 6.0 小于 11.0。

将GCC切换成 GCC 8

```bash
sudo yum install -y devtoolset-8-toolchain
scl enable devtoolset-8 bash
```

然后接着执行：

```bash
DS_BUILD_FUSED_ADAM=1 pip install deepspeed
```

执行成功之后使用

```bash
ds_report
```

查看结果，fused_adam installed 显示为 YES 说明安装成功：

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_170557742975.png)

然后执行

```bash
bash bash pretrain.sh
```

提示`No module named 'torchdata'`,

使用 pip 安装：

```
pip install torchdata
```

再次执行：

```bash
bash bash pretrain.sh
```

报错：

```
Traceback (most recent call last):
  File "/data/litao/workspace/Llama2-Chinese-main/train/pretrain/pretrain_clm.py", line 612, in <module>
    main()
  File "/data/litao/workspace/Llama2-Chinese-main/train/pretrain/pretrain_clm.py", line 235, in main
    model_args, data_args, training_args = parser.parse_args_into_dataclasses()
  File "/root/anaconda3/envs/dis/lib/python3.10/site-packages/transformers/hf_argparser.py", line 338, in parse_args_into_dataclasses
    obj = dtype(**inputs)
  File "<string>", line 112, in __init__
  File "/root/anaconda3/envs/dis/lib/python3.10/site-packages/transformers/training_args.py", line 1329, in __post_init__
    raise ValueError(
ValueError: Your setup doesn't support bf16/gpu. You need torch>=1.10, using Ampere GPU with cuda>=11.0
Traceback (most recent call last):
  File "/data/litao/workspace/Llama2-Chinese-main/train/pretrain/pretrain_clm.py", line 612, in <module>
    main()
  File "/data/litao/workspace/Llama2-Chinese-main/train/pretrain/pretrain_clm.py", line 235, in main
    model_args, data_args, training_args = parser.parse_args_into_dataclasses()
  File "/root/anaconda3/envs/dis/lib/python3.10/site-packages/transformers/hf_argparser.py", line 338, in parse_args_into_dataclasses
    obj = dtype(**inputs)
  File "<string>", line 112, in __init__
  File "/root/anaconda3/envs/dis/lib/python3.10/site-packages/transformers/training_args.py", line 1329, in __post_init__
    raise ValueError(
ValueError: Your setup doesn't support bf16/gpu. You need torch>=1.10, using Ampere GPU with cuda>=11.0

```

这个报错是v100不支持bf16, 将训练精度设置成float16就不报这个错了。

然后两张A100和两张v100都报CUDA OOM的错误。

所有尝试多机多卡 

新建一个hostfile.txt，内容格式如下：前面是服务器的IP地址，slots表示服务器上的显卡数量。

```
1.1.1.1 slots=2
2.2.2.2 slots=2
```

然后在启动命令加上 `--hostfile=hostfile.txt`。

例如：

```bash
deepspeed --hostfile=hostfile.txt pretrain_clm.py \
    --model_name_or_path /data/other_projects/Atom-7B \
   其他参数.......
```

然后在主节点上执行，提示无法通过ssh连接主节点，需要在主节点上对自己ssh免密。

报错`RuntimeError: launcher 'pdsh' not installed.`

在两台服务器都需要安装`pdsh`

```bash
yum install -y pdsh
```

在其中一台服务器中安装pdsh报错` No matches found for: pdsh`

需要添加阿里云的`epel.repo`到 `/etc/yum.repos.d`目录，内容如下：

```
[epel]
name=Extra Packages for Enterprise Linux 7 - $basearch
baseurl=http://mirrors.aliyun.com/epel/7/$basearch
failovermethod=priority
enabled=1
gpgcheck=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7
 
[epel-debuginfo]
name=Extra Packages for Enterprise Linux 7 - $basearch - Debug
baseurl=http://mirrors.aliyun.com/epel/7/$basearch/debug
failovermethod=priority
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7
gpgcheck=0
 
[epel-source]
name=Extra Packages for Enterprise Linux 7 - $basearch - Source
baseurl=http://mirrors.aliyun.com/epel/7/SRPMS
failovermethod=priority
enabled=0
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7
gpgcheck=0

```

然后执行

```bash
yum update -y
yum makecache
yum install pdsh -y
```

然后提示第二台服务器找不到Python和模型，所有需要两台服务器上的conda路径和项目和模型都必须是同一个路径。

然后执行报错：

```
================================================ERROR=====================================
CUDA SETUP: CUDA detection failed! Possible reasons:
1. CUDA driver not installed
2. CUDA not installed
3. You have multiple conflicting CUDA libraries
4. Required library not pre-compiled for this bitsandbytes release!
CUDA SETUP: If you compiled from source, try again with `make CUDA_VERSION=DETECTED_CUDA_VERSION` for example, `make CUDA_VERSION=113`.
CUDA SETUP: The CUDA version for the compile might depend on your conda install. Inspect CUDA version via `conda list | grep cuda`.
================================================================================

CUDA SETUP: Something unexpected happened. Please compile from source:
git clone git@github.com:TimDettmers/bitsandbytes.git
cd bitsandbytes
CUDA_VERSION=114 make cuda11x
python setup.py install
CUDA SETUP: Setup Failed!
Traceback (most recent call last):
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 187, in _run_module_as_main
    mod_name, mod_spec, code = _get_module_details(mod_name, _Error)
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 146, in _get_module_details
    return _get_module_details(pkg_main_name, error)
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 110, in _get_module_details
    __import__(pkg_name)
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/__init__.py", line 6, in <module>
    from . import cuda_setup, utils, research
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/__init__.py", line 1, in <module>
    from . import nn
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/nn/__init__.py", line 1, in <module>
    from .modules import LinearFP8Mixed, LinearFP8Global
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/nn/modules.py", line 8, in <module>
    from bitsandbytes.optim import GlobalOptimManager
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/optim/__init__.py", line 6, in <module>
    from bitsandbytes.cextension import COMPILED_WITH_CUDA
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cextension.py", line 20, in <module>
    raise RuntimeError('''
RuntimeError: 
        CUDA Setup failed despite GPU being available. Please run the following command to get more information:

        python -m bitsandbytes

        Inspect the output of the command and see if you can locate CUDA libraries. You might need to add them
        to your LD_LIBRARY_PATH. If you suspect a bug, please take the information from python -m bitsandbytes
        and open an issue at: https://github.com/TimDettmers/bitsandbytes/issues

```

需要更新一下`bitsandbytes`到最新版本，之前是`0.39.0`，更新后是`bitsandbytes-0.42.0`：

```
pip install -U bitsandbytes
```

然后执行：

```bash
python -m bitsandbytes
```

如果报错

```
False

===================================BUG REPORT===================================
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: Welcome to bitsandbytes. For bug reports, please run

python -m bitsandbytes


  warn(msg)
================================================================================
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: /root/miniconda3/envs/dis did not contain ['libcudart.so', 'libcudart.so.11.0', 'libcudart.so.12.0'] as expected! Searching further paths...
  warn(msg)
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: Found duplicate ['libcudart.so', 'libcudart.so.11.0', 'libcudart.so.12.0'] files: {PosixPath('/usr/local/cuda-11.4/lib64/libcudart.so'), PosixPath('/usr/local/cuda-11.4/lib64/libcudart.so.11.0')}.. We select the PyTorch default libcudart.so, which is {torch.version.cuda},but this might missmatch with the CUDA version that is needed for bitsandbytes.To override this behavior set the BNB_CUDA_VERSION=<version string, e.g. 122> environmental variableFor example, if you want to use the CUDA version 122BNB_CUDA_VERSION=122 python ...OR set the environmental variable in your .bashrc: export BNB_CUDA_VERSION=122In the case of a manual override, make sure you set the LD_LIBRARY_PATH, e.g.export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda-11.2
  warn(msg)
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: /usr/local/cuda-11.4/lib64 did not contain ['libcudart.so', 'libcudart.so.11.0', 'libcudart.so.12.0'] as expected! Searching further paths...
  warn(msg)
The following directories listed in your path were found to be non-existent: {PosixPath('/opt/rh/devtoolset-7/root/usr/share/perl5/vendor_perl'), PosixPath('/opt/rh/devtoolset-7/root/usr/lib/perl5')}
The following directories listed in your path were found to be non-existent: {PosixPath("/bin/scl enable devtoolset-8  'scl' 'enable' 'devtoolset-7' 'bash'")}
The following directories listed in your path were found to be non-existent: {PosixPath('/opt/rh/devtoolset-7/root/usr/lib/python2.7/site-packages'), PosixPath('/opt/rh/devtoolset-7/root/usr/lib64/python2.7/site-packages')}
The following directories listed in your path were found to be non-existent: {PosixPath('/opt/rh/devtoolset-8/root/usr/lib64/pkgconfig')}
CUDA_SETUP: WARNING! libcudart.so not found in any environmental path. Searching in backup paths...
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: Found duplicate ['libcudart.so', 'libcudart.so.11.0', 'libcudart.so.12.0'] files: {PosixPath('/usr/local/cuda/lib64/libcudart.so'), PosixPath('/usr/local/cuda/lib64/libcudart.so.11.0')}.. We select the PyTorch default libcudart.so, which is {torch.version.cuda},but this might missmatch with the CUDA version that is needed for bitsandbytes.To override this behavior set the BNB_CUDA_VERSION=<version string, e.g. 122> environmental variableFor example, if you want to use the CUDA version 122BNB_CUDA_VERSION=122 python ...OR set the environmental variable in your .bashrc: export BNB_CUDA_VERSION=122In the case of a manual override, make sure you set the LD_LIBRARY_PATH, e.g.export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/cuda-11.2
  warn(msg)
DEBUG: Possible options found for libcudart.so: {PosixPath('/usr/local/cuda/lib64/libcudart.so'), PosixPath('/usr/local/cuda/lib64/libcudart.so.11.0')}
CUDA SETUP: PyTorch settings found: CUDA_VERSION=117, Highest Compute Capability: 7.0.
CUDA SETUP: To manually override the PyTorch CUDA version please see:https://github.com/TimDettmers/bitsandbytes/blob/main/how_to_use_nonpytorch_cuda.md
/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cuda_setup/main.py:167: UserWarning: WARNING: Compute capability < 7.5 detected! Only slow 8-bit matmul is supported for your GPU!                     If you run into issues with 8-bit matmul, you can try 4-bit quantization: https://huggingface.co/blog/4bit-transformers-bitsandbytes
  warn(msg)
CUDA SETUP: Loading binary /root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/libbitsandbytes_cuda117_nocublaslt.so...
/lib64/libstdc++.so.6: version `CXXABI_1.3.9' not found (required by /root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/libbitsandbytes_cuda117_nocublaslt.so)
CUDA SETUP: Something unexpected happened. Please compile from source:
git clone https://github.com/TimDettmers/bitsandbytes.git
cd bitsandbytes
CUDA_VERSION=117 make cuda11x_nomatmul
python setup.py install
Traceback (most recent call last):
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 187, in _run_module_as_main
    mod_name, mod_spec, code = _get_module_details(mod_name, _Error)
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 146, in _get_module_details
    return _get_module_details(pkg_main_name, error)
  File "/root/miniconda3/envs/dis/lib/python3.10/runpy.py", line 110, in _get_module_details
    __import__(pkg_name)
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/__init__.py", line 6, in <module>
    from . import cuda_setup, utils, research
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/__init__.py", line 1, in <module>
    from . import nn
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/nn/__init__.py", line 1, in <module>
    from .modules import LinearFP8Mixed, LinearFP8Global
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/research/nn/modules.py", line 8, in <module>
    from bitsandbytes.optim import GlobalOptimManager
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/optim/__init__.py", line 6, in <module>
    from bitsandbytes.cextension import COMPILED_WITH_CUDA
  File "/root/miniconda3/envs/dis/lib/python3.10/site-packages/bitsandbytes/cextension.py", line 20, in <module>
    raise RuntimeError('''
RuntimeError: 
        CUDA Setup failed despite GPU being available. Please run the following command to get more information:

        python -m bitsandbytes

        Inspect the output of the command and see if you can locate CUDA libraries. You might need to add them
        to your LD_LIBRARY_PATH. If you suspect a bug, please take the information from python -m bitsandbytes
        and open an issue at: https://github.com/TimDettmers/bitsandbytes/issues

```

需要将`/root/miniconda3/lib`加入到`LD_LIBRARY_PATH`中：

在`.bashrc`中设置环境变量：

```bash
export PATH=/usr/local/cuda-11.4/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda-11.4/lib64:/root/miniconda3/lib
export CUDA_HOME=/usr/local/cuda-11.4
```



出现`SUCCESS`就可以了。

![image-20240119075717464](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240119075717464.png)



单机多卡 v100和单机多卡A100都失败了，都报错 CUDA OOM。

最终使用多机多卡+`Zero 3`才运行生成。使用A100 * 2和V100 *2 才运行成功。

首先添加一个`hostfile`:

```text
10.113.75.134 slots=2
10.168.144.5 slots=2
```

然后在`pretrain.sh`中添加`hostfile`参数.内容如下：

```bash
output_model=/data/other_projects/Llama2-Chinese-main/train/pretrain/output_model
if [ ! -d ${output_model} ];then  
    mkdir ${output_model}
fi
cp ./pretrain.sh ${output_model}
cp ./ds_config_zero*.json ${output_model}

deepspeed --hostfile=hostfile.txt pretrain_clm.py \
    --model_name_or_path /data/other_projects/Atom-7B \
    --train_files ../../data/train_sft.csv \
    --validation_files  ../../data/dev_sft.csv \
                         ../../data/dev_sft_sharegpt.csv \
    --per_device_train_batch_size 1 \
    --per_device_eval_batch_size 1 \
    --do_train \
    --output_dir ${output_model} \
    --evaluation_strategy  steps \
    --use_fast_tokenizer false \
    --max_eval_samples 500 \
    --learning_rate 3e-5 \
    --gradient_accumulation_steps 4 \
    --num_train_epochs 3 \
    --warmup_steps 10000 \
    --logging_dir ${output_model}/logs \
    --logging_strategy steps \
    --logging_steps 2 \
    --save_strategy steps \
    --preprocessing_num_workers 10 \
    --save_steps 500 \
    --eval_steps 500 \
    --save_total_limit 2000 \
    --seed 42 \
    --disable_tqdm false \
    --ddp_find_unused_parameters false \
    --block_size 4096 \
    --overwrite_output_dir \
    --report_to tensorboard \
    --run_name ${output_model} \
    --torch_dtype float16 \
    --gradient_checkpointing \
    --deepspeed ./ds_config_zero3.json \
    --ignore_data_skip true \
    --ddp_timeout 18000000 \
    | tee -a ${output_model}/train.log
    
    # --resume_from_checkpoint ${output_model}/checkpoint-20400 \

```







