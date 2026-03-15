# System Prompt 设计

## 概念介绍

System Prompt（系统提示词）是在对话开始前发送给模型的特殊指令，用于设定模型的**角色、行为规范、能力边界和输出风格**。与用户消息（User Message）不同，System Prompt 具有更高的优先级，贯穿整个对话。

System Prompt 的作用：
- **角色定义**：让模型扮演特定角色（客服、助手、专家）
- **行为约束**：规定模型能做什么、不能做什么
- **风格控制**：设定回复语气、格式、长度
- **知识注入**：提供特定领域的背景信息
- **安全护栏**：防止模型输出有害内容

## 核心原理

### System Prompt 的工作机制

在 OpenAI API 中，消息类型分为：
- `system`：系统指令，优先级最高
- `user`：用户输入
- `assistant`：模型回复

```python
messages = [
    {"role": "system", "content": "你是一个专业的法律顾问..."},  # 系统提示词
    {"role": "user", "content": "我的问题是..."},                 # 用户输入
    {"role": "assistant", "content": "根据您的情况..."},           # 历史回复
    {"role": "user", "content": "那如果..."},                     # 当前问题
]
```

### System Prompt 设计框架

一个完整的 System Prompt 应包含：

```
1. 角色身份（WHO）
   - 模型是谁？有什么专业背景和能力？

2. 任务目标（WHAT）
   - 模型的主要职责是什么？

3. 行为规范（HOW）
   - 如何回应用户？语气、风格、详细程度

4. 约束边界（LIMITS）
   - 不能讨论什么？如何处理超出范围的问题？

5. 输出格式（FORMAT）
   - 使用什么格式输出？Markdown、JSON、纯文本？

6. 背景信息（CONTEXT）
   - 特定领域知识、公司信息、产品介绍
```

## 代码示例（Python）

### 基础 System Prompt 示例

```python
from openai import OpenAI

client = OpenAI()

# 示例1：技术支持机器人
tech_support_system = """你是「TechBot」，一个专业的技术支持助手，服务于 CloudDev 软件公司。

## 角色定位
- 你是有 5 年经验的技术支持工程师
- 专注于帮助用户解决软件使用问题
- 始终保持耐心、专业、友善的态度

## 工作范围
你可以帮助用户：
- 解答产品功能和使用问题
- 排查常见技术故障
- 提供操作步骤指导
- 提交技术工单（引导用户前往 support.clouddev.com）

## 行为规范
1. 先理解用户问题，必要时追问澄清
2. 用简单易懂的语言回答，避免过多技术术语
3. 提供具体的操作步骤，使用有序列表
4. 无法解决的问题，引导用户联系人工支持：400-123-4567

## 不在服务范围内
- 竞争对手产品的使用问题
- 与软件无关的个人问题
- 法律、财务建议

## 输出格式
- 回复长度：适中，避免过长或过短
- 使用 Markdown 格式（加粗关键信息，使用列表）
- 多步骤操作使用有序列表
- 重要提示使用 > 引用格式"""


def tech_support_chat(user_message: str, conversation_history: list = None):
    messages = [{"role": "system", "content": tech_support_system}]

    if conversation_history:
        messages.extend(conversation_history)

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.3,  # 技术支持需要稳定可靠的回复
        max_tokens=800
    )

    return response.choices[0].message.content


# 测试
reply = tech_support_chat("我登录时一直提示密码错误，但我确认密码是对的")
print(reply)
```

### 多场景 System Prompt 模板库

```python
class SystemPromptTemplates:
    """System Prompt 模板库"""

    # 通用助手
    GENERAL_ASSISTANT = """你是一个智能助手，名叫「助理」。
你的目标是尽力帮助用户解决问题。
回复要简洁、准确、有帮助。
如果不确定，诚实说明而不是猜测。"""

    # 代码助手
    CODE_ASSISTANT = """你是一个专业的编程助手，精通 Python、JavaScript、TypeScript、Go 等主流编程语言。

## 能力
- 代码编写、调试、优化
- 代码审查和重构建议
- 算法和数据结构讲解
- 技术方案设计

## 输出规范
- 代码块必须指定语言（```python, ```javascript 等）
- 提供代码时附带简短说明
- 复杂代码添加必要注释
- 指出潜在的性能问题或安全风险

## 代码风格
- Python：遵循 PEP 8
- 函数添加类型注解和 docstring
- 变量名清晰有意义"""

    # 写作助手
    WRITING_ASSISTANT = """你是一位专业的中文写作助手，擅长各类文体创作。

## 擅长领域
- 商务文案（邮件、报告、提案）
- 技术文档（教程、说明书）
- 创意写作（故事、文章）
- 内容营销（社交媒体、广告文案）

## 写作原则
- 语言简洁清晰，避免冗余
- 结构层次分明
- 根据读者调整语气（正式/轻松/专业）
- 保持语言一致性

## 输出格式
- 标题使用 Markdown 标题格式
- 重点使用加粗
- 列表使用 - 或数字
- 回复中文，专业术语保留英文"""

    # 数据分析助手
    DATA_ANALYST = """你是一位数据分析专家，精通统计学、机器学习和数据可视化。

## 专业能力
- Python（pandas、numpy、sklearn、matplotlib）
- SQL 查询和优化
- 统计分析和假设检验
- 机器学习建模
- 数据可视化设计

## 分析流程
当用户提出数据分析需求时：
1. 先理解数据结构和业务问题
2. 提出分析思路和方法
3. 提供可执行的代码
4. 解释结果和业务含义
5. 给出行动建议

## 输出规范
- 代码使用 Python，添加必要注释
- 结果解释要与业务背景结合
- 指出数据的局限性和分析前提"""

    # 客服机器人（可定制化）
    CUSTOMER_SERVICE_TEMPLATE = """你是「{company_name}」的智能客服助手「{bot_name}」。

## 公司信息
{company_info}

## 产品/服务
{product_info}

## 服务规范
- 始终保持礼貌、专业、耐心
- 用简单易懂的语言回答
- 无法解决的问题，提供人工客服渠道：{contact_info}

## 常见问题
{faq_info}

## 禁止行为
- 不讨论竞争对手
- 不承诺无法兑现的事项
- 不泄露公司内部信息"""

    @classmethod
    def get_customer_service(
        cls,
        company_name: str,
        bot_name: str,
        company_info: str,
        product_info: str,
        contact_info: str,
        faq_info: str = "暂无"
    ) -> str:
        return cls.CUSTOMER_SERVICE_TEMPLATE.format(
            company_name=company_name,
            bot_name=bot_name,
            company_info=company_info,
            product_info=product_info,
            contact_info=contact_info,
            faq_info=faq_info
        )


# 使用模板
customer_service_prompt = SystemPromptTemplates.get_customer_service(
    company_name="极速云存储",
    bot_name="云小助",
    company_info="极速云存储是一家专注于企业级云存储解决方案的科技公司，成立于2020年。",
    product_info="主要产品：CloudDisk Pro（企业网盘）、CloudBackup（自动备份）、CloudShare（安全分享）",
    contact_info="人工客服：400-888-9999（工作日 9:00-18:00）",
    faq_info="""
- 免费版提供 10GB 存储空间
- 企业版支持最多 1000 个用户
- 数据加密采用 AES-256 标准
"""
)
print(customer_service_prompt)
```

### RAG 应用的 System Prompt

```python
RAG_SYSTEM_PROMPT = """你是一个知识库问答助手。

## 任务
基于提供的参考文档，准确回答用户问题。

## 回答规则
1. **仅基于参考文档**回答，不要使用文档之外的知识
2. 如果文档中没有相关信息，明确说明"根据现有资料，暂无此信息"
3. 回答时引用文档来源（如："根据文档[1]..."）
4. 多个文档有相关内容时，综合引用并指出差异
5. 对数字、日期等事实性信息要精确引用原文

## 输出格式
- 先给出直接答案
- 再说明依据（引用具体段落）
- 最后指出信息的局限性（如文档截止日期等）

## 参考文档
{context}

---
请基于以上文档回答用户问题。"""

def rag_chat(question: str, retrieved_docs: list[str]) -> str:
    """RAG 系统的问答函数"""
    # 格式化检索到的文档
    context = "\n\n".join([
        f"[文档{i+1}]\n{doc}"
        for i, doc in enumerate(retrieved_docs)
    ])

    system_prompt = RAG_SYSTEM_PROMPT.format(context=context)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ],
        temperature=0.1  # RAG 问答要求准确，低温度
    )

    return response.choices[0].message.content
```

### System Prompt 评估与优化

```python
def evaluate_system_prompt(
    system_prompt: str,
    test_cases: list[dict],
    model: str = "gpt-4o"
) -> dict:
    """
    评估 System Prompt 的质量
    test_cases: [{"input": "...", "expected": "...", "criteria": "..."}]
    """
    results = []

    for case in test_cases:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": case["input"]}
            ],
            temperature=0.0
        )

        output = response.choices[0].message.content

        # 使用 LLM 评估输出质量
        eval_prompt = f"""评估以下 AI 助手的回复是否满足要求：

用户输入：{case["input"]}
AI 回复：{output}
评估标准：{case["criteria"]}
期望方向：{case.get("expected", "无")}

请给出评分（1-5）和评估理由，格式：
分数：X
理由：..."""

        eval_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": eval_prompt}],
            temperature=0.0
        )

        eval_text = eval_response.choices[0].message.content
        score_match = __import__('re').search(r'分数[：:]\s*(\d)', eval_text)
        score = int(score_match.group(1)) if score_match else 3

        results.append({
            "input": case["input"],
            "output": output,
            "score": score,
            "evaluation": eval_text
        })

    avg_score = sum(r["score"] for r in results) / len(results)
    return {"average_score": avg_score, "results": results}


# 测试示例
test_cases = [
    {
        "input": "你好，请问你是什么？",
        "criteria": "应介绍自己是技术支持机器人，说明服务范围",
    },
    {
        "input": "我的账号被锁定了怎么办？",
        "criteria": "应提供解锁步骤，或引导联系人工支持",
    },
    {
        "input": "帮我写一首诗",
        "criteria": "应礼貌拒绝，说明超出服务范围，并引导回技术问题",
    },
]
```

## 常见用法

### System Prompt 的最佳实践

```python
best_practices = {
    "1. 明确角色身份": "给模型一个清晰的身份定位，比模糊的指令效果更好",
    "2. 具体而非抽象": "不要说'回答要好'，而要说'回答不超过200字，使用子弹点列举要点'",
    "3. 负面约束": "明确说明不能做什么，防止边界情况",
    "4. 提供示例": "在 System Prompt 中嵌入 1-2 个期望的输入输出示例",
    "5. 结构化组织": "使用 Markdown 标题分区，提高可读性和模型理解",
    "6. 版本管理": "为 System Prompt 建立版本，记录每次修改的原因和效果",
    "7. 定期测试": "建立测试用例集，每次修改后自动测试",
}

# System Prompt 长度建议
length_guidelines = {
    "简单任务": "50-200 字，直接说明角色和核心规则",
    "客服/专业助手": "200-800 字，详细角色 + 行为规范 + 常见场景",
    "复杂 RAG 应用": "500-1500 字，包含背景知识 + 引用规范 + 输出格式",
    "注意": "过长的 System Prompt 会消耗大量 Token，且模型可能'遗忘'开头的指令",
}
```

### 动态 System Prompt

```python
def build_dynamic_system_prompt(
    user_profile: dict,
    business_context: dict
) -> str:
    """根据用户和业务上下文动态生成 System Prompt"""

    base_prompt = "你是一个智能助手。"

    # 根据用户等级调整服务级别
    if user_profile.get("tier") == "premium":
        base_prompt += "\n用户是高级会员，提供最优先、最详细的服务。"
    elif user_profile.get("tier") == "basic":
        base_prompt += "\n适当引导用户升级为高级会员以获得更多功能。"

    # 根据用户语言偏好
    lang = user_profile.get("language", "zh")
    if lang == "en":
        base_prompt += "\n请用英语回复。"
    elif lang == "zh":
        base_prompt += "\n请用中文回复。"

    # 注入业务规则
    if business_context.get("promotion"):
        base_prompt += f"\n当前促销活动：{business_context['promotion']}"

    return base_prompt
```

## 小结

- **System Prompt 是 LLM 应用的核心配置**，设计得好能让同一个模型性能提升数倍
- **结构化设计**：使用 Markdown 标题组织角色、职责、规范、格式等部分
- **具体而非抽象**：用具体的例子和明确的规则，而不是模糊的形容词
- **负面约束必不可少**：明确说明边界情况和禁止行为，防止"幻觉"
- **持续迭代**：System Prompt 需要根据实际表现不断优化，建立测试用例集
- **2024-2025 年趋势**：Anthropic 发布了详细的 System Prompt 设计指南，Claude 对系统提示词的遵循能力特别强，推荐参考官方文档
