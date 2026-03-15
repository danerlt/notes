# LlamaIndex 索引

一个RAG系统的流程大致如图：

![image-20240426011357639](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240426011357639.png)

本文主要关注其中的检索部分。使用的框架是 [llama_index](https://www.llamaindex.ai/) 。在一个RAG系统中，在加载文档之后会得到一个 Document 列表 (或者Node 列表, Document 继承·自TextNode，一般情况下使用的都是TextNode)，然后对这些 Document 列表创建索引（Index）来方便检索。



## Document 对象和Node对象

首先我们要来看一下 Document对象 和 TextNode对象是什么样子。其源码在`llama_index\core\schema.py`中：

```mermaid
classDiagram
 
  class BaseComponent {
    class_name() str
    dict() Dict[str, Any]
    from_dict(data: Dict[str, Any]) Self
    from_json(data_str: str) Self
    json() str
    to_dict() Dict[str, Any]
    to_json() str
  }
  class BaseNode {
    child_nodes
    embedding : Optional[List[float]]
    excluded_embed_metadata_keys : List[str]
    excluded_llm_metadata_keys : List[str]
    extra_info
    hash
    id_ : str
    metadata : Dict[str, Any]
    next_node
    node_id
    parent_node
    prev_node
    ref_doc_id
    relationships : Dict[NodeRelationship, RelatedNodeType]
    source_node
  }
  class Document {
    doc_id
    id_ : str
  }
  class TextNode {
    end_char_idx : Optional[int]
    hash
    metadata_seperator : str
    metadata_template : str
    node_info
    start_char_idx : Optional[int]
    text : str
    text_template : str

  }
  BaseNode --|> BaseComponent
  TextNode --|> BaseNode
  Document --|> TextNode
```

其中 `BaseComponent` 提供了一个对象和json，字典互相转换的方法。`Document` 继承自 `TextNode`，`TextNode`继承自`BaseNode`，`BaseNode`继承自`BaseComponent`。其中 `BaseComponent` 提供了一个对象和json，字典互相转换的方法。

`BaseNode`中的字段说明：

-   id_: Node 的唯一Id，默认情况使用uuid.uuid4生成的，**需要注意的是,这个字段一般不直接使用，而是使用`node_id`这个property**

-   embedding: Node对应的embedding字段，是一个float列表，默认情况为`None`

-   metadata:  元数据，是一个字典

-   excluded_embed_metadata_keys：在embedding时用来排除metadata的key列表

-   excluded_llm_metadata_keys: 在llm调用时用来排除metadata的key列表

-   relationships：一个字典，用来保存其他Node和当前Node的关系，有`Source`,`PREVIOUS`,`NEXT`,`PARENT`,`CHILD`等关系。`Source`表示是当前 Node，`PREVIOUS`表示是当前 Node 的前一个，`NEXT`表示是当前Node的下一个，`PARENT`是当前Node的父节点，`CHILD`表示是当前节点的子节点。






## 什么是llama_index中的索引（Index）

>   在 LlamaIndex 术语中， `Index` 是由 `Document` 对象组成的数据结构，旨在支持 LLM 进行查询。

LlamaIndex 提供了几种不同的索引类型。我们将在这里介绍两个最常见的。

-   Vector Store Index(向量存储索引)：`VectorStoreIndex` 是最常见的索引类型。它接受 Document 列表然后将其split成Nodes.



## LlamaIndex 索引样例

使用llama_index创建索引的样例代码如下：

```python
import logging
from urllib.parse import quote_plus

import qdrant_client
from llama_index.core import SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.core.indices.vector_store import VectorIndexRetriever
from llama_index.core.storage.docstore.postgres_docstore import PostgresDocumentStore
from llama_index.storage.docstore.mongodb import MongoDocumentStore
from llama_index.storage.index_store.redis.base import RedisIndexStore
from llama_index.vector_stores.qdrant import QdrantVectorStore
from redis import Redis

from commmon.config import config

logger = logging.getLogger("test")

def log_document(document):
    logger.info(f"{document.doc_id=}, {document.ref_doc_id=}")
    logger.info(f"relationships: {document.relationships}")
    logger.info(f"document: {vars(document)}")
    
def test_create_index():
    # 加载文档
    # 一个文件对应多个document对象 node_id等于doc_id等于id_
    #
     documents = SimpleDirectoryReader(input_files=["test.md"], file_extractor={".md": MarkdownReader(remove_images=False, remove_hyperlinks=False)}).load_data()
    logger.info(f"加载文档成功，共{len(documents)}个文档")
    for document in documents:
        log_document(document)
        
    # 定义docs存储
    # uri格式如下："mongodb://mongo_user:mongo_password@mongo_host:mongo_port
    mongo_db_uri = "mongodb://mongo_user:mongo_password@mongo_host:mongo_port"
    docs_store = MongoDocumentStore.from_uri(mongo_db_uri, db_name="test")

    # 定义vector存储
    client = qdrant_client.QdrantClient(
        host=config.QDRANT_HOST,
        port=config.QDRANT_PORT,
        https=config.QDRANT_HTTPS,
        # set API KEY for Qdrant Cloud
        # api_key="<qdrant-api-key>",
        api_key=config.QDRANT_API_KEY,
    )
    vector_store = QdrantVectorStore(client=client,
                                     batch_size=64,
                                     parallel=10,
                                     max_retries=3,
                                     enable_hybrid=False,
                                     collection_name="test")

    # 定义index存储
    # uri格式如下："redis://:redis_password@redis_host:redis_port/redis_db"
    redis_client = Redis(host=config.REDIS_HOST,
                         port=config.REDIS_PORT,
                         password=config.REDIS_PASSWORD,
                         db=config.REDIS_DB)
    index_sotre = RedisIndexStore.from_redis_client(redis_client, namespace="test")

    # 创建storage context
    storage_context = StorageContext.from_defaults(docstore=docs_store,
                                                   vector_store=vector_store,
                                                   index_store=index_sotre)

    # 构建索引
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        store_nodes_override=True,  # 存储nodes时是否覆盖
    )
    # index.index_struct  :  IndexDict(index_id="xxx", nodes_dict={"node_id":"node_id"}) index_id 111 -> node_ids: [1,2,3,4]
    logger.info("构建索引成功")
    retriever = index.as_retriever(similarity_top_k=10)
    query = "This is a test query text"
    response = retriever.retrieve(query)
    logger.info(f"检索结果：{len(response)=")
    logger.info(f"检索结果：{response[0]=}")
```

`test.md`内容使用的是[Langchain-chatchat](https://github.com/chatchat-space/Langchain-Chatchat)项目的README.md文件。

读取完`documents`列表的长度为`21`,其中第一个document内容如下：

```python
{'id_': 'd8831dcb-6840-48fa-a222-8f82aab2f163',
 'embedding': None,
 'metadata': {'file_path': 'test.md',
  'file_name': 'test.md',
  'file_size': 8503,
  'creation_date': '2024-05-06',
  'last_modified_date': '2024-04-30'},
 'excluded_embed_metadata_keys': ['file_name',
  'file_type',
  'file_size',
  'creation_date',
  'last_modified_date',
  'last_accessed_date'],
 'excluded_llm_metadata_keys': ['file_name',
  'file_type',
  'file_size',
  'creation_date',
  'last_modified_date',
  'last_accessed_date'],
 'relationships': {},
 'text': '\n\n\n![](img/logo-long-chatchat-trans-v2.png)\r\n\r\n�� [READ THIS IN ENGLISH](README_en.md)\r\n�� [日本語で読む](README_ja.md)\r\n\r\n�� **LangChain-Chatchat** (原 Langchain-ChatGLM)\r\n\r\n基于 ChatGLM 等大语言模型与 Langchain 等应用框架实现，开源、可离线部署的检索增强生成(RAG)大模型知识库项目。\r\n\r\n',
 'start_char_idx': None,
 'end_char_idx': None,
 'text_template': '{metadata_str}\n\n{content}',
 'metadata_template': '{key}: {value}',
 'metadata_seperator': '\n',
 'class_name': 'Document'}
```





## 构建索引源码分析



`form_documents`代码如下：

```python
    @classmethod
    def from_documents(
        cls: Type[IndexType],
        documents: Sequence[Document],
        storage_context: Optional[StorageContext] = None,
        show_progress: bool = False,
        callback_manager: Optional[CallbackManager] = None,
        transformations: Optional[List[TransformComponent]] = None,
        # deprecated
        service_context: Optional[ServiceContext] = None,
        **kwargs: Any,
    ) -> IndexType:
        """Create index from documents.

        Args:
            documents (Optional[Sequence[BaseDocument]]): List of documents to
                build the index from.

        """
        storage_context = storage_context or StorageContext.from_defaults()
        docstore = storage_context.docstore
        callback_manager = (
            callback_manager
            or callback_manager_from_settings_or_context(Settings, service_context)
        )
        transformations = transformations or transformations_from_settings_or_context(
            Settings, service_context
        )

        with callback_manager.as_trace("index_construction"):
            for doc in documents:
                docstore.set_document_hash(doc.get_doc_id(), doc.hash)

            nodes = run_transformations(
                documents,  # type: ignore
                transformations,
                show_progress=show_progress,
                **kwargs,
            )

            return cls(
                nodes=nodes,
                storage_context=storage_context,
                callback_manager=callback_manager,
                show_progress=show_progress,
                transformations=transformations,
                service_context=service_context,
                **kwargs,
            )
```

本例中`transformations`列表为空，`nodes`和`documents`是同一个列表。

这个方法首先会调用`set_document_hash`将 Document 的 hash 值 存储到 docstore 中。在本例中会将 doc_hash 写入到MongoDB中的`docstore/metadata` 中。

![image-20240506090622812](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240506090622812.png)



然后执行 `run_transformations` 做文档拆分，元数据提取等工作得到对应的`nodes`，具体执行了哪些是根据`transformations`参数决定的。默认情况下`transformations`是只有一个元素的列表，其中的元素是`SentenceSplitter`类的实例。`transformations`相关代码如下：

```python
transformations = transformations or transformations_from_settings_or_context(
    Settings, service_context
)
    
def transformations_from_settings_or_context(
    settings: _Settings, context: Optional["ServiceContext"]
) -> List[TransformComponent]:
    """Get settings from either settings or context."""
    if context is not None:
        return context.transformations

    return settings.transformations  


@dataclass
class _Settings:
    """Settings for the Llama Index, lazily initialized."""

    # lazy initialization
    _llm: Optional[LLM] = None
    _embed_model: Optional[BaseEmbedding] = None
    _callback_manager: Optional[CallbackManager] = None
    _tokenizer: Optional[Callable[[str], List[Any]]] = None
    _node_parser: Optional[NodeParser] = None
    _prompt_helper: Optional[PromptHelper] = None
    _transformations: Optional[List[TransformComponent]] = None

    # ---- Node parser ----
    @property
    def node_parser(self) -> NodeParser:
        """Get the node parser."""
        if self._node_parser is None:
            self._node_parser = SentenceSplitter()

        if self._callback_manager is not None:
            self._node_parser.callback_manager = self._callback_manager

        return self._node_parser


    # ---- Transformations ----
    @property
    def transformations(self) -> List[TransformComponent]:
        """Get the transformations."""
        if self._transformations is None:
            self._transformations = [self.node_parser]
        return self._transformations


# Singleton
Settings = _Settings()
```

最后会实例化`VectorStoreIndex`类，会调用`VectorStoreIndex`类的`__init__`方法，这个时候 nodes 有值，objects 和 index_struct都为 None：

```python
class VectorStoreIndex(BaseIndex[IndexDict]):
    """Vector Store Index.

    Args:
        use_async (bool): Whether to use asynchronous calls. Defaults to False.
        show_progress (bool): Whether to show tqdm progress bars. Defaults to False.
        store_nodes_override (bool): set to True to always store Node objects in index
            store and document store even if vector store keeps text. Defaults to False
    """

    index_struct_cls = IndexDict

    def __init__(
        self,
        nodes: Optional[Sequence[BaseNode]] = None,
        # vector store index params
        use_async: bool = False,
        store_nodes_override: bool = False,
        embed_model: Optional[EmbedType] = None,
        insert_batch_size: int = 2048,
        # parent class params
        objects: Optional[Sequence[IndexNode]] = None,
        index_struct: Optional[IndexDict] = None,
        storage_context: Optional[StorageContext] = None,
        callback_manager: Optional[CallbackManager] = None,
        transformations: Optional[List[TransformComponent]] = None,
        show_progress: bool = False,
        # deprecated
        service_context: Optional[ServiceContext] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize params."""
        self._use_async = use_async
        self._store_nodes_override = store_nodes_override
        self._embed_model = (
            resolve_embed_model(embed_model, callback_manager=callback_manager)
            if embed_model
            else embed_model_from_settings_or_context(Settings, service_context)
        )

        self._insert_batch_size = insert_batch_size
        super().__init__(
            nodes=nodes,
            index_struct=index_struct,
            service_context=service_context,
            storage_context=storage_context,
            show_progress=show_progress,
            objects=objects,
            callback_manager=callback_manager,
            transformations=transformations,
            **kwargs,
        )
```

这个方法里面首先会获取`embedding model`，然后执行父类`BaseIndex`的`__init__`方法。

```python
class BaseIndex(Generic[IS], ABC):
    """Base LlamaIndex.

    Args:
        nodes (List[Node]): List of nodes to index
        show_progress (bool): Whether to show tqdm progress bars. Defaults to False.
        service_context (ServiceContext): Service context container (contains
            components like LLM, Embeddings, etc.).

    """

    index_struct_cls: Type[IS]

    def __init__(
        self,
        nodes: Optional[Sequence[BaseNode]] = None,
        objects: Optional[Sequence[IndexNode]] = None,
        index_struct: Optional[IS] = None,
        storage_context: Optional[StorageContext] = None,
        callback_manager: Optional[CallbackManager] = None,
        transformations: Optional[List[TransformComponent]] = None,
        show_progress: bool = False,
        # deprecated
        service_context: Optional[ServiceContext] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize with parameters."""
        if index_struct is None and nodes is None and objects is None:
            raise ValueError("One of nodes, objects, or index_struct must be provided.")
        if index_struct is not None and nodes is not None:
            raise ValueError("Only one of nodes or index_struct can be provided.")
        # This is to explicitly make sure that the old UX is not used
        if nodes is not None and len(nodes) >= 1 and not isinstance(nodes[0], BaseNode):
            if isinstance(nodes[0], Document):
                raise ValueError(
                    "The constructor now takes in a list of Node objects. "
                    "Since you are passing in a list of Document objects, "
                    "please use `from_documents` instead."
                )
            else:
                raise ValueError("nodes must be a list of Node objects.")

        self._storage_context = storage_context or StorageContext.from_defaults()
        # deprecated
        self._service_context = service_context

        self._docstore = self._storage_context.docstore
        self._show_progress = show_progress
        self._vector_store = self._storage_context.vector_store
        self._graph_store = self._storage_context.graph_store
        self._callback_manager = (
            callback_manager
            or callback_manager_from_settings_or_context(Settings, service_context)
        )

        objects = objects or []
        self._object_map = {obj.index_id: obj.obj for obj in objects}
        for obj in objects:
            obj.obj = None  # clear the object to avoid serialization issues

        with self._callback_manager.as_trace("index_construction"):
            if index_struct is None:
                nodes = nodes or []
                index_struct = self.build_index_from_nodes(
                    nodes + objects  # type: ignore
                )
            self._index_struct = index_struct
            self._storage_context.index_store.add_index_struct(self._index_struct)

        self._transformations = (
            transformations
            or transformations_from_settings_or_context(Settings, service_context)
        )
```

这个方法首先会对 nodes, index_struct, objects参数做验证，然后从 storage_context 中获取各种store。因为 objects 为None，接着关于object的循环不会执行。接着就是调用`build_index_from_nodes`方法构建索引，然后调用` self._storage_context.index_store.add_index_struct(self._index_struct)`将`index_struct`仓储到`index_store`中。

将 nodes 中的文本执行向量化，保存到向量数据库(本次示例为Qdrant），还有将文档保存到doc_store(本次示例为MongoDB）中都是在这个方法里面去做的。`index_store`本次示例使用的Redis。

`VectorStoreIndex`的`build_index_from_nodes`方法如下：

```python
    def build_index_from_nodes(
        self,
        nodes: Sequence[BaseNode],
        **insert_kwargs: Any,
    ) -> IndexDict:
        """Build the index from nodes.

        NOTE: Overrides BaseIndex.build_index_from_nodes.
            VectorStoreIndex only stores nodes in document store
            if vector store does not store text
        """
        # raise an error if even one node has no content
        if any(
            node.get_content(metadata_mode=MetadataMode.EMBED) == "" for node in nodes
        ):
            raise ValueError(
                "Cannot build index from nodes with no content. "
                "Please ensure all nodes have content."
            )

        return self._build_index_from_nodes(nodes, **insert_kwargs)

```

首先会判断node是否有content，如果没有就报错。然后调用`_build_index_from_nodes`方法。

```python
 def _build_index_from_nodes(
        self,
        nodes: Sequence[BaseNode],
        **insert_kwargs: Any,
    ) -> IndexDict:
        """Build index from nodes."""
        index_struct = self.index_struct_cls()
        if self._use_async:
            tasks = [
                self._async_add_nodes_to_index(
                    index_struct,
                    nodes,
                    show_progress=self._show_progress,
                    **insert_kwargs,
                )
            ]
            run_async_tasks(tasks)
        else:
            self._add_nodes_to_index(
                index_struct,
                nodes,
                show_progress=self._show_progress,
                **insert_kwargs,
            )
        return index_struct
```

默认情况下是使用同步的方式调用，所以会调用`_add_nodes_to_index`方法。

```python
    def _add_nodes_to_index(
        self,
        index_struct: IndexDict,
        nodes: Sequence[BaseNode],
        show_progress: bool = False,
        **insert_kwargs: Any,
    ) -> None:
        """Add document to index."""
        if not nodes:
            return

        for nodes_batch in iter_batch(nodes, self._insert_batch_size):
            nodes_batch = self._get_node_with_embedding(nodes_batch, show_progress)
            new_ids = self._vector_store.add(nodes_batch, **insert_kwargs)

            if not self._vector_store.stores_text or self._store_nodes_override:
                # NOTE: if the vector store doesn't store text,
                # we need to add the nodes to the index struct and document store
                for node, new_id in zip(nodes_batch, new_ids):
                    # NOTE: remove embedding from node to avoid duplication
                    node_without_embedding = node.copy()
                    node_without_embedding.embedding = None

                    index_struct.add_node(node_without_embedding, text_id=new_id)
                    self._docstore.add_documents(
                        [node_without_embedding], allow_update=True
                    )
            else:
                # NOTE: if the vector store keeps text,
                # we only need to add image and index nodes
                for node, new_id in zip(nodes_batch, new_ids):
                    if isinstance(node, (ImageNode, IndexNode)):
                        # NOTE: remove embedding from node to avoid duplication
                        node_without_embedding = node.copy()
                        node_without_embedding.embedding = None

                        index_struct.add_node(node_without_embedding, text_id=new_id)
                        self._docstore.add_documents(
                            [node_without_embedding], allow_update=True
                        )
```

首先会将`nodes`按照`_insert_batch_size`处理成不同的batch，然后对每一个batch进行操作。其中`_get_node_with_embedding`对一个batch的nodes调用embedding model进行向量化操作。然后调用`self._vector_store.add(nodes_batch, **insert_kwargs)`将向量化后的`nodes`写入到向量数据库中。这个方法会返回一个`new_ids`，表示一个batch的nodes在向量数据库中的ID列表。接下来会判断向量数据库的`stores_text`属性和`_store_nodes_override`参数，如果向量数据库的`stores_text`为False或者`_store_nodes_override`参数为True，就会执行if语句，否则就执行else语句。if 语句中会将node的embedding字段置为 None，然后将其添加到Index中。index add_node的代码如下：

```python
@dataclass
class IndexDict(IndexStruct):
    """A simple dictionary of documents."""

    # TODO: slightly deprecated, should likely be a list or set now
    # mapping from vector store id to node doc_id
    nodes_dict: Dict[str, str] = field(default_factory=dict)

    # TODO: deprecated, not used
    # mapping from node doc_id to vector store id
    doc_id_dict: Dict[str, List[str]] = field(default_factory=dict)

    # TODO: deprecated, not used
    # this should be empty for all other indices
    embeddings_dict: Dict[str, List[float]] = field(default_factory=dict)

    def add_node(
        self,
        node: BaseNode,
        text_id: Optional[str] = None,
    ) -> str:
        """Add text to table, return current position in list."""
        # # don't worry about child indices for now, nodes are all in order
        # self.nodes_dict[int_id] = node
        vector_id = text_id if text_id is not None else node.node_id
        self.nodes_dict[vector_id] = node.node_id

        return vector_id

```

index中的nodes_dict维护了向量数据库ID和node_id的一个关系，在本例中这两个ID是一样的，都是node.node_id。最后调用

```python
self._docstore.add_documents(
    [node_without_embedding], allow_update=True
)
```

将node保存的docstore中，在本例中为MongoDB。

在MongoDB中会将数据保存在`docstore/data`、`docstore/metadata`、`docstore/ref_doc_info`三个collection中。

其中`docstore/data`中保存的格式如下：

```json
{
  "_id": "b87e8f8b-e21a-4eca-a0b5-83e336bc6ace",
  "__data__": {
    "id_": "b87e8f8b-e21a-4eca-a0b5-83e336bc6ace",
    "embedding": null,
    "metadata": {
      "page_label": "5",
      "file_name": "测试.pdf",
      "file_path": "测试.pdf",
      "file_type": "application/pdf",
      "file_size": 462360,
      "creation_date": "2024-02-04",
      "last_modified_date": "2023-11-14"
    },
    "excluded_embed_metadata_keys": [
      "file_name",
      "file_type",
      "file_size",
      "creation_date",
      "last_modified_date",
      "last_accessed_date"
    ],
    "excluded_llm_metadata_keys": [
      "file_name",
      "file_type",
      "file_size",
      "creation_date",
      "last_modified_date",
      "last_accessed_date"
    ],
    "relationships": {},
    "text": "《\n热加工工艺\n》\n2016\n年\n10\n月 第\n45\n卷 第\n19\n期\n松缩孔现象\n，\n图\n7\n显示了铝合金罩盖优化前后剖面\n的缩孔区域\n。\n由图可见\n：\n优化后缩孔区域消失\n，\n缩孔\n概率显著降低\n，\n铸件的质量得到提高\n。\n5\n结论\n（\n1\n）\n采用\nBP\n神经网络与\nGA\n结合可对压铸工\n艺参数进行优化\n，\n找出一组适合零件的最佳工艺参数\n。\n（\n2\n）\n通过工艺参数的优化\n，\n可以将零件的凝固\n时间减少\n，\n二次枝晶臂间距减小\n，\n出现缩松缩孔的概\n率降低\n，\n成型质量得到提高\n。\n参考文献\n：\n[1]\n赵军\n，\n尹硕\n，\n武向南\n．\nBP\n神经网络在\nAZ91D\n镁合金挤压铸造\n工艺中的应用\n[J]\n．\n热加工工艺\n，\n2013\n，\n42(7)\n：\n46-48\n．\n[2]\n赵建华\n，\n黄惠兰\n，\n尹冬梅\n，\n等\n．\n基于神经网络的泵体铸造过程\n数值模拟的优化与应用\n[J]\n．\n热加工工艺\n，\n2010\n，\n39 (23)\n：\n53-58\n．\n[3]\n尚守平\n，\n雷敏\n，\n蒯行成\n．\n土结构系统的非线性参数反演研究\n[J]\n．\n湖南大学学报\n：\n自然科学版\n，\n2008\n．\n[4]\n张德丰\n．\nMATLAB\n神经网络应用设计\n[M]\n．\n北京\n：\n机械工业\n出版社\n，\n2009\n．\n[5]\n雷英杰\n，\n张善文\n，\n李续武\n，\n等\n．\nMATLAB\n遗传算法工具箱及应\n用\n[M]\n．\n西安\n：\n西安电子科技大学出版社\n，\n2005\n．\n1.0\n0.9\n0.8\n0.7\n0.6\n0.5\n0.4\n0.3\n0.2\n0.1\n0.0\n图\n7\n压铸件缩孔概率图\nFig.7 Porosity probability of die casting\n(a)\n优化前\n(b)\n优化后\n概率缺陷\n参数\n=0.1\n概率缺陷\n参数\n=0.04\n对比\n。\n可看出\n：\n①\n抗拉强度经过稀土处理之后比未处\n理的均有提高\n，\n平均值提高达\n7.05%\n；\n②\n伸长率经过\n稀土处理之后比未处理的仅最大值持平\n，\n最小值和\n平均值均有降低\n，\n其中平均值降低\n12.82%\n；\n③\n冲击\n功经过稀土处理之后比未处理的均有降低\n，\n平均值\n降低达\n23.92%\n。\n3\n数据分析\n众所周知\n，\n高锰钢的铸态组织是由奥氏体\n、\n碳化\n物\n、\n珠光体和少量磷共晶等组成的\n。\n由于碳化物数量\n多\n，\n并在晶界形成网状\n，\n严重降低钢的晶界强度\n，\n使\n钢的性能变脆\n，\n一般情况下不能使用\n。\n只有通过固溶处理\n（\n即水韧处理\n）\n后\n，\n使钢中的碳化物溶解于奥氏\n体中\n，\n成为单一的奥氏体组织\n，\n高锰钢才具有较高的\n强度\n、\n塑形和韧性\n。\n稀土元素对高锰钢力学性能的影响是钢中非金\n属夹杂物\n、\n碳化物\n、\n晶粒度等各种因素综合影响的结\n果\n。\n综合金相\n、\n扫描电镜和力学性能的检测数据\n，\n分\n析认为\n：\n加入稀土元素\n，\n利用其具有比较高的表面活\n性以及由它形成高熔点化合物作为结晶核心的作\n用\n，\n因此一次结晶得到了细化\n。\n经过稀土处理后的\n高锰钢\n，\n晶粒度明显细化\n。\n但必须指出\n，\n由于稀土元\n素与钢中碳元素可以形成高熔点的稀土碳化物\n，\n它\n虽然存在于晶内\n，\n但是对钢的韧性却产生不利影响\n，\n使高锰钢抗拉强度提高\n，\n但低温冲击韧性降低\n，\n即冲\n击值下降\n，\n特别是在寒冷地区会表现得更加明显\n。\n4\n结语\n高锰钢采用稀土处理\n（\n即加入钢包内对高锰钢进\n行变质处理\n），\n可以有效细化晶粒\n，\n抗拉强度可以提高\n7%\n左右\n，\n但冲击值将大幅降低\n，\n降幅达\n23%\n。\n在没有\n使用精炼技术的情况下\n，\n冲击值下降难以克服\n。\n参考文献\n：\n[1]\n霍文霞\n．\n不同稀土加入量对高锰钢组织及力学性能的影响\n[J]\n．\n热加工工艺\n，\n2012\n，\n41(7)\n：\n15-17\n．\n[2]\n樊安国\n．\n微合金化纯净钢中稀土元素的作用\n[J]\n．\n有色金属\n，\n2010\n，\n62(1)\n：\n14-16\n．\n[3]\n马 杰\n．\n稀土元素在钢中的作用及对钢性能的影响\n[J]\n．\n钢铁\n研究\n，\n2009\n，\n37(3)\n：\n54-56\n．\n方案是否加入稀土\n(\n试件编号\n)\nR\nm\n/MPa\nA\n(%)\na\nU2\n/(J\n·\ncm\n-2\n)\n方案一\n方案二\n方案三\n否\n（\n1A\n）\n是\n（\n1B\n）\n否\n（\n2A\n）\n是\n（\n2B\n）\n否\n（\n3A\n）\n是\n（\n3B\n）\n847\n943\n815\n892\n873\n87970.0\n70.5\n56.5\n48.5\n70.0\n52.5331\n，\n288\n，\n375\n，\n平均\n387.3\n456\n，\n325\n，\n325\n，\n平均\n312.6\n338\n，\n281\n，\n413\n，\n平均\n371.3\n363\n，\n306\n，\n325\n，\n平均\n304\n381\n，\n275\n，\n387\n，\n平均\n383\n381\n，\n256\n，\n225\n，\n平均\n252\n表\n4\n加入稀土和未加稀土高锰钢的力学性能对比\nTab.4 The mechanical properties contrast of high\nmanganese steel with the rare earths and without the\nrare earths\n表\n3\n不同试验方案下高锰钢的力学性能测试结果\nTab.3 Mechanics performance test results of high\nmanganese steel under different test schemes\n试验方案\nR\nm\n/MPa\nA\n(%)\na\nU2\n/(J\n·\ncm\n-2\n)\n最大值最小值平均值最大值最小值平均值最大值最小值平均值\n未加稀土\n加入稀土\n873\n943815\n879845\n904.670.0\n70.556.5\n48.565.5\n57.1387.3\n312.6371.3\n252380.5\n289.5\n(\n上接第\n117\n页\n)\n119\n",
    "start_char_idx": null,
    "end_char_idx": null,
    "text_template": "{metadata_str}\n\n{content}",
    "metadata_template": "{key}: {value}",
    "metadata_seperator": "\n",
    "class_name": "Document"
  },
  "__type__": "4"
}
```

在`docstore/metadata`中的格式如下：

```json
{
  "_id": "891af491-2999-4d99-b587-87a72a79af27",
  "doc_hash": "fa47aff1ecab93260fdba2a6c926bafd4d2cc0afcd2b4832b7ee092d3c2ed3f3"
}
```

在Redis中存储的index有3个字段，分别是ID，Key，Value。ID是自增的数字，Key是一个字符串，表示索引ID，是一个UUID格式，Value是一个字典，表示LlamaIndex中的索引数据结构。格式如下：

```json
{
    "__type__": "vector_store",
    "__data__": "{\"index_id\": \"a289e79a-6acc-4142-bf21-aeb9c16977bc\", \"summary\": null, \"nodes_dict\": {\"da98496b-27a1-4509-bdef-63fb9d834ea5\": \"da98496b-27a1-4509-bdef-63fb9d834ea5\", \"b77f422d-e51a-41a9-8c67-4b37f6d044ae\": \"b77f422d-e51a-41a9-8c67-4b37f6d044ae\", \"fa3932cd-7d81-4617-8c49-4c87607641cf\": \"fa3932cd-7d81-4617-8c49-4c87607641cf\", \"397947bb-5385-4078-b2ca-d86d7bf2003a\": \"397947bb-5385-4078-b2ca-d86d7bf2003a\", \"b87e8f8b-e21a-4eca-a0b5-83e336bc6ace\": \"b87e8f8b-e21a-4eca-a0b5-83e336bc6ace\"}, \"doc_id_dict\": {}, \"embeddings_dict\": {}}"
}
```

其中维护了向量数据库ID和node_id的对应关系。
