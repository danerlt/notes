# OpenLLM

## 什么是 OpenLLM

> OpenLLM 是一个开源平台，旨在促进大型语言模型 (LLM) 在实际应用中的部署和操作。借助 OpenLLM，您可以在任何开源 LLM 上运行推理，将其部署在云端或本地，并构建强大的 AI 应用程序。

OpenLLM是为AI应用开发人员设计的，用于构建基于LLM的生产就绪应用程序。它提供了一套全面的工具和功能，用于微调、服务、部署和监控这些模型，简化了LLM的端到端部署工作流程。


主要功能：

- 🚂 最先进的 LLM：对各种开源 LLM 和模型运行时的集成支持，包括但不限于 Llama 2、StableLM、Falcon、Dolly、Flan-T5、ChatGLM 和 StarCoder。
- 🔥 灵活的 API：使用一个命令就可以为 LLM 提供 RESTful API 或 gRPC 接口。可以使用 Web UI、CLI、Python/JavaScript 客户端或任何 HTTP 客户端与大模型进行交互。
- ⛓️ 自由构建：对 LangChain、BentoML、LlamaIndex、OpenAI 端点和 Hugging Face 提供很好支持，可以通过将 LLM 与其他模型和服务组合来轻松创建自己的 AI 应用程序。
- 🎯 简化部署：自动生成 LLM 服务对应的 Docker 映像或通过 [BentoCloud](https://l.bentoml.com/bento-cloud) 部署为 serverless 服务，它可以轻松管理 GPU 资源、根据流量进行扩展并确保成本效益。
- 🤖️ 加载自己的 LLM：根据具体需求微调任何 LLM 。可以加载 LoRA 层来微调模型，以获得特定任务的更高准确性和性能。统一的模型微调 API ( LLM.tuning() ) 即将推出。
- ⚡ 量化：使用 LLM.int8、SpQR (int4)、AWQ、GPTQ 和 SqueezeLLM 等量化技术以更少的计算和内存成本运行推理。
- 📡 流式传输：支持通过 Server-Sent（SSE）对 token 进行 流式传输。可以使用 `/v1/generate_stream` 流式传输来自 LLM 的响应。
- 🔄 连续批处理：通过 vLLM 支持连续批处理，以提高总吞吐量。

## OpenLLM 有什么用

## OpenLLM 如何使用

安装命令
```bash
pip install openllm
```

验证安装：
```bash
$ openllm -h

Usage: openllm [OPTIONS] COMMAND [ARGS]...

   ██████╗ ██████╗ ███████╗███╗   ██╗██╗     ██╗     ███╗   ███╗
  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██║     ██║     ████╗ ████║
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║     ██║     ██╔████╔██║
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║     ██║     ██║╚██╔╝██║
  ╚██████╔╝██║     ███████╗██║ ╚████║███████╗███████╗██║ ╚═╝ ██║
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝     ╚═╝.

  An open platform for operating large language models in production.
  Fine-tune, serve, deploy, and monitor any LLMs with ease.

Options:
  -v, --version  Show the version and exit.
  -h, --help     Show this message and exit.

Commands:
  build       Package a given models into a BentoLLM.
  import      Setup LLM interactively.
  models      List all supported models.
  prune       Remove all saved models, (and optionally bentos) built with OpenLLM locally.
  query       Query a LLM interactively, from a terminal.
  start       Start a LLMServer for any supported LLM.
  start-grpc  Start a gRPC LLMServer for any supported LLM.

Extensions:
  build-base-container  Base image builder for BentoLLM.
  dive-bentos           Dive into a BentoLLM.
  get-containerfile     Return Containerfile of any given Bento.
  get-prompt            Get the default prompt used by OpenLLM.
  list-bentos           List available bentos built by OpenLLM.
  list-models           This is equivalent to openllm models...
  playground            OpenLLM Playground.
```


以 chatglm 模型为例，启动模型：

安装依赖：
```bash
pip install "openllm[chatglm]"
pip install "openllm[vllm]"
```

启动命令：
```bash
TRUST_REMOTE_CODE=True openllm start /yourdir/models/chatglm3-6b  --backend vllm -p 3333
```

运行过程中报错：
![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-01-05-kHvgUD.png)

需要设置环境变量 `OPENBLAS_NUM_THREADS=1`

```bash
OPENBLAS_NUM_THREADS=1 TRUST_REMOTE_CODE=True nohup openllm start /yourdir/models/chatglm3-6b  --backend vllm -p 3333 >> chatglm.log 2>&1
```

启动成功后，访问 `http://localhost:3333` 即可看到模型的推理结果。

使用 chatglm 模型启动成功之后无法使用，切换成 baichuan 模型：

```bash
cmd="env OPENBLAS_NUM_THREADS=1 TRUST_REMOTE_CODE=True openllm start /yourdir/models/Baichuan2-13B-Chat  --backend vllm -p 3334"
nohup $cmd > baichuan.log 2>&1;
```

运行报错 `RuntimeError: The NVIDIA driver on your system is too old (found version 11040)`：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-01-05-riCyfc.png)

换用 bakend 为 pytorch 再试一下：

```bash
cmd="env OPENBLAS_NUM_THREADS=1 TRUST_REMOTE_CODE=True openllm start /yourdir/models/Baichuan2-13B-Chat  --backend pt -p 3334"
nohup $cmd > baichuan.log 2>&1;
```

运行报错 `torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.20 GiB (GPU 0; 39.59 GiB total capacity; 20.60 GiB already allocated; 26.19 MiB free; 20.60 GiB reserved in total by PyTorch) If reserved memory is >> allocated memory try setting max_split_size_mb to avoid fragmentation.  See documentation for Memory Management and PYTORCH_CUDA_ALLOC_CONF
`


## 参考链接

- [OpenLLM Github](https://github.com/bentoml/OpenLLM)
- [使用 OpenLLM 构建和部署大模型应用](https://mp.weixin.qq.com/s/QPYZXyv8FzdcXH1vX7iYSA)
