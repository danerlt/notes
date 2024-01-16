# FastChat

## FastChat 介绍
FastChat是一个用于训练、服务和评估基于大型语言模型的聊天机器人的开放平台。其核心功能包括：

最先进 LLM 模型的权重、训练代码和评估代码。
带有 WebUI 和与 OpenAI 兼容的 RESTful API 的分布式多模型服务系统。
FastChat 安装
FastChat 的安装方式有两种，一种是通过 Pip 进行安装，一种是通过源码安装，由于源码的方式比较复杂，这里就不介绍了，我们使用 Pip 的方式来安装。

```bash
pip install fschat
```

有些环境在安装完成后，运行 FastChat 的命令会报缺少accelerate这个依赖库的错误，所以为了安全起见，我们也一并安装accelerate这个库。

```bash
pip install accelerate
```


## FastChat 命令行部署
准备工作做好后，我们就可以使用 FastChat 来部署 LLM 了，FastChat 提供了命令行的方式来部署 LLM，命令行的方式比较简单，可以在命令行和 LLM 进行问答交互，我们先看下 FastChat 与 ChatGLM3 的命令行交互：

```bash
python -m fastchat.serve.cli --model-path /yourdirs/models/chatglm3-6b

```

报错 `RuntimeError: The NVIDIA driver on your system is too old (found version 11040). Please update your GPU driver by downloading and installing a new version from the URL: http://www.nvidia.com/Download/index.aspx Alternatively, go to: https://pytorch.org to install a PyTorch version that has been compiled with your version of the CUDA driver.`

