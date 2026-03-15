# Agent 基础

## 什么是 AI Agent

AI Agent（智能体）是一种能够**自主感知环境、进行推理决策、并采取行动**以实现目标的 AI 系统。与普通的 LLM 调用不同，Agent 不仅仅是"输入 → 输出"的一次性对话，而是一个持续循环的自主行动过程。

### Agent 与普通 LLM 调用的区别

| 特性 | 普通 LLM 调用 | AI Agent |
|------|--------------|----------|
| 交互方式 | 单次请求/响应 | 多轮自主循环 |
| 工具使用 | 不使用 | 可调用外部工具 |
| 记忆能力 | 仅限上下文窗口 | 持久化记忆 |
| 决策能力 | 生成文本 | 规划并执行行动 |
| 自主性 | 被动响应 | 主动推进目标 |
| 典型延迟 | 秒级 | 分钟到小时级 |

**普通 LLM 调用**：

```
用户: "帮我查一下明天北京的天气"
LLM: "我无法直接查询天气，但我可以告诉你如何查询..."
```

**Agent**：

```
用户: "帮我查一下明天北京的天气"
Agent: [调用天气 API] → [获取数据] → "明天北京晴天，气温 15-22°C，建议穿薄外套"
```

---

## 感知-思考-行动循环

Agent 的核心工作模式是一个持续循环：

```
┌─────────────────────────────────────────────┐
│                                             │
│   感知 (Perceive)                           │
│   └─ 接收用户输入、工具结果、环境状态         │
│              ↓                              │
│   思考 (Think)                              │
│   └─ 推理分析、规划下一步行动                │
│              ↓                              │
│   行动 (Act)                                │
│   └─ 调用工具、执行代码、返回结果            │
│              ↓                              │
│   观察 (Observe)                            │
│   └─ 获取行动结果，判断是否达成目标          │
│              ↓                              │
│        是否完成？                           │
│       ↙         ↘                          │
│     是            否                        │
│     ↓             ↓                        │
│   输出结果     回到"感知"                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Agent 核心组件

### 1. 规划（Planning）

规划是 Agent 将复杂目标分解为可执行步骤的能力。

**子目标分解**：将大任务拆解为小任务

```
目标: "写一份关于 AI 发展的报告"
分解:
  1. 搜索 AI 发展相关资料
  2. 整理关键信息
  3. 规划报告结构
  4. 逐节撰写内容
  5. 审校并输出
```

**反思与修正**：执行过程中根据结果动态调整计划

### 2. 记忆（Memory）

Agent 的记忆分为几个层次：

| 记忆类型 | 说明 | 实现方式 |
|---------|------|---------|
| 短期记忆 | 当前对话上下文 | LLM Context Window |
| 长期记忆 | 跨会话持久化信息 | 向量数据库、关系数据库 |
| 情节记忆 | 历史行动序列 | 结构化日志 |
| 语义记忆 | 知识和事实 | RAG 知识库 |

### 3. 工具（Tools）

工具是 Agent 与外部世界交互的接口：

- **信息获取**：网络搜索、数据库查询、API 调用
- **代码执行**：Python 解释器、Shell 命令
- **文件操作**：读写文件、解析文档
- **感知工具**：图像识别、语音转文字

### 4. 行动（Action）

Agent 的行动类型：

- **工具调用**：调用预定义的外部工具
- **文本生成**：生成报告、代码、回复
- **决策控制**：选择下一步动作、判断终止条件
- **与其他 Agent 通信**：在多 Agent 系统中传递消息

---

## ReAct 框架

ReAct（Reasoning + Acting）是最经典的 Agent 框架，由 Google 在 2022 年提出。核心思想是将**推理**和**行动**交替进行。

### ReAct 工作流程

```
Thought: 我需要查询北京今天的天气
Action: search("北京今天天气")
Observation: 北京今天晴天，气温 18°C

Thought: 我已经获得了天气信息，可以回答用户了
Action: finish("北京今天晴天，气温 18°C，适合户外活动")
```

### ReAct 提示词模板

```python
REACT_PROMPT = """你是一个智能助手，可以使用以下工具来完成任务：

可用工具：
{tools}

请按以下格式进行思考和行动：

Thought: [分析当前情况，决定下一步]
Action: [工具名称]
Action Input: [工具输入参数]
Observation: [工具返回结果]
... (可以重复 Thought/Action/Observation 多次)
Thought: 我现在可以回答用户的问题了
Final Answer: [最终回答]

开始！

问题: {question}
"""
```

### ReAct 实现示例

```python
from openai import OpenAI

client = OpenAI()

# 定义工具函数
def search_web(query: str) -> str:
    """模拟网络搜索"""
    # 实际项目中接入真实搜索 API
    return f"搜索结果：关于'{query}'的相关信息..."

def calculate(expression: str) -> str:
    """计算数学表达式"""
    try:
        result = eval(expression)  # 生产环境请使用安全的计算方式
        return str(result)
    except Exception as e:
        return f"计算错误: {e}"

# 工具注册表
TOOLS = {
    "search": search_web,
    "calculate": calculate,
}

TOOLS_DESC = """
- search(query): 搜索网络信息，参数为搜索关键词
- calculate(expression): 计算数学表达式，如 "2 + 3 * 4"
"""

def parse_action(text: str):
    """从 LLM 输出中解析 Action 和 Action Input"""
    lines = text.strip().split('\n')
    action = None
    action_input = None

    for line in lines:
        if line.startswith("Action:"):
            action = line.replace("Action:", "").strip()
        elif line.startswith("Action Input:"):
            action_input = line.replace("Action Input:", "").strip()

    return action, action_input

def react_agent(question: str, max_steps: int = 5) -> str:
    """
    简单的 ReAct Agent 实现

    Args:
        question: 用户问题
        max_steps: 最大循环步数，防止无限循环

    Returns:
        最终回答
    """
    prompt = REACT_PROMPT.format(
        tools=TOOLS_DESC,
        question=question
    )

    messages = [{"role": "user", "content": prompt}]

    for step in range(max_steps):
        # 调用 LLM 获取下一步行动
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stop=["Observation:"],  # 在 Observation 之前停止，等待工具执行
        )

        agent_output = response.choices[0].message.content
        print(f"Step {step + 1}:\n{agent_output}")

        # 检查是否已有最终答案
        if "Final Answer:" in agent_output:
            final_answer = agent_output.split("Final Answer:")[-1].strip()
            return final_answer

        # 解析并执行工具调用
        action, action_input = parse_action(agent_output)

        if action and action in TOOLS:
            # 执行工具
            observation = TOOLS[action](action_input)
            print(f"Observation: {observation}\n")

            # 将结果加入对话历史
            full_text = agent_output + f"\nObservation: {observation}\n"
            messages.append({"role": "assistant", "content": full_text})
        else:
            # 工具不存在，让 LLM 自行处理
            messages.append({"role": "assistant", "content": agent_output})

    return "已达到最大步数限制，未能得到最终答案"

# 使用示例
if __name__ == "__main__":
    answer = react_agent("2024年诺贝尔物理学奖得主是谁？他们的主要贡献是什么？")
    print(f"\n最终答案: {answer}")
```

---

## 常见 Agent 类型

### 1. Task Agent（任务型 Agent）

专注于完成特定任务，有明确的开始和结束状态。

**典型场景**：
- 自动化数据分析报告生成
- 代码调试与修复
- 网络信息收集与整理

```python
class TaskAgent:
    """任务型 Agent，完成具体任务后退出"""

    def __init__(self, tools: list, llm_client):
        self.tools = {t.name: t for t in tools}
        self.client = llm_client
        self.is_done = False

    def run(self, task: str) -> str:
        """执行任务直到完成"""
        context = [{"role": "user", "content": task}]

        while not self.is_done:
            response = self._think(context)
            action = self._parse(response)

            if action.type == "finish":
                self.is_done = True
                return action.result

            observation = self._execute(action)
            context.append({
                "role": "assistant",
                "content": response
            })
            context.append({
                "role": "user",
                "content": f"工具结果: {observation}"
            })

        return "任务完成"
```

### 2. Conversational Agent（对话型 Agent）

持续与用户交互，维护对话历史和用户偏好。

**特点**：
- 维护长期用户记忆
- 个性化响应
- 多轮对话管理

```python
class ConversationalAgent:
    """对话型 Agent，持续与用户交互"""

    def __init__(self, tools: list, memory_store):
        self.tools = tools
        self.memory = memory_store
        self.conversation_history = []

    def chat(self, user_message: str, user_id: str) -> str:
        """处理一轮对话"""
        # 从记忆中检索相关历史
        relevant_memory = self.memory.search(
            query=user_message,
            user_id=user_id,
            top_k=5
        )

        # 构建带记忆的上下文
        context = self._build_context(
            user_message,
            relevant_memory,
            self.conversation_history[-10:]  # 最近 10 轮对话
        )

        # 生成响应
        response = self._generate(context)

        # 保存到记忆
        self.memory.save(user_id, user_message, response)
        self.conversation_history.append({
            "user": user_message,
            "assistant": response
        })

        return response
```

### 3. Multi-Agent（多智能体系统）

多个专业 Agent 协作完成复杂任务，每个 Agent 负责特定领域。

```
┌─────────────────────────────────────────┐
│           Orchestrator Agent            │
│         （协调者/任务分发）              │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ↓          ↓          ↓
┌────────┐ ┌────────┐ ┌────────┐
│Research│ │ Coder  │ │Reviewer│
│ Agent  │ │ Agent  │ │ Agent  │
│(调研)  │ │(编码)  │ │(审查)  │
└────────┘ └────────┘ └────────┘
```

详细内容参见[多 Agent 系统](./多Agent系统.md)章节。

---

## 简单 Agent 完整示例

下面是一个能够回答需要搜索信息问题的简单 Agent：

```python
import json
from openai import OpenAI

client = OpenAI()

# ============ 工具定义 ============

def get_weather(city: str, date: str = "today") -> dict:
    """获取天气信息（示例用，实际需接入真实 API）"""
    return {
        "city": city,
        "date": date,
        "weather": "晴天",
        "temperature": "15-22°C",
        "humidity": "45%",
        "suggestion": "适合户外活动，建议携带薄外套"
    }

def search_news(keyword: str, limit: int = 3) -> list:
    """搜索新闻（示例用）"""
    return [
        {"title": f"关于{keyword}的最新动态", "summary": "..."},
        {"title": f"{keyword}行业分析报告", "summary": "..."},
    ]

# ============ OpenAI Function Calling 格式定义 ============

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如：北京、上海"
                    },
                    "date": {
                        "type": "string",
                        "description": "日期，如：today, tomorrow, 2024-01-15",
                        "default": "today"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_news",
            "description": "搜索相关新闻",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "搜索关键词"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回结果数量",
                        "default": 3
                    }
                },
                "required": ["keyword"]
            }
        }
    }
]

# 工具调度表
TOOL_REGISTRY = {
    "get_weather": get_weather,
    "search_news": search_news,
}

# ============ Agent 核心逻辑 ============

def run_agent(user_query: str) -> str:
    """运行 Agent 处理用户查询，使用 OpenAI Function Calling 实现工具调用循环"""
    messages = [
        {
            "role": "system",
            "content": "你是一个智能助手，可以查询天气和新闻信息来帮助用户。"
        },
        {
            "role": "user",
            "content": user_query
        }
    ]

    max_iterations = 10  # 防止无限循环

    for i in range(max_iterations):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools,
            tool_choice="auto"  # 让模型自动决定是否调用工具
        )

        message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        messages.append(message)

        # 没有工具调用，直接返回
        if finish_reason == "stop":
            return message.content

        # 处理工具调用
        if finish_reason == "tool_calls" and message.tool_calls:
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)

                print(f"[Agent] 调用工具: {func_name}({func_args})")

                if func_name in TOOL_REGISTRY:
                    result = TOOL_REGISTRY[func_name](**func_args)
                else:
                    result = f"错误：工具 {func_name} 不存在"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False)
                })

    return "已达到最大迭代次数，无法完成请求"

# ============ 测试 ============

if __name__ == "__main__":
    queries = [
        "上海明天天气怎么样？",
        "帮我查一下关于人工智能的最新新闻",
        "北京今天天气如何，同时搜索一下北京旅游的新闻",
    ]

    for query in queries:
        print(f"\n{'='*50}")
        print(f"用户: {query}")
        answer = run_agent(query)
        print(f"Agent: {answer}")
```

---

## 常见问题与最佳实践

### 问题1：Agent 陷入无限循环

**原因**：工具执行失败或 LLM 判断出错，导致 Agent 一直重试。

**解决方案**：

```python
# 始终设置最大步数限制
MAX_STEPS = 10

# 跟踪已执行过的相同操作，避免重复
seen_actions = set()

def check_duplicate(action_key: str) -> bool:
    """检测重复行动"""
    if action_key in seen_actions:
        return True
    seen_actions.add(action_key)
    return False
```

### 问题2：工具调用参数错误

**最佳实践**：提供清晰的工具描述，让 LLM 理解如何正确调用；返回有意义的错误信息让 LLM 自我纠正。

```python
def safe_tool_call(tool_func, params: dict):
    """带错误处理的工具调用"""
    try:
        return tool_func(**params)
    except TypeError as e:
        # 参数错误，返回提示让 LLM 重试
        return f"参数错误，请检查参数格式: {str(e)}"
    except Exception as e:
        return f"工具执行失败: {str(e)}"
```

### 问题3：上下文窗口溢出

**解决方案**：实现消息压缩和滚动窗口。

```python
def trim_messages(messages: list, keep_last_n: int = 20) -> list:
    """保留最近的消息，防止上下文过长"""
    # 始终保留 system message
    system_msgs = [m for m in messages if m["role"] == "system"]
    other_msgs = [m for m in messages if m["role"] != "system"]

    # 保留最新的 N 条消息
    recent_msgs = other_msgs[-keep_last_n:]

    return system_msgs + recent_msgs
```

### 最佳实践总结

1. **设置合理的迭代上限**，防止无限循环和成本失控
2. **工具描述要清晰准确**，帮助 LLM 正确选择和使用工具
3. **工具错误要优雅处理**，返回有意义的错误信息而非直接抛出异常
4. **记录 Agent 执行轨迹**，便于调试和优化
5. **对敏感操作设置确认步骤**，避免不可逆的错误操作
6. **使用结构化输出**，减少 LLM 输出解析的不确定性
7. **监控 token 消耗**，避免单次任务成本过高
