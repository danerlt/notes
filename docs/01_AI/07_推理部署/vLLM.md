# vLLM

## vLLM 简介

vLLM 是由加州大学伯克利分校开发的高性能大语言模型推理框架，专为生产环境的高并发场景设计。

### 核心技术：PagedAttention

传统 LLM 推理的瓶颈在于 KV Cache（Key-Value 缓存）的内存管理：

- 每个请求都需要预先分配最大序列长度的连续显存
- 大量显存因内存碎片和过度预留而浪费（通常高达 60-80%）

**PagedAttention** 借鉴操作系统虚拟内存的分页思想：

- 将 KV Cache 分割为固定大小的"页"（Block）
- 按需动态分配，不再要求连续显存
- 不同请求可以共享相同前缀的 KV Cache（Prefix Caching）
- 显存利用率从 20-40% 提升到 90%+

### vLLM 的主要优势

- **高吞吐量**：比 HuggingFace Transformers 高 14-24 倍的吞吐量
- **低延迟**：支持 continuous batching，最大化 GPU 利用率
- **生产就绪**：支持多 GPU、分布式推理、OpenAI 兼容 API
- **广泛兼容**：支持 Llama、Qwen、Mistral、GPT、Falcon 等主流模型

---

## 安装与环境要求

### 硬件要求

- GPU：NVIDIA GPU（Compute Capability 7.0+，即 V100 及更新）
- 推荐：A100、H100、RTX 3090/4090
- 显存：至少能容纳量化后的模型（建议 INT4 模型 + 20% 余量）

### 安装

```bash
# 推荐使用 pip 安装（会自动安装对应 CUDA 版本的依赖）
pip install vllm

# 验证安装
python -c "from vllm import LLM; print('vLLM 安装成功')"

# 查看版本
pip show vllm

# 如果遇到 CUDA 版本不匹配问题，指定版本安装
pip install vllm --extra-index-url https://download.pytorch.org/whl/cu121

# 从源码安装（获取最新功能）
git clone https://github.com/vllm-project/vllm.git
cd vllm
pip install -e .
```

### 环境验证

```python
from vllm import LLM, SamplingParams
import torch

print(f"PyTorch 版本：{torch.__version__}")
print(f"CUDA 可用：{torch.cuda.is_available()}")
print(f"GPU 型号：{torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

# 加载一个小模型验证 vLLM 工作正常
llm = LLM(model="facebook/opt-125m")
outputs = llm.generate(["Hello, vLLM!"], SamplingParams(max_tokens=20))
print(outputs[0].outputs[0].text)
```

---

## 启动 vLLM 服务器

### 基本启动命令

```bash
# 最简单的启动方式
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct

# 指定常用参数
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --served-model-name qwen2.5-7b \
    --max-model-len 8192 \
    --dtype bfloat16

# 服务启动后，访问 API 文档
# http://localhost:8000/docs
```

### 使用量化模型启动

```bash
# AWQ 量化模型
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct-AWQ \
    --quantization awq \
    --dtype half

# GPTQ 量化模型
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4 \
    --quantization gptq \
    --dtype half

# 动态 INT8 量化（无需专门量化模型）
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --quantization int8
```

### 完整配置示例

```bash
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --served-model-name qwen2.5-7b \
    --max-model-len 8192 \          # 最大上下文长度
    --max-num-seqs 256 \             # 最大并发请求数
    --max-num-batched-tokens 32768 \ # 每批次最大 token 数
    --gpu-memory-utilization 0.9 \   # GPU 显存使用比例（留余量给 KV Cache）
    --enable-prefix-caching \        # 启用前缀缓存（相同前缀复用 KV Cache）
    --trust-remote-code \            # 信任模型的自定义代码
    --api-key your-secret-key        # 设置 API 密钥（可选）
```

### 使用 systemd 管理服务

```bash
# 创建服务文件
sudo tee /etc/systemd/system/vllm.service << 'EOF'
[Unit]
Description=vLLM API Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
Environment="CUDA_VISIBLE_DEVICES=0"
ExecStart=/home/ubuntu/venv/bin/python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --host 0.0.0.0 \
    --port 8000 \
    --gpu-memory-utilization 0.9
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vllm
sudo systemctl start vllm
sudo journalctl -u vllm -f  # 查看日志
```

---

## OpenAI 兼容 API

vLLM 完全兼容 OpenAI API 格式，现有代码只需修改 `base_url`。

### curl 调用

```bash
# 聊天补全
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "model": "qwen2.5-7b",
    "messages": [
      {"role": "system", "content": "你是一个专业的技术助手。"},
      {"role": "user", "content": "解释什么是 PagedAttention"}
    ],
    "temperature": 0.7,
    "max_tokens": 512,
    "stream": false
  }'

# 流式输出
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-7b",
    "messages": [{"role": "user", "content": "用 Python 实现二分查找"}],
    "stream": true
  }'

# 查看可用模型
curl http://localhost:8000/v1/models
```

---

## Python SDK 使用

### 使用 OpenAI 客户端

```bash
pip install openai
```

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="your-secret-key",  # 如果没有设置 api-key，填任意字符串
)

# 单次对话
response = client.chat.completions.create(
    model="qwen2.5-7b",
    messages=[
        {"role": "system", "content": "你是一个有帮助的 AI 助手。"},
        {"role": "user", "content": "解释一下 vLLM 的 PagedAttention 技术"},
    ],
    temperature=0.7,
    max_tokens=1024,
)
print(response.choices[0].message.content)
print(f"输入 tokens：{response.usage.prompt_tokens}")
print(f"输出 tokens：{response.usage.completion_tokens}")

# 流式输出
stream = client.chat.completions.create(
    model="qwen2.5-7b",
    messages=[{"role": "user", "content": "写一首五言绝句"}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)
print()
```

### 使用 vLLM 原生 Python API

vLLM 原生 API 更适合离线批量处理，无需启动服务器。

```python
from vllm import LLM, SamplingParams

# 加载模型
llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    dtype="bfloat16",
    max_model_len=4096,
    gpu_memory_utilization=0.9,
    trust_remote_code=True,
)

# 配置采样参数
sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=512,
    stop=["<|im_end|>"],  # 停止词
)

# 单条推理
outputs = llm.generate(
    ["请介绍一下 Python 的 GIL 机制"],
    sampling_params,
)
print(outputs[0].outputs[0].text)

# 使用 chat 格式（自动应用 chat template）
from vllm.entrypoints.chat_utils import apply_chat_template
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
messages = [
    {"role": "system", "content": "你是一个 Python 专家。"},
    {"role": "user", "content": "什么是生成器？"},
]
prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

outputs = llm.generate([prompt], sampling_params)
print(outputs[0].outputs[0].text)
```

---

## 批量推理

vLLM 的核心优势之一是高效批量推理，自动将多个请求合并处理。

```python
from vllm import LLM, SamplingParams
from transformers import AutoTokenizer

llm = LLM(model="Qwen/Qwen2.5-7B-Instruct", dtype="bfloat16")
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")

sampling_params = SamplingParams(temperature=0.7, max_tokens=256)

# 准备大批量 prompts
questions = [
    "什么是机器学习？",
    "解释 Python 的装饰器",
    "如何优化 SQL 查询？",
    "什么是微服务架构？",
    "解释 CAP 定理",
    # ... 可以传入几百甚至几千条
]

# 应用 chat template
prompts = [
    tokenizer.apply_chat_template(
        [{"role": "user", "content": q}],
        tokenize=False,
        add_generation_prompt=True,
    )
    for q in questions
]

# vLLM 自动批量处理，比逐条推理快数倍到数十倍
import time
start = time.time()
outputs = llm.generate(prompts, sampling_params)
elapsed = time.time() - start

print(f"处理 {len(prompts)} 条请求耗时：{elapsed:.2f}s")
print(f"平均每条：{elapsed/len(prompts)*1000:.0f}ms")
print(f"总 tokens/s：{sum(len(o.outputs[0].token_ids) for o in outputs) / elapsed:.0f}")

# 输出结果
for question, output in zip(questions, outputs):
    print(f"\nQ: {question}")
    print(f"A: {output.outputs[0].text[:200]}...")
```

### 并发 API 请求测试

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(base_url="http://localhost:8000/v1", api_key="test")

async def single_request(question: str, idx: int) -> dict:
    """发送单个异步请求"""
    response = await client.chat.completions.create(
        model="qwen2.5-7b",
        messages=[{"role": "user", "content": question}],
        max_tokens=256,
    )
    return {
        "idx": idx,
        "question": question,
        "answer": response.choices[0].message.content,
    }

async def concurrent_requests():
    """并发发送 50 个请求，测试 vLLM 的并发能力"""
    questions = [f"解释计算机科学中的第 {i} 个重要概念" for i in range(50)]

    import time
    start = time.time()

    # 并发发送所有请求
    tasks = [single_request(q, i) for i, q in enumerate(questions)]
    results = await asyncio.gather(*tasks)

    elapsed = time.time() - start
    print(f"50 个并发请求总耗时：{elapsed:.2f}s")
    print(f"平均每请求：{elapsed/50*1000:.0f}ms")
    return results

results = asyncio.run(concurrent_requests())
```

---

## 多 GPU 支持（Tensor Parallelism）

vLLM 支持张量并行（Tensor Parallel），将模型分散到多个 GPU 上。

```bash
# 使用 2 张 GPU（tensor_parallel_size=2）
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3-70B-Instruct \
    --tensor-parallel-size 2 \
    --host 0.0.0.0 \
    --port 8000

# 使用 4 张 GPU 运行 70B 模型
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3-70B-Instruct \
    --tensor-parallel-size 4 \
    --dtype bfloat16 \
    --max-model-len 8192

# 使用 8 张 GPU 运行 405B 超大模型
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-405B-Instruct \
    --tensor-parallel-size 8 \
    --pipeline-parallel-size 1 \
    --dtype bfloat16
```

### Python API 多 GPU

```python
from vllm import LLM, SamplingParams

# 自动使用所有可用 GPU
llm = LLM(
    model="meta-llama/Llama-3-70B-Instruct",
    tensor_parallel_size=4,      # 使用 4 张 GPU
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.85, # 每张 GPU 使用 85% 显存
)

sampling_params = SamplingParams(temperature=0.7, max_tokens=512)
outputs = llm.generate(["解释 Transformer 架构"], sampling_params)
print(outputs[0].outputs[0].text)
```

### Pipeline Parallelism（超大模型）

```bash
# 当单个 GPU 无法容纳模型的单层时，使用流水线并行
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-405B-Instruct \
    --tensor-parallel-size 4 \
    --pipeline-parallel-size 2 \  # 流水线并行度（共 4x2=8 张 GPU）
    --dtype bfloat16
```

---

## 性能调优参数

### 关键参数说明

```bash
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \

    # === 显存与批次控制 ===
    --gpu-memory-utilization 0.9 \
    # 占用 GPU 显存的比例（0.0-1.0）
    # 剩余显存用于 KV Cache，越大支持的并发越高，但可能 OOM

    --max-num-seqs 512 \
    # 最大并发序列数（同时处理的请求数上限）

    --max-num-batched-tokens 65536 \
    # 每个批次的最大 token 数，影响吞吐量

    --max-model-len 8192 \
    # 最大序列长度（输入+输出），不超过模型支持的最大值

    # === 缓存优化 ===
    --enable-prefix-caching \
    # 启用前缀缓存：相同 system prompt 的请求共享 KV Cache
    # 对 RAG、多轮对话场景效果显著

    --block-size 16 \
    # KV Cache 分页大小（tokens/页），默认 16

    # === 推理加速 ===
    --enable-chunked-prefill \
    # 分块预填充：将长提示词分块处理，减少首 token 延迟

    --max-prefill-tokens 8192 \
    # 每步预填充的最大 token 数

    --speculative-model Qwen/Qwen2.5-0.5B \
    --num-speculative-tokens 5 \
    # 推测解码：用小模型提前预测，大模型验证，可提升速度 2-3 倍
```

### Python API 性能调优

```python
from vllm import LLM, SamplingParams
from vllm.engine.arg_utils import AsyncEngineArgs
from vllm.engine.async_llm_engine import AsyncLLMEngine

# 高性能配置
engine_args = AsyncEngineArgs(
    model="Qwen/Qwen2.5-7B-Instruct",
    dtype="bfloat16",
    max_model_len=8192,
    gpu_memory_utilization=0.9,
    max_num_seqs=512,
    enable_prefix_caching=True,      # 前缀缓存
    enable_chunked_prefill=True,     # 分块预填充
    tensor_parallel_size=1,
    trust_remote_code=True,
)

# 创建异步引擎（用于生产环境服务）
engine = AsyncLLMEngine.from_engine_args(engine_args)
```

### 基准测试

```bash
# vLLM 内置基准测试工具
python benchmarks/benchmark_throughput.py \
    --model Qwen/Qwen2.5-7B-Instruct \
    --dataset ShareGPT_V3_unfiltered_cleaned_split.json \
    --num-prompts 1000 \
    --backend vllm

# 测试延迟
python benchmarks/benchmark_latency.py \
    --model Qwen/Qwen2.5-7B-Instruct \
    --input-len 512 \
    --output-len 256 \
    --num-iters 100
```

---

## 与 Ollama、TGI 对比

### 功能对比

| 特性 | vLLM | Ollama | TGI（HuggingFace） |
|------|------|--------|-------------------|
| 主要定位 | 生产高并发推理 | 本地开发/个人使用 | 生产部署 |
| 易用性 | 中等 | 最简单 | 中等 |
| 吞吐量 | 最高 | 较低 | 高 |
| 首 token 延迟 | 低 | 中等 | 低 |
| 多 GPU 支持 | 原生支持 | 有限支持 | 支持 |
| CPU 推理 | 不支持 | 原生支持 | 有限支持 |
| OpenAI API 兼容 | 完整兼容 | 完整兼容 | 部分兼容 |
| 量化格式 | AWQ/GPTQ/INT8 | GGUF | GPTQ/AWQ |
| Windows 支持 | 有限（需 WSL2） | 完整支持 | 有限支持 |
| 模型管理 | 手动 | 内置仓库 | 手动 |

### 性能对比（A100 80GB，Llama3-8B，并发 100）

| 框架 | 吞吐量（tokens/s）| 首 token 延迟（ms）| 内存利用率 |
|------|-----------------|-------------------|----------|
| vLLM | ~8000 | ~50 | 90%+ |
| TGI | ~5000 | ~80 | 70% |
| Ollama | ~800 | ~200 | 60% |
| Transformers | ~300 | ~300 | 40% |

### 选择建议

```
场景                          推荐工具
────────────────────────────────────────
个人学习、本地开发              Ollama（简单易用）
生产 API 服务、高并发           vLLM（性能最佳）
需要 CPU 推理、低配机器         Ollama（GGUF + CPU）
HuggingFace 生态集成           TGI（原生集成）
需要微调后部署                 vLLM（支持 LoRA 热加载）
```

---

## 常见问题

### Q1：启动时 CUDA Out of Memory 怎么办？

```bash
# 方法1：降低 gpu-memory-utilization
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --gpu-memory-utilization 0.7  # 从 0.9 降到 0.7

# 方法2：减小最大序列长度
--max-model-len 4096  # 从 8192 减小

# 方法3：使用量化模型
--model Qwen/Qwen2.5-7B-Instruct-AWQ --quantization awq

# 方法4：多 GPU 分摊
--tensor-parallel-size 2
```

### Q2：如何支持 LoRA 微调模型？

```bash
# vLLM 支持动态加载 LoRA（无需重启服务）
python -m vllm.entrypoints.openai.api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --enable-lora \
    --max-lora-rank 64 \
    --lora-modules my-lora=/path/to/lora/adapter

# API 调用时指定 LoRA 模型
curl http://localhost:8000/v1/chat/completions \
  -d '{"model": "my-lora", "messages": [...]}'
```

### Q3：如何监控 vLLM 服务状态？

```bash
# vLLM 内置 Prometheus 指标
curl http://localhost:8000/metrics

# 关键指标：
# vllm:num_requests_running      - 正在处理的请求数
# vllm:gpu_cache_usage_perc      - GPU KV Cache 使用率
# vllm:num_requests_waiting      - 等待队列中的请求数
# vllm:avg_generation_throughput - 平均生成吞吐量

# 配合 Grafana 可视化
docker run -d -p 3000:3000 grafana/grafana
```
