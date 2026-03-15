# SFT 监督微调

## SFT 原理

SFT（Supervised Fine-Tuning，监督微调）是大模型对齐流程中的第一个核心步骤。它通过在人工标注的高质量指令-回答对上进行有监督训练，使预训练模型从"无差别文本补全"转变为"按指令行事的助手"。

### SFT 在整体对齐流程中的位置

```
预训练（Pretraining）
    ↓ 掌握语言和世界知识
SFT（Supervised Fine-Tuning）
    ↓ 学会遵循指令，具备对话能力
RLHF / DPO（偏好学习）
    ↓ 进一步对齐人类偏好，减少有害输出
最终部署模型（如 ChatGPT、Claude）
```

SFT 阶段的目标是让模型学会**对话格式**和**任务理解**，而不是注入新知识（那是预训练的工作）。

---

## 训练目标：Next Token Prediction

SFT 的训练目标与预训练相同，都是 **Next Token Prediction（下一个 token 预测）**，但有一个关键区别：

**预训练**：对序列中所有 token 计算 loss

**SFT**：通常只对 **assistant 回答部分**的 token 计算 loss，input（用户问题）部分的 loss 被 mask 掉

```
用户输入：[请翻译以下句子：Hello world]     ← loss mask = 0，不计算
助手输出：[你好，世界]                       ← loss mask = 1，计算 loss
```

这样设计的原因：我们希望模型学习如何回答，而不是学习如何提问。

### Loss 计算示意

```python
import torch
import torch.nn.functional as F

def compute_sft_loss(
    logits: torch.Tensor,       # 模型输出 (batch, seq_len, vocab_size)
    labels: torch.Tensor,       # 目标 token (batch, seq_len)
    loss_mask: torch.Tensor,    # 哪些位置参与 loss 计算 (batch, seq_len)
) -> torch.Tensor:
    """
    计算带 mask 的 SFT Cross-Entropy Loss

    只有 loss_mask=1 的位置（assistant 的回答）才参与 loss 计算
    """
    # 将 logits 和 labels 对齐（预测下一个 token）
    shift_logits = logits[..., :-1, :].contiguous()  # (batch, seq_len-1, vocab)
    shift_labels = labels[..., 1:].contiguous()       # (batch, seq_len-1)
    shift_mask = loss_mask[..., 1:].contiguous()      # (batch, seq_len-1)

    # 计算每个位置的 cross-entropy loss
    loss_per_token = F.cross_entropy(
        shift_logits.view(-1, shift_logits.size(-1)),
        shift_labels.view(-1),
        reduction="none",  # 不做聚合，保留每个 token 的 loss
    )
    loss_per_token = loss_per_token.view(shift_labels.shape)

    # 只对 mask=1 的位置求均值
    masked_loss = (loss_per_token * shift_mask).sum()
    num_active_tokens = shift_mask.sum()
    loss = masked_loss / num_active_tokens.clamp(min=1)

    return loss
```

---

## 关键超参数

### 学习率（Learning Rate）

SFT 的学习率通常远小于预训练，以避免破坏预训练权重中的知识。

| 模型规模 | 全量微调 LR | LoRA 微调 LR |
|----------|------------|-------------|
| 1B - 7B | 1e-5 ~ 5e-5 | 1e-4 ~ 3e-4 |
| 13B | 5e-6 ~ 2e-5 | 1e-4 ~ 2e-4 |
| 70B | 1e-6 ~ 5e-6 | 5e-5 ~ 1e-4 |

**学习率调度**：推荐使用 cosine decay with warmup：

```python
from transformers import get_cosine_schedule_with_warmup

# warmup_steps 通常取总步数的 3% - 10%
scheduler = get_cosine_schedule_with_warmup(
    optimizer=optimizer,
    num_warmup_steps=100,       # 预热步数
    num_training_steps=3000,    # 总训练步数
)
```

### Batch Size

实际有效 batch size = `per_device_batch_size × gradient_accumulation_steps × num_gpus`

```python
# 等效 batch size = 2 × 8 × 1 = 16
training_args = TrainingArguments(
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,  # 梯度累积，模拟更大 batch
)
```

推荐有效 batch size：64 - 256，具体根据数据量和显存调整。

### Epoch 数量

| 数据量 | 推荐 epoch |
|--------|-----------|
| 小于 1 万条 | 3 - 5 |
| 1 - 10 万条 | 2 - 3 |
| 大于 10 万条 | 1 - 2 |

epoch 过多容易过拟合，epoch 过少则欠拟合。建议以验证集 loss 为准，而非固定 epoch。

### 序列长度（Max Sequence Length）

```python
# 序列长度直接影响显存占用（显存与长度的平方成正比）
# 建议先统计数据集的实际长度分布，取 P95 作为最大长度

from transformers import AutoTokenizer
from datasets import load_dataset

tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")

def compute_length_stats(dataset, tokenizer, num_samples=1000):
    """计算数据集的 token 长度分布"""
    lengths = []
    for sample in dataset[:num_samples]:
        text = sample["instruction"] + sample.get("input", "") + sample["output"]
        tokens = tokenizer.encode(text)
        lengths.append(len(tokens))

    lengths.sort()
    print(f"中位数长度: {lengths[len(lengths)//2]}")
    print(f"P90 长度: {lengths[int(len(lengths)*0.9)]}")
    print(f"P95 长度: {lengths[int(len(lengths)*0.95)]}")
    print(f"最大长度: {max(lengths)}")
    return lengths
```

---

## 训练配置示例

以下是一个使用 `transformers + peft` 进行 LoRA SFT 训练的完整可运行示例。

```python
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
from peft import LoraConfig, TaskType, get_peft_model
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM

# ─────────────────────────────────────────
# 1. 配置参数
# ─────────────────────────────────────────
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
OUTPUT_DIR = "./sft_output"
MAX_SEQ_LENGTH = 1024

# ─────────────────────────────────────────
# 2. 加载模型和 tokenizer
# ─────────────────────────────────────────
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
tokenizer.padding_side = "right"  # SFT 通常使用右填充

# 使用 4-bit 量化降低显存需求（QLoRA 模式）
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model.config.use_cache = False  # 训练时关闭 KV cache

# ─────────────────────────────────────────
# 3. 配置 LoRA
# ─────────────────────────────────────────
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,                    # LoRA rank
    lora_alpha=32,           # scaling factor，通常 = 2 × r
    lora_dropout=0.05,
    target_modules=[         # 对哪些层应用 LoRA
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    bias="none",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# 输出示例：trainable params: 41,943,040 || all params: 7,241,748,480 || trainable%: 0.5792

# ─────────────────────────────────────────
# 4. 准备数据集
# ─────────────────────────────────────────
def format_prompt(sample: dict) -> str:
    """将 Alpaca 格式转换为 Qwen 的 ChatML 格式"""
    user_content = sample["instruction"]
    if sample.get("input"):
        user_content += f"\n\n{sample['input']}"

    return (
        f"<|im_start|>system\n你是一个有用的AI助手。<|im_end|>\n"
        f"<|im_start|>user\n{user_content}<|im_end|>\n"
        f"<|im_start|>assistant\n{sample['output']}<|im_end|>"
    )

dataset = load_dataset("shibing624/alpaca-zh", split="train[:5000]")
# TRL 的 SFTTrainer 接受返回字符串的格式化函数

# ─────────────────────────────────────────
# 5. 训练参数
# ─────────────────────────────────────────
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,     # 等效 batch_size = 16
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,                 # 前 5% 步数做 warmup
    fp16=False,
    bf16=True,                         # A100/H100 推荐 bf16
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=100,
    save_strategy="steps",
    save_steps=100,
    save_total_limit=3,               # 最多保留 3 个 checkpoint
    load_best_model_at_end=True,      # 训练结束加载最优 checkpoint
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    report_to="tensorboard",          # 可改为 "wandb"
    dataloader_num_workers=4,
    group_by_length=True,             # 将相近长度的样本分组，减少填充
)

# ─────────────────────────────────────────
# 6. 启动训练
# ─────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    eval_dataset=dataset.select(range(200)),  # 简单示例，实际应用单独的验证集
    args=training_args,
    formatting_func=format_prompt,
    max_seq_length=MAX_SEQ_LENGTH,
    packing=False,  # False = 每条数据单独一个序列；True = 将短序列打包提升效率
)

trainer.train()
trainer.save_model(OUTPUT_DIR)
```

---

## 损失曲线监控

### 健康的训练曲线特征

```
Train Loss:  █████████
              ↘↘↘↘↘↘  (持续下降，逐渐平稳)
                      ‾‾‾‾

Eval Loss:   █████████
              ↘↘↘↘  (同步下降，略高于 train loss)
                  ‾‾‾‾‾
```

### 使用 TensorBoard 监控

```bash
# 启动 TensorBoard
tensorboard --logdir ./sft_output/runs --port 6006
```

```python
# 在代码中记录自定义指标
from transformers import TrainerCallback

class LossMonitorCallback(TrainerCallback):
    """自定义回调：监控训练过程并记录详细日志"""

    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs is None:
            return
        step = state.global_step
        train_loss = logs.get("loss")
        eval_loss = logs.get("eval_loss")
        lr = logs.get("learning_rate")

        if train_loss:
            print(f"[Step {step:5d}] train_loss={train_loss:.4f}, lr={lr:.2e}")
        if eval_loss:
            print(f"[Step {step:5d}] eval_loss={eval_loss:.4f}  ← 关注这里")

    def on_evaluate(self, args, state, control, metrics=None, **kwargs):
        """每次评估后检查是否出现过拟合"""
        if metrics is None:
            return
        eval_loss = metrics.get("eval_loss", float("inf"))
        # 简单的过拟合预警：eval loss 显著高于 train loss
        train_loss = state.log_history[-1].get("loss", float("inf"))
        if eval_loss > train_loss * 1.5:
            print(f"WARNING: 可能过拟合！eval_loss={eval_loss:.4f}, train_loss={train_loss:.4f}")
```

---

## 过拟合与欠拟合的处理

### 过拟合症状与解决方案

**症状：** train loss 持续下降，eval loss 先降后升

| 解决方案 | 具体操作 |
|----------|---------|
| 减少 epoch | 从 3 epoch 降到 1-2 epoch |
| 增加 dropout | `lora_dropout` 从 0 增加到 0.05-0.1 |
| 增加数据量 | 补充更多多样化数据 |
| 增加数据多样性 | 确保训练集覆盖更多主题 |
| 使用更小的 LoRA rank | r 从 16 降到 8 或 4 |
| 混入通用数据 | 加入 5%-10% 的通用对话数据 |

### 欠拟合症状与解决方案

**症状：** train loss 和 eval loss 都居高不下，下降缓慢

| 解决方案 | 具体操作 |
|----------|---------|
| 增加学习率 | 尝试当前学习率 × 2 |
| 增加 epoch | 训练更多轮次 |
| 增加 LoRA rank | r 从 8 增加到 16 或 32 |
| 扩展 target_modules | 对更多层应用 LoRA |
| 检查数据质量 | 低质量数据会阻碍学习 |
| 检查 loss mask | 确认 assistant 部分的 mask 正确 |

---

## 模型合并（Merge LoRA Weights）

LoRA 训练完成后，模型权重分为两部分：原始基座模型权重和 LoRA 适配器权重。部署前通常需要将它们合并为一个完整模型。

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

def merge_lora_weights(
    base_model_name: str,
    lora_adapter_path: str,
    output_path: str,
    device: str = "cpu",  # 合并操作在 CPU 上进行，节省 GPU 显存
) -> None:
    """
    将 LoRA 适配器权重合并到基座模型

    合并公式：W_merged = W_base + (lora_B @ lora_A) * (alpha / r)
    """
    print(f"加载基座模型: {base_model_name}")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float16,  # fp16 节省内存
        device_map=device,
        trust_remote_code=True,
    )

    print(f"加载 LoRA 适配器: {lora_adapter_path}")
    model = PeftModel.from_pretrained(base_model, lora_adapter_path)

    print("合并权重中...")
    model = model.merge_and_unload()  # 合并并移除 LoRA 层

    print(f"保存合并后模型到: {output_path}")
    model.save_pretrained(output_path, safe_serialization=True)

    # 同时保存 tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model_name, trust_remote_code=True)
    tokenizer.save_pretrained(output_path)

    print("合并完成！")


# 使用示例
merge_lora_weights(
    base_model_name="Qwen/Qwen2.5-7B-Instruct",
    lora_adapter_path="./sft_output/checkpoint-best",
    output_path="./merged_model",
)
```

### 合并后验证

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# 加载合并后的模型进行推理验证
pipe = pipeline(
    "text-generation",
    model="./merged_model",
    torch_dtype=torch.float16,
    device_map="auto",
)

response = pipe(
    "<|im_start|>user\n请用一句话介绍机器学习<|im_end|>\n<|im_start|>assistant\n",
    max_new_tokens=200,
    temperature=0.7,
)
print(response[0]["generated_text"])
```

---

## 常见问题排查

### 问题一：CUDA Out of Memory

```
RuntimeError: CUDA out of memory. Tried to allocate ...
```

**解决步骤：**

```python
# 1. 减小 per_device_train_batch_size（从 4 改到 2 或 1）
# 2. 增大 gradient_accumulation_steps 补偿
# 3. 减小 max_seq_length（从 2048 改到 1024 或 512）
# 4. 开启 gradient_checkpointing
training_args = TrainingArguments(
    gradient_checkpointing=True,  # 以计算换显存，速度降低约 20%
    ...
)
# 5. 确保开启了量化（QLoRA）
```

### 问题二：Loss 变成 NaN

```python
# 可能原因：学习率过大，或输入数据包含特殊字符导致数值溢出
# 解决方案：
training_args = TrainingArguments(
    learning_rate=1e-4,        # 降低学习率（减半或缩小一个数量级）
    max_grad_norm=1.0,         # 梯度裁剪，防止梯度爆炸
    fp16=False,                # 尝试关闭 fp16，改用 bf16
    bf16=True,
    ...
)
```

### 问题三：训练速度过慢

```python
# 优化训练速度的配置
training_args = TrainingArguments(
    dataloader_num_workers=4,       # 多进程数据加载
    dataloader_pin_memory=True,     # 锁页内存加速数据传输
    group_by_length=True,           # 相似长度分组，减少 padding
    tf32=True,                      # Ampere 架构 GPU（A100/RTX30系列）专用
    ...
)
```

### 问题四：eval loss 不下降

常见原因：数据格式错误，导致 loss mask 计算不正确，模型实际上没有学到回答内容。

```python
# 调试：打印一条格式化后的样本，检查 token 和 mask
sample_text = format_prompt(dataset[0])
tokens = tokenizer(sample_text, return_tensors="pt")
print("Input IDs:", tokens["input_ids"][0][:20])
print("Decoded:", tokenizer.decode(tokens["input_ids"][0][:20]))

# 手动检查 response_template 是否正确（TRL 用于找到 mask 起始位置）
response_template = "<|im_start|>assistant\n"
response_token_ids = tokenizer.encode(response_template, add_special_tokens=False)
print("Response template token IDs:", response_token_ids)
```

### 问题五：模型遗忘通用能力（灾难性遗忘）

```python
# 解决方案：在训练数据中混入 5%-10% 的通用对话数据
from datasets import concatenate_datasets

domain_dataset = load_dataset("your/domain_data", split="train")    # 领域数据
general_dataset = load_dataset("shibing624/alpaca-zh", split="train[:500]")  # 通用数据

# 混合数据集
mixed_dataset = concatenate_datasets([domain_dataset, general_dataset])
mixed_dataset = mixed_dataset.shuffle(seed=42)
```
