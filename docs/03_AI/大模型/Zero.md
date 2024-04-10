# ZeRO 学习记录


目前训练超大规模语言模型主要有两条技术路线：TPU + XLA + TensorFlow/JAX 和 GPU + PyTorch + Megatron-LM + DeepSpeed。前者由Google主导，由于TPU和自家云平台GCP深度绑定，对于非Googler来说， 只可远观而不可把玩，后者背后则有NVIDIA、Meta、MS大厂加持，社区氛围活跃，也更受到群众欢迎。

上面提到的DeepSpeed的核心是ZeRO(Zero Redundancy Optimizer)，简单来说，它是一种显存优化的数据并行(data parallelism, DP)方案。而“优化“这个话题又永无止境，在过去两年DeepSpeed团队发表了三篇ZeRO相关的论文，提出了去除冗余参数、引入CPU和内存、引入NVMe等方法，从始至终都围绕着一个目标：将显存优化进行到底。

## ZeRO 发展

- [ZeRO](https://www.microsoft.com/en-us/research/blog/zero-deepspeed-new-system-optimizations-enable-training-models-with-over-100-billion-parameters/) 2020年2月，ZeRO通过优化模型和优化器状态的存储以及通信机制，使得可以高效地训练拥有数十亿甚至上百亿参数的模型。
- [ZeRO-2](https://www.microsoft.com/en-us/research/blog/zero-2-deepspeed-shattering-barriers-of-deep-learning-speed-scale/) 2020年5月，ZeRO-2，对优化器状态和梯度分片。
- [ZeRO-offload](https://arxiv.org/abs/2101.06840) 2021年1月，ZeRO-offload利用了内存，降低了对GPU显存的需求（使用的是ZeRO-2级别），可以训练更大的模型。
- [ZeRO3-offload](https://www.deepspeed.ai/2021/03/07/zero3-offload.html) 2021年3月，ZeRO-offload 支持ZeRO-3 级别。
- [ZeRO-Infinty](https://www.microsoft.com/en-us/research/blog/zero-infinity-and-deepspeed-unlocking-unprecedented-model-scale-for-deep-learning-training/) 2021年4月，ZeRO-Infinty利用了内存和SSD，打破 GPU 内存墙以实现超大规模深度学习。
- [ZeRO++](https://www.microsoft.com/en-us/research/blog/deepspeed-zero-a-leap-in-speed-for-llm-and-chat-model-training-with-4x-less-communication/) 2023年6月，做了一些优化，比ZeRO-3训练速度提升了约2倍的加速。
- [ZeRO-offload++](https://github.com/microsoft/DeepSpeed/tree/master/blogs/deepspeed-offloadpp) 2023年11月，在ZeRO3-offload的基础上做了一些优化，能提供6倍的训练速度。



## 显存计算

混合精度训练（mixed precision training）和Adam优化器基本上已经是训练语言模型的标配，我们先来简单回顾下相关概念。

Adam在SGD基础上，为每个参数梯度增加了一阶动量（momentum）和二阶动量（variance）1。

混合精度训练，字如其名，同时存在fp16和fp32两种格式的数值，其中模型参数、模型梯度都是fp16，此外还有fp32的模型参数副本，如果优化器是Adam，则还有fp32的momentum和variance。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-9ESoq4.png)

ZeRO将模型训练阶段，每张卡中显存内容分为两类：

-   模型状态（model states）: 模型参数（fp16）、模型梯度（fp16）和Adam状态（fp32的模型参数备份，fp32的momentum和fp32的variance）。假设模型参数量 $ Φ $ ，则共需要$ 2Φ+2Φ+(4Φ+4Φ+4Φ)=4Φ+12Φ=16Φ $ 字节存储，可以看到，Adam状态占比 $ 75 \% $

-   剩余状态（residual states）: 除了模型状态之外的显存占用，包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）。

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-0767b38b6144986667975d2b99d02bc3.webp)


可以看到模型参数仅占模型训练过程中所有数据的一部分，当进行混合精度运算时，其中模型状态参数(优化器状态 + 梯度+ 模型参数）占到了一大半以上。因此，我们需要想办法去除模型训练过程中的冗余数据。

而优化器相关的并行就是一种去除冗余数据的并行方案，目前这种并行最流行的方法是 ZeRO（即零冗余优化器）。针对模型状态的存储优化（去除冗余），ZeRO使用的方法是分片，即每张卡只存 1/N 的模型状态量，这样系统内只维护一份模型状态。ZeRO有三个不同级别，对模型状态进行不同程度的分片：

- ZeRO-1 : 对优化器状态分片（Optimizer States Sharding）
- ZeRO-2 : 对优化器状态和梯度分片（Optimizer States & Gradients Sharding）
- ZeRO-3 : 对优化器状态、梯度分片以及模型权重参数分片（Optimizer States & Gradients & Parameters Sharding）

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-80LSfL.png)

示例，以全量预训练Atom-7B的模型为例。我们有两台服务器，其中一台有 2 张A100（40GB），另一台为 2 张 V100（32GB）。

Atom-7B的参数量大小为 $ 7 * 10 ^ 9 $ 字节，等于 7GB 或者 6.5 GiB。$ n_d $表示有多少张卡进行分布式训练，在这里等于 $ 4 $。

将 $ \Psi  = 7 $ GB，$ K = 12 $ ，$ N_d = 4 $ 带入上面的公式。

- baseline内存占用： $ (2 + 2 + 12) * 7 = 112 $ GB，每张卡需要 112GB 显存，超出了显卡的显存，无法训练。
- ZeRO-1 内存占用： $ 2*7 + 2*7 + \frac{12*7}{4} = 49 $ GB，每张卡需要 49GB 显存，超出了显卡的显存，无法训练。
- ZeRO-2 内存占用： $ 2*7 + \frac{(2+12)*7}{4} = 38.5 $ GB，每张卡需要 38.5GB 显存，A100能够训练，超出了V100的显存，无法训练。
- ZeRO-3 内存占用： $ \frac{(2+2+12)*7}{4} = 28 $ GB，每张卡需要 28 GB 显存，能够训练。

**注意：这里计算的显存占用只考虑了模型状态，实际上还有剩余状态（包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）），以 ZeRO-3 训练的时候，实际显存大于 28 GB。如果想要在ZeRO-1和ZeRO-2能够训练需要使用offload技术。**


## ZeRO

## ZeRO++

ZeRO++ 是一个构建在 ZeRO 之上的通信优化策略系统，无论规模或跨设备带宽限制如何，都能为大型模型训练提供无与伦比的效率。比 ZeRO-3 训练速度提升了约2倍的加速。[Zero++ Totorials](https://www.deepspeed.ai/tutorials/zeropp/) 提到了使用 Megatron-DeepSpeed 框架， 4 个 16 x V100（32G显存） 节点，每个节点具有 32GB RAM。 训练了18B 大小的GPT-2  模型。

无需更改用户代码。由于 ZeRO++ 扩展了 ZeRO Stage 3 (ZeRO-3)，因此需要添加适当的标志来激活三个 ZeRO++ 中的集合通信。

- zero_quantized_weights：布尔值，指示是否使用量化零权重（qwZ），默认为 false
- zero_hpz_partition_size： hpZ（辅助分区）组中的Rank数，默认为1表示没有hpZ，理想的是每个节点的Rank数（GPU）。
- zero_quantized_gradients: 布尔值，指示是否使用量化零梯度（qgZ），默认为 false。

示例：

```json
{
    "zero_optimization": {
        "stage": 3,
        "reduce_bucket_size": 10000000,
        "reduce_scatter": true,

        # 下面这三个是ZeRO++ 集合通信的配置
        "zero_quantized_weights": true,
        "zero_hpz_partition_size": 16,
        "zero_quantized_gradients": true,

        "contiguous_gradients": true,
        "overlap_comm": true
    }
}
```

## ZeRO-Offload

ZeRO-Offload 是一种 ZeRO 优化，可将优化器内存和计算从 GPU 卸载到主机 CPU。 

ZeRO-Offload 支持在单个 GPU 上高效训练具有多达 130 亿个参数的大型模型。在 DeepSpeed 模型中使用 ZeRO-Offload 只更改 DeepSpeed 配置 json 中的一些配置，无需更改代码。

对于大型模型训练，Adam 等优化器可能会消耗大量 GPU 计算和内存。 ZeRO-Offload 通过利用主机 CPU 上的计算和内存资源来执行优化器，从而降低此类模型的 GPU 计算和内存需求。此外，为了防止优化器成为瓶颈，ZeRO-Offload 使用 DeepSpeed 高度优化的 Adam CPU 实现（称为 DeepSpeedCPUAdam）。 DeepSpeedCPUAdam 比标准 PyTorch 实现快 5 至 7 倍。

在 [ZeRO-Offload 教程](https://www.deepspeed.ai/tutorials/zero-offload/) 中提到可使用单个 V100 (32GB) 显卡上训练 10B 参数的 GPT-2 模型。

Zero-2 offload `zero_optimization` 配置示例：

```json
{
    "zero_optimization": {
        "stage": 2,
        "offload_optimizer": {
            "device": "cpu",
        },
        "contiguous_gradients": true,
        "overlap_comm": true
    }
}
```

上面提到的主要是ZeRO2-offload，ZeRo-3 offload 包含在 ZeRO-Infinity 中。


## ZeRO-Infinty

ZeRO-Infinity 是一种新颖的深度学习 (DL) 训练技术，用于扩展模型训练，从单个 GPU 到具有数千个 GPU 的大型超级计算机。它通过利用系统的全部内存容量，同时利用所有异构内存（GPU、CPU 和非易失性内存 Express 或简称 NVMe），为前所未有的模型大小提供支持。

- 提供在 512 个 NVIDIA V100 Tensor Core GPU（比现有技术大 50 倍）上训练具有超过 30 万亿个参数的模型的系统能力。
- 通过新颖的数据分区和映射，可利用聚合 CPU/NVMe 内存带宽和 CPU 计算，提供卓越的训练效率和超线性吞吐量扩展，在 512 个 NVIDIA V100 GPU 上提供超过 25 petaflops 的持续吞吐量。
- 通过允许使用单个 GPU 的数据科学家微调大于 Open AI GPT-3（1750 亿个参数）的模型，进一步推动 DeepSpeed 团队实现大型模型训练民主化的使命。
- 通过使大型模型训练变得更简单、更容易，消除进入障碍 - ZeRO-Infinity 可扩展到超过万亿个参数，无需组合多种并行技术的复杂性，也无需更改用户代码。据我们所知，这是唯一能够做到这一点的并行技术。


## ZeRO-Offload++

ZeRO-Offload++， 通过协作 CPU/GPU 双流将训练吞吐量提高 6 倍。借助 Twin-Flow，ZeRO-Offload++ 与 ZeRO-Offload 相比可实现高达 6 倍的训练加速。

[DeepSpeed ZeRO-Offload++: 6x Higher Training Throughput via Collaborative CPU/GPU Twin-Flow](https://github.com/microsoft/DeepSpeed/tree/master/blogs/deepspeed-offloadpp) 提到对 A100 和 H100 DGX 机器进行性能评估，并使用 13B 和 30B 参数测试 OPT 模型。在8台A100 DGX机器上运行13B OPT模型训练，并使用8台H100 DGX机器运行OPT-30B模型训练。通过对 ZeRO-Offload++ 中的卸载率进行一些调整，在单个 DGX-H100-80GB 和 DGX-A100-40GB 上分别实现了 Meta OPT 模型 6 倍和 3 倍的训练加速。




## 参考连接

- [ZeRO](https://www.microsoft.com/en-us/research/blog/zero-deepspeed-new-system-optimizations-enable-training-models-with-over-100-billion-parameters/) 
- [ZeRO-2](https://www.microsoft.com/en-us/research/blog/zero-2-deepspeed-shattering-barriers-of-deep-learning-speed-scale/) 
- [ZeRO-offload](https://arxiv.org/abs/2101.06840) 
- [ZeRO3-offload](https://www.deepspeed.ai/2021/03/07/zero3-offload.html) 
- [ZrRO-Infinty](https://www.microsoft.com/en-us/research/blog/zero-infinity-and-deepspeed-unlocking-unprecedented-model-scale-for-deep-learning-training/) 
- [ZrRO++](https://www.microsoft.com/en-us/research/blog/deepspeed-zero-a-leap-in-speed-for-llm-and-chat-model-training-with-4x-less-communication/) 
- [ZeRO-offload++](https://github.com/microsoft/DeepSpeed/tree/master/blogs/deepspeed-offloadpp)
- [Zero论文](https://arxiv.org/abs/1910.02054)
- [ZeRO Infinity 论文](https://arxiv.org/abs/2104.07857)
- [DeepSpeed ZeRO Totorials](https://www.deepspeed.ai/tutorials/zero/)
- [DeepSpeed之ZeRO系列：将显存优化进行到底](https://basicv8vc.github.io/posts/zero/)
