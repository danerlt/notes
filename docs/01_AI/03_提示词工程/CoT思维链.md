# CoT 思维链

## 概念介绍

Chain-of-Thought（CoT，思维链）是由 Google 研究团队在 2022 年提出的提示词技术。其核心思想是：通过引导模型在给出最终答案之前，**逐步展示推理过程**，从而显著提升模型在复杂推理任务上的准确率。

CoT 的本质：把一个复杂问题拆解为多个简单步骤，模型在每一步都有明确的推理目标，减少"跳步"导致的错误。

CoT 的效果最为显著的任务类型：
- 数学应用题
- 多步骤逻辑推理
- 常识推理
- 代码调试
- 复杂决策分析

## 核心原理

### Standard Prompting vs. CoT Prompting

**Standard Prompting（无 CoT）**：
```
问题：Roger 有 5 个网球。他买了 2 罐网球，每罐 3 个。他现在有多少个网球？
答案：11
```

**CoT Prompting（有思维链）**：
```
问题：Roger 有 5 个网球。他买了 2 罐网球，每罐 3 个。他现在有多少个网球？
思考过程：
- Roger 起始有 5 个网球
- 他买了 2 罐，每罐 3 个，共买了 2 × 3 = 6 个
- 总计：5 + 6 = 11 个
答案：11
```

### Zero-Shot CoT

2022 年发现，仅仅在提示词末尾加上 **"Let's think step by step"**（让我们一步一步思考）就能大幅提升推理准确率，无需提供示例。

中文版：
- "让我们一步步思考："
- "请逐步分析："
- "首先，然后，最后..."

### Few-Shot CoT

提供包含完整推理链的示例，效果比 Zero-Shot CoT 更稳定：

```
问题：一家商店有 50 件T恤，卖了 20 件后进了 30 件，然后又卖了 15 件。还剩多少件？
思考：
1. 起始：50 件
2. 卖出 20 件后：50 - 20 = 30 件
3. 进货 30 件后：30 + 30 = 60 件
4. 又卖出 15 件：60 - 15 = 45 件
答案：45 件

问题：[新问题]
思考：
```

### 思维链的变体

| 变体 | 特点 | 适用场景 |
|------|------|----------|
| Zero-Shot CoT | 简单，无需示例 | 一般推理任务 |
| Few-Shot CoT | 稳定，需示例 | 特定领域任务 |
| Self-Consistency | 多次采样取多数 | 需要更高准确率 |
| Tree-of-Thoughts (ToT) | 树形探索多条路径 | 复杂决策 |
| Graph-of-Thoughts | 图结构推理 | 复杂依赖关系 |
| ReAct | 推理+行动交替 | Agent 任务 |
| o1/o3 Extended Thinking | 模型内部推理 | OpenAI 推理模型 |

## 代码示例（Python）

### Zero-Shot CoT

```python
from openai import OpenAI

client = OpenAI()

def zero_shot_cot(question: str, model: str = "gpt-4o") -> dict:
    """使用 Zero-Shot CoT 回答问题"""

    # 方式一：简单 CoT 触发
    cot_prompt = f"{question}\n\n让我们一步一步地思考："

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "你是一个善于逻辑推理的助手。请展示完整的推理过程。"
            },
            {"role": "user", "content": cot_prompt}
        ],
        temperature=0.1
    )

    reasoning = response.choices[0].message.content

    # 方式二：两阶段 CoT（先推理，再提取答案）
    extract_prompt = f"""
基于以下推理过程，给出最终简洁的答案：

推理过程：
{reasoning}

最终答案（只给出答案，不要重复推理过程）："""

    final_response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": extract_prompt}],
        temperature=0.0
    )

    return {
        "reasoning": reasoning,
        "answer": final_response.choices[0].message.content
    }


# 测试
question = "一个蜗牛在井底，井深 10 米。每天白天爬 3 米，夜晚滑落 2 米。几天后能爬出井口？"
result = zero_shot_cot(question)
print("推理过程：")
print(result["reasoning"])
print("\n最终答案：")
print(result["answer"])
```

### Few-Shot CoT

```python
from openai import OpenAI

client = OpenAI()

# 构建带有完整推理链的 Few-Shot 示例
MATH_COT_EXAMPLES = [
    {
        "question": "小明有20元，买了一本定价15元的书打8折，还剩多少钱？",
        "chain": """
分析：
1. 书的原价是 15 元
2. 打 8 折后的价格：15 × 0.8 = 12 元
3. 小明还剩：20 - 12 = 8 元
""",
        "answer": "8 元"
    },
    {
        "question": "工厂计划20天完成任务，实际每天多生产10%，提前几天完成？",
        "chain": """
分析：
1. 设每天计划产量为 x，总任务量为 20x
2. 实际每天生产 x × (1 + 10%) = 1.1x
3. 实际完成天数：20x ÷ 1.1x = 20/1.1 ≈ 18.18 天
4. 取整为 19 天（第19天可完成）
5. 提前：20 - 19 = 1 天
（更精确：20 - 20/1.1 = 20 × 0.1/1.1 ≈ 1.82天，约提前2天）
""",
        "answer": "提前约 1-2 天完成"
    }
]

def few_shot_cot(question: str, examples: list[dict] = None) -> str:
    """使用 Few-Shot CoT 解答数学题"""

    if examples is None:
        examples = MATH_COT_EXAMPLES

    # 构建提示词
    prompt_parts = [
        "请解答以下数学题，先展示详细的推理过程，再给出最终答案。\n"
    ]

    for i, ex in enumerate(examples, 1):
        prompt_parts.append(f"例题{i}：{ex['question']}")
        prompt_parts.append(f"推理过程：{ex['chain'].strip()}")
        prompt_parts.append(f"最终答案：{ex['answer']}\n")

    prompt_parts.append(f"现在请解答：{question}")
    prompt_parts.append("推理过程：")

    prompt = "\n".join(prompt_parts)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=800
    )

    return response.choices[0].message.content


result = few_shot_cot("一列火车长200米，以60km/h的速度穿过一座长400米的桥，需要多少秒？")
print(result)
```

### Self-Consistency CoT（提升准确率）

```python
from openai import OpenAI
from collections import Counter
import re

client = OpenAI()

def self_consistency_cot(
    question: str,
    n_samples: int = 5,
    model: str = "gpt-4o"
) -> dict:
    """
    Self-Consistency CoT：多次生成，取多数答案
    适合有明确答案的推理任务（数学、逻辑判断等）
    """

    prompt = f"""请解答以下问题，展示完整推理过程并给出最终答案。

问题：{question}

推理过程（让我们一步步思考）："""

    answers = []
    reasonings = []

    for i in range(n_samples):
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,  # 使用较高温度增加多样性
            max_tokens=600
        )

        full_response = response.choices[0].message.content
        reasonings.append(full_response)

        # 提取最终答案（寻找最后出现的数字或明确的答案陈述）
        lines = full_response.split('\n')
        answer_line = ""
        for line in reversed(lines):
            if any(kw in line for kw in ['答案', '结果', '所以', '因此', '共', '总计']):
                answer_line = line
                break

        # 提取数字
        numbers = re.findall(r'-?\d+\.?\d*', answer_line or full_response)
        if numbers:
            answers.append(numbers[-1])  # 取最后一个数字作为答案
        else:
            answers.append(full_response.split('\n')[-1].strip())

    # 投票选出最多数答案
    answer_counter = Counter(answers)
    most_common_answer, vote_count = answer_counter.most_common(1)[0]

    return {
        "final_answer": most_common_answer,
        "confidence": vote_count / n_samples,
        "all_answers": answers,
        "vote_distribution": dict(answer_counter),
        "sample_reasoning": reasonings[0]  # 返回第一个推理过程作为示例
    }


result = self_consistency_cot(
    "班级有学生40人，男女比例为3:5，女生中有一半参加了合唱团，合唱团有多少女生？",
    n_samples=5
)
print(f"最终答案: {result['final_answer']}")
print(f"置信度: {result['confidence']:.0%}")
print(f"投票分布: {result['vote_distribution']}")
```

### Tree of Thoughts（ToT）简化实现

```python
from openai import OpenAI
from typing import Optional

client = OpenAI()

def tree_of_thoughts(
    problem: str,
    n_thoughts: int = 3,
    depth: int = 2,
    model: str = "gpt-4o"
) -> str:
    """
    Tree of Thoughts 简化实现
    每步生成多个思考路径，评估后选择最优路径继续
    """

    def generate_thoughts(problem: str, current_path: str, n: int) -> list[str]:
        """生成多个思考步骤"""
        prompt = f"""问题：{problem}

当前推理进展：
{current_path if current_path else "（开始推理）"}

请给出 {n} 个不同的下一步推理方向（每个方向占一行，用"方向N："开头）："""

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=400
        )
        thoughts = response.choices[0].message.content.split('\n')
        return [t for t in thoughts if t.strip() and '方向' in t]

    def evaluate_thought(problem: str, path: str) -> float:
        """评估推理路径的质量"""
        prompt = f"""问题：{problem}

推理路径：
{path}

请评估这条推理路径的质量（0-10分），只输出数字："""

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10
        )
        try:
            return float(response.choices[0].message.content.strip())
        except ValueError:
            return 5.0

    # 执行 ToT 搜索
    current_path = ""
    for step in range(depth):
        thoughts = generate_thoughts(problem, current_path, n_thoughts)
        if not thoughts:
            break

        # 评估每个思考路径
        scored_thoughts = []
        for thought in thoughts:
            score = evaluate_thought(problem, current_path + "\n" + thought)
            scored_thoughts.append((thought, score))

        # 选择最高分的路径
        best_thought = max(scored_thoughts, key=lambda x: x[1])[0]
        current_path += f"\n{best_thought}"

    # 基于最优路径生成最终答案
    final_prompt = f"""问题：{problem}

推理过程：
{current_path}

基于以上推理，给出最终答案："""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": final_prompt}],
        temperature=0.1
    )

    return response.choices[0].message.content


# 适合复杂决策问题
result = tree_of_thoughts(
    "如何在6个月内将一个小型电商从月营业额10万提升到50万？",
    n_thoughts=3,
    depth=2
)
print(result)
```

### 使用 OpenAI o1/o3 推理模型（2024-2025 最新）

```python
from openai import OpenAI

client = OpenAI()

# o1/o3 模型内置 CoT，无需手动构造 CoT 提示词
# 模型会自动进行扩展思考
response = client.chat.completions.create(
    model="o3-mini",  # 或 "o1", "o3"
    messages=[
        {
            "role": "user",
            "content": """
证明：对任意正整数 n，n³ - n 能被 6 整除。
"""
        }
    ],
    # o1/o3 不支持 temperature 参数
    max_completion_tokens=5000,  # 留足够空间给推理过程
    reasoning_effort="high"  # "low", "medium", "high"
)

print(response.choices[0].message.content)
# 可以查看推理 token 消耗
print(f"\n输入 tokens: {response.usage.input_tokens}")
print(f"推理 tokens: {response.usage.completion_tokens_details.reasoning_tokens}")
print(f"输出 tokens: {response.usage.output_tokens}")
```

## 常见用法

### CoT 触发词汇

```python
# 中文 CoT 触发短语
cot_triggers_zh = [
    "让我们一步一步地思考：",
    "请详细分析，逐步推导：",
    "先思考，再回答：",
    "请展示完整的推理过程：",
    "让我分步骤解决这个问题：",
]

# 英文 CoT 触发短语
cot_triggers_en = [
    "Let's think step by step:",
    "Let me work through this systematically:",
    "I'll reason through this carefully:",
    "Let's break this down:",
]

# 结构化输出 CoT
structured_cot = """
请按以下格式回答：

【分析】
- 关键信息：...
- 需要解决的子问题：...

【推理过程】
1. ...
2. ...
3. ...

【验证】
检查推理是否合理...

【结论】
最终答案：...
"""
```

### 何时使用 CoT

```python
# CoT 适合的任务类型
cot_suitable_tasks = {
    "数学计算": "多步骤计算，容易出错的算术",
    "逻辑推理": "需要多个前提推导结论",
    "计划制定": "复杂目标的步骤分解",
    "代码调试": "逐步分析代码逻辑",
    "决策分析": "权衡多个因素的复杂决策",
    "文本理解": "需要深度理解和推断的阅读",
}

# CoT 不适合的任务类型
cot_unsuitable_tasks = {
    "简单查询": "直接回答，CoT 会浪费 token",
    "创意写作": "CoT 限制创造性",
    "格式转换": "机械性任务不需要推理",
    "情感支持": "自然对话不需要逻辑链",
}
```

## 小结

- **CoT 的核心**是让模型"展示工作过程"，把复杂问题分解为可验证的小步骤
- **Zero-Shot CoT**（"让我们一步步思考"）简单有效，适合大多数情况
- **Few-Shot CoT** 提供示例推理链，对特定领域任务效果更稳定
- **Self-Consistency** 通过多次采样投票提升准确率，代价是 N 倍的 Token 消耗
- **2024-2025 年最新**：OpenAI o1/o3、DeepSeek-R1、Claude 3.7 等推理模型将 CoT 内化，自动进行扩展思考，推理能力大幅超越传统提示词 CoT
- CoT 对模型规模有要求，通常需要 7B+ 的模型才能有效执行思维链推理
