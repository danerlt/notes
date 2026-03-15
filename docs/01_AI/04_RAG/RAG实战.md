# RAG 实战

## 概念介绍

本文通过一个完整的企业知识库问答系统，展示 RAG 系统从文档加载到最终答案生成的全流程实现。这是一个生产级别的 RAG 实现，包含了 2024-2025 年的最佳实践。

**系统特性**：
- 支持多种文档格式（PDF、Word、Markdown、TXT）
- 混合检索（向量 + BM25）
- 重排序（Reranker）
- 流式输出
- 来源引用
- 对话历史管理

## 完整 RAG 实战代码

### 环境准备

```bash
pip install openai langchain langchain-openai langchain-community \
    sentence-transformers faiss-cpu rank-bm25 jieba \
    pymupdf unstructured python-docx FlagEmbedding \
    ragas datasets tiktoken chromadb
```

### 第一步：文档加载

```python
# rag_system.py
from pathlib import Path
from typing import Optional
import logging

from langchain_community.document_loaders import (
    PyMuPDFLoader,
    UnstructuredWordDocumentLoader,
    TextLoader,
    DirectoryLoader,
    UnstructuredMarkdownLoader,
)
from langchain.schema import Document

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def load_documents(source: str) -> list[Document]:
    """
    加载文档，支持单文件或目录

    Args:
        source: 文件路径或目录路径

    Returns:
        Document 列表
    """
    source_path = Path(source)
    documents = []

    if source_path.is_dir():
        loaders = [
            ("**/*.pdf", PyMuPDFLoader),
            ("**/*.docx", UnstructuredWordDocumentLoader),
            ("**/*.txt", TextLoader),
            ("**/*.md", UnstructuredMarkdownLoader),
        ]
        for pattern, loader_cls in loaders:
            try:
                loader = DirectoryLoader(
                    str(source_path),
                    glob=pattern,
                    loader_cls=loader_cls,
                    silent_errors=True
                )
                docs = loader.load()
                documents.extend(docs)
                if docs:
                    logger.info(f"加载 {pattern}: {len(docs)} 个文档")
            except Exception as e:
                logger.warning(f"加载 {pattern} 时出错: {e}")
    else:
        suffix = source_path.suffix.lower()
        try:
            if suffix == ".pdf":
                loader = PyMuPDFLoader(str(source_path))
            elif suffix in (".docx", ".doc"):
                loader = UnstructuredWordDocumentLoader(str(source_path))
            elif suffix == ".md":
                loader = UnstructuredMarkdownLoader(str(source_path))
            else:
                loader = TextLoader(str(source_path), encoding="utf-8")
            documents = loader.load()
        except Exception as e:
            logger.error(f"加载文档失败: {e}")
            raise

    logger.info(f"共加载 {len(documents)} 个文档")
    return documents
```

### 第二步：文本切分

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document


def split_documents(
    documents: list[Document],
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[Document]:
    """
    智能文本切分

    Args:
        documents: 原始文档列表
        chunk_size: 每个 chunk 的最大字符数
        chunk_overlap: 相邻 chunk 的重叠字符数

    Returns:
        切分后的 Document 列表
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=[
            "\n\n",  # 段落
            "\n",    # 换行
            "。",    # 中文句号
            "！",    # 感叹号
            "？",    # 问号
            "；",    # 分号
            "，",    # 逗号
            ". ",    # 英文句号
            "! ",    # 英文感叹号
            "? ",    # 英文问号
            " ",     # 空格
            "",      # 字符
        ],
    )

    chunks = splitter.split_documents(documents)

    # 添加元数据
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = i
        chunk.metadata["chunk_length"] = len(chunk.page_content)

    # 过滤过短的 chunk（内容可能无意义）
    chunks = [c for c in chunks if len(c.page_content.strip()) > 30]

    logger.info(f"文档切分完成: {len(documents)} 个文档 → {len(chunks)} 个 chunk")
    logger.info(f"平均 chunk 长度: {sum(len(c.page_content) for c in chunks) / len(chunks):.0f} 字符")

    return chunks
```

### 第三步：向量化与索引构建

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma, FAISS
from langchain.schema import Document
import os


def build_vectorstore(
    chunks: list[Document],
    persist_dir: str = "./vectorstore",
    embedding_model: str = "text-embedding-3-small",
) -> Chroma:
    """
    构建向量索引并持久化

    Args:
        chunks: 文档切片列表
        persist_dir: 持久化目录
        embedding_model: Embedding 模型名称

    Returns:
        Chroma 向量数据库实例
    """
    embeddings = OpenAIEmbeddings(
        model=embedding_model,
        chunk_size=100  # 批量大小，防止 API 超时
    )

    if os.path.exists(persist_dir) and os.listdir(persist_dir):
        logger.info(f"从 {persist_dir} 加载已有索引...")
        vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=embeddings
        )
        # 增量更新
        vectorstore.add_documents(chunks)
    else:
        logger.info(f"构建新索引，共 {len(chunks)} 个 chunk...")
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=persist_dir
        )

    logger.info(f"向量索引构建完成，共 {vectorstore._collection.count()} 个向量")
    return vectorstore
```

### 第四步：混合检索

```python
from rank_bm25 import BM25Okapi
import jieba
import numpy as np
from langchain.schema import Document


class HybridRetriever:
    """
    混合检索器：向量检索 + BM25，通过 RRF 融合

    使用方法：
        retriever = HybridRetriever(chunks, vectorstore)
        docs = retriever.retrieve("你的问题", top_k=5)
    """

    def __init__(
        self,
        chunks: list[Document],
        vectorstore,
        dense_top_k: int = 20,
        sparse_top_k: int = 20,
    ):
        self.chunks = chunks
        self.vectorstore = vectorstore
        self.dense_top_k = dense_top_k
        self.sparse_top_k = sparse_top_k

        # 构建 BM25 索引
        logger.info("构建 BM25 索引...")
        tokenized_corpus = [
            list(jieba.cut(chunk.page_content)) for chunk in chunks
        ]
        self.bm25 = BM25Okapi(tokenized_corpus)
        logger.info("BM25 索引构建完成")

    def _rrf_score(self, rank: int, k: int = 60) -> float:
        """倒数排名融合得分"""
        return 1 / (k + rank + 1)

    def retrieve(self, query: str, top_k: int = 5, alpha: float = 0.6) -> list[Document]:
        """
        混合检索

        Args:
            query: 用户查询
            top_k: 最终返回的文档数
            alpha: 向量检索权重（0=纯BM25，1=纯向量）

        Returns:
            排序后的文档列表
        """
        # 向量检索
        dense_results = self.vectorstore.similarity_search_with_score(
            query, k=self.dense_top_k
        )
        dense_map = {doc.page_content: (rank, score) for rank, (doc, score) in enumerate(dense_results)}

        # BM25 检索
        query_tokens = list(jieba.cut(query))
        bm25_scores = self.bm25.get_scores(query_tokens)
        sparse_top_indices = np.argsort(bm25_scores)[::-1][:self.sparse_top_k]
        sparse_map = {self.chunks[idx].page_content: rank for rank, idx in enumerate(sparse_top_indices)}

        # 合并所有候选文档
        all_contents = set(list(dense_map.keys()) + list(sparse_map.keys()))

        # 计算 RRF 得分
        rrf_scores = {}
        for content in all_contents:
            dense_rank = dense_map[content][0] if content in dense_map else self.dense_top_k
            sparse_rank = sparse_map[content] if content in sparse_map else self.sparse_top_k
            rrf_scores[content] = (
                alpha * self._rrf_score(dense_rank) +
                (1 - alpha) * self._rrf_score(sparse_rank)
            )

        # 按 RRF 得分排序
        sorted_contents = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # 构建结果文档列表
        content_to_doc = {chunk.page_content: chunk for chunk in self.chunks}
        dense_doc_map = {doc.page_content: doc for doc, _ in dense_results}

        results = []
        for content, score in sorted_contents[:top_k]:
            doc = dense_doc_map.get(content) or content_to_doc.get(content)
            if doc:
                doc.metadata["rrf_score"] = score
                results.append(doc)

        logger.info(f"混合检索完成：向量{len(dense_results)} + BM25{len(sparse_top_indices)} → 融合后 Top{top_k}")
        return results
```

### 第五步：重排序

```python
from FlagEmbedding import FlagReranker


class RerankerWrapper:
    """Reranker 包装器"""

    def __init__(self, model: str = "BAAI/bge-reranker-v2-m3"):
        logger.info(f"加载 Reranker: {model}")
        self.reranker = FlagReranker(model, use_fp16=True)

    def rerank(self, query: str, documents: list[Document], top_k: int = 5) -> list[Document]:
        """
        对候选文档重新排序

        Args:
            query: 用户查询
            documents: 候选文档列表
            top_k: 返回的文档数

        Returns:
            重排序后的文档列表
        """
        if not documents:
            return []

        pairs = [(query, doc.page_content) for doc in documents]
        scores = self.reranker.compute_score(pairs, normalize=True)

        # 添加 rerank 得分到元数据
        scored_docs = list(zip(scores, documents))
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        result = []
        for score, doc in scored_docs[:top_k]:
            doc.metadata["rerank_score"] = float(score)
            result.append(doc)

        return result
```

### 第六步：生成答案

```python
from openai import OpenAI
from typing import Generator


class RAGGenerator:
    """RAG 答案生成器"""

    SYSTEM_PROMPT = """你是一个专业的知识库问答助手。

## 任务
基于提供的参考文档，准确、完整地回答用户问题。

## 规则
1. 只基于参考文档中的信息回答，不要使用文档以外的知识
2. 如果文档中没有相关信息，明确回答"根据现有资料，暂无此信息"
3. 引用文档时使用[文档N]格式标注来源
4. 回答要简洁、准确，重点突出
5. 对于数字、日期等事实信息，精确引用原文

## 输出格式
- 直接回答问题（2-4句核心答案）
- 补充细节（如需要）
- 信息来源（指明来自哪些文档）"""

    def __init__(self, model: str = "gpt-4o"):
        self.client = OpenAI()
        self.model = model

    def _build_context(self, documents: list[Document]) -> str:
        """构建上下文字符串"""
        context_parts = []
        for i, doc in enumerate(documents, 1):
            source = doc.metadata.get("source", "未知来源")
            score = doc.metadata.get("rerank_score", 0)
            context_parts.append(
                f"[文档{i}]（来源：{Path(source).name if source != '未知来源' else source}，相关度：{score:.3f}）\n"
                f"{doc.page_content}"
            )
        return "\n\n".join(context_parts)

    def generate(
        self,
        question: str,
        documents: list[Document],
        history: list[dict] = None,
        stream: bool = False,
    ) -> str | Generator:
        """
        生成答案

        Args:
            question: 用户问题
            documents: 检索到的文档
            history: 对话历史
            stream: 是否流式输出

        Returns:
            答案字符串或流式生成器
        """
        context = self._build_context(documents)

        user_message = f"""参考文档：
{context}

---
问题：{question}"""

        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]

        # 添加对话历史
        if history:
            messages.extend(history[-6:])  # 保留最近 3 轮对话

        messages.append({"role": "user", "content": user_message})

        if stream:
            return self._stream_generate(messages)
        else:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.1,
                max_tokens=1500,
            )
            return response.choices[0].message.content

    def _stream_generate(self, messages: list[dict]) -> Generator:
        """流式生成"""
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1,
            max_tokens=1500,
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
```

### 第七步：组装完整 RAG 系统

```python
import time
from dataclasses import dataclass, field


@dataclass
class RAGConfig:
    """RAG 系统配置"""
    # 文档处理
    chunk_size: int = 500
    chunk_overlap: int = 50

    # 检索
    dense_top_k: int = 20
    sparse_top_k: int = 20
    hybrid_alpha: float = 0.6  # 向量检索权重

    # 重排序
    rerank_top_k: int = 5
    use_reranker: bool = True
    reranker_model: str = "BAAI/bge-reranker-v2-m3"

    # 生成
    llm_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"
    vectorstore_dir: str = "./vectorstore"

    # 对话
    max_history_turns: int = 3


class RAGSystem:
    """
    完整 RAG 系统

    使用示例：
        rag = RAGSystem(RAGConfig())
        rag.build_index("./docs")
        answer = rag.ask("什么是 RAG？")
    """

    def __init__(self, config: RAGConfig = None):
        self.config = config or RAGConfig()
        self.vectorstore = None
        self.retriever = None
        self.reranker = None
        self.generator = RAGGenerator(self.config.llm_model)
        self.conversation_history = []

        # 按需加载 Reranker
        if self.config.use_reranker:
            try:
                self.reranker = RerankerWrapper(self.config.reranker_model)
            except Exception as e:
                logger.warning(f"Reranker 加载失败，将跳过重排序: {e}")

    def build_index(self, doc_source: str, force_rebuild: bool = False) -> None:
        """
        构建文档索引

        Args:
            doc_source: 文档路径或目录
            force_rebuild: 是否强制重建索引
        """
        import shutil

        if force_rebuild and os.path.exists(self.config.vectorstore_dir):
            shutil.rmtree(self.config.vectorstore_dir)
            logger.info("已删除旧索引")

        # 加载文档
        logger.info(f"开始加载文档: {doc_source}")
        documents = load_documents(doc_source)

        if not documents:
            raise ValueError(f"未找到任何文档: {doc_source}")

        # 切分文档
        chunks = split_documents(
            documents,
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap
        )

        # 构建向量索引
        self.vectorstore = build_vectorstore(
            chunks,
            persist_dir=self.config.vectorstore_dir,
            embedding_model=self.config.embedding_model
        )

        # 构建混合检索器
        self.retriever = HybridRetriever(
            chunks=chunks,
            vectorstore=self.vectorstore,
            dense_top_k=self.config.dense_top_k,
            sparse_top_k=self.config.sparse_top_k,
        )

        logger.info("索引构建完成！")

    def ask(
        self,
        question: str,
        stream: bool = False,
        verbose: bool = False
    ) -> dict:
        """
        提问并获取答案

        Args:
            question: 用户问题
            stream: 是否流式输出
            verbose: 是否输出详细检索信息

        Returns:
            包含答案和来源的字典
        """
        if not self.retriever:
            raise RuntimeError("请先调用 build_index() 构建索引")

        start_time = time.time()

        # 1. 混合检索
        candidates = self.retriever.retrieve(
            question,
            top_k=self.config.dense_top_k,
            alpha=self.config.hybrid_alpha
        )

        if verbose:
            print(f"\n检索候选文档 ({len(candidates)} 个):")
            for i, doc in enumerate(candidates[:3], 1):
                print(f"  [{i}] RRF:{doc.metadata.get('rrf_score', 0):.4f} | {doc.page_content[:80]}...")

        # 2. 重排序
        if self.reranker and candidates:
            final_docs = self.reranker.rerank(
                question, candidates, top_k=self.config.rerank_top_k
            )
        else:
            final_docs = candidates[:self.config.rerank_top_k]

        if verbose:
            print(f"\nRerank 后文档 ({len(final_docs)} 个):")
            for i, doc in enumerate(final_docs, 1):
                print(f"  [{i}] Rerank:{doc.metadata.get('rerank_score', 0):.4f} | {doc.page_content[:80]}...")

        # 3. 生成答案
        history = self.conversation_history[-self.config.max_history_turns * 2:]
        answer_or_stream = self.generator.generate(
            question=question,
            documents=final_docs,
            history=history,
            stream=stream
        )

        elapsed = time.time() - start_time

        if not stream:
            # 更新对话历史
            self.conversation_history.extend([
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer_or_stream}
            ])

            return {
                "question": question,
                "answer": answer_or_stream,
                "sources": [
                    {
                        "content": doc.page_content[:200] + "...",
                        "source": doc.metadata.get("source", "未知"),
                        "rerank_score": doc.metadata.get("rerank_score", 0)
                    }
                    for doc in final_docs
                ],
                "latency_ms": round(elapsed * 1000, 2),
                "stats": {
                    "retrieved": len(candidates),
                    "after_rerank": len(final_docs)
                }
            }
        else:
            return {"stream": answer_or_stream, "sources": final_docs}

    def clear_history(self):
        """清空对话历史"""
        self.conversation_history = []
        logger.info("对话历史已清空")
```

### 使用示例

```python
# main.py
import os
from pathlib import Path

os.environ["OPENAI_API_KEY"] = "your-api-key"

# 初始化 RAG 系统
config = RAGConfig(
    chunk_size=500,
    chunk_overlap=50,
    dense_top_k=20,
    rerank_top_k=5,
    use_reranker=True,
    llm_model="gpt-4o",
    embedding_model="text-embedding-3-small",
    vectorstore_dir="./my_vectorstore"
)

rag = RAGSystem(config)

# 构建索引（首次运行）
rag.build_index("./docs", force_rebuild=True)

# 单次查询
result = rag.ask("RAG 系统的工作原理是什么？", verbose=True)
print(f"\n问题: {result['question']}")
print(f"\n答案:\n{result['answer']}")
print(f"\n来源文档:")
for i, src in enumerate(result['sources'], 1):
    print(f"  [{i}] {src['source']} (相关度: {src['rerank_score']:.3f})")
print(f"\n耗时: {result['latency_ms']}ms")

# 多轮对话
print("\n\n=== 多轮对话测试 ===")
questions = [
    "什么是向量检索？",
    "它和 BM25 有什么区别？",
    "那混合检索是什么意思？"
]

for q in questions:
    print(f"\n用户: {q}")
    result = rag.ask(q)
    print(f"助手: {result['answer']}")

# 流式输出
print("\n\n=== 流式输出测试 ===")
print("用户: 请详细解释 Reranking 的工作原理")
print("助手: ", end="", flush=True)
result = rag.ask("请详细解释 Reranking 的工作原理", stream=True)
for token in result["stream"]:
    print(token, end="", flush=True)
print()
```

### 性能优化与生产部署

```python
# 生产环境配置建议
PRODUCTION_CONFIG = RAGConfig(
    # 切分：中等粒度，兼顾精度和上下文完整性
    chunk_size=500,
    chunk_overlap=50,

    # 检索：先宽后窄
    dense_top_k=20,      # 向量检索候选数
    sparse_top_k=20,     # BM25 候选数
    hybrid_alpha=0.6,    # 偏向向量检索

    # 重排序：精选最相关文档
    rerank_top_k=5,
    use_reranker=True,

    # 生成
    llm_model="gpt-4o",                    # 高质量回答
    embedding_model="text-embedding-3-small",  # 经济实惠
)

# 低延迟配置（牺牲部分质量换速度）
LOW_LATENCY_CONFIG = RAGConfig(
    chunk_size=400,
    dense_top_k=10,
    sparse_top_k=10,
    rerank_top_k=3,
    use_reranker=False,  # 关闭 Reranker 减少延迟
    llm_model="gpt-4o-mini",  # 更快的模型
)
```

## 小结

本文实现了一个生产级别的 RAG 系统，核心流程为：

1. **文档加载**：支持 PDF/Word/Markdown/TXT，使用 LangChain Loaders
2. **文本切分**：RecursiveCharacterTextSplitter，中文优化分隔符
3. **向量化**：text-embedding-3-small，批量处理，Chroma 持久化
4. **混合检索**：向量检索 + BM25，RRF 融合，显著提升召回率
5. **重排序**：BGE-Reranker-v2-m3，Cross-Encoder 精排
6. **生成答案**：结构化 System Prompt，对话历史管理，流式输出

**关键经验**：
- 混合检索比纯向量检索平均提升 15-25% 的召回率
- Reranker 是性价比最高的单点优化
- chunk_size 500 + overlap 50 适合大多数场景，需根据文档特性调整
- 生产环境必须有评估（RAGAS）+ 监控 + 缓存
