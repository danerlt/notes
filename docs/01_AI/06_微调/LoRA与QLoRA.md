# LoRA 与 QLoRA

## LoRA 原理

LoRA（Low-Rank Adaptation of Large Language Models）是由微软在 2021 年提出的参数高效微调方法。它的核心思想来源于一个观察：**预训练语言模型的权重更新矩阵在下游任务适配时具有低内在秩（low intrinsic rank）**。

### 为什么权重更新是低秩的？

预训练大模型已经学习了大量通用知识，微调时只需要对模型进行"小幅修正"，而不需要完全重新学习。这种"小幅修正"可以用一个低秩矩阵来近似表示，而不需要存储完整的高维矩阵。

---

## LoRA 数学推导

### 基本公式

对于预训练模型中的一个权重矩阵 `W₀ ∈ ℝ^(d×k)`，全量微调会直接更新它：

```
W = W₀ + ΔW
```

LoRA 的核心思想是用低秩分解来近似 `ΔW`：

```
ΔW = B × A

其中：
  A ∈ ℝ^(r×k)   （down-projection，随机高斯初始化）
  B ∈ ℝ^(d×r)   （up-projection，零初始化）
  r << min(d, k)  （rank 远小于原矩阵的维度）
```

因此，前向传播变为：

```
h = W₀x + ΔWx = W₀x + BAx = W₀x + (α/r) × BAx
```

其中 `α` 是缩放超参数（lora_alpha），`α/r` 是 scaling factor。

### 为什么 B 初始化为零？

训练开始时 `ΔW = B × A = 0`，确保 LoRA 在初始阶段与原始模型行为完全一致，不会破坏预训练权重。随着训练的进行，B 逐渐学习到有意义的值。

### 参数量对比

假设一个权重矩阵 `W ∈ ℝ^(4096×4096)`（典型的 7B 模型中的注意力矩阵）：

- 全量微调参数量：4096 × 4096 = **16,777,216**
- LoRA (r=16) 参数量：4096×16 + 16×4096 = **131,072**（约为全量的 0.78%）

```python
def lora_param_count(d: int, k: int, r: int) -> dict:
    """计算 LoRA 的参数量和压缩比"""
    full_params = d * k
    lora_params = r * k + d * r  # A + B
    ratio = lora_params / full_params
    return {
        "full_params": full_params,
        "lora_params": lora_params,
        "compression_ratio": f"{ratio:.2%}",
    }

# 7B 模型典型注意力层
result = lora_param_count(d=4096, k=4096, r=16)
print(result)
# {'full_params': 16777216, 'lora_params': 131072, 'compression_ratio': '0.78%'}
```

---

## 关键参数详解

### rank（r）

LoRA 矩阵的秩，控制可训练参数的数量。

| rank 值 | 可训练参数 | 适用场景 |
|---------|-----------|---------|
| 4 | 极少 | 资源极度受限，简单任务 |
| 8 | 少 | 大多数任务的起点 |
| 16 | 中等 | 推荐默认值，效果与全量接近 |
| 32 | 较多 | 复杂任务，需要更强表达能力 |
| 64+ | 多 | 接近全量微调，但收益递减明显 |

### lora_alpha（α）

缩放因子，控制 LoRA 更新对原始权重的影响程度。实际缩放比例为 `α/r`。

常见设置：
- `alpha = r`：scaling = 1，更新幅度正常
- `alpha = 2r`：scaling = 2，更新幅度加倍（最常见）
- `alpha = r/2`：scaling = 0.5，更新幅度减半

```python
# 推荐初始设置：alpha = 2 × r
# 例如 r=16, alpha=32
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,   # alpha/r = 2，等效于 lr × 2
    ...
)
```

### target_modules

指定对哪些层应用 LoRA。

```python
# 保守设置：只对注意力的 Q、V 矩阵应用（原论文设置）
target_modules_minimal = ["q_proj", "v_proj"]

# 推荐设置：对所有注意力矩阵应用
target_modules_attention = ["q_proj", "k_proj", "v_proj", "o_proj"]

# 激进设置：同时对 MLP 层应用（效果最好，参数量增加）
target_modules_full = [
    "q_proj", "k_proj", "v_proj", "o_proj",  # 注意力层
    "gate_proj", "up_proj", "down_proj",       # MLP 层（LLaMA 架构）
]

# 查看模型的所有线性层（用于确定 target_modules）
def get_linear_layer_names(model) -> list[str]:
    """获取模型中所有线性层的名称"""
    import re
    from torch import nn
    lora_module_names = set()
    for name, module in model.named_modules():
        if isinstance(module, nn.Linear):
            # 取最后一部分名称
            names = name.split(".")
            lora_module_names.add(names[-1])
    return list(lora_module_names)
```

---

## QLoRA 原理

QLoRA（Quantized Low-Rank Adaptation）由华盛顿大学在 2023 年提出，在 LoRA 的基础上引入了 **4-bit 量化**，使得在单张消费级 GPU（如 RTX 3090）上微调 65B 参数模型成为可能。

### QLoRA 的三大核心技术

#### 1. 4-bit NormalFloat（NF4）量化

NF4 是专为正态分布权重设计的数据类型。神经网络权重通常服从正态分布，NF4 通过将量化级别均匀分布在正态分布的分位点上，比标准 INT4 量化精度更高。

```
标准 INT4：将值域 [-1, 1] 均匀分为 16 个区间
NF4：将值域按正态分布分位数分为 16 个区间
     → 更多量化精度集中在高概率区域
```

#### 2. 双重量化（Double Quantization）

不仅量化模型权重，还对量化常数（缩放因子）本身再次量化，进一步节省显存。

```
普通量化：权重使用 4-bit，量化常数使用 32-bit（fp32）
双重量化：权重使用 4-bit，量化常数再次量化为 8-bit（int8）
节省：每个参数平均再节省 0.37 bit 的存储空间
```

#### 3. 分页优化器（Paged Optimizers）

利用 NVIDIA 统一内存机制，当 GPU 显存不足时自动将优化器状态卸载到 CPU 内存，避免 OOM 崩溃。

### QLoRA 显存计算

```python
def estimate_qlora_memory(model_size_b: float, r: int = 16) -> dict:
    """
    估算 QLoRA 训练所需显存

    Args:
        model_size_b: 模型参数量（十亿，如 7.0 表示 7B）
        r: LoRA rank

    Returns:
        各部分显存占用估算（GB）
    """
    # 4-bit 量化后的模型权重（约 0.5 字节/参数）
    model_memory_gb = model_size_b * 1e9 * 0.5 / 1024**3

    # LoRA 适配器权重（fp16，约 0.5% 参数量）
    lora_param_ratio = 0.005  # 约 0.5%
    lora_memory_gb = model_size_b * 1e9 * lora_param_ratio * 2 / 1024**3

    # 优化器状态（AdamW：每个可训练参数 × 8 字节，用于 m 和 v）
    optimizer_memory_gb = model_size_b * 1e9 * lora_param_ratio * 8 / 1024**3

    # 激活值（取决于 batch_size 和 seq_length，粗略估算）
    activation_memory_gb = 2.0  # 粗略估算，batch_size=4, seq_len=512

    total = model_memory_gb + lora_memory_gb + optimizer_memory_gb + activation_memory_gb

    return {
        "模型权重 (4-bit)": f"{model_memory_gb:.1f} GB",
        "LoRA 适配器": f"{lora_memory_gb:.1f} GB",
        "优化器状态": f"{optimizer_memory_gb:.1f} GB",
        "激活值（估算）": f"{activation_memory_gb:.1f} GB",
        "总计": f"{total:.1f} GB",
    }

# 7B 模型 QLoRA 显存需求
for size, name in [(7, "7B"), (13, "13B"), (70, "70B")]:
    print(f"\n=== {name} 模型 QLoRA ===")
    for k, v in estimate_qlora_memory(size).items():
        print(f"  {k}: {v}")
```

---

## 使用 bitsandbytes 实现 QLoRA

```python
import torch
from transformers import BitsAndBytesConfig, AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType

# ─────────────────────────────────────────
# 1. 配置 4-bit 量化
# ─────────────────────────────────────────
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,                         # 启用 4-bit 量化
    bnb_4bit_quant_type="nf4",                 # 使用 NF4 数据类型
    bnb_4bit_compute_dtype=torch.bfloat16,     # 计算时使用 bf16（精度与速度平衡）
    bnb_4bit_use_double_quant=True,            # 启用双重量化，进一步节省显存
)

# ─────────────────────────────────────────
# 2. 加载量化模型
# ─────────────────────────────────────────
model_name = "Qwen/Qwen2.5-7B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

# ─────────────────────────────────────────
# 3. 为 k-bit 训练做准备（关键步骤）
# ─────────────────────────────────────────
# prepare_model_for_kbit_training 做了三件事：
#   1. 将 LayerNorm 和 embedding 层转换为 fp32（提升训练稳定性）
#   2. 冻结非 LoRA 参数（仅训练 LoRA 适配器）
#   3. 开启 gradient checkpointing
model = prepare_model_for_kbit_training(
    model,
    use_gradient_checkpointing=True,
)

# ─────────────────────────────────────────
# 4. 添加 LoRA 适配器
# ─────────────────────────────────────────
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    bias="none",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
```

---

## 完整 QLoRA 训练示例

```python
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import (
    LoraConfig,
    TaskType,
    get_peft_model,
    prepare_model_for_kbit_training,
)
from trl import SFTTrainer

# ─────────────────────────────────────────
# 配置
# ─────────────────────────────────────────
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
OUTPUT_DIR = "./qlora_output"
MAX_SEQ_LENGTH = 1024
LORA_RANK = 16
LORA_ALPHA = 32

# ─────────────────────────────────────────
# 量化配置
# ─────────────────────────────────────────
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

# ─────────────────────────────────────────
# 加载模型和 tokenizer
# ─────────────────────────────────────────
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token  # 部分模型需要设置 pad_token
tokenizer.padding_side = "right"

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model.config.use_cache = False
model.config.pretraining_tp = 1

# ─────────────────────────────────────────
# 准备 QLoRA 训练
# ─────────────────────────────────────────
model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    bias="none",
)
model = get_peft_model(model, lora_config)

# ─────────────────────────────────────────
# 数据准备
# ─────────────────────────────────────────
dataset = load_dataset("shibing624/alpaca-zh", split="train[:3000]")

def format_sample(sample: dict) -> str:
    """将样本格式化为 Qwen ChatML 格式"""
    user_msg = sample["instruction"]
    if sample.get("input"):
        user_msg += f"\n\n{sample['input']}"
    return (
        "<|im_start|>system\n你是一个有用的AI助手。<|im_end|>\n"
        f"<|im_start|>user\n{user_msg}<|im_end|>\n"
        f"<|im_start|>assistant\n{sample['output']}<|im_end|>"
    )

# ─────────────────────────────────────────
# 训练参数
# ─────────────────────────────────────────
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    bf16=True,
    fp16=False,
    optim="paged_adamw_32bit",    # QLoRA 推荐使用分页优化器
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=100,
    save_strategy="steps",
    save_steps=100,
    save_total_limit=3,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    group_by_length=True,
    report_to="tensorboard",
    max_grad_norm=0.3,            # QLoRA 训练建议使用较小的梯度裁剪
)

# ─────────────────────────────────────────
# 创建 Trainer 并训练
# ─────────────────────────────────────────
# 按比例划分验证集
n = len(dataset)
n_val = max(int(n * 0.05), 50)
train_dataset = dataset.select(range(n - n_val))
eval_dataset = dataset.select(range(n - n_val, n))

trainer = SFTTrainer(
    model=model,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    args=training_args,
    formatting_func=format_sample,
    max_seq_length=MAX_SEQ_LENGTH,
)

# 启动训练
print("开始 QLoRA 训练...")
trainer.train()

# 保存 LoRA 适配器（不保存完整模型，仅约 100MB）
trainer.model.save_pretrained(f"{OUTPUT_DIR}/final_lora")
tokenizer.save_pretrained(f"{OUTPUT_DIR}/final_lora")
print("训练完成，LoRA 适配器已保存！")
```

---

## LoRA vs QLoRA vs 全量微调对比

### 技术指标对比

| 维度 | 全量微调 | LoRA | QLoRA |
|------|---------|------|-------|
| 可训练参数 | 100% | 0.1% - 1% | 0.1% - 1% |
| 显存需求（7B） | ~80 GB | ~24 GB | ~6 GB |
| 训练速度 | 基准 | 约 1.2× 快 | 约 0.7× 慢（量化开销） |
| 效果（vs 全量） | 基准 | 95% - 99% | 90% - 97% |
| 储存（7B LoRA 部分） | ~14 GB | ~100 MB | ~100 MB |
| 推理效率 | 标准 | 合并后与全量相同 | 量化模型约快 2× |

### 适用场景推荐

```python
def recommend_method(
    gpu_memory_gb: float,
    dataset_size: int,
    task_complexity: str,  # "simple" / "moderate" / "complex"
    has_multi_gpu: bool,
) -> str:
    """
    根据资源和任务情况推荐微调方法
    """
    # 消费级 GPU（显存不足 24GB）
    if gpu_memory_gb < 24:
        return (
            "推荐：QLoRA\n"
            f"  显存 {gpu_memory_gb}GB 不足以运行 LoRA，"
            "使用 QLoRA（4-bit 量化）可降低显存需求约 75%"
        )

    # 服务器 GPU（24-80GB）
    if gpu_memory_gb < 80:
        if task_complexity == "complex" and dataset_size > 100000:
            return (
                "推荐：LoRA（高 rank）\n"
                "  r=32 或 r=64，target_modules 包含 MLP 层"
            )
        return (
            "推荐：LoRA\n"
            "  r=16, lora_alpha=32，标准配置即可"
        )

    # A100/H100 80GB 级别
    if has_multi_gpu and dataset_size > 500000:
        return (
            "推荐：全量微调\n"
            "  数据量充足且资源允许，全量微调效果最佳"
        )
    return (
        "推荐：LoRA（大 rank）或全量微调\n"
        "  可先尝试 r=64 的 LoRA，对比全量微调效果后决定"
    )


# 使用示例
print(recommend_method(
    gpu_memory_gb=12,
    dataset_size=5000,
    task_complexity="moderate",
    has_multi_gpu=False,
))
```

### 效果对比实验结果（参考论文数据）

基于 LLaMA 在 MMLU 基准上的实验：

| 方法 | r | 可训练参数 | MMLU 分数 |
|------|---|-----------|----------|
| 全量微调 | — | 6.7B | 68.9 |
| LoRA | 64 | 33.6M | 68.6 |
| LoRA | 16 | 8.4M | 67.8 |
| LoRA | 4 | 2.1M | 66.5 |
| QLoRA | 64 | 33.6M | 67.2 |
| QLoRA | 16 | 8.4M | 66.1 |

---

## 最佳实践与调参建议

### LoRA 调参清单

```python
# 推荐的初始配置（7B 模型，中等任务）
lora_config_starter = LoraConfig(
    r=16,                   # 从 16 开始，效果不好再调大
    lora_alpha=32,          # 通常 = 2 × r
    lora_dropout=0.05,      # 数据量小时可增大到 0.1
    target_modules=[        # 包含所有线性层效果更好
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    bias="none",            # 通常不训练 bias
    task_type=TaskType.CAUSAL_LM,
)

# 调参方向：
# 效果不够 → 增大 r（16→32），或增加 target_modules
# 过拟合   → 增大 lora_dropout，减小 r
# 资源不足 → 减小 r（16→8），或缩减 target_modules
```

### QLoRA 调参清单

```python
# QLoRA 专项注意事项：

# 1. 优化器选择
#    使用 paged_adamw_32bit（比 adamw_torch 节省约 30% 显存）
#    learning_rate 通常比 LoRA 略小：1e-4 ~ 2e-4

# 2. 梯度裁剪
#    max_grad_norm = 0.3（比全量微调更小，4-bit 量化引入更多噪声）

# 3. 计算精度
#    bnb_4bit_compute_dtype = torch.bfloat16
#    bf16 比 fp16 在量化训练中更稳定（不容易出现数值溢出）

# 4. 量化类型选择
#    bnb_4bit_quant_type = "nf4"（权重服从正态分布时最优）
#    若发现 nf4 效果差，可尝试 "fp4"（更保守的量化）

# 5. 批处理大小
#    建议 per_device_batch_size=1 或 2，用 gradient_accumulation 补偿
```

### 常见陷阱

| 陷阱 | 描述 | 解决方案 |
|------|------|---------|
| target_modules 设置错误 | 不同架构的模型层名称不同 | 用 `get_linear_layer_names()` 检查 |
| 忘记 `prepare_model_for_kbit_training` | QLoRA 训练不稳定 | 量化模型必须调用此函数 |
| lora_alpha 过大 | 等效学习率过高，loss 振荡 | 降低 alpha 或降低学习率 |
| 合并前未正确设置 dtype | 合并后模型精度下降 | 合并时使用 float16 或 bfloat16 |
| 验证时未调用 `FastLanguageModel.for_inference` | Unsloth 模型推理速度慢 | 推理前切换到推理模式 |
