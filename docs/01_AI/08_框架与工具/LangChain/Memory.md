# LangChain Memory（记忆）

## 为什么需要 Memory

LLM 本身是无状态的——每次 API 调用都是独立的，模型不会记住上一次的对话内容。对于单轮问答这没有问题，但构建多轮对话助手时，需要将历史消息手动传给模型。

**Memory 组件**的作用就是自动管理这份对话历史，解决以下问题：

- **上下文维护**：让模型"记住"之前说过的内容
- **Token 控制**：对话历史越来越长，需要策略性地截断或压缩
- **持久化**：在服务重启后恢复用户的对话历史
- **跨 Session 记忆**：在不同会话之间共享特定信息

### 没有 Memory 的问题

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")

# 第一轮对话
r1 = llm.invoke("我叫小明，我是一名 Python 工程师")
print(r1.content)  # "你好，小明！很高兴认识你..."

# 第二轮对话 - 模型完全不记得之前的信息
r2 = llm.invoke("你还记得我的名字吗？")
print(r2.content)  # "我是一个 AI，没有记忆功能..."  ← 问题所在
```

---

## Memory 类型

### ConversationBufferMemory（缓冲记忆）

最简单的 Memory 类型，完整保存所有对话历史。

```python
from langchain.memory import ConversationBufferMemory
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

# 初始化记忆
memory = ConversationBufferMemory(return_messages=True)

# 模拟保存对话
memory.save_context(
    {"input": "我叫小明"},
    {"output": "你好，小明！"}
)
memory.save_context(
    {"input": "我是 Python 工程师"},
    {"output": "太好了，Python 是一门很棒的语言！"}
)

# 读取历史
history = memory.load_memory_variables({})
print(history)
# {'history': [HumanMessage(content='我叫小明'), AIMessage(content='你好，小明！'), ...]}
```

**适用场景**：短对话（消息条数少于 20），或有明确 Token 预算的场景。

**缺点**：对话历史无限增长，消耗大量 Token。

### ConversationBufferWindowMemory（滑动窗口记忆）

只保留最近 K 轮对话，超出的历史自动丢弃。

```python
from langchain.memory import ConversationBufferWindowMemory

# 只保留最近 5 轮对话（每轮 = 一问一答）
memory = ConversationBufferWindowMemory(
    k=5,
    return_messages=True
)

# 添加 6 轮对话
for i in range(6):
    memory.save_context(
        {"input": f"问题 {i+1}"},
        {"output": f"回答 {i+1}"}
    )

history = memory.load_memory_variables({})
messages = history["history"]
print(f"保留了 {len(messages)//2} 轮对话")  # 保留了 5 轮对话
print("最早的消息:", messages[0].content)    # 问题 2（问题 1 已被丢弃）
```

**适用场景**：长期对话，只需要近期上下文。

### ConversationSummaryMemory（摘要记忆）

使用 LLM 将历史对话压缩为摘要，适合长对话场景。

```python
from langchain.memory import ConversationSummaryMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 使用 LLM 自动生成摘要
memory = ConversationSummaryMemory(
    llm=llm,
    return_messages=True
)

# 添加对话历史
memory.save_context(
    {"input": "我叫张三，我在开发一个电商系统"},
    {"output": "好的，请问您需要什么帮助？"}
)
memory.save_context(
    {"input": "我需要实现一个购物车功能，支持商品增删改查"},
    {"output": "我可以帮您设计购物车的数据结构和 API 接口。"}
)
memory.save_context(
    {"input": "数据库用 MySQL，后端用 Python FastAPI"},
    {"output": "好的，我来给您设计一个基于 FastAPI 和 MySQL 的购物车方案。"}
)

# 查看自动生成的摘要
print(memory.moving_summary_buffer)
# 输出：用户张三正在开发使用 Python FastAPI 和 MySQL 的电商系统，
#       需要实现购物车的增删改查功能...
```

**适用场景**：超长对话，需要在记忆完整性和 Token 消耗之间平衡。

**缺点**：每次添加消息都需要调用 LLM，有额外成本。

### ConversationSummaryBufferMemory（混合记忆）

结合缓冲和摘要：最近的消息保留原文，超出 Token 阈值的旧消息自动压缩为摘要。

```python
from langchain.memory import ConversationSummaryBufferMemory
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

memory = ConversationSummaryBufferMemory(
    llm=llm,
    max_token_limit=500,   # 超过 500 token 的旧消息会被压缩为摘要
    return_messages=True
)

# 近期消息保留完整内容，旧消息自动压缩
for i in range(10):
    memory.save_context(
        {"input": f"这是第 {i+1} 个问题，关于 Python 编程技巧"},
        {"output": f"这是第 {i+1} 个回答，包含详细的代码示例和解释"}
    )

history = memory.load_memory_variables({})
# history 包含：旧消息的摘要 + 最近几条完整消息
```

### VectorStoreRetrieverMemory（向量检索记忆）

将对话历史存入向量数据库，每次检索与当前问题最相关的历史片段，而非简单的最近几条。

```python
from langchain.memory import VectorStoreRetrieverMemory
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# 创建向量数据库
embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma(
    collection_name="conversation_memory",
    embedding_function=embedding,
)

# 创建基于向量检索的记忆
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
memory = VectorStoreRetrieverMemory(retriever=retriever)

# 存储各种话题的对话
memory.save_context(
    {"input": "我喜欢用 Python 做数据分析"},
    {"output": "Python 在数据分析领域有 pandas、numpy 等强大工具"}
)
memory.save_context(
    {"input": "我最近在学习机器学习"},
    {"output": "推荐从 scikit-learn 开始学习机器学习"}
)
memory.save_context(
    {"input": "我住在北京，喜欢爬山"},
    {"output": "北京周边有很多适合爬山的地方，比如香山"}
)

# 检索与当前问题最相关的记忆（不是最近的，而是最相关的）
relevant = memory.load_memory_variables({"input": "推荐一些数据分析工具"})
print(relevant)
# 会检索到关于 Python 数据分析的记忆，而非关于爬山的记忆
```

**适用场景**：个人助理、长期记忆场景，需要"想起"很久以前的特定对话。

---

## 在 Chain 中使用 Memory

### LCEL 方式（推荐，手动管理历史）

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from typing import List

# 带历史记录的提示词模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个专业的 Python 技术助手，回答要简洁准确。"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
chain = prompt | llm | StrOutputParser()

class ConversationManager:
    """管理对话历史的封装类"""

    def __init__(self, max_turns: int = 10):
        self.history: List = []
        self.max_turns = max_turns  # 最多保留 N 轮

    def chat(self, user_input: str) -> str:
        # 调用链
        response = chain.invoke({
            "chat_history": self.history,
            "input": user_input,
        })

        # 更新历史，超出最大轮数时删除最早的
        self.history.append(HumanMessage(content=user_input))
        self.history.append(AIMessage(content=response))
        if len(self.history) > self.max_turns * 2:
            self.history = self.history[2:]  # 删除最早的一轮

        return response

    def clear(self):
        """清空对话历史"""
        self.history.clear()

# 使用
conv = ConversationManager(max_turns=5)
print(conv.chat("我叫小李，今年 25 岁"))
print(conv.chat("我想学习机器学习，从哪里开始？"))
print(conv.chat("你还记得我叫什么名字吗？"))  # 能记住"小李"
```

### 使用 RunnableWithMessageHistory

LangChain 提供了 `RunnableWithMessageHistory` 来自动管理 per-session 的对话历史。

```python
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# 内存中存储各用户的对话历史
store: dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """根据 session_id 获取或创建对话历史"""
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# 构建基础链
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手。"),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()

# 包装为带历史管理的链
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

# 用户 A 的对话（session_id="user_a"）
r1 = chain_with_history.invoke(
    {"input": "我叫小明"},
    config={"configurable": {"session_id": "user_a"}}
)
print(f"用户A: {r1}")

r2 = chain_with_history.invoke(
    {"input": "你还记得我叫什么？"},
    config={"configurable": {"session_id": "user_a"}}
)
print(f"用户A: {r2}")  # 记得叫小明

# 用户 B 的对话（不同 session，独立的历史）
r3 = chain_with_history.invoke(
    {"input": "你还记得我叫什么？"},
    config={"configurable": {"session_id": "user_b"}}
)
print(f"用户B: {r3}")  # 不知道用户B的名字
```

---

## 在 Agent 中使用 Memory

Agent 需要记忆来维持多轮对话能力，同时保留工具调用的历史。

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# 定义工具
@tool
def get_weather(city: str) -> str:
    """获取指定城市的天气信息"""
    # 实际使用时调用天气 API
    weather_data = {
        "北京": "晴天，25°C",
        "上海": "多云，22°C",
        "广州": "小雨，28°C",
    }
    return weather_data.get(city, f"{city}的天气数据暂不可用")

@tool
def calculate(expression: str) -> str:
    """计算数学表达式"""
    try:
        result = eval(expression)  # 生产环境请使用安全的计算方式
        return str(result)
    except Exception as e:
        return f"计算错误: {e}"

tools = [get_weather, calculate]

# 创建带记忆的 Agent
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手，可以查询天气和进行计算。"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_tool_calling_agent(llm, tools, prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
)

# 用历史包装
store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

agent_with_history = RunnableWithMessageHistory(
    agent_executor,
    get_session_history,
    input_messages_key="input",
    history_messages_key="chat_history",
)

config = {"configurable": {"session_id": "demo_session"}}

# 多轮对话
print(agent_with_history.invoke({"input": "北京今天天气怎么样？"}, config=config))
print(agent_with_history.invoke({"input": "那上海呢？"}, config=config))  # 上下文：对话天气
print(agent_with_history.invoke({"input": "把这两个城市的温度加起来是多少？"}, config=config))
```

---

## 自定义 Memory

### 实现自定义 Memory 类

```python
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage
from typing import List, Sequence
import json

class FileBasedChatHistory(BaseChatMessageHistory):
    """将对话历史持久化到文件的自定义实现"""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self._messages: List[BaseMessage] = self._load()

    def _load(self) -> List[BaseMessage]:
        """从文件加载消息"""
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            from langchain_core.messages import messages_from_dict
            return messages_from_dict(data)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save(self):
        """将消息保存到文件"""
        from langchain_core.messages import messages_to_dict
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(messages_to_dict(self._messages), f, ensure_ascii=False, indent=2)

    @property
    def messages(self) -> List[BaseMessage]:
        return self._messages

    def add_messages(self, messages: Sequence[BaseMessage]) -> None:
        self._messages.extend(messages)
        self._save()

    def clear(self) -> None:
        self._messages = []
        self._save()

# 使用自定义 Memory
history = FileBasedChatHistory("chat_history.json")
history.add_user_message("我叫小王")
history.add_ai_message("你好，小王！")

# 验证持久化
reloaded = FileBasedChatHistory("chat_history.json")
print(reloaded.messages)  # 从文件恢复的历史记录
```

---

## 持久化存储

### Redis 存储（生产环境推荐）

```python
# 安装依赖
# pip install redis langchain-community

from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# Redis 连接配置
REDIS_URL = "redis://localhost:6379"

def get_redis_history(session_id: str) -> RedisChatMessageHistory:
    return RedisChatMessageHistory(
        session_id=session_id,
        url=REDIS_URL,
        ttl=3600,  # 历史记录 1 小时后过期
    )

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个专业助手。"),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()

chain_with_redis = RunnableWithMessageHistory(
    chain,
    get_redis_history,
    input_messages_key="input",
    history_messages_key="history",
)

# 跨进程、跨服务器共享对话历史
result = chain_with_redis.invoke(
    {"input": "我叫小华，我是一名设计师"},
    config={"configurable": {"session_id": "user_xiahua_001"}}
)
print(result)
```

### SQLite 存储（轻量级本地方案）

```python
# pip install langchain-community

from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

def get_sqlite_history(session_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=session_id,
        connection_string="sqlite:///chat_history.db",
    )

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的助手。"),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])

chain = prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()

chain_with_sql = RunnableWithMessageHistory(
    chain,
    get_sqlite_history,
    input_messages_key="input",
    history_messages_key="history",
)

# 对话历史会自动存储在 SQLite 数据库中
result = chain_with_sql.invoke(
    {"input": "你好，我需要帮助规划我的学习路线"},
    config={"configurable": {"session_id": "session_001"}}
)
print(result)
```

---

## 常见问题与最佳实践

### 问题1：对话历史过长导致 Token 超限

```python
from langchain_core.messages import BaseMessage
from typing import List

def trim_messages(messages: List[BaseMessage], max_tokens: int = 2000) -> List[BaseMessage]:
    """
    从最新消息开始，保留不超过 max_tokens 的消息。
    始终保留系统消息（如果有）。
    """
    import tiktoken
    encoder = tiktoken.encoding_for_model("gpt-4o-mini")

    # 统计 token
    def count_msg_tokens(msg: BaseMessage) -> int:
        return len(encoder.encode(msg.content)) + 4  # 4 为消息格式开销

    total_tokens = 0
    result = []

    # 从最新消息向前遍历
    for msg in reversed(messages):
        tokens = count_msg_tokens(msg)
        if total_tokens + tokens > max_tokens:
            break
        total_tokens += tokens
        result.insert(0, msg)

    return result

# 在链中使用
from langchain_core.runnables import RunnableLambda

chain = (
    RunnableLambda(lambda x: {
        **x,
        "history": trim_messages(x.get("history", []))
    })
    | prompt
    | llm
    | StrOutputParser()
)
```

### 问题2：多用户隔离

```python
# 关键：每个用户使用不同的 session_id
# session_id 推荐格式：{user_id}_{conversation_id}

def create_session_id(user_id: str, conversation_id: str = "default") -> str:
    return f"{user_id}_{conversation_id}"

# 同一用户的不同对话也能独立存储
session_a = create_session_id("user_001", "conv_python")
session_b = create_session_id("user_001", "conv_cooking")
```

### 最佳实践总结

| 场景 | 推荐 Memory 类型 | 原因 |
|------|----------------|------|
| 短期对话（<20 轮） | ConversationBufferMemory | 简单直接，保留完整上下文 |
| 长期对话（无限轮） | ConversationSummaryBufferMemory | 平衡完整性和 Token 消耗 |
| 只需最近几轮 | ConversationBufferWindowMemory | 最省 Token |
| 检索特定历史 | VectorStoreRetrieverMemory | 按语义相关性检索 |
| 生产环境 | RedisChatMessageHistory | 持久化、高性能、支持 TTL |
| 轻量级本地 | SQLChatMessageHistory | 无需额外服务，文件持久化 |

1. **始终为每个用户/会话分配独立的 session_id**
2. **设置合理的历史记录 TTL**，避免存储无用的过期会话
3. **不要在 Memory 中存储敏感信息**，如密码、Token 等
4. **LCEL 中手动管理历史更灵活**，比旧版 ConversationChain 更推荐
5. **生产环境使用 Redis**，避免服务重启丢失对话历史
