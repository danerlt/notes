# RAG 概述

## 概念介绍

RAG（Retrieval-Augmented Generation，检索增强生成）是将信息检索与大语言模型生成能力相结合的技术架构。它解决了 LLM 的两个核心痛点：

1. **知识截止（Knowledge Cutoff）**：LLM 训练数据有时效性，无法获取最新信息
2. **幻觉（Hallucination）**：LLM 在缺乏知识时可能编造答案

RAG 的核心思路：**先检索相关文档，再基于文档生成答案**。模型不再依赖"记忆"，而是依赖"查阅"。

### RAG 的优势

- **时效性**：可以随时更新知识库，无需重新训练模型
- **可追溯**：答案可以指向具体文档来源
- **成本低**：相比微调，知识库更新成本极低
- **可控性**：限定模型只能基于检索内容回答，减少幻觉

## 核心原理

### RAG 发展阶段

#### Naive RAG（基础 RAG）

最简单的 RAG 实现：

```
用户问题
    ↓
向量化（Embedding）
    ↓
向量数据库检索（Top-K 相似文档）
    ↓
拼接到 Prompt 中
    ↓
LLM 生成答案
```

**局限性**：
- 检索精度不足（向量相似度 ≠ 语义相关）
- 上下文窗口限制了可引用的文档数量
- 缺乏对复杂问题的分解能力

#### Advanced RAG（高级 RAG）

在 Naive RAG 基础上添加优化：

**预检索优化（Pre-Retrieval）**：
- **查询改写（Query Rewriting）**：用 LLM 改写用户问题，提升检索效果
- **HyDE（Hypothetical Document Embedding）**：生成假设答案文档再检索
- **子问题分解（Query Decomposition）**：复杂问题拆分为多个子问题

**检索优化（Retrieval）**：
- **混合检索（Hybrid Search）**：向量检索 + BM25 关键词检索
- **多向量索引**：对文档不同粒度（标题、段落、摘要）分别建索引
- **重排序（Reranking）**：用 Cross-Encoder 对检索结果精排

**后检索优化（Post-Retrieval）**：
- **上下文压缩**：去除检索文档中的冗余信息
- **重排序与过滤**：根据相关性再次筛选

#### Modular RAG（模块化 RAG）

将 RAG 拆分为可组合的模块，灵活搭配：

```
查询分析模块 → 路由模块 → 检索模块 → 重排序模块 → 生成模块
                              ↑
                     （网络搜索 / 向量库 / 结构化DB）
```

### RAG 完整流程图

```
【索引阶段（离线）】
原始文档（PDF/Word/网页）
    ↓ 文档加载
    ↓ 文本切分（Chunking）
    ↓ 向量化（Embedding Model）
    ↓ 存入向量数据库

【查询阶段（在线）】
用户问题
    ↓ 查询优化（可选）
    ↓ 向量化
    ↓ 相似度检索（Top-K）
    ↓ 重排序（可选）
    ↓ 构建 Prompt（问题 + 上下文）
    ↓ LLM 生成答案
    ↓ 返回答案 + 来源引用
```

### 关键技术组件

| 组件 | 主要方案 | 说明 |
|------|----------|------|
| 文档加载 | LangChain Loaders、PyMuPDF | 支持 PDF/Word/HTML/Markdown |
| 文本切分 | RecursiveTextSplitter、语义切分 | 核心参数：chunk_size, overlap |
| Embedding 模型 | BGE-M3、text-embedding-3-small | 文本向量化 |
| 向量数据库 | Chroma、FAISS、Qdrant、Milvus | 存储和检索向量 |
| 重排序 | BGE-Reranker、Cohere Rerank | 精排检索结果 |
| LLM | GPT-4o、Claude、Qwen | 最终生成答案 |

## 代码示例（Python）

### 最简 RAG 实现

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

# 模拟知识库文档
documents = [
    "RAG（检索增强生成）是结合检索和生成的 AI 技术，能减少大模型幻觉。",
    "向量数据库专门存储高维向量，支持高效的近似最近邻（ANN）搜索。",
    "BM25 是一种经典的词汇检索算法，基于词频和逆文档频率计算相关性。",
    "FAISS 是 Facebook 开发的高效向量相似度搜索库，支持亿级向量检索。",
    "Embedding 模型将文本转换为稠密向量，使语义相似的文本在向量空间中距离更近。",
]


def get_embedding(text: str) -> list[float]:
    """获取文本向量"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def cosine_similarity(a: list, b: list) -> float:
    """计算余弦相似度"""
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# 预计算文档向量（实际应用中存入向量数据库）
doc_embeddings = [get_embedding(doc) for doc in documents]


def simple_rag(question: str, top_k: int = 3) -> str:
    """简单 RAG 实现"""
    # 1. 问题向量化
    question_embedding = get_embedding(question)

    # 2. 检索最相似文档
    similarities = [cosine_similarity(question_embedding, doc_emb) for doc_emb in doc_embeddings]
    top_k_indices = np.argsort(similarities)[::-1][:top_k]
    retrieved_docs = [documents[i] for i in top_k_indices]

    # 3. 构建 Prompt
    context = "\n".join([f"- {doc}" for doc in retrieved_docs])
    prompt = f"""请基于以下参考资料回答问题。如果资料中没有相关信息，请说明。

参考资料：
{context}

问题：{question}

回答："""

    # 4. LLM 生成
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )

    return response.choices[0].message.content


# 测试
answer = simple_rag("什么是 RAG？它有什么优势？")
print(answer)
```

### 使用 LangChain 构建 RAG

```python
from langchain_community.document_loaders import PyMuPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

# 1. 加载文档
loader = DirectoryLoader("./docs", glob="**/*.pdf", loader_cls=PyMuPDFLoader)
documents = loader.load()
print(f"加载了 {len(documents)} 个文档")

# 2. 文本切分
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""]
)
chunks = splitter.split_documents(documents)
print(f"切分为 {len(chunks)} 个 chunk")

# 3. 向量化并存入 Chroma
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# 4. 构建检索器
retriever = vectorstore.as_retriever(
    search_type="mmr",           # MMR 算法保证多样性
    search_kwargs={"k": 5, "fetch_k": 20}
)

# 5. 自定义 Prompt 模板
prompt_template = """你是一个专业的问答助手。请基于以下上下文回答问题。
如果上下文中没有答案，请说"根据现有资料，无法回答此问题"，不要编造答案。

上下文：
{context}

问题：{question}

回答（请引用文档中的原文支持你的回答）："""

PROMPT = PromptTemplate(
    template=prompt_template,
    input_variables=["context", "question"]
)

# 6. 构建 RAG 链
llm = ChatOpenAI(model="gpt-4o", temperature=0.1)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    chain_type_kwargs={"prompt": PROMPT},
    return_source_documents=True
)

# 7. 查询
result = qa_chain.invoke({"query": "文档中提到了哪些关键技术？"})
print(f"答案：\n{result['result']}")
print(f"\n来源文档数：{len(result['source_documents'])}")
for i, doc in enumerate(result['source_documents'][:2], 1):
    print(f"\n来源{i}（{doc.metadata.get('source', '未知')}）：")
    print(doc.page_content[:200] + "...")
```

## 常见用法

### RAG 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 检索不到相关内容 | chunk 太大或太小 | 调整 chunk_size，尝试语义切分 |
| 答案不准确 | 检索文档相关性低 | 加入重排序（Reranker） |
| 答案缺乏完整性 | 信息分散在多个 chunk | 增大 top_k，使用摘要索引 |
| 回答了知识库外的问题 | System Prompt 约束不足 | 强化 System Prompt 约束 |
| 延迟高 | Embedding 或 LLM 慢 | 使用更快的 Embedding，缓存常见查询 |

### RAG 关键参数调优

```python
# chunk_size 选择建议
chunk_size_guide = {
    "短文本/FAQ": 100-200,
    "通用文档": 300-500,
    "长文章/书籍": 500-1000,
    "代码文件": 按函数或类切分,
}

# overlap 建议：chunk_size 的 10%-20%
# top_k 建议：通常 3-10，过多会稀释注意力

# Embedding 模型选择
embedding_models = {
    "快速+经济": "text-embedding-3-small（1536维，OpenAI）",
    "高质量中文": "BAAI/bge-m3（1024维，免费）",
    "平衡": "text-embedding-3-large（3072维，OpenAI）",
}
```

## 小结

- **RAG 的核心价值**：让 LLM 能够基于私有、实时的知识库回答问题，同时保持答案可追溯
- **Naive RAG → Advanced RAG → Modular RAG** 的演进，每个阶段都在解决上一阶段的痛点
- **检索质量是 RAG 系统的瓶颈**，混合检索（向量 + BM25）+ 重排序是 2024-2025 年的最佳实践
- **LangChain** 是构建 RAG 的主流框架，提供了完整的组件体系
- 构建 RAG 系统时，**评估**（RAGAS 框架）同样重要——没有度量就没有改进
