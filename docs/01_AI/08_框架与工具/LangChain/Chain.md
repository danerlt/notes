# LangChain Chain（链）

## 什么是 Chain

Chain（链）是 LangChain 中的核心抽象，表示将多个组件按顺序连接起来的可执行流程。最简单的链就是 `提示词 → 模型 → 输出解析`，复杂的链可以包含条件分支、并行执行、循环调用等逻辑。

### Chain 的本质

在 LCEL（LangChain Expression Language）中，所有组件都实现了 `Runnable` 接口，具备统一的调用方式：

```python
# 所有 Runnable 组件都支持以下方法
runnable.invoke(input)           # 同步调用，返回单个结果
runnable.ainvoke(input)          # 异步调用
runnable.stream(input)           # 流式输出
runnable.astream(input)          # 异步流式输出
runnable.batch([input1, input2]) # 批量调用（并发）
runnable.abatch([...])           # 异步批量调用
```

---

## LCEL 语法：| 管道操作符

LCEL 使用 `|` 将多个 Runnable 组件串联，数据从左到右依次流经每个组件。

### 基础管道

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# 最基础的三段式链：Prompt | LLM | Parser
chain = (
    ChatPromptTemplate.from_template("请将以下文本翻译为英文：{text}")
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)

result = chain.invoke({"text": "人工智能正在改变世界"})
print(result)
# AI is changing the world.
```

### 管道中的数据流转

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

# 使用 RunnableLambda 插入自定义处理步骤
def preprocess(text: str) -> dict:
    """预处理：去除多余空格并转为小写"""
    return {"text": text.strip().lower()}

def postprocess(text: str) -> str:
    """后处理：添加句号"""
    return text if text.endswith(".") else text + "."

chain = (
    RunnableLambda(preprocess)
    | ChatPromptTemplate.from_template("翻译为英文：{text}")
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
    | RunnableLambda(postprocess)
)

result = chain.invoke("  人工智能  ")
print(result)
```

### RunnableParallel：并行执行

```python
from langchain_core.runnables import RunnableParallel
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o-mini")

# 并行生成摘要和关键词
parallel_chain = RunnableParallel(
    summary=(
        ChatPromptTemplate.from_template("用 50 字总结：{text}")
        | llm
        | StrOutputParser()
    ),
    keywords=(
        ChatPromptTemplate.from_template("提取 5 个关键词，逗号分隔：{text}")
        | llm
        | StrOutputParser()
    ),
)

result = parallel_chain.invoke({
    "text": "大型语言模型通过海量文本训练，学会了理解和生成自然语言，推动了 AI 技术的革命性进步。"
})

print("摘要:", result["summary"])
print("关键词:", result["keywords"])
```

### RunnablePassthrough：传递原始输入

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# 将原始输入和处理结果一起传递给下一步
chain = (
    RunnableParallel(
        original=RunnablePassthrough(),   # 原样传递输入
        translation=(
            ChatPromptTemplate.from_template("翻译为英文：{text}")
            | ChatOpenAI(model="gpt-4o-mini")
            | StrOutputParser()
        )
    )
)

result = chain.invoke({"text": "你好世界"})
print(result)
# {'original': {'text': '你好世界'}, 'translation': 'Hello, World!'}
```

---

## 常用 Chain 类型

### LLMChain（基础链）

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# LCEL 风格的 LLMChain（推荐）
def create_llm_chain(system_prompt: str, model: str = "gpt-4o-mini"):
    """创建一个基础的 LLM 链"""
    return (
        ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        | ChatOpenAI(model=model, temperature=0)
        | StrOutputParser()
    )

# 翻译链
translate_chain = create_llm_chain("你是一个专业翻译，将输入翻译为英文。")
result = translate_chain.invoke({"input": "今天天气很好"})
print(result)

# 代码审查链
review_chain = create_llm_chain("你是一个资深 Python 工程师，审查代码并给出改进建议。")
result = review_chain.invoke({"input": "def f(x): return x*x"})
print(result)
```

### SequentialChain（顺序链）

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 第一步：将文本翻译为英文
translate_chain = (
    ChatPromptTemplate.from_template("将以下中文翻译为英文，只返回翻译结果：\n{text}")
    | llm
    | StrOutputParser()
)

# 第二步：对英文文本做情感分析
sentiment_chain = (
    ChatPromptTemplate.from_template(
        "分析以下英文文本的情感倾向（Positive/Negative/Neutral），只返回一个词：\n{translated}"
    )
    | llm
    | StrOutputParser()
)

# 将两步连接：第一步的输出作为第二步的输入
sequential_chain = (
    {"translated": translate_chain}
    | sentiment_chain
)

result = sequential_chain.invoke({"text": "这个产品质量太差了，完全不值这个价格！"})
print(result)  # Negative
```

### 带记忆的对话链

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# 带历史记录的对话模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有帮助的 AI 助手。"),
    MessagesPlaceholder(variable_name="history"),  # 历史消息占位符
    ("human", "{input}"),
])

chain = prompt | llm | StrOutputParser()

# 手动维护对话历史
history = []

def chat(user_input: str) -> str:
    response = chain.invoke({
        "history": history,
        "input": user_input,
    })
    # 更新历史记录
    history.append(HumanMessage(content=user_input))
    history.append(AIMessage(content=response))
    return response

print(chat("我叫小明"))
print(chat("你还记得我的名字吗？"))  # 能记住"小明"
```

---

## 构建 RAG Chain 示例

RAG（检索增强生成）是最常见的 Chain 应用场景，结合向量检索和 LLM 生成。

### 完整 RAG Chain

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

# 步骤1：加载并切分文档
loader = TextLoader("knowledge.txt", encoding="utf-8")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
)
chunks = splitter.split_documents(docs)

# 步骤2：构建向量数据库
embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(chunks, embedding)
retriever = vectorstore.as_retriever(
    search_kwargs={"k": 3}  # 检索最相关的 3 个片段
)

# 步骤3：构建 RAG 提示词
rag_prompt = ChatPromptTemplate.from_messages([
    ("system", """你是一个知识问答助手。请基于以下上下文回答问题。
如果上下文中没有相关信息，请如实告知，不要编造答案。

上下文：
{context}"""),
    ("human", "{question}"),
])

# 步骤4：组装 RAG Chain
def format_docs(docs) -> str:
    """将检索到的文档列表拼接为字符串"""
    return "\n\n".join(doc.page_content for doc in docs)

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

rag_chain = (
    {
        "context": retriever | format_docs,    # 检索并格式化
        "question": RunnablePassthrough(),     # 原样传递问题
    }
    | rag_prompt
    | llm
    | StrOutputParser()
)

# 使用
answer = rag_chain.invoke("什么是向量数据库？")
print(answer)
```

### 带来源引用的 RAG Chain

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# 同时返回答案和来源文档
rag_chain_with_source = RunnableParallel(
    answer=(
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
        }
        | rag_prompt
        | llm
        | StrOutputParser()
    ),
    sources=retriever,  # 直接返回检索到的文档列表
)

result = rag_chain_with_source.invoke("什么是向量数据库？")
print("回答:", result["answer"])
print("\n来源文档:")
for i, doc in enumerate(result["sources"], 1):
    print(f"  [{i}] {doc.metadata.get('source', '未知')} - {doc.page_content[:100]}...")
```

---

## 自定义 Chain

### 使用 RunnableLambda 封装自定义逻辑

```python
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json

# 自定义预处理函数
def extract_keywords(input_dict: dict) -> dict:
    """从用户输入中提取关键信息"""
    text = input_dict.get("text", "")
    return {
        "text": text,
        "word_count": len(text.split()),
        "language": "中文" if any('\u4e00' <= c <= '\u9fff' for c in text) else "英文"
    }

# 自定义后处理函数
def add_metadata(response: str) -> dict:
    """为响应添加元数据"""
    return {
        "content": response,
        "length": len(response),
        "has_code": "```" in response,
    }

# 组合自定义链
custom_chain = (
    RunnableLambda(extract_keywords)
    | ChatPromptTemplate.from_template(
        "请用{language}总结以下{word_count}词的文本：\n{text}"
    )
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
    | RunnableLambda(add_metadata)
)

result = custom_chain.invoke({"text": "人工智能技术的快速发展正在深刻改变各行各业的工作方式"})
print(result)
# {'content': '...', 'length': 42, 'has_code': False}
```

### 继承 Runnable 创建类（高级用法）

```python
from langchain_core.runnables import Runnable
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Any, Optional

class TranslationChain(Runnable):
    """可配置的翻译链"""

    def __init__(self, target_lang: str = "英文", model: str = "gpt-4o-mini"):
        self.target_lang = target_lang
        self._chain = (
            ChatPromptTemplate.from_template(
                f"请将以下文本翻译为{target_lang}，只返回翻译结果：\n{{text}}"
            )
            | ChatOpenAI(model=model, temperature=0)
            | StrOutputParser()
        )

    def invoke(self, input: Any, config: Optional[dict] = None) -> str:
        if isinstance(input, str):
            input = {"text": input}
        return self._chain.invoke(input, config=config)

# 使用自定义链
zh_to_en = TranslationChain(target_lang="英文")
zh_to_jp = TranslationChain(target_lang="日文")

print(zh_to_en.invoke("你好世界"))
print(zh_to_jp.invoke("你好世界"))

# 可以作为普通 Runnable 组合使用
pipeline = zh_to_en | RunnableLambda(lambda x: x.upper())
print(pipeline.invoke("人工智能"))
```

---

## 错误处理与重试

### 使用 with_retry

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o-mini")

# 为链添加重试逻辑
chain = (
    ChatPromptTemplate.from_template("回答：{question}")
    | llm.with_retry(
        retry_if_exception_type=(Exception,),
        stop_after_attempt=3,        # 最多重试 3 次
        wait_exponential_jitter=True # 指数退避 + 随机抖动
    )
    | StrOutputParser()
)
```

### 使用 with_fallbacks 降级处理

```python
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 主模型：GPT-4o
primary_llm = ChatOpenAI(model="gpt-4o")
# 备用模型：本地 Ollama
fallback_llm = ChatOllama(model="qwen2.5:7b")

# 主模型失败时自动切换到备用模型
llm_with_fallback = primary_llm.with_fallbacks([fallback_llm])

chain = (
    ChatPromptTemplate.from_template("解释：{concept}")
    | llm_with_fallback
    | StrOutputParser()
)

result = chain.invoke({"concept": "量子纠缠"})
print(result)
```

### 自定义错误处理

```python
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def safe_invoke(chain, input_data: dict, default: str = "处理失败，请稍后重试") -> str:
    """带错误处理的链调用"""
    try:
        return chain.invoke(input_data)
    except Exception as e:
        print(f"[错误] 链调用失败: {type(e).__name__}: {e}")
        return default

llm_chain = (
    ChatPromptTemplate.from_template("分析：{text}")
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)

result = safe_invoke(llm_chain, {"text": "这是一段测试文本"})
print(result)
```

---

## Chain 调试

### 打印中间步骤

```python
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

def debug_step(name: str):
    """创建调试节点，打印当前步骤的输入"""
    def _debug(x):
        print(f"\n[DEBUG - {name}]")
        print(f"  类型: {type(x).__name__}")
        if hasattr(x, 'content'):
            print(f"  内容: {x.content[:100]}...")
        else:
            print(f"  值: {str(x)[:200]}")
        return x
    return RunnableLambda(_debug)

# 在链中插入调试节点
chain = (
    ChatPromptTemplate.from_template("总结：{text}")
    | debug_step("Prompt 输出")
    | ChatOpenAI(model="gpt-4o-mini")
    | debug_step("LLM 输出")
    | StrOutputParser()
    | debug_step("解析后")
)

result = chain.invoke({"text": "深度学习是机器学习的一个分支"})
```

### 使用 LangSmith 追踪

```python
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# 启用 LangSmith 追踪
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls__your_key"
os.environ["LANGCHAIN_PROJECT"] = "rag-debug"

# 为运行添加自定义标签，便于在 LangSmith 中筛选
chain = (
    ChatPromptTemplate.from_template("解释：{concept}")
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)

result = chain.invoke(
    {"concept": "神经网络"},
    config={
        "run_name": "概念解释-神经网络",  # 自定义运行名称
        "tags": ["production", "concept-explanation"],
        "metadata": {"user_id": "user_123"},
    }
)
```

---

## 常见问题与最佳实践

### 问题1：如何处理链的输出类型不匹配

```python
from langchain_core.runnables import RunnableLambda

# 场景：前一步输出 dict，下一步需要 str
chain = (
    some_chain_returns_dict
    | RunnableLambda(lambda x: x["answer"])  # 提取 dict 中的字段
    | next_chain_needs_str
)
```

### 问题2：如何实现条件分支

```python
from langchain_core.runnables import RunnableBranch
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-4o-mini")

# 根据输入内容选择不同的处理链
branch_chain = RunnableBranch(
    # (条件函数, 对应的链)
    (
        lambda x: "代码" in x["type"],
        ChatPromptTemplate.from_template("审查代码：{content}") | llm | StrOutputParser()
    ),
    (
        lambda x: "文章" in x["type"],
        ChatPromptTemplate.from_template("总结文章：{content}") | llm | StrOutputParser()
    ),
    # 默认分支
    ChatPromptTemplate.from_template("处理内容：{content}") | llm | StrOutputParser()
)

result = branch_chain.invoke({"type": "代码审查", "content": "def hello(): print('hi')"})
print(result)
```

### 最佳实践总结

1. **优先使用 LCEL 管道语法** - 比旧版 Chain 类更简洁、功能更强
2. **合理使用 RunnableParallel** - 对独立任务并行处理，提升速度
3. **为生产链添加 with_retry 和 with_fallbacks** - 提升健壮性
4. **用 debug_step 调试复杂链** - 逐步确认每个节点的输入输出
5. **避免在链中做复杂的 IO 操作** - 将 IO 封装在独立函数中，保持链的清晰
6. **RAG Chain 中的检索步骤要做超时控制** - 避免向量检索卡住整个链
