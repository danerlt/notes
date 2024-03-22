# ZeRO 学习记录


目前训练超大规模语言模型主要有两条技术路线：TPU + XLA + TensorFlow/JAX 和 GPU + PyTorch + Megatron-LM + DeepSpeed。前者由Google主导，由于TPU和自家云平台GCP深度绑定，对于非Googler来说， 只可远观而不可把玩，后者背后则有NVIDIA、Meta、MS大厂加持，社区氛围活跃，也更受到群众欢迎。

上面提到的DeepSpeed的核心是ZeRO(Zero Redundancy Optimizer)，简单来说，它是一种显存优化的数据并行(data parallelism, DP)方案。而“优化“这个话题又永无止境，在过去两年DeepSpeed团队发表了三篇ZeRO相关的论文，提出了去除冗余参数、引入CPU和内存、引入NVMe等方法，从始至终都围绕着一个目标：将显存优化进行到底。

## ZeRO 发展

- [ZeRO](https://www.microsoft.com/en-us/research/blog/zero-deepspeed-new-system-optimizations-enable-training-models-with-over-100-billion-parameters/) 2020年2月
- [ZeRO-2](https://www.microsoft.com/en-us/research/blog/zero-2-deepspeed-shattering-barriers-of-deep-learning-speed-scale/) 2020年5月
- [ZeRO-offload](https://arxiv.org/abs/2101.06840) 2021年1月
- [ZeRO3-offload](https://www.deepspeed.ai/2021/03/07/zero3-offload.html) 2021年3月
- [ZrRO-Infinty](https://www.microsoft.com/en-us/research/blog/zero-infinity-and-deepspeed-unlocking-unprecedented-model-scale-for-deep-learning-training/) 2021年4月
- [ZrRO++](https://www.microsoft.com/en-us/research/blog/deepspeed-zero-a-leap-in-speed-for-llm-and-chat-model-training-with-4x-less-communication/) 2023年6月
- [ZeRO-offload++](https://github.com/microsoft/DeepSpeed/tree/master/blogs/deepspeed-offloadpp) 2023年11月



## 显存计算

混合精度训练（mixed precision training）和Adam优化器基本上已经是训练语言模型的标配，我们先来简单回顾下相关概念。

Adam在SGD基础上，为每个参数梯度增加了一阶动量（momentum）和二阶动量（variance）1。

混合精度训练，字如其名，同时存在fp16和fp32两种格式的数值，其中模型参数、模型梯度都是fp16，此外还有fp32的模型参数，如果优化器是Adam，则还有fp32的momentum和variance。

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

Atom-7B的参数量大小为 $ 7 * 10 ^ 9 $ 字节，等于 7GB 或者 6.5 GiB。$n_d$表示有多少张卡进行分布式训练，在这里等于 $4$。

将 $ Φ = 7 GB$ ，$ k = 12$，$n_d=4$ 带入上面的公式，。

-   Baseline内存占用： $ (2 + 2 + 12) * 7 = 112 $ GB，每张卡需要 112GB 显存，超出了显卡的显存，无法训练。
-   ZeRO-1 内存占用： $ 2*7 + 2*7 + \frac{12*7}{4} = 49 $ GB，每张卡需要 49GB 显存，超出了显卡的显存，无法训练。
-   ZeRO-2 内存占用： $ 2*7 + \frac{(2+12)*7}{4} = 38.5 $ GB，每张卡需要 38.5GB 显存，A100能够训练，超出了V100的显存，无法训练。
-   ZeRO-3 内存占用： $ \frac{(2+2+12)*7}{4} = 28 $ GB，每张卡需要 28 GB 显存，能够训练。

**注意：这里计算的显存占用只考虑了模型状态，实际上还有剩余状态（包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）），以 ZeRO-3 训练的时候，实际显存大于 28 GB。如果想要在ZeRO-1和ZeRO-2能够训练需要使用offload技术。**



## ZeRO-Offload

TODO

## ZeRO-Infinty

TODO

## ZeRO-Offload++

TODO 



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
