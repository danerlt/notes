# RAG评估

评估（Evaluation）和基准测试（benchmark）是开发中LLM的关键概念。若要提高LLM应用（RAG、Agent）的性能，必须有一种方法来衡量它。

LlamaIndex 提供衡量生成结果的质量和检索质量的关键模块。

-   响应评估（Response Evaluation）：LLM生成的结果和检索到的上下文是否匹配？和query是否匹配？和参考答案和指南是匹配？
-   检索评估（Retrieavl Evalution）：检索到的内容和query是否相关？



## 检索评估（Retrieval Evalution)

LlamaIndex提供相关模块可以单独的对检索效果进行评估。

检索评估的概念并不新颖；给定一个包含问题和ground-truth的数据集，我们可以使用平均互惠排名（MRR）、命中率、精确度等排名指标来评估检索器。



检索评估核心步骤围绕以下内容展开：

-   数据集生成（Dataset Generation）：给定一个文本语料库，使用大模型生成（问题，上下文）对。
-   检索评估（Retrieval Evaluation）：给定一个检索器和一组问题，使用排序指标（mrr,hit rate等）评估检索到的结果。



示例代码：

```python
from llama_index.core.evaluation import generate_question_context_pairs
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.core.evaluation import (
    generate_question_context_pairs,
    EmbeddingQAFinetuneDataset,
)

# 加载文件、对文件进行分片
documents = SimpleDirectoryReader("./data/").load_data()
node_parser = SentenceSplitter(chunk_size=512)
nodes = node_parser.get_nodes_from_documents(documents)
# by default, the node ids are set to random uuids. To ensure same id's per run, we manually set them.
for idx, node in enumerate(nodes):
    node.id_ = f"node_{idx}"
    
# 构建索引
vector_index = VectorStoreIndex(nodes)

# 创建retrier
retriever = vector_index.as_retriever(similarity_top_k=2)


# 构造<query,context>数据集
llm = OpenAI(model="gpt-4")
qa_dataset = generate_question_context_pairs(
    nodes, llm=llm, num_questions_per_chunk=2
)
# 可选 将数据集保存到JSON中
# qa_dataset.save_json("dataset.json")
# 可选 从JSON文件中加载到数据集
# qa_dataset = EmbeddingQAFinetuneDataset.from_json("dataset.json")

# 评测相关
metrics = ["mrr", "hit_rate"]
retriever_evaluator = RetrieverEvaluator.from_metric_names(
    metrics, retriever=retriever
)
# 对数据集进行评测
eval_results = await retriever_evaluator.aevaluate_dataset(qa_dataset)
```

### 数据集生成

其中构造数据集的是通过调用大模型，让大模型对每一个node生成多个query。具体代码见`llama_index.core.evaluation`下的`generate_question_context_pairs`函数，这个函数实际上在`llama_index\core\llama_dataset\legacy\embedding.py`中，在`embedding.py`中叫`generate_qa_embedding_pairs`函数，其源码如下：

```python
def generate_qa_embedding_pairs(
    nodes: List[TextNode],
    llm: LLM,
    qa_generate_prompt_tmpl: str = DEFAULT_QA_GENERATE_PROMPT_TMPL,
    num_questions_per_chunk: int = 2,
) -> EmbeddingQAFinetuneDataset:
    """Generate examples given a set of nodes."""
    node_dict = {
        node.node_id: node.get_content(metadata_mode=MetadataMode.NONE)
        for node in nodes
    }

    queries = {}
    relevant_docs = {}
    for node_id, text in tqdm(node_dict.items()):
        query = qa_generate_prompt_tmpl.format(
            context_str=text, num_questions_per_chunk=num_questions_per_chunk
        )
        response = llm.complete(query)

        result = str(response).strip().split("\n")
        questions = [
            re.sub(r"^\d+[\).\s]", "", question).strip() for question in result
        ]
        questions = [question for question in questions if len(question) > 0]

        for question in questions:
            question_id = str(uuid.uuid4())
            queries[question_id] = question
            relevant_docs[question_id] = [node_id]

    # construct dataset
    return EmbeddingQAFinetuneDataset(
        queries=queries, corpus=node_dict, relevant_docs=relevant_docs
    )
```

这个函数接受4个参数：

-   nodes: 用来生成question的node列表

-   llm: 用来生成question的大语言模型对象，llm对象只实现了`complete`方法即可

-   qa_generate_prompt_tmpl：用来生成question的提示词模板，默认为`DEFAULT_QA_GENERATE_PROMPT_TMPL`，内容为：

    ```text
    """\
    Context information is below.
    
    ---------------------
    {context_str}
    ---------------------
    
    Given the context information and not prior knowledge.
    generate only questions based on the below query.
    
    You are a Teacher/ Professor. Your task is to setup \
    {num_questions_per_chunk} questions for an upcoming \
    quiz/examination. The questions should be diverse in nature \
    across the document. Restrict the questions to the \
    context information provided."
    """
    ```

    翻译成对应的中文提示词如下：

    ```text
    """\
    以下是上下文信息。
    
    ---------------------
    {context_str}
    ---------------------
    
    深入理解上述给定的上下文信息，而不是你的先验知识，根据下面的要求生成问题。
    
    要求：你是一位教授，你的任务是为即将到来的考试设置{num_questions_per_chunk}个问题。你应该严格基于上下文信息，来设置多种多样的问题。\
    你设置的问题不要包含选项，也不要以“问题1”或“问题2”为开头，也不要输出问题的序号，直接输出生成的问题。\
    将问题限制在所提供的上下文信息中。\
    """
    ```

-   num_questions_per_chunk：对每个node生成多少个question，默认为2个。

数据集构造完成之后会创建一个`EmbeddingQAFinetuneDataset`的对象。

`EmbeddingQAFinetuneDataset`源码如下：

```python
class EmbeddingQAFinetuneDataset(BaseModel):
    """Embedding QA Finetuning Dataset.

    Args:
        queries (Dict[str, str]): Dict id -> query.
        corpus (Dict[str, str]): Dict id -> string.
        relevant_docs (Dict[str, List[str]]): Dict query id -> list of doc ids.

    """

    queries: Dict[str, str]  # dict id -> query
    corpus: Dict[str, str]  # dict id -> string
    relevant_docs: Dict[str, List[str]]  # query id -> list of doc ids
    mode: str = "text"

    @property
    def query_docid_pairs(self) -> List[Tuple[str, List[str]]]:
        """Get query, relevant doc ids."""
        return [
            (query, self.relevant_docs[query_id])
            for query_id, query in self.queries.items()
        ]

    def save_json(self, path: str) -> None:
        """Save json."""
        with open(path, "w") as f:
            json.dump(self.dict(), f, indent=4)

    @classmethod
    def from_json(cls, path: str) -> "EmbeddingQAFinetuneDataset":
        """Load json."""
        with open(path, encodings="utf-8") as f:
            data = json.load(f)
        return cls(**data)
```

其中有三个字典，分别是`queries`、`corpus`、`relevant_docs`。

-   queries：存储间所有的qution，key是自动生成的uuid，value是通过llm生成的question
-   corpus：存储所有的node,key是node的id，value是node
-   relevant_docs：存储query和node的对应映射，key是question的id，value是一个列表，表示生成question对应的node的id，默认情况下这个列表中的元素只有一个。

另外这个类还实现了保存到JSON和从JSON加载数据的方法。但是默认情况下没有考虑编码和中文字符。对JSON和中文字符优化后的代码如下：

```python
class EmbeddingQAFinetuneDataset(LlamaIndexEmbeddingQAFinetuneDataset):
    def save_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.dict(), f, indent=4, ensure_ascii=False)

    @classmethod
    def from_json(cls, path: str) -> "EmbeddingQAFinetuneDataset":
        """Load json."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(**data)

```

生成的JSON文件内容格式如下：

```json
{
    "queries": {},
    "corpus": {},
    "relevant_docs": {},
    "mode": "text"
}
```

### 检索评估

评估相关代码为：

```python
# 评测相关
metrics = ["mrr", "hit_rate"]
retriever_evaluator = RetrieverEvaluator.from_metric_names(
    metrics, retriever=retriever
)
# 对数据集进行评测
eval_results = await retriever_evaluator.aevaluate_dataset(qa_dataset)
```

检索评估使用的是`RetrieverEvaluator` 这个类，需要将评估指标和retriever传递到`from_metric_names`方法，然后调用`aevaluate_dataset`方法将数据集传进去。

`RetrieverEvaluator`类定义在`llama_index\core\evaluation\retrieval\evaluator.py`中，这个类继承自`BaseRetrievalEvaluator`，实现了`_aget_retrieved_ids_texts`方法，这个方法中使用异步调用` retriever`的`aretrieve`方法。

```python
class RetrieverEvaluator(BaseRetrievalEvaluator):
    """Retriever evaluator.

    This module will evaluate a retriever using a set of metrics.

    Args:
        metrics (List[BaseRetrievalMetric]): Sequence of metrics to evaluate
        retriever: Retriever to evaluate.
        node_postprocessors (Optional[List[BaseNodePostprocessor]]): Post-processor to apply after retrieval.


    """

    retriever: BaseRetriever = Field(..., description="Retriever to evaluate")
    node_postprocessors: Optional[List[BaseNodePostprocessor]] = Field(
        default=None, description="Optional post-processor"
    )

    def __init__(
        self,
        metrics: Sequence[BaseRetrievalMetric],
        retriever: BaseRetriever,
        node_postprocessors: Optional[List[BaseNodePostprocessor]] = None,
        **kwargs: Any,
    ) -> None:
        """Init params."""
        super().__init__(
            metrics=metrics,
            retriever=retriever,
            node_postprocessors=node_postprocessors,
            **kwargs,
        )

    async def _aget_retrieved_ids_and_texts(
        self, query: str, mode: RetrievalEvalMode = RetrievalEvalMode.TEXT
    ) -> Tuple[List[str], List[str]]:
        """Get retrieved ids and texts, potentially applying a post-processor."""
        retrieved_nodes = await self.retriever.aretrieve(query)

        if self.node_postprocessors:
            for node_postprocessor in self.node_postprocessors:
                retrieved_nodes = node_postprocessor.postprocess_nodes(
                    retrieved_nodes, query_str=query
                )

        return (
            [node.node.node_id for node in retrieved_nodes],
            [node.node.text for node in retrieved_nodes],
        )
```

`BaseRetrievalEvaluator`类定义在`llama_index\core\evaluation\retrieval\base.py`中。

源码如下：

```python
class BaseRetrievalEvaluator(BaseModel):
    """Base Retrieval Evaluator class."""

    metrics: List[BaseRetrievalMetric] = Field(
        ..., description="List of metrics to evaluate"
    )

    class Config:
        arbitrary_types_allowed = True

    @classmethod
    def from_metric_names(
        cls, metric_names: List[str], **kwargs: Any
    ) -> "BaseRetrievalEvaluator":
        """Create evaluator from metric names.

        Args:
            metric_names (List[str]): List of metric names
            **kwargs: Additional arguments for the evaluator

        """
        metric_types = resolve_metrics(metric_names)
        return cls(metrics=[metric() for metric in metric_types], **kwargs)

    @abstractmethod
    async def _aget_retrieved_ids_and_texts(
        self, query: str, mode: RetrievalEvalMode = RetrievalEvalMode.TEXT
    ) -> Tuple[List[str], List[str]]:
        """Get retrieved ids and texts."""
        raise NotImplementedError

    def evaluate(
        self,
        query: str,
        expected_ids: List[str],
        expected_texts: Optional[List[str]] = None,
        mode: RetrievalEvalMode = RetrievalEvalMode.TEXT,
        **kwargs: Any,
    ) -> RetrievalEvalResult:
        """Run evaluation results with query string and expected ids.

        Args:
            query (str): Query string
            expected_ids (List[str]): Expected ids

        Returns:
            RetrievalEvalResult: Evaluation result

        """
        return asyncio.run(
            self.aevaluate(
                query=query,
                expected_ids=expected_ids,
                expected_texts=expected_texts,
                mode=mode,
                **kwargs,
            )
        )

    # @abstractmethod
    async def aevaluate(
        self,
        query: str,
        expected_ids: List[str],
        expected_texts: Optional[List[str]] = None,
        mode: RetrievalEvalMode = RetrievalEvalMode.TEXT,
        **kwargs: Any,
    ) -> RetrievalEvalResult:
        """Run evaluation with query string, retrieved contexts,
        and generated response string.

        Subclasses can override this method to provide custom evaluation logic and
        take in additional arguments.
        """
        retrieved_ids, retrieved_texts = await self._aget_retrieved_ids_and_texts(
            query, mode
        )
        metric_dict = {}
        for metric in self.metrics:
            eval_result = metric.compute(
                query, expected_ids, retrieved_ids, expected_texts, retrieved_texts
            )
            metric_dict[metric.metric_name] = eval_result

        return RetrievalEvalResult(
            query=query,
            expected_ids=expected_ids,
            expected_texts=expected_texts,
            retrieved_ids=retrieved_ids,
            retrieved_texts=retrieved_texts,
            mode=mode,
            metric_dict=metric_dict,
        )

    async def aevaluate_dataset(
        self,
        dataset: EmbeddingQAFinetuneDataset,
        workers: int = 2,
        show_progress: bool = False,
        **kwargs: Any,
    ) -> List[RetrievalEvalResult]:
        """Run evaluation with dataset."""
        semaphore = asyncio.Semaphore(workers)

        async def eval_worker(
            query: str, expected_ids: List[str], mode: RetrievalEvalMode
        ) -> RetrievalEvalResult:
            async with semaphore:
                return await self.aevaluate(query, expected_ids=expected_ids, mode=mode)

        response_jobs = []
        mode = RetrievalEvalMode.from_str(dataset.mode)
        for query_id, query in dataset.queries.items():
            expected_ids = dataset.relevant_docs[query_id]
            response_jobs.append(eval_worker(query, expected_ids, mode))
        if show_progress:
            from tqdm.asyncio import tqdm_asyncio

            eval_results = await tqdm_asyncio.gather(*response_jobs)
        else:
            eval_results = await asyncio.gather(*response_jobs)

        return eval_results

```

BaseRetrievalEvaluator是一个基础的检索评估器类。它允许通过指定评估指标名称来创建评估器，并提供了对检索结果进行评估的方法。  

- `metrics`属性是一个评估指标列表，用于指定要评估的指标。 

- `from_metric_names`是一个类方法，通过给定指标名称列表和可选的额外参数来创建评估器实例。
- `_aget_retrieved_ids_and_texts`是一个抽象方法，用于获取检索到的ID和文本。子类需要实现此方法。_
- evaluate方法用于对给定的查询和期望ID进行评估，并返回评估结果。它内部使用了asyncio.run来运行异步的aevaluate方法。 
-  aevaluate方法是evaluate的异步版本，它执行具体的评估逻辑，包括调用子类实现的`_aget_retrieved_ids_and_texts`方法获取检索结果，并使用指定的评估指标计算结果。 
- aevaluate_dataset方法用于对整个数据集进行评估，它通过创建多个工作线程并行地执行aevaluate方法来提高效率。可以通过workers参数指定并发的工作线程数量，通过show_progress参数控制是否显示进度条。

#### 检索指标

其中跟检索相关的指标有3个，hit_rate、mrr、cohere_rerank_relevancy。

-   hit_rate: 表示命中率
-   mrr(Mean Reciprocal Rank)：表示平均倒数排名
-   cohere_rerank_relevancy：表示使用cohere重排之后的相关度

metrics相关的代码定义在`llama_index\core\evaluation\retrieval\metrics.py`中。

加载metric类是从`METRIC_REGISTRY`字典中获取的。

```python
METRIC_REGISTRY: Dict[str, Type[BaseRetrievalMetric]] = {
    "hit_rate": HitRate,
    "mrr": MRR,
    "cohere_rerank_relevancy": CohereRerankRelevancyMetric,
}


def resolve_metrics(metrics: List[str]) -> List[Type[BaseRetrievalMetric]]:
    """Resolve metrics from list of metric names."""
    for metric in metrics:
        if metric not in METRIC_REGISTRY:
            raise ValueError(f"Invalid metric name: {metric}")

    return [METRIC_REGISTRY[metric] for metric in metrics]
```

其中hit rate计算如下：

```python
class HitRate(BaseRetrievalMetric):
    """Hit rate metric."""

    metric_name: str = "hit_rate"

    def compute(
        self,
        query: Optional[str] = None,
        expected_ids: Optional[List[str]] = None,
        retrieved_ids: Optional[List[str]] = None,
        expected_texts: Optional[List[str]] = None,
        retrieved_texts: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> RetrievalMetricResult:
        """Compute metric."""
        if retrieved_ids is None or expected_ids is None:
            raise ValueError("Retrieved ids and expected ids must be provided")
        is_hit = any(id in expected_ids for id in retrieved_ids)
        return RetrievalMetricResult(
            score=1.0 if is_hit else 0.0,
        )
```

`retrieved_ids`表示检索出的node_id列表。`expected_ids`表示构造数据集时query对应的node_id列表，默认只有一个元素。

如果检索出来的id在`expected_ids`中就表示命中了，分数设置为1.0，否则就没有命中，分数设置为0.0

其中mrr指标的计算如下：

```python
class MRR(BaseRetrievalMetric):
    """MRR metric."""

    metric_name: str = "mrr"

    def compute(
        self,
        query: Optional[str] = None,
        expected_ids: Optional[List[str]] = None,
        retrieved_ids: Optional[List[str]] = None,
        expected_texts: Optional[List[str]] = None,
        retrieved_texts: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> RetrievalMetricResult:
        """Compute metric."""
        if retrieved_ids is None or expected_ids is None:
            raise ValueError("Retrieved ids and expected ids must be provided")
        for i, id in enumerate(retrieved_ids):
            if id in expected_ids:
                return RetrievalMetricResult(
                    score=1.0 / (i + 1),
                )
        return RetrievalMetricResult(
            score=0.0,
        )
```

循环检索出来的node_id列表，如果node_id在`expected_ids`中，就返回`1/n`，`n`表示是检索出来的结果中的第几个，从`1`开始。如果没有命中，就返回0.0。



一个完整的的测试脚本样例如下，对LlamaIndex样例主要做了多进程的改进，可以同时对多个engine评估，修复了`EmbeddingQAFinetuneDataset`中没有对JSON文件编码进行设置和中文字符会存储成Unicode字符的问题。

```python
import argparse
import asyncio
import json
import logging
from multiprocessing import Pool, Manager, Queue

from typing import List, Sequence, Any, Tuple, Dict

import pandas as pd
from llama_index.core import QueryBundle
from llama_index.core.bridge.pydantic import Field
from llama_index.core.evaluation import generate_question_context_pairs, BaseRetrievalEvaluator
from llama_index.core.evaluation.retrieval.base import RetrievalEvalMode
from llama_index.core.evaluation.retrieval.metrics_base import BaseRetrievalMetric
from llama_index.legacy.finetuning import EmbeddingQAFinetuneDataset as LlamaIndexEmbeddingQAFinetuneDataset

from common.const import ROOT_PATH
from common.errors import EvaluateException
from core.query.engine.register import single_engine_register, multi_engine_register
from core.store.doc.mongo import mongo_db_docs_store
from evaluate.llm_chat import llm_register
from utils.log_utils import init_logger

logger = init_logger("evaluate", save_level=False)
logger.setLevel(logging.INFO)


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-d', '--dataset_id', required=True, type=str, help="数据集ID")
    parser.add_argument('-e', '--engines', default='', type=str, help="用来评估的engine名称，用逗号分隔")
    parser.add_argument('-l', '--llm', default='local', type=str, help="用来生成数据集的LLM")
    parser.add_argument('-n', '--num', default=2, type=int, help="每个node生成query的个数")
    parser.add_argument('-o', '--override', default=False, action="store_true", help="是否重新生成数据集，默认为False")
    parser.add_argument('-m', '--metrics', default=["mrr", "hit_rate"], type=str, nargs='+', help="用来评估的指标")
    parser.add_argument('-r', '--result', default="result.xlsx", type=str, help="结果文件名")
    return parser.parse_args()


class LabelledQADataset(LlamaIndexEmbeddingQAFinetuneDataset):
    def save_json(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.dict(), f, indent=4, ensure_ascii=False)

    @classmethod
    def from_json(cls, path: str) -> "LabelledQADataset":
        """Load json."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(**data)


class QueryEngineEvaluator(BaseRetrievalEvaluator):
    engine: Any = Field(None, description="query engine")
    dataset_id: str = Field("", description="数据集ID")

    def __init__(
            self,
            metrics: Sequence[BaseRetrievalMetric],
            engine: Any,
            dataset_id: str = "",
            **kwargs: Any,
    ) -> None:
        """Init params."""
        super().__init__(
            metrics=metrics,
            **kwargs,
        )
        self.engine = engine
        self.dataset_id = dataset_id

    async def _aget_retrieved_ids_and_texts(
            self, query: str, mode: RetrievalEvalMode = RetrievalEvalMode.TEXT
    ) -> Tuple[List[str], List[str]]:
        """Get retrieved ids and texts."""
        query_bundle = QueryBundle(query_str=query)
        retrieved_nodes = self.engine.retrieve(query_bundle, dataset_id=self.dataset_id)
        return (
            [node.node.node_id for node in retrieved_nodes],
            [node.node.text for node in retrieved_nodes],
        )


class MyEngineEvaluator(object):
    def __init__(self,
                 dataset_id: str = None,
                 engines="",
                 llm: str = "yi",
                 num_questions_per_chunk: int = 2,
                 metrics: List[str] = None,
                 override: bool = False,
                 result_file_name="result.xlsx"):
        self.dataset_id = dataset_id
        self.engines = engines
        self.llm_name = llm
        self.llm = self.get_llm(llm_name=llm)
        self.num_questions_per_chunk = num_questions_per_chunk
        if metrics is None:
            self.metrics = ["mrr", "hit_rate"]
        else:
            self.metrics = metrics
        self.override = override
        self.result_file_name = result_file_name

        #
        self.qa_generate_prompt_tmpl = """\
以下是上下文信息。上下文信息在<p>标签中，上下文信息内容主要是xxxxxx公司技术保障团队整理的文档。

---------------------
<p>
{context_str}
</p>
---------------------

深入理解上述给定的上下文信息，而不是你的先验知识，根据下面的要求生成问题。

要求：你是一位技术保障团队的运维专家，你的任务是根据上下文信息生成{num_questions_per_chunk}个公司员工工作中可能询问的问题。你应该严格基于上下文信息，来设置多种多样的问题。\
你设置的问题不要包含选项，也不要以“问题1”或“问题2”为开头，也不要输出问题的序号，直接输出生成的问题。\
将问题限制在所提供的上下文信息中。\
"""
        self.dataset_path = ROOT_PATH.joinpath("datasets")
        if not self.dataset_path.exists():
            logger.info(f"创建目录：{self.dataset_path}")
            self.dataset_path.mkdir(parents=True, exist_ok=True)
        self.auto_qa_file_name = f"{self.llm_name}.json"
        self.human_qa_file_name = "human.json"

        self.qa_dataset = None
        self.result = None

    def get_llm(self, llm_name: str):
        llm = llm_register.get(llm_name)
        return llm

    def get_qa_dataset(self):
        """
        获取 <query,上下文> 数据集

        1. 根据 override 参数判断是否需要自动生成数据集、
        2. 将自动生成的数据集后手动构造的数据集合并到一个数据集中

        :return: <query, context> 数据集
        """

        if self.override:
            auto_qa_dataset: LabelledQADataset = self.get_qa_dataset_from_db()
            auto_qa_file_path = self.dataset_path.joinpath(self.auto_qa_file_name)
            auto_qa_dataset.save_json(auto_qa_file_path)
        else:
            auto_qa_dataset = self.get_qa_dataset_from_file(file_name=self.auto_qa_file_name)
        human_qa_dataset = self.get_qa_dataset_from_file(file_name=self.human_qa_file_name)
        # 合并数据集
        auto_qa_dataset.queries.update(human_qa_dataset.queries)
        auto_qa_dataset.corpus.update(human_qa_dataset.corpus)
        auto_qa_dataset.relevant_docs.update(human_qa_dataset.relevant_docs)
        return auto_qa_dataset

    def get_qa_dataset_from_file(self, file_name=None) -> LabelledQADataset:
        """从文件中读取 <query, context> 数据集

        从datasets目录下的JSON文件获取数据集
        """
        if file_name is None:
            raise EvaluateException("从文件中读取数据集参数错误：文件名为空")
        file_path = self.dataset_path.joinpath(file_name)
        if not file_path.exists():
            empty_qa_dataset = LabelledQADataset(queries={}, corpus={}, relevant_docs={})
            empty_qa_dataset.save_json(file_path)
            return empty_qa_dataset
        else:
            qa_dataset = LabelledQADataset.from_json(file_path)
            return qa_dataset

    def get_qa_dataset_from_db(self) -> LabelledQADataset:
        """从数据库中读取 nodes 然后使用LLM生成数据集
        """
        # 从数据库查询出所有nodes
        nodes = mongo_db_docs_store.get_docs(dataset_id=self.dataset_id)

        # 使用大模型生成数据集
        qa_dataset = generate_question_context_pairs(
            nodes, llm=self.llm,
            num_questions_per_chunk=self.num_questions_per_chunk,
            qa_generate_prompt_tmpl=self.qa_generate_prompt_tmpl
        )
        # 将 qa_dataset 转换成自定义的类型
        res = LabelledQADataset(queries=qa_dataset.queries, corpus=qa_dataset.corpus,
                                relevant_docs=qa_dataset.relevant_docs)
        return res

    def get_engine_names(self):
        """获取engine名称列表
        """
        all_engine_names = self.get_all_engine_names()
        if self.engines:
            self.engines = self.engines.strip()
            engine_names = self.engines.split(",")
            if len(engine_names) == 0:
                return all_engine_names
            else:
                avaliable_engine_names = []
                for gine_name in engine_names:
                    if gine_name in all_engine_names:
                        avaliable_engine_names.append(gine_name)
                return avaliable_engine_names
        else:
            return all_engine_names

    def get_all_engine_names(self) -> List[str]:
        """获取所有的engine名称列表

        Returns: list(str): 所有的engine名称列表
        """
        single_engine_names = single_engine_register.get_all_names()
        multi_engine_names = multi_engine_register.get_all_names()
        result = single_engine_names + multi_engine_names
        return result

    def evalutate_singe_engine(self, engine_name: str = None,
                               dataset: LabelledQADataset = None,
                               dataset_id: str = None,
                               result_queue: Queue = None,
                               engine_index: int = 0):
        """对单个engine进行评估

        Args:
            engine_name: engine名称
            dataset: 数据集
            dataset_id: 数据集ID
            result_queue: 评估结果
            engine_index: engine序号

        Returns:

        """
        try:
            logger.info(f"开始评估engine: {engine_name}")
            engine = single_engine_register.get(engine_name)
            if not engine:
                engine = multi_engine_register.get(engine_name)
            if not engine:
                raise EvaluateException(f"引擎{engine_name}不存在")

            # 对数据集进行评估
            query_engine_evaluator = QueryEngineEvaluator.from_metric_names(
                self.metrics, engine=engine, dataset_id=dataset_id
            )
            eval_results = asyncio.run(query_engine_evaluator.aevaluate_dataset(dataset, workers=16))
            
            # 计算指标平均数
            metric_dicts = []
            for eval_result in eval_results:
                metric_dict = eval_result.metric_vals_dict
                metric_dicts.append(metric_dict)
            temp_result = pd.DataFrame(metric_dicts)
            hit_rate = temp_result['hit_rate'].mean()
            mrr = temp_result['mrr'].mean()
            
            # 返回结果
            result = {"engine": engine_name, "hit_rate": hit_rate, "mrr": mrr, "engine_index": engine_index}
            logger.info(f"结束评估engine: {engine_name}, result: {result}")
            result_queue.put(result)
        except Exception as e:
            logger.exception(f"评估engine {engine_name} 失败: {str(e)}")

    def evaluate_engines(self, engine_names=None, dataset=None):
        if not engine_names:
            raise EvaluateException("engine_name为空")
        if not dataset:
            raise EvaluateException("dataset为空")

        # 使用多进程对多个engine进行评估
        with Manager() as manager:
            result_queue = manager.Queue()
            engine_names_count = len(engine_names)
            with Pool(processes=engine_names_count) as pool:
                for engine_index, engine_name in enumerate(engine_names):
                    pool.apply_async(self.evalutate_singe_engine,
                                     kwds={
                                         "engine_name": engine_name,
                                         "dataset": dataset,
                                         "dataset_id": self.dataset_id,
                                         "result_queue": result_queue,
                                         "engine_index": engine_index
                                     })

                pool.close()  # 关闭进程池 ==》 不接受任务
                pool.join()  # 等待子进程执行完毕，父进程再执行

            result = []
            while not result_queue.empty():
                result.append(result_queue.get())
            return result

    def display_result(self, data: List[Dict]):
        """显示结果

        Args:
            data (list): 格式如下
            [
                {
                    "engine": 引擎名称,
                    "hit_rate": 命中率,
                    "mrr": mrr指标,
                    "engine_index": 引擎序号，从0开始
                }
            ]

        Returns:

        """
        result = pd.DataFrame(data)
        # 根据engine_index排序，多进程的话列表顺序会变乱，加上这个保证多次执行的结果一样
        result.sort_values(by="engine_index", inplace=True)
        # 添加 F1 分数
        result["F1 Score"] = (2 * result["hit_rate"] * result["mrr"]) / (result["hit_rate"] + result["mrr"])
        logger.info("评测结果")
        logger.info("=" * 100)
        logger.info(result)
        logger.info("=" * 100)
        result_file_path = self.dataset_path.joinpath(self.result_file_name)
        result.to_excel(result_file_path, index=False)

    def run(self):
        """执行评估的入口方法
        """
        # 获取数据集
        qa_dataset = self.get_qa_dataset()

        # 获取engine名称列表
        engine_names = self.get_engine_names()

        # 评估检索器
        result = self.evaluate_engines(engine_names=engine_names, dataset=qa_dataset)

        # 4.评估结果处理，打印日志和保存到文件
        self.display_result(result)


def main():
    # 1. 参数解析
    args = get_args()
    logger.info(f"start evaluation, args: {args}")
    engine_exaluator = MyEngineEvaluator(dataset_id=args.dataset_id,
                                         engines=args.engines,
                                         llm=args.llm,
                                         num_questions_per_chunk=args.num,
                                         metrics=args.metrics,
                                         override=args.override,
                                         result_file_name=args.result
                                         )
    engine_exaluator.run()
    logger.info("end evaluation")


if __name__ == '__main__':
    main()

```





## 响应评估（Response Evalution)

