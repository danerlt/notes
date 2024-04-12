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

## 存储消耗

在大模型训练的过程中，GPU都需要存什么内容。

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-fcc24ce92b951ca8515114204cfa59cf_720w.webp)

**Model States**指和模型本身息息相关的，必须存储的内容，具体包括：

-   **optimizer states**：优化器状态，在大语言模型中一般使用的是Adam优化器。Adam优化算法中的momentum和variance。
-   **gradients**：模型梯度
-   **parameters**：模型参数W

**Residual States**指并非模型必须的，但在训练过程中会额外产生的内容，具体包括：

-   **activation**：激活值。在流水线并行中我们曾详细介绍过。在backward过程中使用[链式法则](https://www.zhihu.com/search?q=链式法则&search_source=Entity&hybrid_search_source=Entity&hybrid_search_extra={"sourceType"%3A"answer"%2C"sourceId"%3A2964829128})计算梯度时会用到。有了它算梯度会更快，但它不是必须存储的，因为可以通过重新做Forward来算它。
-   **temporary buffers:** 临时存储。例如把梯度发送到某块GPU上做加总聚合时产生的存储。
-   **unusable fragment memory**：碎片化的存储空间。虽然总存储空间是够的，但是如果取不到连续的存储空间，相关的请求也会被fail掉。对这类空间浪费可以通过内存整理来解决。



## 混合精度训练

增加神经网络的大小通常会提高准确性，但也会增加训练模型的内存和计算要求。[Mixed Precision Training](https://arxiv.org/abs/1710.03740) 介绍了使用半精度浮点数（通常是FP16）训练深度神经网络的方法，而不会损失模型精度或不必修改超参数。这几乎使内存需求减半，并且在最新的 GPU 上，还可以加快运算速度。

较大的模型通常需要更多的计算和内存资源来训练。通过使用降低精度的表示和算术可以降低这些要求。任何程序（包括神经网络训练和推理）的性能（速度）都受到以下三个因素之一的限制：

-   算术带宽
-   内存带宽
-   延迟。

降低精度解决了其中两个限制因素。通过使用更少的位来存储相同数量的值，可以降低内存带宽压力。降低精度之后进行数学运算，算术时间也可以缩短。例如，最新 GPU 中的半精度数学吞吐量比单精度高 2 倍到 8 倍。除了速度提高之外，降低精度的格式还可以减少训练所需的内存量。

IEEE标准中的FP16格式如下：

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-ac598aff6b1ef947ab7c72b6ced10c87_720w.webp)

由于 FP16 格式的动态范围比 FP32 窄，因此混合精度训练引入了三种技术来防止模型精度损失：

-   在 FP32 中维护权重的主副本（maintaining a master copy of weights in FP32,）
-   最小化梯度值变为零时损失缩放（loss-scaling that minimizes gradient values becoming zero）
-   采用FP16算术进行计算但以FP32进行累加（FP16 arithmetic with accumulation in FP32）

混合精度训练，字如其名，同时存在fp16和fp32两种格式的数值，其中模型参数、模型梯度都是fp16，此外还有fp32的模型参数副本。



![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-9ESoq4.png)

混合精度训练（mixed precision training）和Adam优化器基本上已经是训练大语言模型的标配。

Adam在SGD基础上，为每个参数梯度增加了一阶动量（momentum）和二阶动量（variance）。

如果优化器是Adam，则还有fp32的momentum和variance。

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-72f68c3cd3e0dd87c2afb1e14b3f6587_720w.webp)

-   存储一份fp32的parameter，momentum和variance（统称model states）

-   在forward开始之前，额外开辟一块存储空间，将fp32 parameter减半到fp16 parameter。

-   正常做forward和backward，在此之间产生的activation和gradients，都用fp16进行存储。

-   用fp16 gradients去更新fp32下的model states。

-   当模型收敛后，fp32的parameter就是最终的参数输出。

## 显存计算

现在，我们可以来计算模型在训练时需要的存储大小了，假设模型的参数W大小是 $\Phi$  ，**以byte为单位**，存储如下：

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-2fa670488fcc2408bd27bdcfec283d33_720w.webp)


因为采用了Adam优化，所以才会出现momentum和variance，当然你也可以选择别的优化办法。因此这里为了更通用些，记模型必存的数据大小为 $ \Phi $ 。因此最终内存开销为： 
$$
2\Phi + 2\Phi + K\Phi
$$
另外，**这里暂不将activation纳入统计范围**，原因是：

-   activation不仅与模型参数相关，还与batch size相关
-   activation的存储不是必须的。存储activation只是为了在用链式法则做backward的过程中，计算梯度更快一些。但你永远可以通过只保留最初的输入X，重新做forward来得到每一层的activation（虽然实际中并不会这么极端）。
-   因为activation的这种灵活性，纳入它后不方便衡量系统性能随模型增大的真实变动情况。因此在这里不考虑它，在后面会单开一块说明对activation的优化。

## ZeRO 介绍

GPU分布图如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-0767b38b6144986667975d2b99d02bc3.webp)

显存内容分为两类：

-   模型状态（model states）: 模型参数（fp16）、模型梯度（fp16）和优化器状态（fp32的模型参数备份，fp32的momentum和fp32的variance）。假设模型参数量 $ Φ $ ，则共需要$ 2Φ+2Φ+(4Φ+4Φ+4Φ)=4Φ+12Φ=16Φ $ 字节存储，可以看到，Adam状态占比 $ 75 \% $
-   剩余状态（residual states）: 除了模型状态之外的显存占用，包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）。


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

**注意：这里计算的显存占用只考虑了模型状态，实际上还有剩余状态（包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）），以 ZeRO-3 训练的时候，实际显存会大于 28 GB，训练可能会报OOM的错误。如果想要在ZeRO-1和ZeRO-2能够训练需要使用offload技术。**

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
- [如何评价微软开源的分布式训练框架deepspeed？ - 猛猿的回答](https://www.zhihu.com/question/371094177/answer/2964829128)
