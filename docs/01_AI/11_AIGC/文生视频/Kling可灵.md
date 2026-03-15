# Kling 可灵

## 简介

Kling（可灵）是快手大模型团队开发的视频生成 AI 产品，于 2024 年 6 月正式发布。作为国产视频生成领域的代表性产品，可灵在运动幅度、物理真实感和视频时长方面均处于业界领先水平。

**核心优势：**
- 国内可直接访问，无需代理
- 支持最长 3 分钟的视频生成
- 运动幅度大，动态效果出色
- 物理真实感强（尤其是人物动作）
- 提供开放 API，支持商业集成
- 持续迭代更新，版本快速演进

**官方网站：** [klingai.com](https://klingai.com)

---

## 版本演进

### Kling 1.0（2024.06）

首个正式版本，奠定了可灵的技术基础：
- 支持文生视频和图生视频
- 最长支持 3 分钟视频生成
- 1080p 分辨率
- 运动幅度相比竞品有明显优势

### Kling 1.5（2024.09）

重大质量升级：
- 画面清晰度和细节大幅提升
- 人物面部一致性改善
- 支持摄像机运动控制
- 视频流畅度提升
- 语义理解能力增强

### Kling 1.6（2024.11）

专项优化：
- 运动合理性进一步提升
- 手部变形问题有所改善
- 新增更多摄像机运动选项
- 图生视频效果提升

### Kling 2.0（2025）

架构级升级：
- 全新模型架构，综合质量跃升
- 更强的物理世界理解
- 支持更复杂的运动轨迹
- 角色一致性显著提升
- Master 版本专为专业创作设计

---

## 主要功能

### 文生视频

根据文字描述直接生成视频，是最基础也最常用的功能。

**参数设置：**

| 参数 | 可选值 | 说明 |
|------|--------|------|
| 创意程度 | 0.0 - 1.0 | 越高越有创意，但可能偏离提示词 |
| 视频时长 | 5s / 10s | 单次生成时长 |
| 分辨率 | 720p / 1080p | 视频分辨率 |
| 宽高比 | 16:9 / 9:16 / 1:1 / 4:3 / 3:4 | 适配不同平台 |
| 摄像机运动 | 多种预设 | 控制镜头运动方式 |

**摄像机运动预设：**
- 固定（Static）
- 缓慢平移（Slow Pan）
- 推进（Dolly In）
- 拉远（Dolly Out）
- 俯仰（Tilt Up / Tilt Down）
- 环绕（Orbit）
- 跟随（Follow）
- 手持（Handheld）

### 图生视频

上传一张图片，以该图片为起点生成视频。这是可灵的招牌功能之一，在保持图片内容一致性的同时添加动态效果。

**使用场景：**
- 将静态产品图转化为展示视频
- 将概念设计图制作成动态演示
- 将照片制作成动态纪念视频
- 为已有素材添加特定运动效果

**运动幅度控制（图生视频专属）：**

| 级别 | 描述 |
|------|------|
| 小 | 细微动作，保持整体构图 |
| 中 | 适度运动，兼顾变化与稳定 |
| 大 | 大幅运动，场景变化明显 |

### 视频续写

在已有视频基础上继续生成后续内容，保持视频的连贯性。

**应用场景：**
- 单次生成 5s 不够时，续写延长
- 为故事性视频添加结局
- 将多段独立视频统一成长片

### 首帧 / 尾帧控制

通过指定开始帧或结束帧图片，精确控制视频的起点和终点。

```
开始图片 → [AI 生成过渡] → 结束图片
```

这一功能特别适合制作两个状态之间的变换效果，例如：
- 白天变黑夜
- 花朵绽放
- 物体形变

### 对口型（Lip Sync）

上传人物视频 + 音频，自动生成嘴唇与音频同步的视频。支持用于数字人内容创作。

---

## 使用方式

### 网页版

1. 访问 [klingai.com](https://klingai.com)
2. 注册/登录账号（支持手机号、微信登录）
3. 选择功能：文生视频 / 图生视频
4. 输入提示词，配置参数
5. 点击生成，等待队列

**积分说明：**

| 操作 | 消耗积分 |
|------|---------|
| 文生视频 5s（标准） | 10 积分 |
| 文生视频 10s（标准） | 20 积分 |
| 文生视频 5s（高质量） | 35 积分 |
| 图生视频 5s | 10 积分 |

新用户有免费积分赠送，也可通过每日签到获取少量积分。

### API 接入

可灵提供 RESTful API，适合开发者集成到自己的应用中。

**API 地址：** `https://api.klingai.com`

**鉴权方式：** JWT Token（需要 AccessKey 和 SecretKey）

#### 快速开始

**安装依赖（Python）：**
```bash
pip install requests pyjwt
```

**生成 JWT Token：**
```python
import jwt
import time

def generate_token(access_key: str, secret_key: str) -> str:
    headers = {
        "alg": "HS256",
        "typ": "JWT"
    }
    payload = {
        "iss": access_key,
        "exp": int(time.time()) + 1800,  # 30分钟有效期
        "nbf": int(time.time()) - 5
    }
    token = jwt.encode(
        payload,
        secret_key,
        algorithm="HS256",
        headers=headers
    )
    return token
```

**文生视频 API 示例：**
```python
import requests
import time

ACCESS_KEY = "your_access_key"
SECRET_KEY = "your_secret_key"

def create_video_task(prompt: str, duration: int = 5) -> str:
    """创建文生视频任务，返回任务ID"""
    token = generate_token(ACCESS_KEY, SECRET_KEY)

    url = "https://api.klingai.com/v1/videos/text2video"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "model_name": "kling-v1",
        "prompt": prompt,
        "negative_prompt": "模糊, 低质量, 变形",
        "cfg_scale": 0.5,
        "mode": "std",          # std: 标准模式, pro: 专业模式
        "duration": str(duration),  # "5" 或 "10"
        "aspect_ratio": "16:9"
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if result["code"] == 0:
        task_id = result["data"]["task_id"]
        print(f"任务创建成功，ID: {task_id}")
        return task_id
    else:
        raise Exception(f"任务创建失败: {result['message']}")


def query_video_task(task_id: str) -> dict:
    """查询任务状态"""
    token = generate_token(ACCESS_KEY, SECRET_KEY)

    url = f"https://api.klingai.com/v1/videos/text2video/{task_id}"
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, headers=headers)
    return response.json()


def wait_for_video(task_id: str, timeout: int = 300) -> str:
    """等待视频生成完成，返回视频URL"""
    start_time = time.time()

    while time.time() - start_time < timeout:
        result = query_video_task(task_id)

        if result["code"] == 0:
            status = result["data"]["task_status"]

            if status == "succeed":
                video_url = result["data"]["task_result"]["videos"][0]["url"]
                print(f"视频生成成功: {video_url}")
                return video_url
            elif status == "failed":
                raise Exception(f"视频生成失败: {result['data'].get('task_status_msg')}")
            else:
                print(f"当前状态: {status}，等待中...")

        time.sleep(10)  # 每10秒查询一次

    raise TimeoutError("视频生成超时")


# 使用示例
if __name__ == "__main__":
    prompt = "一只可爱的橘猫坐在窗台上，望着窗外的雨景，慢镜头，温暖的室内光"
    task_id = create_video_task(prompt, duration=5)
    video_url = wait_for_video(task_id)
    print(f"下载地址: {video_url}")
```

**图生视频 API 示例：**
```python
import base64

def create_image2video_task(image_path: str, prompt: str) -> str:
    """图生视频任务"""
    token = generate_token(ACCESS_KEY, SECRET_KEY)

    # 读取图片并转为 base64
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    url = "https://api.klingai.com/v1/videos/image2video"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "model_name": "kling-v1",
        "image": image_b64,
        "image_tail": None,      # 结束帧图片，可选
        "prompt": prompt,
        "negative_prompt": "",
        "cfg_scale": 0.5,
        "mode": "std",
        "duration": "5"
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if result["code"] == 0:
        return result["data"]["task_id"]
    else:
        raise Exception(f"任务创建失败: {result['message']}")
```

---

## 提示词技巧

### 基础结构

可灵对中文提示词支持良好，推荐中文描述：

```
[镜头语言] [主体描述] [动作细节] [场景环境] [风格氛围]
```

### 有效关键词

**镜头运动：**
```
推镜头、拉镜头、摇镜头、跟镜头、环绕拍摄
固定镜头、手持镜头、俯拍、仰拍、航拍
```

**风格词汇：**
```
电影感、纪录片风格、广告大片、商业摄影
写实风格、唯美、史诗感、小清新
4K 超清、高帧率、慢动作
```

**光线氛围：**
```
黄金时段光、蓝调时刻、丁达尔光、逆光
柔和散射光、戏剧性强光、霓虹光、烛光
```

### 实用提示词示例

**人物类：**
```
一位身着白色旗袍的东方女性站在水墨山水画前，
微风吹动发丝和衣袂，
固定机位慢慢推进，
电影感，自然光，写实风格
```

**自然风光：**
```
黄金时段，西藏高原的雪山倒映在圣湖中，
远处有牦牛群缓慢走动，
低角度航拍慢慢抬升，
宏大史诗感，纪录片风格，4K
```

**产品展示：**
```
一杯精品咖啡放在木质桌面上，
咖啡表面拉花清晰可见，蒸汽缓缓升起，
镜头缓慢环绕，
商业广告风格，暖色调，高清
```

**动态场景：**
```
城市夜景延时摄影，
车流形成光轨在立交桥上流动，
霓虹灯和建筑灯光交相辉映，
航拍俯视角度缓慢旋转，
赛博朋克风格
```

### 常见坑点

1. **避免描述手部细节**：可灵对手指处理仍有局限，不要特写手部
2. **人物数量控制**：单镜头内人物越少越好，尽量不超过 2 人
3. **文字内容**：不要期望生成准确的文字，如有需要后期叠加
4. **极端运动**：过于复杂的运动轨迹（如 360 度翻转）效果不稳定

---

## 参数调优指南

### 创意程度（CFG Scale）

```
低 (0.0-0.3)：紧贴提示词，结果更稳定，但可能略显刻板
中 (0.4-0.6)：平衡创意与准确，推荐日常使用
高 (0.7-1.0)：更有创意，但可能偏离描述，适合风格化内容
```

### 模式选择

- **标准模式（std）**：速度快，积分消耗少，适合快速测试
- **专业模式（pro）**：质量更高，细节更丰富，适合最终出片

### 负向提示词（Negative Prompt）

推荐的通用负向提示词：
```
模糊, 低分辨率, 变形, 抖动, 闪烁, 噪点, 失真,
重影, 不自然的运动, 多余的肢体
```

---

## 工作流建议

### 快速迭代工作流

```
1. 用简洁提示词生成 5s 测试版（标准模式）
2. 确认构图和动作满意
3. 优化提示词，生成 10s 完整版（专业模式）
4. 如需要更长视频，使用"续写"功能延长
5. 用剪映/PR 配乐剪辑
```

### 图生视频工作流

```
1. 用 Midjourney 或 FLUX 生成高质量概念图
2. 导入可灵图生视频功能
3. 写简洁的动作描述提示词
4. 调整运动幅度（小/中/大）
5. 生成并评估，不满意则调整运动幅度或提示词
```

### API 批量生成工作流

```python
# 批量生成场景示例
prompts = [
    "场景一描述...",
    "场景二描述...",
    "场景三描述..."
]

task_ids = []
for prompt in prompts:
    task_id = create_video_task(prompt)
    task_ids.append(task_id)
    time.sleep(2)  # 避免请求过频

# 并发等待所有任务
results = []
for task_id in task_ids:
    video_url = wait_for_video(task_id)
    results.append(video_url)
```

---

## 与同类产品对比

| 对比维度 | Kling 可灵 | Sora | Runway Gen-3 | Pika |
|---------|-----------|------|--------------|------|
| **国内访问** | 直接访问 | 需代理 | 需代理 | 需代理 |
| **最长时长** | 3分钟 | 60s | 10s | 10s |
| **运动幅度** | 最大 | 大 | 中 | 中 |
| **物理真实感** | 强 | 最强 | 强 | 一般 |
| **API** | 完整 REST API | 有限 | 完整 | 有 |
| **价格** | 较低 | 较高 | 中等 | 较低 |
| **中文支持** | 原生中文 | 英文为主 | 英文为主 | 英文为主 |
| **图生视频** | 优秀 | 良好 | 优秀 | 良好 |
