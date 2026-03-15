# 重排序 Rerank

## 概念介绍

Reranking（重排序）是 RAG 系统中的精排阶段：在向量检索（粗排）返回 Top-N 候选文档后，使用更精确但计算量更大的模型对候选文档重新打分排序，选出最相关的 Top-K 结果传给 LLM。

**为什么需要 Rerank？**

向量检索（Bi-Encoder）的局限：
- Embedding 模型将 Query 和 Document 独立编码，无法建模两者的细粒度交互
- 召回的 Top-20 中可能有排名靠后但实际更相关的文档
- 向量相似度 ≠ 语义相关性（如近义词、转述表达）

Reranking 通过联合建模 Query 和 Document 的交互，能显著提升最终排序质量。

**典型 RAG 流程（带 Rerank）**：
```
用户问题
    ↓ 向量检索（快速粗排，Top-20~50）
    ↓ Reranker（精排，Top-3~5）
    ↓ LLM 生成答案
```

## 核心原理

### Bi-Encoder vs Cross-Encoder

**Bi-Encoder（双塔）**：
```
Query  →  Encoder  →  q_vector
Document →  Encoder  →  d_vector
similarity = cosine(q_vector, d_vector)
```
- 优点：速度极快（向量可预计算），适合大规模检索
- 缺点：Query 和 Document 独立编码，交互信息弱

**Cross-Encoder（交叉编码器）**：
```
[Query, Document]  →  Encoder  →  相关性得分
```
- 优点：联合建模 Query-Document 交互，精度高
- 缺点：无法预计算，每次查询都要计算，速度慢（O(n)）

**组合策略（2024-2025 最佳实践）**：
1. 向量检索（Bi-Encoder）：从百万文档中快速召回 Top-50
2. Reranker（Cross-Encoder）：对 Top-50 精排，选出 Top-5
3. LLM 生成：基于 Top-5 文档生成答案

### 主流 Reranker 模型对比

| 模型 | 机构 | 语言 | 部署方式 | 特点 |
|------|------|------|----------|------|
| BAAI/bge-reranker-v2-m3 | 北航 | 多语言 | 本地 | 开源最强，推荐 |
| BAAI/bge-reranker-large | 北航 | 中英文 | 本地 | 效果好，速度适中 |
| BAAI/bge-reranker-base | 北航 | 中英文 | 本地 | 速度快，轻量 |
| Cohere Rerank v3 | Cohere | 多语言 | API | 商业级，效果强 |
| ms-marco-MiniLM | Microsoft | 英文 | 本地 | 经典英文 Reranker |
| Jina Reranker v2 | Jina AI | 多语言 | API/本地 | 支持长文档 |
| LLM-based Reranker | — | 任意 | API | 使用 LLM 直接打分 |

## 代码示例（Python）

### BGE-Reranker 本地使用

```python
from FlagEmbedding import FlagReranker
import numpy as np

# 加载 BGE Reranker
reranker = FlagReranker(
    "BAAI/bge-reranker-v2-m3",
    use_fp16=True  # 使用半精度减少内存
)

# 候选文档
query = "RAG 系统如何提高准确性？"
candidates = [
    "RAG 通过检索相关文档为 LLM 提供上下文，有效减少幻觉",
    "向量数据库用于存储高维向量，支持近似最近邻搜索",
    "重排序模型对检索结果重新打分，提升最终排序质量",
    "深度学习是机器学习的子领域，使用多层神经网络",
    "RAG 系统的准确性可通过混合检索和 Reranking 显著提升",
    "Python 是 AI 开发的主流编程语言",
    "Reranker 使用 Cross-Encoder 架构，联合建模 Query 和 Document",
    "LLM 的幻觉问题可以通过 RAG 技术来缓解",
]

# 构建 (query, passage) 对
pairs = [(query, doc) for doc in candidates]

# 计算相关性得分
scores = reranker.compute_score(pairs, normalize=True)  # normalize=True 得分在 [0,1]
print(f"得分: {scores}")

# 按分数排序
ranked_results = sorted(zip(scores, candidates), reverse=True)
print("\nRerank 后的排序结果:")
for score, doc in ranked_results:
    print(f"  {score:.4f} | {doc}")
```

### 完整 Reranker Pipeline

```python
from FlagEmbedding import FlagReranker
from openai import OpenAI
import numpy as np
import faiss

client = OpenAI()

class RerankerPipeline:
    """完整的检索 → Rerank → 生成 Pipeline"""

    def __init__(
        self,
        documents: list[str],
        embedding_model: str = "text-embedding-3-small",
        reranker_model: str = "BAAI/bge-reranker-v2-m3",
        top_k_retrieve: int = 20,   # 向量检索返回数量
        top_k_rerank: int = 5,      # Rerank 后保留数量
    ):
        self.documents = documents
        self.top_k_retrieve = top_k_retrieve
        self.top_k_rerank = top_k_rerank
        self.embedding_model = embedding_model

        # 初始化 Reranker
        self.reranker = FlagReranker(reranker_model, use_fp16=True)

        # 构建向量索引
        print("构建向量索引...")
        embeddings = self._get_embeddings(documents)
        faiss.normalize_L2(embeddings)
        self.dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(self.dim)
        self.index.add(embeddings)
        print(f"索引构建完成，共 {len(documents)} 个文档")

    def _get_embeddings(self, texts: list[str]) -> np.ndarray:
        response = client.embeddings.create(model=self.embedding_model, input=texts)
        return np.array(
            [item.embedding for item in sorted(response.data, key=lambda x: x.index)],
            dtype=np.float32
        )

    def retrieve(self, query: str) -> list[dict]:
        """向量粗排"""
        query_emb = self._get_embeddings([query])
        faiss.normalize_L2(query_emb)
        scores, indices = self.index.search(query_emb, k=self.top_k_retrieve)

        return [
            {"doc": self.documents[idx], "vector_score": float(score), "idx": idx}
            for score, idx in zip(scores[0], indices[0])
        ]

    def rerank(self, query: str, candidates: list[dict]) -> list[dict]:
        """Cross-Encoder 精排"""
        pairs = [(query, c["doc"]) for c in candidates]
        scores = self.reranker.compute_score(pairs, normalize=True)

        for candidate, score in zip(candidates, scores):
            candidate["rerank_score"] = float(score)

        # 按 Rerank 得分排序，返回 top_k_rerank
        return sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)[:self.top_k_rerank]

    def generate(self, query: str, context_docs: list[dict]) -> str:
        """基于检索结果生成答案"""
        context = "\n\n".join([
            f"[文档{i+1}]（相关度：{doc['rerank_score']:.3f}）\n{doc['doc']}"
            for i, doc in enumerate(context_docs)
        ])

        prompt = f"""请基于以下参考资料回答问题。

参考资料：
{context}

问题：{query}

请给出准确、完整的回答，并说明依据："""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        return response.choices[0].message.content

    def query(self, question: str) -> dict:
        """完整查询流程"""
        print(f"\n问题: {question}")

        # 1. 向量检索
        candidates = self.retrieve(question)
        print(f"向量检索到 {len(candidates)} 个候选文档")

        # 2. Rerank
        reranked = self.rerank(question, candidates)
        print(f"Rerank 后保留 {len(reranked)} 个文档")
        for i, doc in enumerate(reranked, 1):
            print(f"  [{i}] 向量:{doc['vector_score']:.3f} → Rerank:{doc['rerank_score']:.3f} | {doc['doc'][:60]}...")

        # 3. 生成答案
        answer = self.generate(question, reranked)

        return {
            "question": question,
            "answer": answer,
            "source_docs": reranked,
            "retrieval_stats": {
                "retrieved": len(candidates),
                "reranked_kept": len(reranked)
            }
        }


# 使用示例
documents = [
    "RAG 是检索增强生成，通过检索相关文档减少 LLM 的幻觉",
    "向量检索使用 Bi-Encoder 快速找到相似文档，适合大规模场景",
    "Reranking 使用 Cross-Encoder 精确评估 Query-Document 相关性",
    "BGE-Reranker 是北航开发的开源重排序模型，支持中英文",
    "混合检索结合向量检索和 BM25，能提升检索的召回率",
    "FAISS 是高效的向量相似度搜索库，支持亿级向量",
    "Qdrant 是生产级向量数据库，支持元数据过滤和分布式部署",
    "LLM 生成答案时，高质量的上下文文档是准确率的关键",
]

pipeline = RerankerPipeline(documents, top_k_retrieve=6, top_k_rerank=3)
result = pipeline.query("Rerank 是如何工作的？有什么优势？")
print(f"\n最终答案:\n{result['answer']}")
```

### 使用 Cohere Rerank API（云端方案）

```python
import cohere
from openai import OpenAI

co = cohere.Client("your-cohere-api-key")
openai_client = OpenAI()

def cohere_rerank(query: str, documents: list[str], top_n: int = 5) -> list[dict]:
    """使用 Cohere Rerank API"""
    results = co.rerank(
        query=query,
        documents=documents,
        top_n=top_n,
        model="rerank-multilingual-v3.0",  # 支持中文
        return_documents=True
    )

    return [
        {
            "text": result.document.text,
            "relevance_score": result.relevance_score,
            "original_index": result.index
        }
        for result in results.results
    ]


# 使用示例
query = "如何优化 RAG 系统的检索准确性？"
results = cohere_rerank(query, documents, top_n=3)
for r in results:
    print(f"相关度: {r['relevance_score']:.4f} | {r['text'][:80]}")
```

### LLM-based Reranker（使用 LLM 打分）

```python
from openai import OpenAI

client = OpenAI()

def llm_rerank(query: str, documents: list[str], top_k: int = 3) -> list[dict]:
    """
    使用 LLM 对候选文档打分排序
    适合需要复杂推理判断相关性的场景
    较慢但精度高，适合候选文档较少的场景
    """
    scored_docs = []

    for doc in documents:
        prompt = f"""评估以下文档与问题的相关程度。

问题：{query}

文档：{doc}

请给出 0-10 的相关性评分，只输出数字：
- 0-2：完全不相关
- 3-5：部分相关
- 6-8：比较相关
- 9-10：高度相关

评分："""

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # 使用较便宜的模型打分
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=5
        )

        try:
            score = float(response.choices[0].message.content.strip())
        except ValueError:
            score = 5.0

        scored_docs.append({"doc": doc, "score": score / 10.0})

    return sorted(scored_docs, key=lambda x: x["score"], reverse=True)[:top_k]


# 使用
ranked = llm_rerank("什么是 Cross-Encoder？", documents, top_k=3)
for r in ranked:
    print(f"LLM 评分: {r['score']:.2f} | {r['doc'][:80]}")
```

## 常见用法

### Rerank 效果评估

```python
def evaluate_reranker_improvement(
    queries: list[str],
    ground_truth: list[list[int]],   # 每个 query 对应的相关文档索引
    before_rerank: list[list[int]],  # Rerank 前的排名
    after_rerank: list[list[int]],   # Rerank 后的排名
    k: int = 3
) -> dict:
    """评估 Rerank 前后的 Precision@K 变化"""

    def precision_at_k(ranked: list[int], relevant: list[int], k: int) -> float:
        top_k = ranked[:k]
        return sum(1 for idx in top_k if idx in relevant) / k

    before_scores = []
    after_scores = []

    for gt, before, after in zip(ground_truth, before_rerank, after_rerank):
        before_scores.append(precision_at_k(before, gt, k))
        after_scores.append(precision_at_k(after, gt, k))

    return {
        f"P@{k} before rerank": sum(before_scores) / len(before_scores),
        f"P@{k} after rerank": sum(after_scores) / len(after_scores),
        "improvement": (sum(after_scores) - sum(before_scores)) / len(after_scores)
    }
```

### 速度与精度的权衡

```python
# Reranker 耗时分析（参考）
performance_comparison = {
    "bge-reranker-base": {
        "latency_ms_per_doc": 2,   # 每文档约 2ms
        "quality": "good",
        "recommendation": "高并发场景"
    },
    "bge-reranker-large": {
        "latency_ms_per_doc": 8,
        "quality": "excellent",
        "recommendation": "平衡选择（最常用）"
    },
    "bge-reranker-v2-m3": {
        "latency_ms_per_doc": 10,
        "quality": "best",
        "recommendation": "多语言场景首选"
    },
    "cohere-rerank-v3": {
        "latency_ms_per_doc": 5,   # API 调用
        "quality": "excellent",
        "recommendation": "无本地 GPU 时的云端方案"
    }
}
# 实际延迟 = 候选文档数 × 每文档延迟
# Top-20 候选，bge-reranker-large：20 × 8ms = 160ms（可接受）
```

## 小结

- **Reranking 是 RAG 性能提升最显著的单点优化**，通常能将 Precision@3 提升 20%-40%
- **两阶段架构**（Bi-Encoder 粗排 + Cross-Encoder 精排）是 2024-2025 年 RAG 的标准配置
- **BGE-Reranker-v2-m3** 是中文场景私有化部署的最佳选择，支持多语言
- **Cohere Rerank API** 是无本地 GPU 时的最佳云端方案，支持中文
- **Top-K 配置建议**：向量检索 Top-20，Rerank 后保留 Top-3~5，超过 5 个文档会导致 LLM "注意力分散"
- **成本权衡**：Reranker 计算成本比 Embedding 高，但远低于 LLM，是性价比最高的优化手段
