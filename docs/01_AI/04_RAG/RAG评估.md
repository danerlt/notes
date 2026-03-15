# RAG 评估

## 概念介绍

RAG 系统的评估是确保系统质量、指导优化方向的关键环节。与传统 NLP 评估不同，RAG 系统涉及检索和生成两个阶段，需要从多个维度衡量质量。

**为什么 RAG 评估困难？**
- 答案可能正确但表述不同，难以自动比较
- 需要同时评估检索质量和生成质量
- 缺乏大量人工标注的参考答案（成本高）
- 不同任务的评估标准不同

**解决方案**：RAGAS 框架——使用 LLM 作为评估器（LLM-as-Judge），自动评估 RAG 系统的多个维度。

## 核心原理

### RAGAS 框架的四大核心指标

RAGAS（Retrieval Augmented Generation Assessment）是 2023 年提出的 RAG 评估框架，使用 LLM 自动评估，无需人工标注参考答案（无参考评估）。

#### 1. Faithfulness（忠实度）

衡量生成答案中的陈述是否能从检索到的上下文中推断出来。

$$\text{Faithfulness} = \frac{\text{上下文支持的陈述数}}{\text{答案中的总陈述数}}$$

- **高分**：答案完全基于检索文档，无幻觉
- **低分**：答案包含文档中没有的信息（幻觉）
- 范围：0-1

#### 2. Answer Relevancy（答案相关性）

衡量生成答案与原始问题的相关程度。

评估方法：用 LLM 根据答案反向生成若干问题，计算这些问题与原始问题的平均相似度。

$$\text{Answer Relevancy} = \frac{1}{N}\sum_{i=1}^{N} \text{cos\_sim}(q_i, q_{original})$$

- **高分**：答案直接回应了问题
- **低分**：答案与问题偏离（答非所问，或包含过多无关信息）
- 范围：0-1

#### 3. Context Recall（上下文召回率）

衡量参考答案（Ground Truth）中的信息是否都能从检索的上下文中找到。（需要 Ground Truth）

$$\text{Context Recall} = \frac{\text{上下文能支持的GT句子数}}{\text{GT中的总句子数}}$$

- **高分**：检索到的文档包含了正确答案所需的所有信息
- **低分**：检索遗漏了重要信息

#### 4. Context Precision（上下文精确率）

衡量检索到的上下文中，与回答问题相关的比例。

$$\text{Context Precision} = \frac{\text{相关上下文块数}}{\text{检索到的总上下文块数}}$$

- **高分**：检索到的文档大多与问题相关
- **低分**：检索到很多无关文档（噪音多）

### 其他重要评估指标

| 指标 | 含义 | 是否需要 GT |
|------|------|------------|
| Faithfulness | 答案是否有文档支持 | 否 |
| Answer Relevancy | 答案与问题的相关性 | 否 |
| Context Recall | 检索覆盖了参考答案的多少 | 是 |
| Context Precision | 检索结果中相关的比例 | 是 |
| Answer Correctness | 答案与参考答案的准确性 | 是 |
| Answer Similarity | 答案与参考答案的语义相似度 | 是 |

## 代码示例（Python）

### 使用 RAGAS 框架评估

```python
# pip install ragas
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
    answer_correctness,
)
from datasets import Dataset
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# 准备评估数据集
# 格式：question, answer, contexts, ground_truth
eval_data = {
    "question": [
        "RAG 技术的主要作用是什么？",
        "什么是 HNSW 算法？",
        "如何评估 RAG 系统的质量？",
    ],
    "answer": [
        "RAG（检索增强生成）通过检索相关文档为大语言模型提供上下文，从而减少幻觉，提高答案的准确性和时效性。",
        "HNSW（分层小世界图）是一种近似最近邻搜索算法，通过构建分层图结构实现高效的向量检索，速度极快。",
        "可以使用 RAGAS 框架从忠实度、答案相关性、上下文召回率等多个维度自动评估 RAG 系统。",
    ],
    "contexts": [
        [
            "RAG 是检索增强生成技术，通过检索相关文档来增强 LLM 的知识，有效减少幻觉问题",
            "RAG 系统使知识库可以随时更新，无需重新训练 LLM",
        ],
        [
            "HNSW 是目前最流行的 ANN 算法，通过分层小世界图实现快速向量检索",
            "HNSW 索引构建时 M 参数控制每个节点的连接数，影响精度和内存",
        ],
        [
            "RAGAS 是专门用于评估 RAG 系统的框架，使用 LLM 作为评估器",
            "RAGAS 的核心指标包括忠实度、答案相关性、上下文召回率、上下文精确率",
        ],
    ],
    "ground_truth": [
        "RAG 的主要作用是减少 LLM 的幻觉，提升答案准确性，并支持知识库实时更新。",
        "HNSW 是一种高效的近似最近邻搜索算法，基于分层图结构，速度极快。",
        "使用 RAGAS 框架可以从忠实度、答案相关性、上下文精确率、上下文召回率等维度评估。",
    ]
}

dataset = Dataset.from_dict(eval_data)

# 配置评估模型（可使用任意 OpenAI 兼容模型）
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 执行评估
result = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
    ],
    llm=llm,
    embeddings=embeddings,
    raise_exceptions=False  # 遇到错误继续
)

print("RAG 评估结果:")
print(result)
print(f"\n忠实度 (Faithfulness): {result['faithfulness']:.4f}")
print(f"答案相关性 (Answer Relevancy): {result['answer_relevancy']:.4f}")
print(f"上下文召回率 (Context Recall): {result['context_recall']:.4f}")
print(f"上下文精确率 (Context Precision): {result['context_precision']:.4f}")

# 转换为 DataFrame 查看详细结果
df = result.to_pandas()
print("\n逐条评估结果:")
print(df[['question', 'faithfulness', 'answer_relevancy', 'context_recall', 'context_precision']])
```

### 构建自动化评估 Pipeline

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
from datasets import Dataset
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
import pandas as pd
from datetime import datetime


class RAGEvaluator:
    """RAG 系统自动化评估器"""

    def __init__(self, rag_pipeline, eval_model: str = "gpt-4o-mini"):
        self.rag_pipeline = rag_pipeline
        self.llm = ChatOpenAI(model=eval_model, temperature=0)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    def generate_eval_dataset(self, questions: list[str]) -> Dataset:
        """运行 RAG 系统，生成评估数据集"""
        results = []
        for question in questions:
            try:
                # 运行 RAG 系统
                output = self.rag_pipeline.query(question)
                results.append({
                    "question": question,
                    "answer": output["answer"],
                    "contexts": [doc["doc"] for doc in output["source_docs"]],
                })
            except Exception as e:
                print(f"问题处理失败: {question}, 错误: {e}")

        return Dataset.from_list(results)

    def evaluate(self, questions: list[str], ground_truths: list[str] = None) -> dict:
        """执行完整评估"""
        dataset_dict = self.generate_eval_dataset(questions).__dict__

        if ground_truths:
            dataset_dict["ground_truth"] = ground_truths

        dataset = Dataset.from_dict(dataset_dict)

        # 选择指标
        metrics = [faithfulness, answer_relevancy]
        if ground_truths:
            from ragas.metrics import context_recall
            metrics.append(context_recall)

        result = evaluate(
            dataset=dataset,
            metrics=metrics,
            llm=self.llm,
            embeddings=self.embeddings,
            raise_exceptions=False
        )

        return {
            "timestamp": datetime.now().isoformat(),
            "n_questions": len(questions),
            "scores": {
                "faithfulness": result.get("faithfulness", None),
                "answer_relevancy": result.get("answer_relevancy", None),
                "context_recall": result.get("context_recall", None),
            },
            "details": result.to_pandas().to_dict(orient="records")
        }

    def compare_versions(self, questions: list[str], pipeline_v1, pipeline_v2) -> pd.DataFrame:
        """对比两个 RAG 版本的效果"""
        self.rag_pipeline = pipeline_v1
        result_v1 = self.evaluate(questions)

        self.rag_pipeline = pipeline_v2
        result_v2 = self.evaluate(questions)

        comparison = pd.DataFrame([
            {
                "metric": k,
                "v1": result_v1["scores"][k],
                "v2": result_v2["scores"][k],
                "improvement": (result_v2["scores"][k] or 0) - (result_v1["scores"][k] or 0)
            }
            for k in result_v1["scores"]
            if result_v1["scores"][k] is not None
        ])

        return comparison
```

### 自定义评估指标（不依赖 RAGAS）

```python
from openai import OpenAI
import numpy as np

client = OpenAI()

def evaluate_faithfulness_custom(question: str, answer: str, contexts: list[str]) -> dict:
    """
    自定义忠实度评估
    检查答案中的每个陈述是否有上下文支持
    """
    context_text = "\n".join([f"[{i+1}] {ctx}" for i, ctx in enumerate(contexts)])

    prompt = f"""评估 AI 助手的回答是否忠实于提供的参考文档。

问题：{question}

参考文档：
{context_text}

AI 回答：{answer}

请执行以下步骤：
1. 将回答分解为独立的陈述（每行一个）
2. 判断每个陈述是否有参考文档支持（有支持/无支持/无法判断）
3. 计算忠实度得分（有支持的陈述数 / 总陈述数）

输出格式：
{{
  "statements": [
    {{"text": "陈述1", "supported": true, "evidence": "来自文档[N]的依据"}},
    ...
  ],
  "faithfulness_score": 0.0-1.0,
  "analysis": "总体分析"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"}
    )

    import json
    return json.loads(response.choices[0].message.content)


def evaluate_answer_relevancy_custom(question: str, answer: str, n_questions: int = 3) -> dict:
    """
    自定义答案相关性评估
    让 LLM 根据答案反向生成问题，计算与原始问题的相似度
    """
    prompt = f"""根据以下 AI 回答，生成 {n_questions} 个可能导致此回答的问题。

AI 回答：{answer}

请生成 {n_questions} 个问题，每行一个，不要编号："""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    generated_questions = [
        q.strip() for q in response.choices[0].message.content.split('\n')
        if q.strip()
    ][:n_questions]

    # 计算生成问题与原始问题的相似度
    all_questions = [question] + generated_questions
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=all_questions
    )

    embeddings = np.array([item.embedding for item in sorted(response.data, key=lambda x: x.index)])
    orig_emb = embeddings[0]
    gen_embs = embeddings[1:]

    # 余弦相似度
    similarities = []
    for gen_emb in gen_embs:
        sim = np.dot(orig_emb, gen_emb) / (np.linalg.norm(orig_emb) * np.linalg.norm(gen_emb))
        similarities.append(float(sim))

    return {
        "original_question": question,
        "generated_questions": generated_questions,
        "similarities": similarities,
        "answer_relevancy_score": np.mean(similarities)
    }


# 测试
question = "RAG 如何减少 LLM 的幻觉？"
answer = "RAG 通过在生成前检索相关文档，将外部知识注入 LLM 的上下文中。这样 LLM 不再依赖训练时记忆的知识，而是基于实际检索到的文档回答，从而有效减少因知识缺乏或不准确导致的幻觉现象。"
contexts = ["RAG 通过检索相关文档为 LLM 提供上下文，有效减少幻觉"]

faithfulness_result = evaluate_faithfulness_custom(question, answer, contexts)
relevancy_result = evaluate_answer_relevancy_custom(question, answer)

print(f"忠实度得分: {faithfulness_result['faithfulness_score']:.4f}")
print(f"答案相关性: {relevancy_result['answer_relevancy_score']:.4f}")
```

### 批量评估与可视化

```python
import pandas as pd
import matplotlib.pyplot as plt


def batch_evaluate_and_visualize(eval_results: list[dict]):
    """批量评估结果可视化"""
    df = pd.DataFrame(eval_results)

    # 雷达图
    metrics = ['faithfulness', 'answer_relevancy', 'context_recall', 'context_precision']
    available_metrics = [m for m in metrics if m in df.columns]

    scores = [df[m].mean() for m in available_metrics]

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # 柱状图
    axes[0].bar(available_metrics, scores, color=['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'])
    axes[0].set_ylim(0, 1)
    axes[0].set_title("RAG 系统评估得分")
    axes[0].set_ylabel("得分")
    for i, (metric, score) in enumerate(zip(available_metrics, scores)):
        axes[0].text(i, score + 0.02, f'{score:.3f}', ha='center', fontsize=11)

    # 分布图
    for metric in available_metrics:
        axes[1].hist(df[metric].dropna(), alpha=0.6, label=metric, bins=10)
    axes[1].set_title("各指标得分分布")
    axes[1].legend()
    axes[1].set_xlabel("得分")
    axes[1].set_ylabel("频次")

    plt.tight_layout()
    plt.savefig("rag_evaluation.png", dpi=150, bbox_inches='tight')
    plt.show()

    # 汇总报告
    print("\n===== RAG 评估报告 =====")
    print(f"评估问题数: {len(df)}")
    for metric in available_metrics:
        score = df[metric].mean()
        level = "优秀" if score > 0.8 else "良好" if score > 0.6 else "需改进"
        print(f"{metric}: {score:.4f} ({level})")

    # 找出低分问题
    if 'faithfulness' in df.columns:
        low_faith = df[df['faithfulness'] < 0.5]
        if len(low_faith) > 0:
            print(f"\n忠实度不足的问题 ({len(low_faith)} 个):")
            for _, row in low_faith.iterrows():
                print(f"  - {row['question'][:60]}... (忠实度: {row['faithfulness']:.3f})")
```

## 常见用法

### 评估指标解读与优化建议

```python
def interpret_rag_scores(scores: dict) -> list[str]:
    """根据评估得分给出优化建议"""
    suggestions = []

    if scores.get("faithfulness", 1.0) < 0.7:
        suggestions.append(
            "【忠实度低】模型存在幻觉，建议：\n"
            "  1. 加强 System Prompt 中的约束（只基于文档回答）\n"
            "  2. 检查 Reranker 是否有效过滤了不相关文档\n"
            "  3. 考虑使用更强的 LLM"
        )

    if scores.get("answer_relevancy", 1.0) < 0.7:
        suggestions.append(
            "【答案相关性低】答案偏离问题，建议：\n"
            "  1. 优化 System Prompt，明确要求直接回答问题\n"
            "  2. 降低生成温度（temperature）\n"
            "  3. 检查是否存在查询理解偏差"
        )

    if scores.get("context_recall", 1.0) < 0.7:
        suggestions.append(
            "【上下文召回率低】检索遗漏重要信息，建议：\n"
            "  1. 增大 top_k（检索更多候选文档）\n"
            "  2. 使用混合检索（向量 + BM25）\n"
            "  3. 优化文本切分策略（减小 chunk_size）\n"
            "  4. 考虑查询扩展（Query Expansion）"
        )

    if scores.get("context_precision", 1.0) < 0.7:
        suggestions.append(
            "【上下文精确率低】检索噪音多，建议：\n"
            "  1. 启用 Reranker 过滤低相关度文档\n"
            "  2. 添加元数据过滤缩小检索范围\n"
            "  3. 提高 Embedding 模型质量"
        )

    return suggestions if suggestions else ["所有指标表现良好！"]
```

## 小结

- **RAGAS 框架**是 2024-2025 年最主流的 RAG 评估方案，使用 LLM-as-Judge 实现无参考评估
- **四大核心指标**：Faithfulness（无幻觉）、Answer Relevancy（答案相关）、Context Recall（检索覆盖）、Context Precision（检索精准）
- **忠实度（Faithfulness）** 是最重要的指标，低于 0.7 说明存在幻觉，需优先解决
- **无参考评估**（Faithfulness、Answer Relevancy）适合快速迭代；**有参考评估**（Context Recall、Answer Correctness）适合阶段性深度评估
- 建议在 RAG 系统开发中建立**自动化评估 Pipeline**，每次更新后自动运行评估，防止性能回退
- **评估 → 分析 → 优化** 的循环是提升 RAG 系统质量的核心方法论
