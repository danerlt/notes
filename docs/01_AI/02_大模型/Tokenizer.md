# Tokenizer

## 概念介绍

Tokenizer（分词器）是 LLM 处理文本的第一步，负责将原始文本转换为模型可处理的 Token 序列（整数 ID 列表），以及将 Token 序列还原为文本。

Token 不等同于单词，可能是：
- 一个完整单词（"hello"）
- 单词的一部分（"un" + "believ" + "able"）
- 一个字符（中文通常 1-2 个字符一个 Token）
- 标点符号、空格

Tokenizer 的设计直接影响：
- 模型的词汇表大小（Vocabulary Size）
- 序列长度（影响 Context Length 的利用效率）
- 语言处理能力（尤其是中文、代码等特殊语言）

## 核心原理

### BPE（Byte Pair Encoding）

BPE 是 GPT 系列和 LLaMA 等模型使用的算法：

**训练过程**：
1. 将文本分割为字符序列
2. 统计相邻字符对的频率
3. 将最频繁的字符对合并为新 Token
4. 重复步骤 2-3 直到达到目标词汇表大小

**示例**：
```
初始：["l", "o", "w", "e", "r"] × 多次
合并最频繁对 (e, r) → ["l", "o", "w", "er"]
合并最频繁对 (l, o) → ["lo", "w", "er"]
...
最终 Token："lower" = ["low", "er"]
```

**Byte-level BPE（BBPE）**：在字节级别（0-255）而非字符级别进行 BPE，可以处理任意 Unicode 字符，GPT-2/GPT-3/GPT-4/LLaMA 均使用此方案。

### WordPiece

BERT 和早期 Google 模型使用的算法，与 BPE 类似，但合并标准不同：

- BPE：选择频率最高的字符对
- WordPiece：选择使语言模型似然最大化的字符对

子词使用 `##` 前缀标注，例如：
```
"playing" → ["play", "##ing"]
"unbelievable" → ["un", "##believ", "##able"]
```

### SentencePiece

Google 开发的通用分词工具，Gemma、T5、LLaMA（部分版本）、Qwen 使用：

- 语言无关：不依赖空格分隔，直接处理原始 Unicode
- 支持 BPE 和 Unigram 两种算法
- 将空格视为特殊字符 `▁`，例如 `"Hello World"` → `["▁Hello", "▁World"]`

### Tiktoken（OpenAI）

OpenAI 基于 Rust 实现的高速 BPE 分词器，GPT-3.5/GPT-4/GPT-4o 均使用：

| 模型 | 编码方案 | 词汇表大小 |
|------|----------|-----------|
| GPT-2 | gpt2 | 50,257 |
| GPT-3.5-turbo | cl100k_base | 100,277 |
| GPT-4 / GPT-4o | cl100k_base / o200k_base | 100,277 / 200,019 |
| text-embedding-3 | cl100k_base | 100,277 |

### 各主流模型 Tokenizer 对比

| 模型 | Tokenizer 类型 | 词汇表大小 | 中文效率 |
|------|---------------|-----------|----------|
| GPT-4o | BBPE (o200k) | 200,019 | 一般 |
| Claude 3.x | BBPE | ~100K+ | 较好 |
| LLaMA-3 | BBPE | 128,256 | 较好 |
| Qwen2.5 | BBPE (tiktoken) | 152,064 | 优秀 |
| DeepSeek-V3 | BBPE | 102,400 | 良好 |
| GLM-4 | SentencePiece | 150,000+ | 优秀 |

## 代码示例（Python）

### 使用 Tiktoken（OpenAI）

```python
import tiktoken

# 获取 GPT-4o 的编码器
enc = tiktoken.get_encoding("o200k_base")
# 或按模型名称获取
enc = tiktoken.encoding_for_model("gpt-4o")

# 编码
text = "Hello, 世界！Transformer 是现代 AI 的基础架构。"
tokens = enc.encode(text)
print(f"文本: {text}")
print(f"Token IDs: {tokens}")
print(f"Token 数量: {len(tokens)}")

# 解码
decoded = enc.decode(tokens)
print(f"解码结果: {decoded}")

# 查看每个 Token 对应的文本
for token_id in tokens:
    token_bytes = enc.decode_single_token_bytes(token_id)
    print(f"  ID {token_id:6d} -> {token_bytes}")

# 统计不同文本的 Token 数
texts = [
    "Hello world",
    "你好世界",
    "def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)",
]
for t in texts:
    n = len(enc.encode(t))
    print(f"[{n:3d} tokens] {t}")
```

### 使用 HuggingFace Tokenizers

```python
from transformers import AutoTokenizer

# 加载各种模型的 Tokenizer
tokenizers = {
    "Qwen2.5": "Qwen/Qwen2.5-7B-Instruct",
    "LLaMA-3": "meta-llama/Meta-Llama-3-8B-Instruct",
    "BERT-Chinese": "bert-base-chinese",
}

text = "大语言模型是基于 Transformer 架构的人工智能系统。"

for name, model_name in tokenizers.items():
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokens = tokenizer.tokenize(text)
        ids = tokenizer.encode(text)
        print(f"\n{name}:")
        print(f"  Tokens: {tokens}")
        print(f"  数量: {len(ids)}")
    except Exception as e:
        print(f"{name}: {e}")
```

### Qwen2.5 Tokenizer 详细示例

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")

# 编码与解码
text = "请解释什么是 Attention 机制？"
encoded = tokenizer(text, return_tensors="pt")
print(f"Input IDs: {encoded['input_ids']}")
print(f"Token 数: {encoded['input_ids'].shape[1]}")

# 应用 Chat Template
messages = [
    {"role": "system", "content": "你是一个专业的 AI 助手。"},
    {"role": "user", "content": "什么是 Transformer？"}
]

# 格式化为模型期望的输入格式
formatted = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)
print(f"\nChat Template 格式化结果:\n{formatted}")

# 编码整个对话
input_ids = tokenizer.apply_chat_template(
    messages,
    tokenize=True,
    add_generation_prompt=True,
    return_tensors="pt"
)
print(f"\n编码后 Token 数: {input_ids.shape[1]}")
```

### SentencePiece 使用示例

```python
import sentencepiece as spm

# 训练自定义分词器（以自有语料为例）
spm.SentencePieceTrainer.train(
    input='corpus.txt',       # 训练语料
    model_prefix='my_tokenizer',
    vocab_size=32000,
    character_coverage=0.9995,  # 覆盖字符的比例（中文建议 0.9999）
    model_type='bpe',          # 'bpe' 或 'unigram'
    pad_id=0,
    unk_id=1,
    bos_id=2,
    eos_id=3
)

# 加载并使用
sp = spm.SentencePieceProcessor()
sp.load('my_tokenizer.model')

text = "深度学习改变了人工智能的发展方向。"
tokens = sp.encode_as_pieces(text)
ids = sp.encode_as_ids(text)
print(f"Tokens: {tokens}")
print(f"IDs: {ids}")
print(f"解码: {sp.decode(ids)}")
```

### Token 数量对比分析

```python
import tiktoken
from transformers import AutoTokenizer

# 对比不同 tokenizer 的中文压缩效率
def compare_tokenizers(text: str):
    results = {}

    # tiktoken (GPT-4o)
    enc = tiktoken.get_encoding("o200k_base")
    results["GPT-4o (o200k)"] = len(enc.encode(text))

    # Qwen2.5
    qwen_tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
    results["Qwen2.5"] = len(qwen_tok.encode(text))

    return results

test_texts = [
    "The quick brown fox jumps over the lazy dog.",
    "大语言模型通过海量文本预训练，具备了惊人的语言理解和生成能力。",
    "def quicksort(arr): return arr if len(arr)<=1 else quicksort([x for x in arr[1:] if x<=arr[0]])+[arr[0]]+quicksort([x for x in arr[1:] if x>arr[0]])",
]

for text in test_texts:
    print(f"\n文本: {text[:50]}...")
    results = compare_tokenizers(text)
    for name, count in results.items():
        print(f"  {name}: {count} tokens")
```

## 常见用法

### 计算上下文窗口使用率

```python
import tiktoken

def estimate_context_usage(messages: list, model: str = "gpt-4o") -> dict:
    """估算消息列表占用的 Token 数"""
    enc = tiktoken.encoding_for_model(model)

    # 每条消息的固定 overhead
    tokens_per_message = 3
    tokens_per_name = 1

    total_tokens = 3  # 每个请求的固定开销

    for msg in messages:
        total_tokens += tokens_per_message
        total_tokens += len(enc.encode(msg.get("content", "")))
        if "name" in msg:
            total_tokens += tokens_per_name

    context_limits = {
        "gpt-4o": 128000,
        "gpt-4-turbo": 128000,
        "gpt-3.5-turbo": 16385
    }

    limit = context_limits.get(model, 128000)
    return {
        "used_tokens": total_tokens,
        "limit": limit,
        "usage_pct": f"{total_tokens/limit*100:.1f}%",
        "remaining": limit - total_tokens
    }

messages = [
    {"role": "system", "content": "你是一个专业助手"},
    {"role": "user", "content": "解释什么是 RAG？"},
]
usage = estimate_context_usage(messages)
print(usage)
```

### 长文本截断策略

```python
import tiktoken

def truncate_to_token_limit(text: str, max_tokens: int, model: str = "gpt-4o") -> str:
    """将文本截断到指定 Token 数以内"""
    enc = tiktoken.encoding_for_model(model)
    tokens = enc.encode(text)

    if len(tokens) <= max_tokens:
        return text

    # 截断并解码
    truncated_tokens = tokens[:max_tokens]
    return enc.decode(truncated_tokens)

long_text = "这是一段很长的文本..." * 1000
truncated = truncate_to_token_limit(long_text, max_tokens=500)
print(f"原始长度: {len(long_text)} 字符")
print(f"截断后: {len(truncated)} 字符")
```

## 小结

- **BPE（Byte Pair Encoding）** 是目前主流 LLM 的主要分词算法，平衡了词汇表大小和序列长度
- **Tiktoken** 是 OpenAI 的高效实现，GPT-4o 使用 `o200k_base`（20万词汇表）
- **中文 Token 效率**：Qwen2.5 > GLM-4 > LLaMA-3 > GPT-4o，选择中文友好的模型能显著降低 Token 消耗
- **Chat Template** 是 HuggingFace 的标准化对话格式，不同模型格式不同，使用 `apply_chat_template` 避免手动处理
- 实际开发中，Token 计算影响：API 成本估算、上下文窗口管理、批处理效率优化
