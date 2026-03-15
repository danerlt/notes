# Few-Shot 学习

## 概念介绍

Few-Shot Learning（少样本学习）是指在提示词中提供少量示例（通常 1-10 个），让模型从示例中理解任务模式，从而更准确地完成新的任务。这是 LLM 最重要的能力之一，也是提示词工程的核心技术。

Few-Shot 的变体：
- **Zero-Shot**：不提供任何示例，仅靠任务描述
- **One-Shot**：提供 1 个示例
- **Few-Shot**：提供 2-10 个示例
- **Many-Shot**：提供大量示例（受上下文窗口限制）

Few-Shot 的核心价值：通过示例"展示"而非"描述"期望的行为，弥补文字描述的歧义性。

## 核心原理

### 为什么 Few-Shot 有效

LLM 在预训练时见过大量的"输入→输出"模式。Few-Shot 示例相当于激活模型对特定模式的关注，引导模型按照示例风格生成输出。

**关键机制**：In-Context Learning（上下文学习）——模型能从上下文中提取任务规律，无需更新参数。

### Few-Shot 示例的组成

一个好的 Few-Shot 示例应包含：
1. **输入（Input）**：完整、有代表性的输入
2. **输出（Output）**：期望的输出格式和内容
3. **分隔符**：清晰区分示例与实际问题

### 示例选择原则

1. **多样性**：覆盖不同情况（正/负类、简单/复杂案例）
2. **代表性**：选择典型案例，而非边界情况
3. **一致性**：所有示例遵循相同格式
4. **相关性**：示例应与实际任务场景相似
5. **质量**：确保示例输出是正确的

## 代码示例（Python）

### 基础 Few-Shot 示例

```python
from openai import OpenAI

client = OpenAI()

# 情感分析 Few-Shot 示例
few_shot_sentiment_prompt = """以下是一些产品评论的情感分析示例：

示例1：
评论：这款耳机音质非常好，佩戴也很舒适，性价比极高！
分析：正面 | 置信度：0.95 | 关键词：音质好、舒适、性价比高

示例2：
评论：收到货发现有划痕，客服态度也很差，再也不买了。
分析：负面 | 置信度：0.98 | 关键词：有划痕、客服态度差

示例3：
评论：东西还可以吧，跟描述基本符合，就是快递慢了点。
分析：中性 | 置信度：0.75 | 关键词：基本符合、快递慢

请对以下评论进行同样的情感分析：
评论：手机屏幕很大很亮，系统流畅，但是电池不耐用，充电速度也慢。
分析："""

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": few_shot_sentiment_prompt}],
    temperature=0.1
)
print(response.choices[0].message.content)
```

### 结构化 Few-Shot（推荐格式）

```python
def build_few_shot_prompt(
    task_description: str,
    examples: list[dict],
    test_input: str,
    input_key: str = "input",
    output_key: str = "output"
) -> str:
    """构建标准化的 Few-Shot 提示词"""

    prompt_parts = [task_description, ""]

    # 添加示例
    for i, example in enumerate(examples, 1):
        prompt_parts.append(f"示例{i}：")
        prompt_parts.append(f"输入：{example[input_key]}")
        prompt_parts.append(f"输出：{example[output_key]}")
        prompt_parts.append("")

    # 添加待处理的实际输入
    prompt_parts.append("现在请处理以下输入：")
    prompt_parts.append(f"输入：{test_input}")
    prompt_parts.append("输出：")

    return "\n".join(prompt_parts)


# 信息提取示例
task_desc = "从文本中提取人名、地点和时间，并以指定格式输出。"

examples = [
    {
        "input": "2024年1月15日，张伟在北京参加了人工智能峰会。",
        "output": "人名：张伟 | 地点：北京 | 时间：2024年1月15日"
    },
    {
        "input": "李娜计划明年3月前往上海出差，与客户王总会面。",
        "output": "人名：李娜、王总 | 地点：上海 | 时间：明年3月"
    },
    {
        "input": "昨天下午，陈医生在广州某医院成功完成了一台复杂手术。",
        "output": "人名：陈医生 | 地点：广州某医院 | 时间：昨天下午"
    },
]

test_input = "2025年春节期间，赵雷和孙明将共同前往成都参与年度技术培训。"

prompt = build_few_shot_prompt(task_desc, examples, test_input)
print(prompt)
print("\n---模型输出---")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.0
)
print(response.choices[0].message.content)
```

### Few-Shot 分类器

```python
from openai import OpenAI
import json

client = OpenAI()

class FewShotClassifier:
    """基于 Few-Shot 的文本分类器"""

    def __init__(self, categories: list[str], model: str = "gpt-4o-mini"):
        self.categories = categories
        self.model = model
        self.examples = []

    def add_example(self, text: str, label: str):
        """添加训练示例"""
        assert label in self.categories, f"标签必须是以下之一: {self.categories}"
        self.examples.append({"text": text, "label": label})

    def classify(self, text: str) -> dict:
        """对文本进行分类"""
        # 构建提示词
        categories_str = "/".join(self.categories)

        prompt_lines = [
            f"请将文本分类为以下类别之一：{categories_str}",
            f"输出格式：{{\"label\": \"类别\", \"confidence\": 0.0-1.0, \"reason\": \"原因\"}}",
            ""
        ]

        # 添加 Few-Shot 示例
        for i, ex in enumerate(self.examples, 1):
            prompt_lines.append(f"示例{i}：")
            prompt_lines.append(f"文本：{ex['text']}")
            prompt_lines.append(f"分类：{{\"label\": \"{ex['label']}\", \"confidence\": 0.95, \"reason\": \"示例\"}}")
            prompt_lines.append("")

        prompt_lines.append("请分类以下文本：")
        prompt_lines.append(f"文本：{text}")
        prompt_lines.append("分类：")

        prompt = "\n".join(prompt_lines)

        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )

        result_str = response.choices[0].message.content.strip()
        try:
            return json.loads(result_str)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', result_str, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"label": "未知", "confidence": 0.0, "reason": result_str}


# 使用示例：客服工单分类
classifier = FewShotClassifier(
    categories=["产品质量问题", "物流问题", "退款请求", "咨询问题", "其他"]
)

# 添加示例
classifier.add_example("收到的商品有破损，要求退换货", "产品质量问题")
classifier.add_example("快递已经7天了还没到，请查一下", "物流问题")
classifier.add_example("我要申请退款，订单号是123456", "退款请求")
classifier.add_example("这款产品支持哪些颜色？", "咨询问题")
classifier.add_example("想了解一下你们的会员政策", "咨询问题")
classifier.add_example("我的订单一直显示待付款，但已经支付了", "其他")

# 分类测试
test_texts = [
    "买的手机屏幕出现了裂纹，使用才三天",
    "包裹什么时候能到？已经等了5天了",
    "请问这款耳机有白色款吗？",
]

for text in test_texts:
    result = classifier.classify(text)
    print(f"文本: {text}")
    print(f"分类: {result['label']} (置信度: {result['confidence']})")
    print(f"理由: {result['reason']}\n")
```

### 动态 Few-Shot：从向量库中检索相似示例

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

class DynamicFewShotSelector:
    """根据查询动态选择最相关的 Few-Shot 示例"""

    def __init__(self):
        self.examples = []
        self.embeddings = []

    def get_embedding(self, text: str) -> list[float]:
        """获取文本的向量表示"""
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding

    def add_example(self, input_text: str, output_text: str):
        """添加示例并计算其向量"""
        embedding = self.get_embedding(input_text)
        self.examples.append({"input": input_text, "output": output_text})
        self.embeddings.append(embedding)

    def cosine_similarity(self, a: list, b: list) -> float:
        """计算余弦相似度"""
        a, b = np.array(a), np.array(b)
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def select_examples(self, query: str, k: int = 3) -> list[dict]:
        """选择与查询最相似的 k 个示例"""
        if not self.examples:
            return []

        query_embedding = self.get_embedding(query)
        similarities = [
            self.cosine_similarity(query_embedding, emb)
            for emb in self.embeddings
        ]

        # 取 top-k
        top_k_indices = np.argsort(similarities)[::-1][:k]
        return [self.examples[i] for i in top_k_indices]

    def generate(self, query: str, k: int = 3) -> str:
        """使用动态选择的示例生成回答"""
        selected_examples = self.select_examples(query, k)

        # 构建提示词
        prompt_parts = ["根据以下示例，完成相似的任务：\n"]
        for i, ex in enumerate(selected_examples, 1):
            prompt_parts.append(f"示例{i}：")
            prompt_parts.append(f"输入：{ex['input']}")
            prompt_parts.append(f"输出：{ex['output']}\n")

        prompt_parts.append(f"现在请处理：\n输入：{query}\n输出：")

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "\n".join(prompt_parts)}],
            temperature=0.1
        )
        return response.choices[0].message.content
```

## 最佳实践

### Few-Shot 示例数量选择

```python
# 示例数量与效果的权衡
guidelines = {
    "0-shot": "任务描述清晰，模型已有足够先验知识时使用",
    "1-shot": "快速展示期望输出格式，节省 Token",
    "3-5 shot": "大多数分类/提取任务的最佳选择",
    "5-10 shot": "复杂格式要求或模型不熟悉的特殊任务",
    "10+ shot": "极度专业的领域，或需要展示多种边界情况",
}

# 注意：示例越多，每次请求的 Token 消耗越大，成本越高
# gpt-4o 约 $0.005/1K input tokens
# 100 个 Token 的示例 × 5 个 = 500 Token = $0.0025 额外成本
```

### 示例多样性验证

```python
def validate_example_diversity(examples: list[dict], label_key: str = "label"):
    """验证 Few-Shot 示例的标签分布"""
    from collections import Counter

    labels = [ex[label_key] for ex in examples]
    counter = Counter(labels)

    print("标签分布：")
    for label, count in counter.items():
        pct = count / len(examples) * 100
        print(f"  {label}: {count} ({pct:.1f}%)")

    # 检查是否严重不均衡
    max_pct = max(count / len(examples) for count in counter.values())
    if max_pct > 0.6:
        print("⚠️ 警告：示例标签分布不均衡，可能导致偏差")
    else:
        print("✓ 示例分布均衡")
```

## 小结

- **Few-Shot 是最实用的提示词技术之一**，通过示例消除歧义，显著提升模型输出质量
- **示例质量比数量更重要**：3 个高质量示例优于 10 个随意示例
- **示例多样性**：覆盖不同类型、边界情况，防止模型学到偏差
- **动态 Few-Shot**：使用向量检索选择与当前查询最相似的示例，是 2024-2025 年 RAG+Few-Shot 结合的最佳实践
- **Token 成本**：Few-Shot 示例会增加 Token 消耗，生产环境需权衡效果与成本
- 当 Few-Shot 效果仍不满意时，考虑微调（Fine-tuning）——收集足够数据让模型永久学习
