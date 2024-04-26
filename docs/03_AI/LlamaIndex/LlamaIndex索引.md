# LlamaIndex 索引

一个RAG系统的流程大致如图：

![image-20240426011357639](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240426011357639.png)

本文主要关注其中的检索部分。使用的框架是 [llama_index](https://www.llamaindex.ai/) 。在一个RAG系统中，在加载文档之后会得到一个 Document 列表 (或者Node 列表, Document 继承·自TextNode，一般情况下使用的都是TextNode)，然后对这些 Document 列表创建索引（Index）来方便检索。

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

def test_create_index():
    # 加载文档
    # 一个文件对应多个document对象 node_id等于doc_id等于id_
    #
    documents = SimpleDirectoryReader(input_files=["测试.pdf"]).load_data()
    logger.info(f"加载文档成功，共{len(documents)}个文档")

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
        store_nodes_override=True,
    )
    # index.index_struct  :  IndexDict(index_id="xxx", nodes_dict={"node_id":"node_id"}) index_id 111 -> node_ids: [1,2,3,4]
    logger.info("构建索引成功")
    retriever = index.as_retriever(similarity_top_k=10)
    query = "This is a test query text"
    response = retriever.retrieve(query)
    logger.info(f"检索结果：{len(response)=")
    logger.info(f"检索结果：{response[0]=}")
```





