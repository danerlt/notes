# Embedding 模型

## 概念介绍

Embedding（向量嵌入）是将文本（或其他数据）转换为固定长度的稠密向量的技术。语义相似的文本在向量空间中距离更近，这是 RAG 系统相似度检索的基础。

Embedding 模型的作用：
- 将文档切片转换为向量，存入向量数据库（**离线索引**）
- 将用户查询转换为向量，与文档向量计算相似度（**在线检索**）

好的 Embedding 模型需要：
- **高语义理解能力**：语义相似的文本向量距离近
- **跨语言支持**：中英文混合文档处理
- **高效推理速度**：在线查询要求低延迟
- **合适的向量维度**：维度越高，表达能力越强，但存储和计算成本越高

## 核心原理

### 向量表示

一段文本通过 Embedding 模型转换为浮点数向量，例如：

```
"RAG 是检索增强生成技术" → [0.023, -0.156, 0.478, ..., 0.234]  # 1024 维向量
```

语义相近的文本，其向量的余弦相似度更高：
- "RAG" 和 "检索增强生成" → 余弦相似度 ≈ 0.95（非常接近）
- "RAG" 和 "深度学习" → 余弦相似度 ≈ 0.6（一般相关）
- "RAG" 和 "足球比赛" → 余弦相似度 ≈ 0.2（不相关）

### Embedding 模型架构

主流 Embedding 模型基于 **BERT/RoBERTa** 架构或 **Sentence Transformers** 框架：

1. **Bi-Encoder（双塔模型）**：Query 和 Document 分别编码，适合大规模检索（速度快）
2. **Cross-Encoder（交叉编码器）**：Query 和 Document 联合编码，精度更高但速度慢（用于 Reranking）

RAG 检索阶段使用 **Bi-Encoder**，Reranking 阶段使用 **Cross-Encoder**。

### 主流 Embedding 模型对比

| 模型 | 机构 | 维度 | 最大 Token | 语言 | 特点 |
|------|------|------|-----------|------|------|
| text-embedding-3-small | OpenAI | 1536 | 8191 | 多语言 | API，性价比高 |
| text-embedding-3-large | OpenAI | 3072 | 8191 | 多语言 | API，精度更高 |
| BAAI/bge-m3 | 北航 | 1024 | 8192 | 100+ 语言 | 开源，多粒度检索 |
| BAAI/bge-large-zh-v1.5 | 北航 | 1024 | 512 | 中文 | 开源，中文最佳 |
| BAAI/bge-large-en-v1.5 | 北航 | 1024 | 512 | 英文 | 开源，英文强 |
| mxbai-embed-large | MixedBread | 1024 | 512 | 多语言 | 开源，性能优秀 |
| nomic-embed-text | Nomic AI | 768 | 8192 | 英文 | 开源，长文本 |
| e5-mistral-7b-instruct | Microsoft | 4096 | 32768 | 多语言 | 开源，7B 参数 |
| Cohere Embed v3 | Cohere | 1024 | 512 | 多语言 | API，企业级 |

**2024-2025 推荐**：
- **云端 API**：`text-embedding-3-small`（经济）或 `text-embedding-3-large`（高质量）
- **中文私有化部署**：`BAAI/bge-m3`（多语言+长文本）
- **纯中文场景**：`BAAI/bge-large-zh-v1.5`

## 代码示例（Python）

### OpenAI Embedding API

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """获取单个文本的向量"""
    # 清理文本（去除多余空白，避免浪费 Token）
    text = text.replace("\n", " ").strip()
    response = client.embeddings.create(
        model=model,
        input=text,
        encoding_format="float"  # "float" 或 "base64"
    )
    return response.data[0].embedding


def get_embeddings_batch(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    """批量获取向量（更高效）"""
    # 批量请求，减少 API 调用次数
    texts = [t.replace("\n", " ").strip() for t in texts]
    response = client.embeddings.create(
        model=model,
        input=texts
    )
    # 按原始顺序返回
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


# 测试
texts = [
    "RAG 是检索增强生成技术",
    "Retrieval-Augmented Generation combines retrieval with LLM",
    "足球是一种团队体育运动",
    "向量数据库专门用于存储高维向量",
]

embeddings = get_embeddings_batch(texts)
print(f"向量维度: {len(embeddings[0])}")

# 计算相似度矩阵
def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

print("\n余弦相似度矩阵:")
for i in range(len(texts)):
    for j in range(len(texts)):
        sim = cosine_similarity(embeddings[i], embeddings[j])
        print(f"  [{i},{j}] {sim:.3f}", end="")
    print()
```

### 使用 HuggingFace 本地 Embedding（BGE-M3）

```python
from sentence_transformers import SentenceTransformer
import numpy as np
import torch

# 加载 BGE-M3（支持 100+ 语言，8192 Token 上下文）
model = SentenceTransformer(
    "BAAI/bge-m3",
    device="cuda" if torch.cuda.is_available() else "cpu"
)

# 单个文本编码
text = "RAG 系统通过检索相关文档来增强 LLM 的生成能力"
embedding = model.encode(text, normalize_embeddings=True)
print(f"向量维度: {embedding.shape}")  # (1024,)

# 批量编码
texts = [
    "RAG 是检索增强生成技术，用于减少 LLM 幻觉",
    "向量检索是 RAG 系统的核心组件",
    "今天天气很好，适合出去散步",
    "FAISS 是一个高效的向量相似度搜索库",
]

# 批量编码（推荐使用 batch_size 控制内存）
embeddings = model.encode(
    texts,
    batch_size=32,
    normalize_embeddings=True,   # 归一化，使余弦相似度 = 点积
    show_progress_bar=True
)
print(f"批量向量形状: {embeddings.shape}")  # (4, 1024)

# 相似度计算
from sentence_transformers import util
similarity_matrix = util.cos_sim(embeddings, embeddings)
print("\n相似度矩阵:")
print(similarity_matrix)
```

### BGE-M3 多粒度检索（Dense + Sparse + ColBERT）

```python
from FlagEmbedding import BGEM3FlagModel

# BGE-M3 支持三种检索模式
model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

queries = ["什么是 RAG 技术？"]
passages = [
    "RAG 是检索增强生成技术，通过检索相关文档来增强 LLM 的知识",
    "向量数据库用于存储和检索高维向量，是 RAG 系统的核心组件",
    "深度学习使用多层神经网络进行特征提取",
]

# 编码
query_embeddings = model.encode(queries, return_dense=True, return_sparse=True, return_colbert_vecs=True)
passage_embeddings = model.encode(passages, return_dense=True, return_sparse=True, return_colbert_vecs=True)

# 三种相似度计算
dense_scores = query_embeddings['dense_vecs'] @ passage_embeddings['dense_vecs'].T
sparse_scores = model.compute_lexical_matching_score(
    query_embeddings['lexical_weights'],
    passage_embeddings['lexical_weights']
)
colbert_scores = model.colbert_score(
    query_embeddings['colbert_vecs'],
    passage_embeddings['colbert_vecs']
)

# 混合得分（加权融合）
hybrid_scores = 0.4 * dense_scores + 0.2 * sparse_scores + 0.4 * colbert_scores

print("Dense scores:", dense_scores)
print("Sparse scores:", sparse_scores)
print("ColBERT scores:", colbert_scores)
print("Hybrid scores:", hybrid_scores)
```

### LangChain 集成各种 Embedding

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_cohere import CohereEmbeddings

# OpenAI Embedding
openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    dimensions=1024  # 支持降维，节省存储（仅 text-embedding-3-* 支持）
)

# HuggingFace 本地模型（BGE-M3）
bge_embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cuda"},
    encode_kwargs={
        "normalize_embeddings": True,
        "batch_size": 32
    }
)

# Cohere 商业 Embedding
cohere_embeddings = CohereEmbeddings(
    model="embed-multilingual-v3.0",
    cohere_api_key="your-api-key"
)

# 使用示例（与 Chroma 向量数据库集成）
from langchain_community.vectorstores import Chroma

vectorstore = Chroma.from_texts(
    texts=["RAG 技术介绍", "向量数据库原理", "LLM 基础"],
    embedding=bge_embeddings,
    persist_directory="./chroma_db"
)

# 相似度搜索
results = vectorstore.similarity_search_with_score("检索增强生成", k=3)
for doc, score in results:
    print(f"相似度: {score:.4f} | 内容: {doc.page_content}")
```

### Embedding 维度压缩（节省存储）

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

# text-embedding-3-* 支持指定维度（Matryoshka Representation Learning）
def get_embedding_with_dim(text: str, dimensions: int = 256) -> list[float]:
    """获取指定维度的向量"""
    response = client.embeddings.create(
        model="text-embedding-3-large",  # 原始 3072 维
        input=text,
        dimensions=dimensions  # 压缩到指定维度
    )
    return response.data[0].embedding

# 对比不同维度的效果
test_text = "大语言模型是 AI 的重要突破"
for dim in [256, 512, 1024, 3072]:
    emb = get_embedding_with_dim(test_text, dim)
    print(f"维度 {dim}: 向量长度 = {len(emb)}")
    # 存储成本：3072维 float32 = 12KB，256维 = 1KB，节省92%
```

## 常见用法

### Embedding 模型选择指南

```python
# 根据场景选择 Embedding 模型
def recommend_embedding_model(
    language: str,      # "zh", "en", "multilingual"
    deployment: str,    # "cloud", "local"
    priority: str       # "speed", "quality", "cost"
) -> str:

    if deployment == "cloud":
        if priority == "cost":
            return "text-embedding-3-small（$0.02/1M tokens）"
        else:
            return "text-embedding-3-large（$0.13/1M tokens，精度更高）"

    else:  # local
        if language == "zh":
            if priority == "quality":
                return "BAAI/bge-m3（多语言，8192 context，最推荐）"
            else:
                return "BAAI/bge-large-zh-v1.5（纯中文，速度快）"
        elif language == "en":
            return "BAAI/bge-large-en-v1.5 或 nomic-embed-text"
        else:
            return "BAAI/bge-m3（100+ 语言，推荐默认）"
```

### 向量缓存（生产环境必备）

```python
import hashlib
import json
import pickle
from pathlib import Path

class EmbeddingCache:
    """向量缓存，避免重复计算"""

    def __init__(self, cache_dir: str = ".embedding_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)

    def _get_cache_key(self, text: str, model: str) -> str:
        content = f"{model}:{text}"
        return hashlib.md5(content.encode()).hexdigest()

    def get(self, text: str, model: str) -> list[float] | None:
        key = self._get_cache_key(text, model)
        cache_file = self.cache_dir / f"{key}.pkl"
        if cache_file.exists():
            with open(cache_file, "rb") as f:
                return pickle.load(f)
        return None

    def set(self, text: str, model: str, embedding: list[float]):
        key = self._get_cache_key(text, model)
        cache_file = self.cache_dir / f"{key}.pkl"
        with open(cache_file, "wb") as f:
            pickle.dump(embedding, f)

cache = EmbeddingCache()

def get_embedding_with_cache(text: str, model: str = "text-embedding-3-small") -> list[float]:
    cached = cache.get(text, model)
    if cached is not None:
        return cached

    response = client.embeddings.create(model=model, input=text)
    embedding = response.data[0].embedding
    cache.set(text, model, embedding)
    return embedding
```

## 小结

- **Embedding 模型是 RAG 系统的基础**，模型质量直接决定检索准确率的上限
- **BGE-M3** 是 2024-2025 年中文场景私有化部署的最佳选择，支持多语言、长文本（8192 token）、多粒度检索
- **OpenAI text-embedding-3-small** 是云端方案的性价比首选，支持维度压缩节省存储
- **维度压缩**（Matryoshka Embeddings）：text-embedding-3 支持将 3072 维压缩到 256 维，存储节省 92%，质量略有损失
- **批量编码**比逐条调用效率高 10-50 倍，生产环境务必使用批量 API
- **向量缓存**是生产环境的必备优化，相同文本无需重复调用 Embedding API
