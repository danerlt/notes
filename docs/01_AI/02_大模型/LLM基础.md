# LLM 基础

## 概念介绍

大语言模型（Large Language Model，LLM）是基于 Transformer 架构、在海量文本数据上预训练的超大规模神经网络。其核心任务是**语言建模**：给定前文，预测下一个 Token 的概率分布。

LLM 的"大"体现在三个维度（Scaling Law）：
- **参数量**：从数十亿到数千亿参数（7B、13B、70B、405B、671B...）
- **训练数据**：数万亿 Token（Common Crawl、书籍、代码、学术论文等）
- **计算量**：数千到数百万 GPU 小时

2022 年 ChatGPT 发布后，LLM 进入快速迭代时代，2024-2025 年主流模型参数量持续增大，同时小模型（小于 10B）的能力也大幅提升。

## 核心原理

### 预训练（Pre-training）

**自回归语言建模（Autoregressive Language Modeling）**是 Decoder-only LLM 的预训练目标：

$$\mathcal{L} = -\sum_{t=1}^{T} \log P(x_t | x_1, x_2, ..., x_{t-1})$$

模型通过预测下一个 Token，学习语言的语法、语义、事实知识和推理能力。

**预训练数据构成（以主流 LLM 为例）**：
- 网页文本（Common Crawl、C4）：约 60-70%
- 书籍（Books3、Gutenberg）：约 10-15%
- 代码（GitHub）：约 5-10%
- 学术论文（ArXiv、PubMed）：约 3-5%
- 维基百科等高质量文本：约 5%

### 后训练对齐（Post-training Alignment）

预训练后的模型只会"续写"，需要通过后训练使其变成有用的助手：

**SFT（Supervised Fine-Tuning）**：
- 使用高质量的指令-回复对数据进行监督微调
- 教会模型理解指令格式和回复风格

**RLHF（Reinforcement Learning from Human Feedback）**：
1. 收集人类偏好数据（A 回复好还是 B 回复好）
2. 训练奖励模型（Reward Model）
3. 使用 PPO 算法优化语言模型

**DPO（Direct Preference Optimization）**：
- 2023 年提出，RLHF 的简化替代方案
- 直接从偏好数据学习，无需单独训练奖励模型
- 2024-2025 年被广泛采用

### 涌现能力（Emergent Abilities）

当模型规模超过某个阈值时，会突然涌现出小模型完全不具备的能力：
- **上下文学习（In-Context Learning）**：通过少量示例直接学习新任务
- **思维链推理（Chain-of-Thought）**：逐步推理解决复杂问题
- **代码生成**：编写可运行的代码
- **指令遵循**：理解并执行复杂指令

### 推理机制

**自回归生成（Autoregressive Generation）**：逐 Token 生成，每个 Token 基于所有前文。

**解码策略**：
| 策略 | 特点 | 适用场景 |
|------|------|----------|
| Greedy Decoding | 每步选最高概率，确定性强 | 代码生成、精确任务 |
| Beam Search | 保留 K 条候选路径 | 机器翻译 |
| Temperature Sampling | 控制随机性，T<1 更保守 | 创意写作 |
| Top-p (Nucleus) Sampling | 从累积概率 > p 的词中采样 | 对话生成 |
| Top-k Sampling | 从概率最高的 K 个词中采样 | 通用生成 |

**思维链（Chain-of-Thought）推理**：
- **o1/o3 模式**：模型内部进行扩展思考（Extended Thinking）
- **DeepSeek-R1**：强化学习训练推理能力
- **QwQ**：Qwen 系列的推理增强版本

## 主流 LLM 发展历程

| 时间 | 模型 | 机构 | 里程碑 |
|------|------|------|--------|
| 2020.05 | GPT-3 (175B) | OpenAI | 少样本学习能力大幅提升 |
| 2022.11 | ChatGPT | OpenAI | RLHF 对齐，开启 AI 助手时代 |
| 2023.03 | GPT-4 | OpenAI | 多模态，推理能力大幅提升 |
| 2023.07 | LLaMA-2 | Meta | 开源可商用，推动开源生态 |
| 2024.04 | LLaMA-3 | Meta | 开源模型接近闭源水平 |
| 2024.05 | GPT-4o | OpenAI | 实时多模态 |
| 2024.09 | o1 | OpenAI | 扩展思考，数学推理突破 |
| 2025.01 | DeepSeek-R1 | DeepSeek | 开源推理模型，性能媲美 o1 |
| 2025.02 | Claude 3.7 Sonnet | Anthropic | 混合推理模式 |

## 代码示例（Python）

### 使用 OpenAI API 调用 LLM

```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

# 基础对话
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一个专业的 Python 开发助手。"},
        {"role": "user", "content": "用 Python 实现一个快速排序算法"}
    ],
    temperature=0.7,
    max_tokens=1000
)

print(response.choices[0].message.content)
print(f"\n消耗 Token: {response.usage.total_tokens}")
```

### 流式输出

```python
from openai import OpenAI

client = OpenAI()

# 流式输出，适合实时显示
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "解释什么是 Transformer"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
```

### 使用 HuggingFace 加载本地开源模型

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_name = "Qwen/Qwen2.5-7B-Instruct"

# 加载 tokenizer 和模型
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,   # 使用 bfloat16 节省内存
    device_map="auto",             # 自动分配到 GPU
    trust_remote_code=True
)

# 构建对话
messages = [
    {"role": "system", "content": "你是一个有帮助的 AI 助手。"},
    {"role": "user", "content": "什么是大语言模型？"}
]

# 使用 chat template
text = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

inputs = tokenizer([text], return_tensors="pt").to(model.device)

# 生成
with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=512,
        temperature=0.7,
        top_p=0.9,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )

# 解码（去掉输入部分）
generated_ids = outputs[0][len(inputs.input_ids[0]):]
response = tokenizer.decode(generated_ids, skip_special_tokens=True)
print(response)
```

### 使用 vLLM 高性能推理（2024-2025 年主流方案）

```python
from vllm import LLM, SamplingParams

# 加载模型（支持 PagedAttention，内存利用率大幅提升）
llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    dtype="bfloat16",
    gpu_memory_utilization=0.9,
    tensor_parallel_size=1  # 多 GPU 时增加
)

sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=512
)

# 批量推理
prompts = [
    "什么是大语言模型？",
    "解释 Attention 机制",
    "如何提高 RAG 系统的准确率？"
]

outputs = llm.generate(prompts, sampling_params)
for output in outputs:
    print(f"Prompt: {output.prompt}")
    print(f"Response: {output.outputs[0].text}\n")
```

### 使用 LangChain 调用多种 LLM

```python
from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama
from langchain_core.messages import HumanMessage, SystemMessage

# OpenAI
openai_llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

# 本地 Ollama 模型
ollama_llm = Ollama(model="qwen2.5:7b")

messages = [
    SystemMessage(content="你是一个 AI 专家"),
    HumanMessage(content="解释什么是 LLM 的涌现能力")
]

response = openai_llm.invoke(messages)
print(response.content)
```

## 常见用法

### Token 计算与成本估算

```python
import tiktoken

# 使用 tiktoken 计算 OpenAI 模型的 Token 数
enc = tiktoken.encoding_for_model("gpt-4o")

text = "大语言模型是基于 Transformer 架构的超大规模神经网络。"
tokens = enc.encode(text)
print(f"文本: {text}")
print(f"Token 数: {len(tokens)}")
print(f"Token IDs: {tokens}")

# 成本估算（以 gpt-4o 为例）
input_cost_per_1k = 0.005   # $0.005/1K input tokens
output_cost_per_1k = 0.015  # $0.015/1K output tokens

input_tokens = 1000
output_tokens = 500
cost = (input_tokens / 1000 * input_cost_per_1k +
        output_tokens / 1000 * output_cost_per_1k)
print(f"预估成本: ${cost:.4f}")
```

### LLM 输出结构化数据

```python
from openai import OpenAI
from pydantic import BaseModel
from typing import List

client = OpenAI()

class MovieReview(BaseModel):
    title: str
    rating: float
    pros: List[str]
    cons: List[str]
    summary: str

# 使用 Structured Outputs（OpenAI 2024 新功能）
response = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "user", "content": "评价电影《流浪地球2》"}
    ],
    response_format=MovieReview
)

review = response.choices[0].message.parsed
print(f"标题: {review.title}")
print(f"评分: {review.rating}")
print(f"优点: {review.pros}")
```

## 小结

- LLM 的核心是**自回归语言建模**，通过预测下一个 Token 在海量数据上学习知识和推理能力
- **Scaling Law** 指出增大参数量、数据量和计算量能持续提升模型能力，但边际效益递减
- **涌现能力**（In-Context Learning、CoT 推理）在模型超过特定规模后突然出现
- **后训练对齐**（SFT + RLHF/DPO）是让预训练模型变成有用助手的关键步骤
- 2024-2025 年趋势：**推理模型**（o1/R1/QwQ）通过扩展测试时计算大幅提升复杂推理能力
- 工程实践推荐：**OpenAI API** 用于快速开发，**vLLM + 开源模型** 用于私有化部署
