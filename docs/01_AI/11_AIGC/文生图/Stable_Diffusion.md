# Stable Diffusion

## SD 原理：潜在扩散模型（LDM）

Stable Diffusion 的全称是 **Latent Diffusion Model（潜在扩散模型）**，由 Stability AI 与 CompVis 实验室联合开发，于 2022 年 8 月开源。

与直接在像素空间操作的扩散模型不同，SD 的核心创新是**将扩散过程移到低维潜在空间**，极大降低了计算量：

```
文本提示词
    ↓  CLIP Text Encoder
文本向量 (77 × 768)
    ↓
    ├─── 随机噪声 (64×64×4 潜变量)
    ↓        ↓
    U-Net（去噪网络，每步用 Cross-Attention 注入文本条件）
    ↓
去噪后的潜变量 (64×64×4)
    ↓  VAE Decoder
最终图像 (512×512×3 像素)
```

**关键优势**：
- 在 64×64 的潜空间操作（而非 512×512 的像素空间），计算量降低 ~48 倍
- 消费级 GPU（8GB 显存）即可运行
- 开源，支持大量社区扩展

## 关键组件详解

### VAE（变分自编码器）

VAE 负责在**像素空间**和**潜在空间**之间转换：

```python
# VAE 的压缩比为 8x
# 512×512 像素图像 → 64×64×4 潜变量（通道数从 3 变为 4）

# 编码：图像 → 潜变量（生成时将初始噪声加到潜变量空间）
latent = vae.encode(image)      # shape: [1, 4, 64, 64]

# 解码：潜变量 → 图像（最后一步将去噪结果转回像素）
image = vae.decode(latent)      # shape: [1, 3, 512, 512]
```

VAE 对图像细节影响很大，高质量 VAE（如 SD1.5 社区微调的 VAE-ft-mse）可以显著改善色彩饱和度和细节清晰度。

### U-Net（去噪主干网络）

U-Net 是 SD 中参数量最大的组件，负责预测并去除潜变量中的噪声：

```
输入：[噪声潜变量, 时间步 t, 文本向量]
  ↓
编码器（下采样）：3个分辨率级别，每级包含 ResNet + Self-Attention + Cross-Attention
  ↓
中间层：最低分辨率处理
  ↓
解码器（上采样）：通过跳跃连接与编码器对应层合并
  ↓
输出：预测的噪声 ε（与输入噪声潜变量形状相同）
```

**Cross-Attention** 是文本控制图像的关键机制：
- Query 来自图像特征
- Key、Value 来自文本向量
- 让每个图像区域"关注"最相关的文本词汇

### CLIP Text Encoder

将用户输入的提示词编码为向量，注入 U-Net 的 Cross-Attention 层：

```python
# SD 1.x 使用 OpenAI CLIP ViT-L/14
# 最大 token 数：77
# 输出维度：77 × 768

import torch
from transformers import CLIPTextModel, CLIPTokenizer

tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-large-patch14")
text_encoder = CLIPTextModel.from_pretrained("openai/clip-vit-large-patch14")

prompt = "a majestic lion in the savanna, golden hour, photorealistic"
tokens = tokenizer(
    prompt,
    padding="max_length",
    max_length=77,       # 超过 77 token 的内容会被截断
    truncation=True,
    return_tensors="pt"
)

with torch.no_grad():
    text_embeddings = text_encoder(tokens.input_ids)[0]
    # shape: [1, 77, 768]
```

## SD 版本演进

| 版本 | 基础分辨率 | Text Encoder | 特点 |
|------|-----------|--------------|------|
| SD 1.4/1.5 | 512×512 | CLIP ViT-L | 生态最丰富，LoRA/ControlNet 插件多 |
| SD 2.0/2.1 | 768×768 | OpenCLIP ViT-H | 质量提升但社区生态不如 1.x |
| SDXL 1.0 | 1024×1024 | 双 CLIP | 质量大幅提升，引入 Refiner |
| SD 3.0/3.5 | 1024×1024 | T5-XXL + 双 CLIP | 引入 Flow Matching，文字渲染改善 |

### SDXL 架构改进

SDXL 相较 SD 1.x 有以下关键改进：

```python
# SDXL 使用双 Text Encoder
# 1. CLIP ViT-L（与 SD1.x 相同）
# 2. OpenCLIP ViT-bigG（更大，理解能力更强）
# 两个编码器的输出拼接后输入 U-Net

# SDXL 引入 size conditioning
# 在训练时将图像尺寸信息也注入网络，改善低分辨率图像质量

# SDXL 基础模型 + Refiner 两阶段生成
# Base Model: 生成初始潜变量
# Refiner Model: 在高时间步（加少量噪声后）进一步精化细节
```

## WebUI（AUTOMATIC1111）使用指南

AUTOMATIC1111 的 [stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) 是最流行的 SD 图形界面。

### 安装

```bash
# 克隆仓库
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Windows：直接运行
webui-user.bat

# Linux/Mac
bash webui.sh
```

### 关键参数说明

```
Sampling Steps（采样步数）：
  - 推荐值：20-30 步（更多步不一定更好，边际效益递减）
  - DPM++ 2M Karras 采样器：20 步即可达到较好效果

CFG Scale（提示词引导强度）：
  - 推荐值：7-12
  - 过低：图像偏离提示词，过高：图像过饱和/变形

Seed（随机种子）：
  - -1：每次随机
  - 固定值：可以复现相同图像
  - 调整提示词时固定 seed，便于对比效果差异

Denoising Strength（重绘强度，img2img 中使用）：
  - 0.4-0.6：保留原图结构，改变风格
  - 0.7-0.9：大幅修改，只保留大致构图
```

### 通过 API 调用

```python
import requests
import base64
from PIL import Image
import io

# WebUI 需要启动时加上 --api 参数
# python launch.py --api

def generate_image(
    prompt: str,
    negative_prompt: str = "",
    steps: int = 20,
    cfg_scale: float = 7.5,
    width: int = 512,
    height: int = 512,
    seed: int = -1,
) -> Image.Image:
    """调用 AUTOMATIC1111 WebUI API 生成图像"""

    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": steps,
        "cfg_scale": cfg_scale,
        "width": width,
        "height": height,
        "seed": seed,
        "sampler_name": "DPM++ 2M Karras",
    }

    response = requests.post(
        "http://127.0.0.1:7860/sdapi/v1/txt2img",
        json=payload,
        timeout=120,
    )
    response.raise_for_status()

    # 解码 base64 图像
    image_data = base64.b64decode(response.json()["images"][0])
    image = Image.open(io.BytesIO(image_data))
    return image


# 使用示例
img = generate_image(
    prompt="a cyberpunk cityscape at night, neon lights, rain, cinematic, 8k",
    negative_prompt="blurry, low quality, watermark",
    steps=25,
    cfg_scale=8,
    width=768,
    height=512,
)
img.save("output.png")
```

## ComfyUI 工作流

ComfyUI 是节点式工作流界面，灵活性远超 WebUI，适合构建复杂的生成流程。

```
[CLIP Text Encode(+)] ──┐
                         ├──> [KSampler] ──> [VAE Decode] ──> [Save Image]
[CLIP Text Encode(-)] ──┘       ↑
                                 │
[Load Checkpoint] ──> [MODEL]────┘
                  └──> [VAE] ──────────────────────────────┘
                  └──> [CLIP] ──> 两个 Text Encode 节点
```

通过 Python API 调用 ComfyUI：

```python
import json
import requests

# ComfyUI 工作流（JSON 格式）
workflow = {
    "3": {  # KSampler
        "class_type": "KSampler",
        "inputs": {
            "model": ["4", 0],          # 引用节点 4 的第 0 个输出
            "positive": ["6", 0],        # 正向提示词
            "negative": ["7", 0],        # 负向提示词
            "latent_image": ["5", 0],    # 空白潜变量
            "seed": 42,
            "steps": 20,
            "cfg": 8.0,
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "denoise": 1.0,
        }
    },
    "4": {  # CheckpointLoaderSimple
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}
    },
    # ... 其他节点
}

response = requests.post(
    "http://127.0.0.1:8188/prompt",
    json={"prompt": workflow}
)
print(response.json())
```

## LoRA 模型

LoRA（Low-Rank Adaptation）是一种轻量级微调方法，文件很小（通常 10-150MB），可以在不修改基础模型的情况下改变生成风格或新增概念。

### 使用 LoRA

```python
# 在 WebUI 提示词中使用 LoRA
prompt = """
a portrait of a woman, oil painting style
<lora:oil_painting_style:0.8>   # 使用 LoRA，权重 0.8
<lora:add_detail:0.5>           # 叠加多个 LoRA
"""

# 使用 diffusers 库加载 LoRA
from diffusers import StableDiffusionPipeline
import torch

pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
).to("cuda")

# 加载 LoRA 权重
pipe.load_lora_weights(
    ".",
    weight_name="my_lora.safetensors",
)

# 生成图像
image = pipe(
    prompt="a beautiful landscape in the style of van gogh",
    cross_attention_kwargs={"scale": 0.8},  # LoRA 强度
).images[0]
```

### 训练 LoRA

```bash
# 使用 kohya_ss 训练 LoRA
# 准备训练数据：10-30 张高质量图像 + 文字描述

python train_network.py \
    --pretrained_model_name_or_path="runwayml/stable-diffusion-v1-5" \
    --train_data_dir="./training_data" \
    --output_dir="./output_lora" \
    --network_module=networks.lora \
    --network_dim=32 \          # LoRA rank，越大表达能力越强但文件越大
    --network_alpha=16 \
    --learning_rate=1e-4 \
    --max_train_steps=1000
```

## ControlNet

ControlNet 通过额外的条件信号（深度图、姿势、边缘等）精确控制图像的结构和构图。

```python
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
from diffusers.utils import load_image
import torch
import numpy as np
from PIL import Image
import cv2

# 加载 ControlNet（以 Canny 边缘检测为例）
controlnet = ControlNetModel.from_pretrained(
    "lllyasviel/sd-controlnet-canny",
    torch_dtype=torch.float16
)

pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float16
).to("cuda")

# 准备控制图像（提取 Canny 边缘）
original_image = load_image("./reference.jpg")
image_array = np.array(original_image)

# 检测边缘
edges = cv2.Canny(image_array, 100, 200)
canny_image = Image.fromarray(edges)

# 基于边缘图生成新图像（保持构图，改变风格）
result = pipe(
    prompt="a beautiful landscape, oil painting, masterpiece",
    negative_prompt="blurry, low quality",
    image=canny_image,
    controlnet_conditioning_scale=0.8,  # 控制强度
    num_inference_steps=20,
).images[0]

result.save("controlled_output.png")
```

### 常用 ControlNet 类型

| 类型 | 输入 | 控制效果 |
|------|------|---------|
| Canny | 边缘图 | 控制轮廓和边缘 |
| Depth | 深度图 | 控制空间层次感 |
| OpenPose | 人体骨骼图 | 精确控制人物姿势 |
| Scribble | 草图 | 将简单草图转为精细图像 |
| Tile | 高分辨率图 | 图像超分/细节增强 |
| IP-Adapter | 参考图 | 保持参考图的风格/内容 |

## 提示词技巧

### 正向提示词结构

```
# 推荐结构（从重要到次要）
[主体] + [主体细节] + [场景/背景] + [风格] + [质量词] + [光照] + [摄影参数]

示例：
"A young woman with long black hair,
wearing a red dress,
standing in a neon-lit Tokyo street at night,
cyberpunk aesthetic, anime style,
masterpiece, best quality, ultra-detailed,
dramatic lighting, bokeh background,
shot on Canon EOS R5, 85mm lens"
```

### 权重控制语法

```
# AUTOMATIC1111 语法
(word:1.3)        → 提高权重到 1.3x（默认 1.0）
[word:0.8]        → 降低权重到 0.8x（等价 (word:0.8)）
(word)            → 轻微提高权重（1.05x 左右）
[[word]]          → 轻微降低权重
(highly detailed:1.5)  → 强调某个属性

# 示例
"(masterpiece:1.2), best quality,
a (beautiful:1.3) landscape,
(mountains:1.1) in the background,
[simple background:0.8]"
```

### 负向提示词模板

```
# 通用负向提示词
negative_prompt = """
nsfw, lowres, bad anatomy, bad hands, text, error,
missing fingers, extra digit, fewer digits, cropped,
worst quality, low quality, normal quality, jpeg artifacts,
signature, watermark, username, blurry,
bad feet, mutation, deformed, ugly,
extra limbs, cloned face, disfigured, gross proportions,
malformed limbs, missing arms, missing legs,
extra arms, extra legs, mutated hands, fused fingers,
too many fingers, long neck
"""
```

### 常见问题解决

```
手部变形：添加 "(perfect hands:1.4), (detailed hands:1.3)"
         负向：bad hands, missing fingers, extra fingers, deformed hands

面部失真：使用 ADetailer 插件自动修复面部
         或 img2img 局部重绘（Inpaint）

分辨率低：使用 Hires.fix（WebUI 内置）
         或 Ultimate SD Upscale 脚本（4x 放大）

颜色异常：检查 VAE 是否正确加载
         建议使用 vae-ft-mse-840000-ema-pruned.ckpt
```
