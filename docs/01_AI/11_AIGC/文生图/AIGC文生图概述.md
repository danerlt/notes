# AIGC 文生图概述

## 技术发展历史

文本生成图像（Text-to-Image）技术的发展经历了几个重要阶段：

**2014-2018：GAN 时代**
- 2014 年，Ian Goodfellow 提出生成对抗网络（GAN）
- DCGAN（2015）、ProGAN（2017）、StyleGAN（2018）逐步提升图像质量
- 但 GAN 训练不稳定，容易模式崩溃，且难以做到精准文字控制

**2021：多模态对齐突破**
- OpenAI 发布 DALL-E（基于 GPT 自回归模型）和 CLIP（对比学习文本-图像对齐）
- CLIP 的出现奠定了文字控制图像生成的基础

**2022：扩散模型爆发**
- Stable Diffusion 开源（2022年8月），真正让普通人能够在本地运行文生图
- Midjourney 公测，以惊艳的艺术质量吸引大量用户
- DALL-E 2 发布，质量大幅提升

**2023-2024：高速迭代**
- SDXL、SD3、Midjourney v6 不断刷新质量上限
- Flux.1（Black Forest Labs）横空出世，在提示词遵循上取得突破
- 视频生成（Sora、Runway）开始成熟，从静态延伸到动态

## 主流技术路线

### GAN（生成对抗网络）

```
随机噪声 → 生成器(Generator) → 假图像
                                  ↓
真实图像 → 判别器(Discriminator) → 真/假判断
           ↑_____________________________↑
                    对抗训练
```

- **优点**：生成速度快，图像清晰度高
- **缺点**：训练不稳定，多样性差，难以精确控制内容
- **代表**：StyleGAN3、BigGAN

### VAE（变分自编码器）

```
图像 → 编码器 → 潜在向量(z) → 解码器 → 重建图像
```

- **优点**：潜在空间连续，可插值
- **缺点**：生成图像偏模糊，质量低于 GAN
- **作用**：在 Stable Diffusion 中作为压缩图像到潜空间的工具

### Diffusion Model（扩散模型）

```
正向过程：图像 → 逐步加噪 → 纯噪声
逆向过程：纯噪声 → 逐步去噪 → 生成图像
                 ↑
           文本条件引导
```

- **优点**：生成质量高，多样性好，可精确文字控制
- **缺点**：推理速度慢（需要多步去噪）
- **代表**：Stable Diffusion、DALL-E 3、Imagen

### Autoregressive（自回归模型）

```
文本 token → ... → 图像 token 1 → 图像 token 2 → ... → 图像 token N
```

将图像量化为离散 token，像语言模型一样逐 token 生成图像。

- **优点**：统一的语言-图像建模框架
- **缺点**：生成速度慢，分辨率受限
- **代表**：DALL-E 1、LlamaGen、Chameleon

### Flow Matching（流匹配）

扩散模型的进化版本，使用更简单的线性路径替代复杂的噪声过程。

- **优点**：训练更稳定，推理步数更少，质量更高
- **代表**：Stable Diffusion 3、Flux.1

## Diffusion Model 原理简介

### 正向过程（加噪）

给图像 x₀ 逐步添加高斯噪声，经过 T 步后变为纯噪声 xT：

```python
# 伪代码示意
import numpy as np

def add_noise(image, t, beta_schedule):
    """
    image: 原始图像
    t: 时间步（0 到 T）
    beta_schedule: 每步的噪声强度
    """
    alpha = 1 - beta_schedule[t]
    alpha_bar = np.prod(alpha_schedule[:t+1])  # 累积乘积

    noise = np.random.randn(*image.shape)

    # 可以直接计算第 t 步的噪声图像（无需迭代）
    noisy_image = np.sqrt(alpha_bar) * image + np.sqrt(1 - alpha_bar) * noise
    return noisy_image, noise
```

### 逆向过程（去噪）

训练一个 U-Net 网络，预测每一步的噪声，从而逐步从噪声中恢复图像：

```python
# 伪代码示意
def denoise_step(noisy_image, t, text_embedding, unet_model):
    """
    noisy_image: 当前噪声图像
    t: 当前时间步
    text_embedding: 文本条件（CLIP 编码的提示词）
    unet_model: 训练好的去噪网络
    """
    # U-Net 预测当前噪声
    predicted_noise = unet_model(noisy_image, t, text_embedding)

    # 计算去噪后的图像（根据 DDPM 公式）
    alpha = 1 - beta_schedule[t]
    alpha_bar = compute_alpha_bar(t)

    # 减去预测的噪声
    denoised = (noisy_image - np.sqrt(1 - alpha_bar) * predicted_noise) / np.sqrt(alpha_bar)

    return denoised
```

### 文本条件引导（Classifier-Free Guidance）

```python
# CFG：无分类器引导，让生成图像更贴合文本描述
def cfg_step(noisy_image, t, text_embedding, null_embedding, guidance_scale=7.5):
    """
    guidance_scale: 引导强度，越高越贴合文字，但多样性降低
    """
    # 有条件预测（按照文本生成）
    noise_cond = unet(noisy_image, t, text_embedding)

    # 无条件预测（自由生成，用空文本）
    noise_uncond = unet(noisy_image, t, null_embedding)

    # 线性插值：强化文本相关的方向
    guided_noise = noise_uncond + guidance_scale * (noise_cond - noise_uncond)

    return guided_noise
```

## 主流模型对比

| 模型 | 开发者 | 类型 | 开源 | 优势 | 劣势 |
|------|--------|------|------|------|------|
| Midjourney v6 | Midjourney | 商业 SaaS | 否 | 艺术质量极高，美感强 | 不可本地部署，需订阅 |
| DALL-E 3 | OpenAI | 商业 API | 否 | 提示词遵循极好，文字渲染强 | 价格较高，有内容限制 |
| Stable Diffusion 3 | Stability AI | 扩散模型 | 部分 | 可本地部署，生态丰富 | 需要显卡，上手门槛高 |
| Flux.1 | Black Forest Labs | 流匹配 | 部分 | 提示词遵循强，细节精准 | 显存需求较高 |
| Ideogram 2 | Ideogram | 商业 | 否 | 文字渲染最强 | 商业产品，限制较多 |

## 提示词的重要性

文生图系统的输出质量很大程度取决于提示词（Prompt）的质量。

### 提示词结构（以 Stable Diffusion 为例）

```
[主体描述] [风格修饰] [画质词] [光照/色彩] [构图] [负面提示词]

示例：
正向：a beautiful young woman, cyberpunk city background,
      digital painting, highly detailed, 8k resolution,
      neon lighting, rule of thirds composition, artstation

负向：blurry, low quality, deformed, ugly, watermark,
      bad anatomy, extra limbs
```

### 提示词技巧

```python
# 提示词工程示例（非执行代码，为示意结构）

# 质量控制词
quality_tags = [
    "masterpiece",          # 杰作
    "best quality",         # 最高质量
    "ultra-detailed",       # 超细节
    "photorealistic",       # 照片写实
    "8k uhd",               # 超高分辨率
    "sharp focus",          # 清晰对焦
]

# 风格词
style_tags = {
    "写实": ["photorealistic", "hyperrealistic", "RAW photo"],
    "动漫": ["anime style", "manga", "studio ghibli"],
    "油画": ["oil painting", "impressionist", "claude monet"],
    "概念艺术": ["concept art", "artstation", "by greg rutkowski"],
}

# 光照词
lighting_tags = [
    "golden hour",          # 黄金时段
    "dramatic lighting",    # 戏剧性光照
    "rim lighting",         # 轮廓光
    "soft diffused light",  # 柔和漫射光
    "cinematic lighting",   # 电影感光照
]
```

## 图像质量评估指标

### FID（Fréchet Inception Distance）

衡量生成图像与真实图像在特征空间的分布距离，**越低越好**。

```python
# 使用 pytorch-fid 库计算 FID
# pip install pytorch-fid

from pytorch_fid import fid_score

# 计算两个文件夹图像的 FID
fid_value = fid_score.calculate_fid_given_paths(
    paths=["./real_images", "./generated_images"],
    batch_size=50,
    device="cuda",
    dims=2048,  # Inception v3 特征维度
)

print(f"FID Score: {fid_value:.2f}")
# FID < 10: 极好
# FID < 30: 较好
# FID > 50: 质量较差
```

### CLIP Score

衡量生成图像与对应文本描述的相关性，**越高越好（范围 0-100）**。

```python
import torch
import clip
from PIL import Image

# 加载 CLIP 模型
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

def compute_clip_score(image_path: str, prompt: str) -> float:
    """计算单张图像与提示词的 CLIP Score"""
    # 预处理图像
    image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)

    # 编码文本
    text = clip.tokenize([prompt]).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image)
        text_features = model.encode_text(text)

        # 归一化
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        # 余弦相似度（乘以 100 映射到 0-100）
        score = (100.0 * image_features @ text_features.T).item()

    return score

# 示例
score = compute_clip_score(
    "generated_image.png",
    "a cat sitting on a wooden table"
)
print(f"CLIP Score: {score:.2f}")
```

### IS（Inception Score）

衡量生成图像的质量和多样性，**越高越好**。

- 高 IS：生成的图像清晰（低熵）且多样（高边际熵）
- 缺点：与真实图像无关，可能被"欺骗"

## 应用场景与商业化

### 主要应用场景

| 场景 | 需求特点 | 推荐工具 |
|------|---------|---------|
| 概念艺术设计 | 创意强、艺术感 | Midjourney |
| 电商产品图 | 精准还原产品细节 | DALL-E 3、Flux.1 |
| 游戏资产生成 | 批量、风格一致 | SD + LoRA |
| 营销素材 | 文字清晰、品牌一致 | Ideogram、DALL-E 3 |
| 个人写真/换脸 | 人物相似度高 | SD + ControlNet |
| 建筑效果图 | 写实、精准透视 | Flux.1 dev |

### 版权与合规注意事项

- 商业使用前需确认模型授权协议（如 SD 的 RAIL 协议）
- Midjourney 的生成图像归用户所有，但需订阅 Pro 计划才可商用
- DALL-E 3 通过 API 生成的图像，OpenAI 不主张版权
- 避免生成名人肖像、受版权保护的角色（如迪士尼人物）

### 成本对比（2024 参考）

| 方案 | 成本 | 适合场景 |
|------|------|---------|
| Midjourney Pro | $60/月，无限图 | 日常创作、商业设计 |
| DALL-E 3 API | ~$0.04/张（标准） | 程序化批量生成 |
| 本地 SD（RTX 3090） | 一次性硬件成本 | 大量生成、需要完全控制 |
| Flux.1 dev（本地） | 需 24GB 显存 | 高质量、需隐私保护 |
