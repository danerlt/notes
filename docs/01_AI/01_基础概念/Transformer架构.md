# Transformer 架构

## 概念介绍

Transformer 是 2017 年 Google 在论文《Attention Is All You Need》中提出的革命性神经网络架构。它完全基于注意力机制（Attention Mechanism），摒弃了 RNN 的序列递归结构，实现了高度并行化训练。

Transformer 已成为现代 AI 的基础架构，广泛应用于：
- **NLP**：GPT 系列、BERT、LLaMA、Claude 等所有主流 LLM
- **计算机视觉**：ViT（Vision Transformer）
- **多模态**：CLIP、GPT-4V、Gemini
- **语音**：Whisper

## 核心原理

### Attention 机制

注意力机制的本质是：让模型在处理某个位置的信息时，动态地关注序列中其他位置的相关信息。

核心公式（Scaled Dot-Product Attention）：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$

其中：
- **Q（Query）**：当前位置的查询向量，表示"我想找什么"
- **K（Key）**：其他位置的键向量，表示"我能提供什么"
- **V（Value）**：其他位置的值向量，表示"我实际提供的内容"
- **$\sqrt{d_k}$**：缩放因子，防止点积过大导致 softmax 梯度消失

### Self-Attention（自注意力）

Self-Attention 是 Transformer 的核心，Q、K、V 均来自同一输入序列，使得每个 token 能感知序列中所有其他 token 的信息。

计算步骤：
1. 对输入 $X$ 分别乘以三个可学习矩阵 $W_Q, W_K, W_V$ 得到 Q、K、V
2. 计算注意力得分：$\text{scores} = QK^T / \sqrt{d_k}$
3. Softmax 归一化得到注意力权重
4. 加权求和 V 得到输出

### 多头注意力（Multi-Head Attention）

将注意力机制并行运行 h 次，每个"头"学习不同的关注模式：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h) W^O$$

$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

多头注意力的优势：
- 不同的头可以关注不同类型的关系（句法、语义、指代等）
- 提高模型的表达能力

### 位置编码（Positional Encoding）

Transformer 本身对位置不敏感，需要显式注入位置信息。常见方案：

**原始 Transformer（正弦位置编码）**：
$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

**现代 LLM 常用方案**：
- **RoPE（Rotary Position Embedding）**：LLaMA、Qwen、DeepSeek 使用，支持更长上下文
- **ALiBi**：通过注意力偏置实现，外推性能好
- **可学习位置编码**：BERT 使用

### Transformer 完整架构

```
输入序列
    ↓
Token Embedding + Positional Encoding
    ↓
┌─────────────────────────────┐
│  Transformer Block × N      │
│  ┌─────────────────────┐    │
│  │ Multi-Head Attention │    │
│  └──────────┬──────────┘    │
│       Add & LayerNorm        │
│  ┌─────────────────────┐    │
│  │  Feed-Forward Network│   │
│  └──────────┬──────────┘    │
│       Add & LayerNorm        │
└─────────────────────────────┘
    ↓
输出层（LM Head / 分类头）
```

**FFN（前馈网络）**：每个位置独立计算，通常为两层线性变换 + 激活函数：
$$\text{FFN}(x) = \text{GELU}(xW_1 + b_1)W_2 + b_2$$

现代 LLM 多使用 **SwiGLU** 变体：
$$\text{SwiGLU}(x) = (xW_1 \odot \text{Sigmoid}(xW_3)) W_2$$

## 代码示例（Python）

### 从零实现 Scaled Dot-Product Attention

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math


class ScaledDotProductAttention(nn.Module):
    """Scaled Dot-Product Attention 实现"""

    def __init__(self, dropout=0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

    def forward(self, Q, K, V, mask=None):
        """
        Args:
            Q: (batch, heads, seq_len, d_k)
            K: (batch, heads, seq_len, d_k)
            V: (batch, heads, seq_len, d_v)
            mask: 可选的注意力掩码
        """
        d_k = Q.size(-1)

        # 计算注意力得分
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)

        # 应用掩码（因果注意力/padding mask）
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))

        # Softmax 归一化
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)

        # 加权求和
        output = torch.matmul(attn_weights, V)
        return output, attn_weights
```

### 多头注意力实现

```python
class MultiHeadAttention(nn.Module):
    """多头自注意力机制"""

    def __init__(self, d_model, num_heads, dropout=0.1):
        super().__init__()
        assert d_model % num_heads == 0

        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        # Q、K、V 投影矩阵
        self.W_q = nn.Linear(d_model, d_model, bias=False)
        self.W_k = nn.Linear(d_model, d_model, bias=False)
        self.W_v = nn.Linear(d_model, d_model, bias=False)
        self.W_o = nn.Linear(d_model, d_model, bias=False)

        self.attention = ScaledDotProductAttention(dropout)
        self.dropout = nn.Dropout(dropout)

    def split_heads(self, x):
        """(batch, seq, d_model) -> (batch, heads, seq, d_k)"""
        batch, seq, _ = x.shape
        x = x.view(batch, seq, self.num_heads, self.d_k)
        return x.transpose(1, 2)

    def forward(self, query, key, value, mask=None):
        batch = query.size(0)

        # 线性投影并分头
        Q = self.split_heads(self.W_q(query))
        K = self.split_heads(self.W_k(key))
        V = self.split_heads(self.W_v(value))

        # 注意力计算
        x, attn_weights = self.attention(Q, K, V, mask)

        # 拼接多头输出
        x = x.transpose(1, 2).contiguous()
        x = x.view(batch, -1, self.d_model)

        return self.W_o(x)
```

### 完整 Transformer Block

```python
class TransformerBlock(nn.Module):
    """标准 Transformer 编码器块（Pre-LayerNorm 变体）"""

    def __init__(self, d_model, num_heads, ffn_dim, dropout=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, ffn_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ffn_dim, d_model),
            nn.Dropout(dropout)
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)

    def forward(self, x, mask=None):
        # Pre-LayerNorm（现代 LLM 的标准做法）
        x = x + self.attn(self.norm1(x), self.norm1(x), self.norm1(x), mask)
        x = x + self.ffn(self.norm2(x))
        return x


# 使用 PyTorch Flash Attention（2024 年推荐）
import torch.nn.functional as F

def flash_attention_forward(q, k, v, is_causal=True):
    """使用 PyTorch 2.0+ 的 Flash Attention 实现"""
    with torch.backends.cuda.sdp_kernel(
        enable_flash=True,
        enable_math=False,
        enable_mem_efficient=True
    ):
        return F.scaled_dot_product_attention(q, k, v, is_causal=is_causal)
```

### 使用 HuggingFace Transformers 加载模型

```python
from transformers import AutoModel, AutoTokenizer
import torch

# 加载 BERT 模型并提取 Attention 权重
model_name = "bert-base-chinese"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name, output_attentions=True)

text = "Transformer架构是现代大模型的基础。"
inputs = tokenizer(text, return_tensors="pt")

with torch.no_grad():
    outputs = model(**inputs)

# 获取所有层的注意力权重
# shape: (num_layers, batch, num_heads, seq_len, seq_len)
attentions = outputs.attentions
print(f"层数: {len(attentions)}")
print(f"注意力矩阵形状: {attentions[0].shape}")

# 可视化某层某头的注意力权重
import matplotlib.pyplot as plt

tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
attn_matrix = attentions[0][0][0].numpy()  # 第1层，batch=0，head=0

plt.figure(figsize=(8, 6))
plt.imshow(attn_matrix, cmap='Blues')
plt.xticks(range(len(tokens)), tokens, rotation=45)
plt.yticks(range(len(tokens)), tokens)
plt.title("第1层第1头的注意力权重")
plt.colorbar()
plt.tight_layout()
plt.show()
```

## 常见用法

### Transformer 变体对比

| 变体 | 代表模型 | 架构特点 | 适用场景 |
|------|----------|----------|----------|
| Encoder-only | BERT、RoBERTa | 双向注意力 | 文本理解、分类、NER |
| Decoder-only | GPT、LLaMA | 因果注意力（Causal） | 文本生成、LLM |
| Encoder-Decoder | T5、BART | 编码器+解码器 | 翻译、摘要 |

### KV Cache（推理加速）

```python
# Decoder-only 模型推理时，历史 K/V 无需重复计算
# PyTorch 中使用 past_key_values 缓存
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("gpt2")
tokenizer = AutoTokenizer.from_pretrained("gpt2")

inputs = tokenizer("Hello, my name is", return_tensors="pt")
# use_cache=True 启用 KV Cache
outputs = model.generate(
    **inputs,
    max_new_tokens=50,
    use_cache=True,  # 默认开启
    do_sample=True,
    temperature=0.7
)
print(tokenizer.decode(outputs[0]))
```

### GQA（Grouped-Query Attention，2024 年主流）

现代 LLM（LLaMA-3、Qwen2.5 等）使用 GQA 减少 KV Cache 内存：

- **MHA（Multi-Head Attention）**：每个头都有独立的 Q、K、V
- **MQA（Multi-Query Attention）**：所有头共享同一组 K、V
- **GQA（Grouped-Query Attention）**：多个头共享一组 K、V，平衡性能和效率

## 小结

- **Attention 机制**通过动态权重聚合信息，是 Transformer 超越 RNN 的关键
- **Multi-Head Attention** 让模型同时学习不同语义维度的依赖关系
- **位置编码**方面，RoPE 已成为 2024-2025 年主流 LLM 的标准选择，支持长上下文
- **Pre-LayerNorm** 比原始论文的 Post-LayerNorm 训练更稳定，已成为主流
- **Flash Attention** 大幅降低内存占用并提升速度，是工程实践中的必选项
- **GQA/MQA** 通过减少 KV Cache 大小，使部署大模型更加高效
