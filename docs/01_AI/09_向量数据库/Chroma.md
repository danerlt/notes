# Chroma

## Chroma 简介

Chroma 是一个开源的轻量级向量数据库，专为 AI 应用开发而设计。它的核心特点是**零配置、内嵌运行**——无需独立部署服务器，像 SQLite 一样直接在 Python 进程内使用，是快速原型开发和中小规模应用的首选。

**核心特点**：
- 内嵌模式（in-process）：直接在 Python 进程中运行，无需启动外部服务
- 持久化存储：数据可持久化到本地磁盘
- 简洁 API：集合（Collection）级别的操作，API 极度简化
- LangChain / LlamaIndex 原生支持：主流 AI 框架深度集成
- 内置 Embedding 函数：可选择是否自带向量化

**适用规模**：百万条以内的向量数据，开发/测试/中小型生产应用。

## 安装

```bash
# 基础安装
pip install chromadb

# 如果需要使用 OpenAI Embedding（推荐）
pip install chromadb openai

# 如果需要使用本地 Sentence Transformers
pip install chromadb sentence-transformers
```

## 基本使用

### 创建客户端

```python
import chromadb

# 内存模式（数据不持久化，适合测试）
client = chromadb.Client()

# 持久化模式（数据保存到本地目录）
client = chromadb.PersistentClient(path="./chroma_db")

# 查看当前所有 collection
print(client.list_collections())
```

### 创建 Collection

```python
import chromadb
from chromadb.utils import embedding_functions

# 使用内置的 OpenAI Embedding 函数
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-api-key",          # 或从环境变量 OPENAI_API_KEY 读取
    model_name="text-embedding-3-small"
)

client = chromadb.PersistentClient(path="./chroma_db")

# 创建 collection，指定 embedding 函数
collection = client.create_collection(
    name="my_documents",
    embedding_function=openai_ef,
    metadata={"hnsw:space": "cosine"}  # 距离度量：cosine / l2 / ip
)

# 获取已存在的 collection（不存在则报错）
collection = client.get_collection(
    name="my_documents",
    embedding_function=openai_ef
)

# 获取或创建（最常用的方式）
collection = client.get_or_create_collection(
    name="my_documents",
    embedding_function=openai_ef,
    metadata={"hnsw:space": "cosine"}
)
```

### 添加文档

```python
# 方式一：只提供文本，让 Chroma 自动调用 embedding_function 生成向量
collection.add(
    documents=[
        "Python 是一种面向对象的解释型编程语言",
        "机器学习通过数据训练模型来完成任务",
        "向量数据库用于存储和检索高维向量",
        "RAG 技术结合检索和生成来提升 LLM 准确性",
        "Transformer 架构是现代大语言模型的基础",
    ],
    metadatas=[
        {"category": "编程", "source": "wiki"},
        {"category": "AI", "source": "textbook"},
        {"category": "数据库", "source": "blog"},
        {"category": "AI", "source": "paper"},
        {"category": "AI", "source": "paper"},
    ],
    ids=["doc_1", "doc_2", "doc_3", "doc_4", "doc_5"]
    # ids 必须唯一，不提供会报错
)

# 方式二：自行提供向量（适合已有向量，避免重复计算）
import numpy as np

my_embeddings = [
    np.random.rand(1536).tolist(),   # 实际应用中替换为真实的 embedding
    np.random.rand(1536).tolist(),
]

collection.add(
    embeddings=my_embeddings,
    documents=["自定义向量文档1", "自定义向量文档2"],
    metadatas=[{"source": "custom"}, {"source": "custom"}],
    ids=["custom_1", "custom_2"]
)

# 查看 collection 中的文档数量
print(f"文档总数: {collection.count()}")
```

### 查询

```python
# 基础语义查询：输入文本，Chroma 自动向量化后检索
results = collection.query(
    query_texts=["什么是人工智能？"],
    n_results=3   # 返回最相似的3条
)

print("查询结果:")
for i, (doc, meta, dist) in enumerate(zip(
    results["documents"][0],
    results["metadatas"][0],
    results["distances"][0]
)):
    print(f"[{i+1}] 相似度距离: {dist:.4f}")
    print(f"    内容: {doc}")
    print(f"    元数据: {meta}")

# 多查询（批量查询，一次请求）
multi_results = collection.query(
    query_texts=["什么是机器学习？", "数据库有哪些类型？"],
    n_results=2
)
# multi_results["documents"][0] 是第一个查询的结果
# multi_results["documents"][1] 是第二个查询的结果

# 使用自定义向量查询
query_embedding = np.random.rand(1536).tolist()
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=3
)
```

### 更新与删除

```python
# 更新已有文档（id 必须存在，否则报错）
collection.update(
    ids=["doc_1"],
    documents=["Python 是一种高级、解释型、面向对象的编程语言，以简洁著称"],
    metadatas=[{"category": "编程", "source": "wiki", "updated": True}]
)

# Upsert：存在则更新，不存在则插入（最安全的写入方式）
collection.upsert(
    documents=["新文档内容"],
    metadatas=[{"category": "新分类"}],
    ids=["new_doc_1"]
)

# 删除指定 id
collection.delete(ids=["doc_2", "doc_3"])

# 按元数据条件删除
collection.delete(
    where={"category": "编程"}
)

# 删除整个 collection
client.delete_collection("my_documents")
```

## 持久化存储

```python
import chromadb

# 使用 PersistentClient，数据自动持久化到指定目录
client = chromadb.PersistentClient(path="./my_vector_store")

collection = client.get_or_create_collection("knowledge_base")

# 写入数据...
collection.add(
    documents=["这条数据会被持久化到磁盘"],
    ids=["persist_1"]
)

# 程序重启后，数据依然存在
# 重新创建 client，之前的数据自动加载
client2 = chromadb.PersistentClient(path="./my_vector_store")
collection2 = client2.get_collection("knowledge_base")
print(f"重启后文档数: {collection2.count()}")  # 依然是之前写入的数量
```

## 元数据过滤

Chroma 支持在查询时按元数据字段进行过滤，避免全量语义搜索：

```python
# 单条件过滤：只在 category 为 "AI" 的文档中搜索
results = collection.query(
    query_texts=["模型训练方法"],
    n_results=3,
    where={"category": "AI"}           # 精确匹配
)

# 多条件过滤（AND）
results = collection.query(
    query_texts=["深度学习框架"],
    n_results=3,
    where={
        "$and": [
            {"category": {"$eq": "AI"}},
            {"source": {"$eq": "paper"}}
        ]
    }
)

# 支持的比较操作符
# $eq: 等于       $ne: 不等于
# $gt: 大于       $gte: 大于等于
# $lt: 小于       $lte: 小于等于
# $in: 在列表中   $nin: 不在列表中

# 示例：检索 page 大于 5 的文档
results = collection.query(
    query_texts=["搜索内容"],
    n_results=5,
    where={"page": {"$gt": 5}}
)

# 同时过滤文档内容（全文过滤，非向量搜索）
results = collection.query(
    query_texts=["搜索内容"],
    n_results=5,
    where_document={"$contains": "Python"}  # 文档文本必须包含 "Python"
)
```

## 与 LangChain 集成

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader

# 初始化 Embedding 模型
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 方式一：从文档列表直接创建
from langchain_core.documents import Document

docs = [
    Document(
        page_content="Chroma 是一个轻量级向量数据库，适合开发阶段使用",
        metadata={"source": "docs", "page": 1}
    ),
    Document(
        page_content="LangChain 提供了丰富的工具链用于构建 AI 应用",
        metadata={"source": "docs", "page": 2}
    ),
]

vectorstore = Chroma.from_documents(
    documents=docs,
    embedding=embeddings,
    persist_directory="./langchain_chroma",  # 持久化路径
    collection_name="langchain_docs"
)

# 方式二：加载已有的持久化 Chroma
vectorstore = Chroma(
    persist_directory="./langchain_chroma",
    embedding_function=embeddings,
    collection_name="langchain_docs"
)

# 语义搜索
results = vectorstore.similarity_search(
    query="什么是向量数据库？",
    k=3,
    filter={"source": "docs"}  # 元数据过滤
)
for doc in results:
    print(f"内容: {doc.page_content}")
    print(f"元数据: {doc.metadata}")

# 带分数的搜索（返回相似度分数）
results_with_score = vectorstore.similarity_search_with_score(
    query="AI 开发工具",
    k=3
)
for doc, score in results_with_score:
    print(f"分数: {score:.4f} | {doc.page_content[:50]}")

# 作为 Retriever 使用（可直接嵌入 RAG 链）
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)
```

## 完整 RAG 示例

```python
import os
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# ---- 第一步：准备知识库文档 ----
raw_documents = [
    """
    公司退款政策：
    1. 购买后7天内可无理由退款，需保持商品完好
    2. 7-30天内如有质量问题可申请退款，需提供照片证明
    3. 超过30天不支持退款，但可申请维修服务
    4. 数字商品（软件、课程）一经激活不支持退款
    """,
    """
    配送说明：
    1. 默认使用顺丰快递，一般1-3个工作日送达
    2. 偏远地区可能需要5-7个工作日
    3. 订单满200元免运费，不满则收取12元运费
    4. 支持货到付款，收取5元手续费
    """,
    """
    会员权益：
    1. 普通会员：享受9折优惠，生日双倍积分
    2. 黄金会员：享受8.5折优惠，专属客服，优先发货
    3. 铂金会员：享受8折优惠，每月赠品，免费退换货
    4. 会员积分100分可兑换1元优惠券
    """,
]

# ---- 第二步：文本切分 ----
splitter = RecursiveCharacterTextSplitter(
    chunk_size=200,
    chunk_overlap=20,
    separators=["\n\n", "\n", "。", "，"]
)

documents = []
for i, text in enumerate(raw_documents):
    chunks = splitter.create_documents(
        [text],
        metadatas=[{"doc_id": i, "source": f"policy_{i}"}]
    )
    documents.extend(chunks)

print(f"切分后共 {len(documents)} 个文档块")

# ---- 第三步：建立向量索引 ----
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vectorstore = Chroma.from_documents(
    documents=documents,
    embedding=embeddings,
    persist_directory="./rag_chroma_db",
    collection_name="company_policies"
)

# ---- 第四步：构建 RAG 链 ----
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}
)

prompt = ChatPromptTemplate.from_template("""
你是一个客服助手，请根据以下参考资料回答用户问题。
如果参考资料中没有相关信息，请如实告知。

参考资料：
{context}

用户问题：{question}

请用简洁、友好的语言回答：
""")

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# ---- 第五步：测试 ----
questions = [
    "我买的东西可以退款吗？",
    "运费怎么计算？",
    "黄金会员有什么优惠？",
]

for q in questions:
    print(f"\nQ: {q}")
    answer = rag_chain.invoke(q)
    print(f"A: {answer}")
```

## 优缺点分析

### 优点

1. **上手极快**：`pip install chromadb` 后三行代码即可运行，无需任何配置
2. **无外部依赖**：不需要 Docker，不需要运行额外服务
3. **API 简洁直观**：概念少，学习曲线极低
4. **LangChain 原生集成**：在 LangChain 生态中是使用最广泛的向量数据库
5. **本地开发友好**：数据存在本地，调试方便，无网络依赖

### 缺点

1. **扩展性有限**：不支持分布式部署，无法水平扩展
2. **过滤功能较弱**：相比 Qdrant/Milvus，元数据过滤能力有限
3. **没有 gRPC 支持**：高并发场景下性能不如专业数据库
4. **生产稳定性**：社区和企业级支持不如 Milvus/Qdrant 成熟
5. **不适合超大规模**：千万级以上向量建议迁移到其他方案

### 适用场景总结

| 场景 | 推荐度 |
|------|--------|
| 本地原型开发 / Demo | 强烈推荐 |
| 个人项目 / 小团队应用 | 推荐 |
| 中小规模生产（<100万向量） | 可以使用 |
| 大规模生产（>1000万向量） | 不推荐，考虑 Qdrant/Milvus |
| 需要强过滤/高并发 | 不推荐 |
