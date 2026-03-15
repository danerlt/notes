# vllm

## 介绍

vllm 是一个拥有高吞吐量和内存高效的 LLM 推理和服务引擎。

vLLM的快速特点包括： 

-   服务高吞吐量
-   使用**PagedAttention**高效管理注意力键和值内存
-   持续批量处理传入请求 
-   使用CUDA/HIP图快速模型执行 
-   量化：[GPTQ](https://arxiv.org/abs/2210.17323)、[AWQ](https://arxiv.org/abs/2306.00978)、[SqueezeLLM](https://arxiv.org/abs/2306.07629)、FP8 KV缓存 
-   优化的CUDA内核

vLLM的灵活性和易用性包括：

- 与流行的Hugging Face模型无缝集成
- 使用各种解码算法进行高吞吐量服务，包括*并行采样*、*束搜索*等
- 分布式推理的张量并行性支持
- 流式输出
- OpenAI兼容的API服务
- 支持NVIDIA GPU和AMD GPU
- （实验性）前缀缓存支持
- （实验性）多LoRA支持

vLLM无缝支持HuggingFace上的大多数流行开源模型，包括：
- 类似于Transformer的LLM（例如，Llama）
- 专家混合LLM（例如，Mixtral）
- 多模态LLM（例如，LLaVA）

在[这里](https://docs.vllm.ai/en/latest/models/supported_models.html)找到支持模型的完整列表。

## 安装

LLM是一个Python库，还包括预编译的C++和CUDA(12.1)二进制文件。

### Requirements

OS: Linux
Python: 3.8 -- 3.11
GPU: compute capability 7.0 or higher (e.g., V100, T4, RTX20xx, A100, L4, H100, etc.)

### 使用pip安装

使用pip安装：

```bash
$ # (Recommended) Create a new conda environment.
$ conda create -n vllm python=3.10 -y
$ conda activate vllm

$ # Install vLLM with CUDA 12.1.
$ pip install vllm
```

截至目前，默认情况下，vLLM 使用 CUDA 12.1 以及公开的 PyTorch 发行版本编译二进制文件。

为了得到更好的性能，vLLM 必须编译许多 cuda 库。不幸的是，编译会给其他 CUDA 版本和 PyTorch 版本带来不兼容。因此，建议使用全新的 conda 环境安装 vLLM。

## 使用

默认情况下，vLLM 从 HuggingFace 下载模型。如果您想在以下示例中使用 ModelScope 中的模型，请设置环境变量：

```bash
export VLLM_USE_MODELSCOPE=True
```

### 离线批量推理

我们首先展示一个使用 vLLM 对数据集进行离线批量推理的示例。

从 vLLM 导入 `LLM` 和 `SamplingParams` 。 `LLM` 类是使用 vLLM 引擎运行离线推理的主类。 `SamplingParams` 类指定采样过程的参数。

```
from vllm import LLM, SamplingParams
```

定义input列表和生成的采样参数。采样温度设置为0.8，核采样概率设置为0.95。有关采样参数的更多信息，请参阅[SamplingParams类定义](https://github.com/vllm-project/vllm/blob/main/vllm/sampling_params.py)。

```python
prompts = [
    "Hello, my name is",
    "The president of the United States is",
    "The capital of France is",
    "The future of AI is",
]
sampling_params = SamplingParams(temperature=0.8, top_p=0.95)
```

使用 `LLM` 类和 OPT-125M 模型初始化 vLLM 的离线推理引擎。

```bash
llm = LLM(model="facebook/opt-125m")
```

调用 `llm.generate` 生成输出。它将输入promtp添加到 vLLM 引擎的等待队列中，并执行 vLLM 引擎以生成高吞吐量的输出。输出作为 `RequestOutput` 对象列表返回，其中包括所有输出token。

```python
outputs = llm.generate(prompts, sampling_params)

# Print the outputs.
for output in outputs:
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")
```



### 为LLM构建API Server



### 启动兼容OpenAI 的API Server

vLLM可以部署为实现OpenAI API协议的服务器。这使得 vLLM 可以用作使用 OpenAI API 的应用程序的直接替代品。默认情况下，它在 `http://localhost:8000` 处启动服务器。您可以使用 `--host` 和 `--port` 参数指定地址。服务器当前一次托管一个模型（下面命令中的 OPT-125M）并实现[list models](https://platform.openai.com/docs/api-reference/models/list)、[create chat completion](https://platform.openai.com/docs/api-reference/chat/completions/create)和[create completion](https://platform.openai.com/docs/api-reference/completions/create)接口。

启动服务

```bash
$ python -m vllm.entrypoints.openai.api_server --model facebook/opt-125m
```

默认情况下，服务器使用存储在 tokenizer 中的预定义聊天模板。您可以使用 `--chat-template` 参数覆盖此模板：

```bash
$ python -m vllm.entrypoints.openai.api_server \
$     --model facebook/opt-125m \
$     --chat-template ./examples/template_chatml.jinja
```

该服务器可以按照与OpenAI API相同的格式进行查询。可以传入参数 `--api-key` 或环境变量 `VLLM_API_KEY` 以使服务器能够检查headers中的 API 密钥。

#### 模型列表：

```bash
$ curl http://localhost:8000/v1/models
```

#### 生成回答

```bash
$ curl http://localhost:8000/v1/completions \
$     -H "Content-Type: application/json" \
$     -d '{
$         "model": "facebook/opt-125m",
$         "prompt": "San Francisco is a",
$         "max_tokens": 7,
$         "temperature": 0
$     }'
```

#### 对话接口

```bash
$ curl http://localhost:8000/v1/chat/completions \
$     -H "Content-Type: application/json" \
$     -d '{
$         "model": "facebook/opt-125m",
$         "messages": [
$             {"role": "system", "content": "You are a helpful assistant."},
$             {"role": "user", "content": "Who won the world series in 2020?"}
$         ]
$     }'
```

Python客户端使用对话接口示例：

```python
from openai import OpenAI
# Set OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"

client = OpenAI(
    api_key=openai_api_key,
    base_url=openai_api_base,
)

chat_response = client.chat.completions.create(
    model="facebook/opt-125m",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Tell me a joke."},
    ]
)
print("Chat response:", chat_response)
```



### openai api server 参数说明

```bash
vLLM 兼容 OpenAI 的 RESTful API 服务器。

选项：
  -h, --help           显示此帮助信息并退出
  --host HOST          主机名
  --port PORT          端口号
  --uvicorn-log-level {debug,info,warning,error,critical,trace}
                       uvicorn 的日志级别
  --allow-credentials  允许凭证
  --allowed-origins ALLOWED_ORIGINS
                       允许的来源
  --allowed-methods ALLOWED_METHODS
                       允许的方法
  --allowed-headers ALLOWED_HEADERS
                       允许的头部
  --api-key API_KEY    如果提供，服务器将要求在标头中呈现此密钥。
  --lora-modules LORA_MODULES [LORA_MODULES ...]
                       LoRA 模块配置，格式为 name=path。可以指定多个模块。
  --chat-template CHAT_TEMPLATE
                       聊天模板的文件路径，或指定模型的单行形式模板
  --response-role RESPONSE_ROLE
                       如果 `request.add_generation_prompt=true`，返回的角色名称。
  --ssl-keyfile SSL_KEYFILE
                       SSL 密钥文件的路径
  --ssl-certfile SSL_CERTFILE
                       SSL 证书文件的路径
  --ssl-ca-certs SSL_CA_CERTS
                       证书颁发机构的证书文件
  --ssl-cert-reqs SSL_CERT_REQS
                       是否需要客户端证书（参见 stdlib ssl 模块）
  --root-path ROOT_PATH
                       当应用程序位于基于路径的路由代理后面时，FastAPI 的 root_path
  --middleware MIDDLEWARE
                       应用于应用程序的额外 ASGI 中间件。我们接受多个 --middleware 参数。值应为导入路径。如果提供了一个函数，vLLM 将使用 @app.middleware('http') 将其添加到服务器。如果提供了一个类，vLLM 将使用 app.add_middleware() 将其添加到服务器。
  --model MODEL        要使用的大模型名称或路径。
  --tokenizer TOKENIZER
                       要使用的分词器名称或路径。
  --skip-tokenizer-init
                       跳过分词器和去分词器初始化
  --revision REVISION  要使用的特定模型版本。可以是分支名称、标签名称或提交 id。如果未指定，将使用默认版本。
  --code-revision CODE_REVISION
                       要在 Hugging Face Hub 上使用的模型代码的特定修订版本。可以是分支名称、标签名称或提交 id。如果未指定，将使用默认版本。
  --tokenizer-revision TOKENIZER_REVISION
                       要使用的特定分词器版本。可以是分支名称、标签名称或提交 id。如果未指定，将使用默认版本。
  --tokenizer-mode {auto,slow}
                       分词器模式。* "auto" 将使用快速分词器（如果可用）。* "slow" 将始终使用慢速分词器。
  --trust-remote-code  信任来自 huggingface 的远程代码。
  --download-dir DOWNLOAD_DIR
                       下载和加载权重的目录，默认为 huggingface 的默认缓存目录。
  --load-format {auto,pt,safetensors,npcache,dummy,tensorizer}
                       要加载的模型权重格式。* "auto" 将尝试以 safetensors 格式加载权重，如果 safetensors 格式不可用，则回退到 pytorch bin 格式。* "pt" 将以 pytorch bin 格式加载权重。* "safetensors" 将以 safetensors 格式加载权重。* "npcache" 将以 pytorch 格式加载权重，并存储 numpy 缓存以加快加载速度。* "dummy" 将使用随机值初始化权重，这主要用于分析。* "tensorizer" 将使用来自 CoreWeave 的 tensorizer 加载权重，这假设 tensorizer_uri 被设置为序列化权重位置。
  --dtype {auto,half,float16,bfloat16,float,float32}
                       模型权重和激活的数据类型。* "auto" 将对 FP32 和 FP16 模型使用 FP16 精度，对 BF16 模型使用 BF16 精度。* "half" 用于 FP16。推荐用于 AWQ 量化。* "float16" 与 "half" 相同。* "bfloat16" 用于平衡精度和范围。* "float" 是 FP32 精度的缩写。* "float32" 用于 FP32 精度。
  --kv-cache-dtype {auto,fp8}
                       KV 缓存存储的数据类型。如果为 "auto"，将使用模型数据类型。FP8_E5M2（无缩放）仅在 cuda 版本大于 11.8 时支持。在 ROCm（AMD GPU）上，FP8_E4M3 反而支持常见的推理标准。
  --quantization-param-path QUANTIZATION_PARAM_PATH
                       包含 KV 缓存缩放因子的 JSON 文件的路径。这通常应该提供，当 KV 缓存 dtype 为 FP8 时。否则，KV 缓存缩放因子默认为 1.0，这可能会导致精度问题。FP8_E5M2（无缩放）仅在 cuda 版本大于 11.8 时支持。在 ROCm（AMD GPU）上，FP8_E4M3 反而支持常见的推理标准。
  --max-model-len MAX_MODEL_LEN
                       模型上下文长度。如果未指定，将自动从模型配置中派生。
  --guided-decoding-backend {outlines,lm-format-enforcer}
                       默认将使用哪个引擎进行指导解码（JSON 模式 / 正则表达式等）。目前支持 和
                       可以通过每个请求的 guided_decoding_backend 参数覆盖。
  --worker-use-ray      使用 Ray 进行分布式服务，当使用多于 1 个 GPU 时将自动设置。
  --pipeline-parallel-size PIPELINE_PARALLEL_SIZE, -pp PIPELINE_PARALLEL_SIZE
                       管道阶段的数目。
  --tensor-parallel-size TENSOR_PARALLEL_SIZE, -tp TENSOR_PARALLEL_SIZE
                       张量并行副本的数量。
  --max-parallel-loading-workers MAX_PARALLEL_LOADING_WORKERS
                       在多个批次中顺序加载模型，以避免在使用张量并行和大模型时出现 RAM OOM。
  --ray-workers-use-nsight
                       如果指定，使用 nsight 对 Ray 工作者进行性能分析。
  --block-size {8,16,32}
                       用于连续的标记块的标记块大小。
  --enable-prefix-caching
                       启用自动前缀缓存。
  --use-v2-block-manager
                       使用 BlockSpaceMangerV2。
  --num-lookahead-slots NUM_LOOKAHEAD_SLOTS
                       必要的实验性调度配置，用于投机性解码。这将在未来被投机性配置取代；在此之前，它是为了启用正确性测试而存在的。
  --seed SEED          操作的随机种子。
  --swap-space SWAP_SPACE
                       每个 GPU 的 CPU 交换空间大小（GiB）。
  --gpu-memory-utilization GPU_MEMORY_UTILIZATION
                       模型执行器将使用的 GPU 内存比例，范围从 0 到 1。例如，值为 0.5 表示 50% 的 GPU 内存利用率。如果
                       未指定，将使用默认值 0.9。
  --num-gpu-blocks-override NUM_GPU_BLOCKS_OVERRIDE
                       如果指定，忽略 GPU 分析结果并使用这个数量的 GPU 块。用于测试抢占。
  --max-num-batched-tokens MAX_NUM_BATCHED
```

