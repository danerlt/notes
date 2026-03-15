# Ollama

## Ollama 简介

Ollama 是一款开源的本地大模型运行工具，让开发者可以在自己的电脑上一键下载、管理和运行大语言模型，无需复杂的环境配置。

### 核心特点

- **开箱即用**：一条命令即可下载并运行模型，无需手动配置 CUDA、依赖库
- **跨平台支持**：原生支持 macOS（Apple Silicon/Intel）、Linux、Windows
- **OpenAI 兼容 API**：内置 REST API，格式与 OpenAI 完全兼容，现有代码几乎零改动
- **模型库丰富**：官方仓库收录 Llama3、Qwen2.5、DeepSeek、Mistral 等主流模型
- **CPU/GPU 自动调度**：自动检测硬件，优先使用 GPU，显存不足时自动 offload 到 CPU
- **模型格式**：使用 GGUF 格式，支持多种量化精度

---

## 安装

### macOS

```bash
# 方法1：官网下载安装包（推荐）
# 访问 https://ollama.com/download，下载 .dmg 安装包

# 方法2：使用 Homebrew
brew install ollama

# 验证安装
ollama --version
```

### Linux

```bash
# 一键安装脚本
curl -fsSL https://ollama.com/install.sh | sh

# 验证安装
ollama --version

# 查看服务状态
systemctl status ollama

# 如果服务未启动，手动启动
systemctl start ollama
systemctl enable ollama  # 设置开机自启
```

### Windows

```powershell
# 方法1：官网下载安装包（推荐）
# 访问 https://ollama.com/download，下载 OllamaSetup.exe

# 方法2：使用 winget
winget install Ollama.Ollama

# 安装完成后，Ollama 会作为系统托盘程序运行
# 验证
ollama --version
```

### Docker 安装

```bash
# 仅 CPU 版本
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# 带 NVIDIA GPU 支持
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# 验证服务是否运行
curl http://localhost:11434/api/tags
```

---

## 基本命令

### 模型管理

```bash
# 下载并直接运行模型（首次运行会自动下载）
ollama run llama3.2

# 仅下载模型，不运行
ollama pull qwen2.5:7b

# 列出本地已下载的模型
ollama list

# 查看模型详情
ollama show qwen2.5:7b

# 删除模型
ollama rm llama3.2:latest

# 复制模型（用于基于现有模型创建自定义版本）
ollama cp qwen2.5:7b my-qwen
```

### 交互式对话

```bash
# 启动交互式对话
ollama run qwen2.5:7b

# 对话中的特殊命令
# /bye          退出对话
# /clear        清空对话历史
# /set system   设置系统提示词
# /show info    显示当前模型信息

# 从命令行直接发送单条消息（非交互模式）
echo "解释一下什么是量化" | ollama run qwen2.5:7b
```

### 服务管理

```bash
# 启动 Ollama 服务（通常安装后自动启动）
ollama serve

# 指定监听地址（默认 127.0.0.1:11434）
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 后台运行（Linux）
nohup ollama serve &> /var/log/ollama.log &
```

---

## 常用模型

### 主流开源模型

```bash
# Meta Llama 3 系列（综合能力强）
ollama pull llama3.2:3b      # 3B，适合低显存设备
ollama pull llama3.2:latest  # 默认 3B
ollama pull llama3.1:8b      # 8B，性价比高
ollama pull llama3.1:70b     # 70B，需要较大显存或内存

# Qwen2.5 系列（中文能力优秀）
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b       # 推荐：中文效果好，消费级显卡可运行
ollama pull qwen2.5:14b
ollama pull qwen2.5:72b

# DeepSeek 系列（推理能力强）
ollama pull deepseek-r1:7b
ollama pull deepseek-r1:14b
ollama pull deepseek-r1:32b

# 代码专用模型
ollama pull codellama:7b
ollama pull qwen2.5-coder:7b

# 小型高效模型
ollama pull phi3.5:3.8b      # Microsoft Phi3.5，轻量高效
ollama pull gemma2:9b        # Google Gemma2
```

### 模型标签说明

```bash
# 格式：模型名:标签
# 常见标签含义：
ollama pull qwen2.5:7b          # 默认量化版本（通常是 Q4_K_M）
ollama pull qwen2.5:7b-instruct # 指令调优版本
ollama pull qwen2.5:7b-q8_0    # INT8 量化，质量更高
ollama pull qwen2.5:7b-fp16    # FP16 全精度（需要更多显存）
```

---

## API 接口使用

Ollama 内置 REST API，默认监听 `http://localhost:11434`，兼容 OpenAI API 格式。

### 基础 API 调用

```bash
# 聊天补全（对话）
curl http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [
      {"role": "user", "content": "用一句话介绍你自己"}
    ],
    "stream": false
  }'

# 文本生成（非对话格式）
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "prompt": "中国的首都是",
    "stream": false
  }'

# 获取文本 Embedding 向量
curl http://localhost:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "input": "这是一段需要向量化的文本"
  }'

# 列出已安装模型
curl http://localhost:11434/api/tags
```

### OpenAI 兼容格式（推荐）

```bash
# Ollama 完整兼容 OpenAI 的 /v1/chat/completions 接口
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [
      {"role": "system", "content": "你是一个专业的 Python 开发者。"},
      {"role": "user", "content": "写一个快速排序算法"}
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

---

## Python 调用示例

### 使用 ollama 官方库

```bash
pip install ollama
```

```python
import ollama

# 简单对话
response = ollama.chat(
    model="qwen2.5:7b",
    messages=[
        {"role": "user", "content": "用 Python 实现一个单例模式"},
    ],
)
print(response["message"]["content"])

# 流式输出（打字机效果）
for chunk in ollama.chat(
    model="qwen2.5:7b",
    messages=[{"role": "user", "content": "讲一个关于程序员的笑话"}],
    stream=True,
):
    print(chunk["message"]["content"], end="", flush=True)
print()  # 换行

# 多轮对话
messages = [
    {"role": "system", "content": "你是一个有帮助的编程助手，回答简洁。"},
]

def chat(user_input: str):
    messages.append({"role": "user", "content": user_input})
    response = ollama.chat(model="qwen2.5:7b", messages=messages)
    assistant_msg = response["message"]["content"]
    messages.append({"role": "assistant", "content": assistant_msg})
    return assistant_msg

print(chat("什么是装饰器？"))
print(chat("给我一个实际的例子"))  # 有上下文记忆
```

### 使用 OpenAI 客户端库（直接替换 base_url）

```bash
pip install openai
```

```python
from openai import OpenAI

# 将 base_url 指向 Ollama，api_key 随意填写
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # 任意字符串，Ollama 不验证
)

# 与使用 OpenAI API 完全相同的代码
response = client.chat.completions.create(
    model="qwen2.5:7b",
    messages=[
        {"role": "system", "content": "你是一个专业的技术文档作者。"},
        {"role": "user", "content": "解释什么是 REST API"},
    ],
    temperature=0.7,
    max_tokens=512,
    stream=False,
)
print(response.choices[0].message.content)

# 流式输出
stream = client.chat.completions.create(
    model="qwen2.5:7b",
    messages=[{"role": "user", "content": "介绍一下 Python 异步编程"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()

# 生成 Embedding
embedding_response = client.embeddings.create(
    model="nomic-embed-text",  # 需要先 ollama pull nomic-embed-text
    input="这是一段需要向量化的文本",
)
vector = embedding_response.data[0].embedding
print(f"向量维度：{len(vector)}")
```

### 异步调用

```python
import asyncio
import ollama

async def async_chat():
    """异步流式对话"""
    async_client = ollama.AsyncClient()

    async for chunk in await async_client.chat(
        model="qwen2.5:7b",
        messages=[{"role": "user", "content": "写一首关于秋天的诗"}],
        stream=True,
    ):
        print(chunk["message"]["content"], end="", flush=True)
    print()

asyncio.run(async_chat())
```

---

## Modelfile 自定义模型

Modelfile 类似 Dockerfile，用于自定义模型的行为、参数和系统提示词。

### 基本语法

```dockerfile
# Modelfile 语法说明

# FROM：基础模型（必填）
FROM qwen2.5:7b

# SYSTEM：系统提示词
SYSTEM """
你是一个专业的 Python 编程助手，名叫"代码猫"。
你的特点：
1. 只回答与 Python 编程相关的问题
2. 回答简洁，代码有注释
3. 遇到不相关的问题，礼貌地拒绝并引导回编程话题
"""

# PARAMETER：推理参数
PARAMETER temperature 0.3      # 降低温度，让代码输出更稳定
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096          # 上下文窗口大小
PARAMETER repeat_penalty 1.1    # 重复惩罚

# TEMPLATE：自定义对话模板（通常不需要修改）
# MESSAGE：预置对话示例（few-shot）
MESSAGE user 如何读取文件？
MESSAGE assistant 使用 Python 内置的 open() 函数：\n```python\nwith open('file.txt', 'r', encoding='utf-8') as f:\n    content = f.read()\n```
```

### 创建和使用自定义模型

```bash
# 创建 Modelfile 文件
cat > Modelfile << 'EOF'
FROM qwen2.5:7b

SYSTEM """
你是一个专注于 Python 编程的助手，回答要简洁、实用，代码示例必须有注释。
"""

PARAMETER temperature 0.3
PARAMETER num_ctx 4096
EOF

# 根据 Modelfile 创建自定义模型
ollama create code-assistant -f Modelfile

# 验证创建成功
ollama list

# 使用自定义模型
ollama run code-assistant "如何用 Python 发送 HTTP 请求？"
```

### 基于本地 GGUF 文件创建模型

```bash
# 如果你已经有 .gguf 文件，可以直接导入
cat > Modelfile << 'EOF'
FROM /path/to/your-model-q4_k_m.gguf

SYSTEM "你是一个有帮助的助手。"
PARAMETER temperature 0.7
EOF

ollama create my-local-model -f Modelfile
ollama run my-local-model
```

---

## 性能配置与优化

### 环境变量配置

```bash
# 设置 Ollama 服务监听所有网络接口（允许局域网访问）
export OLLAMA_HOST=0.0.0.0:11434

# 设置模型存储目录（默认：~/.ollama/models）
export OLLAMA_MODELS=/data/ollama/models

# 设置最大并发请求数（默认：1）
export OLLAMA_NUM_PARALLEL=4

# 设置最大加载模型数量（默认：1，内存充足可以增大）
export OLLAMA_MAX_LOADED_MODELS=2

# GPU 相关设置
export CUDA_VISIBLE_DEVICES=0,1  # 指定使用的 GPU

# Linux 系统在 /etc/systemd/system/ollama.service.d/ 中配置持久化
sudo mkdir -p /etc/systemd/system/ollama.service.d/
cat | sudo tee /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_NUM_PARALLEL=4"
EOF
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

### 推理参数调优

```python
import ollama

# 不同场景的参数配置
response = ollama.chat(
    model="qwen2.5:7b",
    messages=[{"role": "user", "content": "解释量子纠缠"}],
    options={
        # 创意写作：高 temperature
        # "temperature": 0.9,
        # "top_p": 0.95,

        # 代码/精确回答：低 temperature
        "temperature": 0.1,
        "top_p": 0.9,

        # 上下文窗口（模型支持的最大值）
        "num_ctx": 8192,

        # 推理加速：使用 GPU 层数（-1 = 全部放 GPU）
        "num_gpu": -1,

        # 预加载提示词的批次大小（影响首 token 延迟）
        "num_batch": 512,
    },
)
print(response["message"]["content"])
```

### 检查 GPU 使用情况

```bash
# 查看 Ollama 是否在使用 GPU
nvidia-smi  # 看是否有 ollama 进程占用显存

# 查看 Ollama 日志（了解 GPU 层数加载情况）
# macOS/Linux
journalctl -u ollama -f

# 或直接前台运行查看日志
ollama serve
# 日志中会显示：llm_load_tensors: offloading 32 repeating layers to GPU
```

---

## 常见问题

### Q1：模型下载太慢怎么办？

```bash
# 方法1：设置镜像（如果有的话）
export OLLAMA_HOST=https://your-mirror.com

# 方法2：手动下载 GGUF 文件后导入
# 从 Hugging Face 或 ModelScope 下载 .gguf 文件
# 然后使用 Modelfile 的 FROM /path/to/file.gguf 导入

# 方法3：使用代理
export https_proxy=http://127.0.0.1:7890
ollama pull qwen2.5:7b
```

### Q2：Ollama 无法使用 GPU，全在 CPU 跑

```bash
# 检查 CUDA 是否可用
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"

# 查看 Ollama 日志，确认 GPU 层数
ollama run qwen2.5:7b "test"
# 正常情况日志会显示：offloading N layers to GPU

# 如果显存不足，Ollama 会自动 CPU/GPU 混合运行
# 可以通过环境变量强制 CPU 运行
OLLAMA_NUM_GPU=0 ollama run qwen2.5:7b
```

### Q3：如何让局域网其他设备访问 Ollama？

```bash
# 1. 设置监听所有接口
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 2. 确保防火墙放行 11434 端口（Linux）
sudo ufw allow 11434

# 3. 其他设备使用宿主机 IP 访问
curl http://192.168.1.100:11434/api/tags
```

### Q4：如何同时运行多个模型？

```bash
# 设置最大加载模型数
export OLLAMA_MAX_LOADED_MODELS=3

# 之后调用不同模型，Ollama 会自动管理缓存
# 超过上限时会卸载最久未使用的模型
```

### Q5：Apple Silicon Mac 如何获得最佳性能？

```bash
# Apple Silicon（M1/M2/M3/M4）原生支持，会自动使用 Metal GPU 加速
# 无需额外配置

# 检查 Metal 是否被使用
ollama run llama3.2 "test"
# 日志中应出现：metal=1

# 建议：使用 Q4_K_M 量化，性能与质量的最佳平衡点
ollama pull qwen2.5:7b  # 默认就是 Q4_K_M
```
