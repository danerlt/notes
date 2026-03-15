# dify接口记录

dify 本地启动之后，需要的对其中 RAG 相关的关键步骤梳理。

主要需要弄清的包括：

- 添加模型
- 新建知识库
- 知识库上传文件
- 文档分片
- 向量化
- 索引
- 对话
  - 模型是如何来的
  - 检索逻辑
  - 提示词的拼接
  - 拼接好的提示词如何和LLM调用的
  - LLM返回的结果处理

## 添加模型

添加模型的路径为 【设置】-> 【工作空间】-> 【模型提供商】，下面以添加`通义千问`模型为例。梳理添加模型的逻辑。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-01-16-OjSinE.png)

选中 `通义千问` 会弹出一个对话框，需要输入通义千问的 API KEY。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-01-16-hXg36M.png)

点击保存会使用 `POST` 调用接口`http://localhost:5001/console/api/workspaces/current/model-providers/tongyi`, 接口调用成功响应状态码为 `201`。
接口参数格式为：
```json
{
	"credentials": {
		"dashscope_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxx"
	}
}
```

接口URL映射在 `api/controllers/console/workspace/model_providers.py`中的：
```python
api.add_resource(ModelProviderApi, '/workspaces/current/model-providers/<string:provider>')
```

其中`provider`为路径参数，这里传递的是`tongyi`。

`ModelProviderApi`类的定义如下：
```python
class ModelProviderApi(Resource):

    @setup_required
    @login_required
    @account_initialization_required
    def post(self, provider: str):
        if current_user.current_tenant.current_role not in ['admin', 'owner']:
            raise Forbidden()

        # credentials表示 api key
        parser = reqparse.RequestParser()
        parser.add_argument('credentials', type=dict, required=True, nullable=False, location='json')
        args = parser.parse_args()

        model_provider_service = ModelProviderService()

        try:
            model_provider_service.save_provider_credentials(
                tenant_id=current_user.current_tenant_id,
                provider=provider,
                credentials=args['credentials']
            )
        except CredentialsValidateFailedError as ex:
            raise ValueError(str(ex))

        return {'result': 'success'}, 201

    @setup_required
    @login_required
    @account_initialization_required
    def delete(self, provider: str):
        if current_user.current_tenant.current_role not in ['admin', 'owner']:
            raise Forbidden()

        model_provider_service = ModelProviderService()
        model_provider_service.remove_provider_credentials(
            tenant_id=current_user.current_tenant_id,
            provider=provider
        )

        return {'result': 'success'}, 204
```

其中`post`方法对应着 `POST` 请求, `delete`方法对应着 `DELETE` 请求。

其中`setup_required`装饰器定义在`api/controllers/console/setup.py`中，内容如下：
```python 
def setup_required(view):
    @wraps(view)
    def decorated(*args, **kwargs):
        # check setup
        if not get_setup_status():
            raise NotSetupError()

        return view(*args, **kwargs)

    return decorated


def get_setup_status():
    if current_app.config['EDITION'] == 'SELF_HOSTED':
        return DifySetup.query.first()
    else:
        return True

```
如果`get_setup_status`函数返回`False`，就抛出`NotSetupError`。如果配置中`EDITION`为`SELF_HOSTED`，本地启动默认就是这个配置,就去`DifySetup`查询一条记录。这个执行了初始化就会有一条记录，这个就会返回`True`。

`login_required`装饰器是用来进行 `token` 校验的。

`account_initialization_required`装饰器用来判断账户是否已经初始化。

`post`方法处理 `POST` 请求，接收 `provider` 参数。首先校验用户权限，非`admin`或`owner`则抛出异常。然后解析请求中的 json 格式 `credentials` 信息，并使用 `ModelProviderService` 服务类保存租户、提供者及其凭证信息。若凭证验证失败，则抛出错误，如果验证成功，返回状态码为 201。





## 新建知识库

### 创建一个空的知识库

点击【知识库】->【创建知识库】-> 【创建一个空的知识库】

![image-20240122025935825](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240122025935825.png)

会调用`POST`接口:  http://localhost:5001/console/api/datasets

接口参数格式如下：

```json
{"name":"测试知识库"}
```

接口代码定义在`api/controllers/console/datasets/datasets.py`中的`DatasetListApi`类中。

URL 映射为：

```python
api.add_resource(DatasetListApi, '/datasets')
```

`DatasetListApi`类定义如下，其中`get`方法是用来获取所有数据集列表，`post`方法是用来创建数据集。

```python
class DatasetListApi(Resource):

    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=20, type=int)
        ids = request.args.getlist('ids')
        provider = request.args.get('provider', default="vendor")
        if ids:
            datasets, total = DatasetService.get_datasets_by_ids(ids, current_user.current_tenant_id)
        else:
            datasets, total = DatasetService.get_datasets(page, limit, provider,
                                                          current_user.current_tenant_id, current_user)

        # check embedding setting
        provider_manager = ProviderManager()
        configurations = provider_manager.get_configurations(
            tenant_id=current_user.current_tenant_id
        )

        embedding_models = configurations.get_models(
            model_type=ModelType.TEXT_EMBEDDING,
            only_active=True
        )

        model_names = []
        for embedding_model in embedding_models:
            model_names.append(f"{embedding_model.model}:{embedding_model.provider.provider}")

        data = marshal(datasets, dataset_detail_fields)
        for item in data:
            if item['indexing_technique'] == 'high_quality':
                item_model = f"{item['embedding_model']}:{item['embedding_model_provider']}"
                if item_model in model_names:
                    item['embedding_available'] = True
                else:
                    item['embedding_available'] = False
            else:
                item['embedding_available'] = True

        response = {
            'data': data,
            'has_more': len(datasets) == limit,
            'limit': limit,
            'total': total,
            'page': page
        }
        return response, 200

    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', nullable=False, required=True,
                            help='type is required. Name must be between 1 to 40 characters.',
                            type=_validate_name)
        parser.add_argument('indexing_technique', type=str, location='json',
                            choices=Dataset.INDEXING_TECHNIQUE_LIST,
                            nullable=True,
                            help='Invalid indexing technique.')
        args = parser.parse_args()

        # The role of the current user in the ta table must be admin or owner
        if current_user.current_tenant.current_role not in ['admin', 'owner']:
            raise Forbidden()

        try:
            dataset = DatasetService.create_empty_dataset(
                tenant_id=current_user.current_tenant_id,
                name=args['name'],
                indexing_technique=args['indexing_technique'],
                account=current_user
            )
        except services.errors.dataset.DatasetNameDuplicateError:
            raise DatasetNameDuplicateError()

        return marshal(dataset, dataset_detail_fields), 201

```

其中`create_empty_dataset`方法如下，主要是用来写入`dataset`表，其中`embedding_model`相关属性，要根据`index_technique`来获取：

```python
    @staticmethod
    def create_empty_dataset(tenant_id: str, name: str, indexing_technique: Optional[str], account: Account):
        # check if dataset name already exists
        if Dataset.query.filter_by(name=name, tenant_id=tenant_id).first():
            raise DatasetNameDuplicateError(
                f'Dataset with name {name} already exists.')
        embedding_model = None
        if indexing_technique == 'high_quality':
            model_manager = ModelManager()
            embedding_model = model_manager.get_default_model_instance(
                tenant_id=tenant_id,
                model_type=ModelType.TEXT_EMBEDDING
            )
        dataset = Dataset(name=name, indexing_technique=indexing_technique)
        # dataset = Dataset(name=name, provider=provider, config=config)
        dataset.created_by = account.id
        dataset.updated_by = account.id
        dataset.tenant_id = tenant_id
        dataset.embedding_model_provider = embedding_model.provider if embedding_model else None
        dataset.embedding_model = embedding_model.model if embedding_model else None
        db.session.add(dataset)
        db.session.commit()
        return dataset
```

### 创建知识库

#### 上传文件

首先点击【知识库】->【创建知识库】-> 【上传文本文件】

首先会`POST`调用接口： http://localhost:5001/console/api/files/upload  来上传文件

接口参数格式如下：

```json
------WebKitFormBoundaryZOQCLEOLaD76jAfu
Content-Disposition: form-data; name="file"; filename="中华人民共和国劳动法.txt"
Content-Type: text/plain


------WebKitFormBoundaryZOQCLEOLaD76jAfu--
```

返回格式如下：

```json
{
	"id": "a1e3917e-e56e-45dc-8078-883684444dce",
	"name": "中华人民共和国劳动法.txt",
	"size": 17390,
	"extension": "txt",
	"mime_type": "text/plain",
	"created_by": "368861f3-65cd-49be-9556-96410617a25d",
	"created_at": 1705904335
}
```

接口代码在文件`api/controllers/console/datasets/file.py`中，其中URL映射对应`FileApi`类。

```
api.add_resource(FileApi, '/files/upload')
```

`FileApi`类定义如下，其中的`POST`方法对应着上传文件接口，`GET`接口用来查询上传文件相关的`limit`配置：

```python
class FileApi(Resource):

    @setup_required
    @login_required
    @account_initialization_required
    @marshal_with(upload_config_fields)
    def get(self):
        file_size_limit = current_app.config.get("UPLOAD_FILE_SIZE_LIMIT")
        batch_count_limit = current_app.config.get("UPLOAD_FILE_BATCH_LIMIT")
        image_file_size_limit = current_app.config.get("UPLOAD_IMAGE_FILE_SIZE_LIMIT")
        return {
            'file_size_limit': file_size_limit,
            'batch_count_limit': batch_count_limit,
            'image_file_size_limit': image_file_size_limit
        }, 200

    @setup_required
    @login_required
    @account_initialization_required
    @marshal_with(file_fields)
    def post(self):

        # get file from request
        file = request.files['file']

        # check file
        if 'file' not in request.files:
            raise NoFileUploadedError()

        if len(request.files) > 1:
            raise TooManyFilesError()
        try:
            upload_file = FileService.upload_file(file, current_user)
        except services.errors.file.FileTooLargeError as file_too_large_error:
            raise FileTooLargeError(file_too_large_error.description)
        except services.errors.file.UnsupportedFileTypeError:
            raise UnsupportedFileTypeError()

        return upload_file, 201
```

其中上传文件的逻辑主要在`FileService`类中的`upload_file`方法。

```python
class FileService:

    @staticmethod
    def upload_file(file: FileStorage, user: Union[Account, EndUser], only_image: bool = False) -> UploadFile:
        extension = file.filename.split('.')[-1]
        etl_type = current_app.config['ETL_TYPE']
        if etl_type == 'Unstructured':
            allowed_extensions = ['txt', 'markdown', 'md', 'pdf', 'html', 'htm', 'xlsx',
                                  'docx', 'csv', 'eml', 'msg', 'pptx', 'ppt', 'xml',
                                  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
        else:
            allowed_extensions = ['txt', 'markdown', 'md', 'pdf', 'html', 'htm', 'xlsx', 'docx', 'csv',
                                  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
        if extension.lower() not in allowed_extensions:
            raise UnsupportedFileTypeError()
        elif only_image and extension.lower() not in IMAGE_EXTENSIONS:
            raise UnsupportedFileTypeError()

        # read file content
        file_content = file.read()

        # get file size
        file_size = len(file_content)

        if extension.lower() in IMAGE_EXTENSIONS:
            file_size_limit = current_app.config.get("UPLOAD_IMAGE_FILE_SIZE_LIMIT") * 1024 * 1024
        else:
            file_size_limit = current_app.config.get("UPLOAD_FILE_SIZE_LIMIT") * 1024 * 1024

        if file_size > file_size_limit:
            message = f'File size exceeded. {file_size} > {file_size_limit}'
            raise FileTooLargeError(message)

        # user uuid as file name
        file_uuid = str(uuid.uuid4())

        if isinstance(user, Account):
            current_tenant_id = user.current_tenant_id
        else:
            # end_user
            current_tenant_id = user.tenant_id

        file_key = 'upload_files/' + current_tenant_id + '/' + file_uuid + '.' + extension

        # save file to storage
        storage.save(file_key, file_content)

        # save file to db
        config = current_app.config
        upload_file = UploadFile(
            tenant_id=current_tenant_id,
            storage_type=config['STORAGE_TYPE'],
            key=file_key,
            name=file.filename,
            size=file_size,
            extension=extension,
            mime_type=file.mimetype,
            created_by_role=('account' if isinstance(user, Account) else 'end_user'),
            created_by=user.id,
            created_at=datetime.datetime.utcnow(),
            used=False,
            hash=hashlib.sha3_256(file_content).hexdigest()
        )

        db.session.add(upload_file)
        db.session.commit()

        return upload_file
```

这个方法首先会对文件后缀进行判断，然后读取文件内容，对文件大小做判断。接着通过`from extensions.ext_storage import storage`中的`storage`对象进行文件的保存，这个对象会根据`STORAGE_TYPE`配置将文件存储到S3上或服务器本地目录。最后将数据写入`UploadFile`model对应的数据库表中。



#### 文本分段和清洗

上传完文件之后，就需要对文本分段和清洗进行设置，还要对索引相关配置进行设置。

![image-20240122063532379](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240122063532379.png)

点击保存并处理，会`POST`调用接口: http://localhost:5001/console/api/datasets/init 

接口参数格式如下：

```json
{
	"data_source": {
		"type": "upload_file",
		"info_list": {
			"data_source_type": "upload_file",
			"file_info_list": {
				"file_ids": ["a1e3917e-e56e-45dc-8078-883684444dce"]
			}
		}
	},
	"indexing_technique": "high_quality",
	"process_rule": {
		"rules": {},
		"mode": "automatic"
	},
	"doc_form": "text_model",
	"doc_language": "Chinese",
	"retrieval_model": {
		"search_method": "semantic_search",
		"reranking_enable": false,
		"reranking_model": {
			"reranking_provider_name": "",
			"reranking_model_name": ""
		},
		"top_k": 3,
		"score_threshold_enabled": false,
		"score_threshold": 0.5
	}
}
```

接口对应文件在 `api/controllers/console/datasets/datasets_document.py`中，

URL 映射为：

```python
api.add_resource(DatasetInitApi,
                 '/datasets/init')
```

对应着`DatasetInitApi`类。

代码如下：

```python
class DatasetInitApi(Resource):

    @setup_required
    @login_required
    @account_initialization_required
    @marshal_with(dataset_and_document_fields)
    @cloud_edition_billing_resource_check('vector_space')
    def post(self):
        # The role of the current user in the ta table must be admin or owner
        if current_user.current_tenant.current_role not in ['admin', 'owner']:
            raise Forbidden()

        parser = reqparse.RequestParser()
        parser.add_argument('indexing_technique', type=str, choices=Dataset.INDEXING_TECHNIQUE_LIST, required=True,
                            nullable=False, location='json')
        parser.add_argument('data_source', type=dict, required=True, nullable=True, location='json')
        parser.add_argument('process_rule', type=dict, required=True, nullable=True, location='json')
        parser.add_argument('doc_form', type=str, default='text_model', required=False, nullable=False, location='json')
        parser.add_argument('doc_language', type=str, default='English', required=False, nullable=False,
                            location='json')
        parser.add_argument('retrieval_model', type=dict, required=False, nullable=False,
                            location='json')
        args = parser.parse_args()
        if args['indexing_technique'] == 'high_quality':
            try:
                model_manager = ModelManager()
                model_manager.get_default_model_instance(
                    tenant_id=current_user.current_tenant_id,
                    model_type=ModelType.TEXT_EMBEDDING
                )
            except InvokeAuthorizationError:
                raise ProviderNotInitializeError(
                    f"No Embedding Model available. Please configure a valid provider "
                    f"in the Settings -> Model Provider.")
            except ProviderTokenNotInitError as ex:
                raise ProviderNotInitializeError(ex.description)

        # validate args
        DocumentService.document_create_args_validate(args)

        try:
            dataset, documents, batch = DocumentService.save_document_without_dataset_id(
                tenant_id=current_user.current_tenant_id,
                document_data=args,
                account=current_user
            )
        except ProviderTokenNotInitError as ex:
            raise ProviderNotInitializeError(ex.description)
        except QuotaExceededError:
            raise ProviderQuotaExceededError()
        except ModelCurrentlyNotSupportError:
            raise ProviderModelCurrentlyNotSupportError()

        response = {
            'dataset': dataset,
            'documents': documents,
            'batch': batch
        }

        return response

```

首先通过`indexing_technique`判断`text_embedding`模型是否可用。然后进行参数校验。接着调用`DocumentService`的`save_document_without_dataset_id`

方法（见文件：`api/services/dataset_service.py`）。

```python
    @staticmethod
    def save_document_without_dataset_id(tenant_id: str, document_data: dict, account: Account):
        count = 0
        if document_data["data_source"]["type"] == "upload_file":
            upload_file_list = document_data["data_source"]["info_list"]['file_info_list']['file_ids']
            count = len(upload_file_list)
        elif document_data["data_source"]["type"] == "notion_import":
            notion_info_list = document_data["data_source"]['info_list']['notion_info_list']
            for notion_info in notion_info_list:
                count = count + len(notion_info['pages'])

        embedding_model = None
        dataset_collection_binding_id = None
        retrieval_model = None
        if document_data['indexing_technique'] == 'high_quality':
            model_manager = ModelManager()
            embedding_model = model_manager.get_default_model_instance(
                tenant_id=current_user.current_tenant_id,
                model_type=ModelType.TEXT_EMBEDDING
            )
            dataset_collection_binding = DatasetCollectionBindingService.get_dataset_collection_binding(
                embedding_model.provider,
                embedding_model.model
            )
            dataset_collection_binding_id = dataset_collection_binding.id
            if 'retrieval_model' in document_data and document_data['retrieval_model']:
                retrieval_model = document_data['retrieval_model']
            else:
                default_retrieval_model = {
                    'search_method': 'semantic_search',
                    'reranking_enable': False,
                    'reranking_model': {
                        'reranking_provider_name': '',
                        'reranking_model_name': ''
                    },
                    'top_k': 2,
                    'score_threshold_enabled': False
                }
                retrieval_model = default_retrieval_model
        # save dataset
        dataset = Dataset(
            tenant_id=tenant_id,
            name='',
            data_source_type=document_data["data_source"]["type"],
            indexing_technique=document_data["indexing_technique"],
            created_by=account.id,
            embedding_model=embedding_model.model if embedding_model else None,
            embedding_model_provider=embedding_model.provider if embedding_model else None,
            collection_binding_id=dataset_collection_binding_id,
            retrieval_model=retrieval_model
        )

        db.session.add(dataset)
        db.session.flush()

        documents, batch = DocumentService.save_document_with_dataset_id(dataset, document_data, account)

        cut_length = 18
        cut_name = documents[0].name[:cut_length]
        dataset.name = cut_name + '...'
        dataset.description = 'useful for when you want to answer queries about the ' + documents[0].name
        db.session.commit()

        return dataset, documents, batch
```

首先会根据`indexing_technique`等于`high_quality`会调用`get_dataset_collection_binding`
获取`dataset_collection_binding`,代码如下：

```python
class DatasetCollectionBindingService:
    @classmethod
    def get_dataset_collection_binding(cls, provider_name: str, model_name: str,
                                       collection_type: str = 'dataset') -> DatasetCollectionBinding:
        dataset_collection_binding = db.session.query(DatasetCollectionBinding). \
            filter(DatasetCollectionBinding.provider_name == provider_name,
                   DatasetCollectionBinding.model_name == model_name,
                   DatasetCollectionBinding.type == collection_type). \
            order_by(DatasetCollectionBinding.created_at). \
            first()

        if not dataset_collection_binding:
            dataset_collection_binding = DatasetCollectionBinding(
                provider_name=provider_name,
                model_name=model_name,
                collection_name="Vector_index_" + str(uuid.uuid4()).replace("-", "_") + '_Node',
                type=collection_type
            )
            db.session.add(dataset_collection_binding)
            db.session.commit()
        return dataset_collection_binding
```

如果`DatasetCollectionBinding`表记录不存在就创建一个记录。



然后会创建`Dataset`记录，最后调用`DocumentService`类的`save_document_with_dataset_id`方法保存文档（代码见`api/services/dataset_service.py`文件）。

```python
    @staticmethod
    def save_document_with_dataset_id(dataset: Dataset, document_data: dict,
                                      account: Account, dataset_process_rule: Optional[DatasetProcessRule] = None,
                                      created_from: str = 'web'):

        # check document limit
        if current_app.config['EDITION'] == 'CLOUD':
            if 'original_document_id' not in document_data or not document_data['original_document_id']:
                count = 0
                if document_data["data_source"]["type"] == "upload_file":
                    upload_file_list = document_data["data_source"]["info_list"]['file_info_list']['file_ids']
                    count = len(upload_file_list)
                elif document_data["data_source"]["type"] == "notion_import":
                    notion_info_list = document_data["data_source"]['info_list']['notion_info_list']
                    for notion_info in notion_info_list:
                        count = count + len(notion_info['pages'])
        # if dataset is empty, update dataset data_source_type
        if not dataset.data_source_type:
            dataset.data_source_type = document_data["data_source"]["type"]

        if not dataset.indexing_technique:
            if 'indexing_technique' not in document_data \
                    or document_data['indexing_technique'] not in Dataset.INDEXING_TECHNIQUE_LIST:
                raise ValueError("Indexing technique is required")

            dataset.indexing_technique = document_data["indexing_technique"]
            if document_data["indexing_technique"] == 'high_quality':
                model_manager = ModelManager()
                embedding_model = model_manager.get_default_model_instance(
                    tenant_id=current_user.current_tenant_id,
                    model_type=ModelType.TEXT_EMBEDDING
                )
                dataset.embedding_model = embedding_model.model
                dataset.embedding_model_provider = embedding_model.provider
                dataset_collection_binding = DatasetCollectionBindingService.get_dataset_collection_binding(
                    embedding_model.provider,
                    embedding_model.model
                )
                dataset.collection_binding_id = dataset_collection_binding.id
                if not dataset.retrieval_model:
                    default_retrieval_model = {
                        'search_method': 'semantic_search',
                        'reranking_enable': False,
                        'reranking_model': {
                            'reranking_provider_name': '',
                            'reranking_model_name': ''
                        },
                        'top_k': 2,
                        'score_threshold_enabled': False
                    }

                    dataset.retrieval_model = document_data.get('retrieval_model') if document_data.get(
                        'retrieval_model') else default_retrieval_model

        documents = []
        batch = time.strftime('%Y%m%d%H%M%S') + str(random.randint(100000, 999999))
        if 'original_document_id' in document_data and document_data["original_document_id"]:
            document = DocumentService.update_document_with_dataset_id(dataset, document_data, account)
            documents.append(document)
        else:
            # save process rule
            if not dataset_process_rule:
                process_rule = document_data["process_rule"]
                if process_rule["mode"] == "custom":
                    dataset_process_rule = DatasetProcessRule(
                        dataset_id=dataset.id,
                        mode=process_rule["mode"],
                        rules=json.dumps(process_rule["rules"]),
                        created_by=account.id
                    )
                elif process_rule["mode"] == "automatic":
                    dataset_process_rule = DatasetProcessRule(
                        dataset_id=dataset.id,
                        mode=process_rule["mode"],
                        rules=json.dumps(DatasetProcessRule.AUTOMATIC_RULES),
                        created_by=account.id
                    )
                db.session.add(dataset_process_rule)
                db.session.commit()
            position = DocumentService.get_documents_position(dataset.id)
            document_ids = []
            if document_data["data_source"]["type"] == "upload_file":
                upload_file_list = document_data["data_source"]["info_list"]['file_info_list']['file_ids']
                for file_id in upload_file_list:
                    file = db.session.query(UploadFile).filter(
                        UploadFile.tenant_id == dataset.tenant_id,
                        UploadFile.id == file_id
                    ).first()

                    # raise error if file not found
                    if not file:
                        raise FileNotExistsError()

                    file_name = file.name
                    data_source_info = {
                        "upload_file_id": file_id,
                    }
                    document = DocumentService.build_document(dataset, dataset_process_rule.id,
                                                              document_data["data_source"]["type"],
                                                              document_data["doc_form"],
                                                              document_data["doc_language"],
                                                              data_source_info, created_from, position,
                                                              account, file_name, batch)
                    db.session.add(document)
                    db.session.flush()
                    document_ids.append(document.id)
                    documents.append(document)
                    position += 1
            elif document_data["data_source"]["type"] == "notion_import":
                notion_info_list = document_data["data_source"]['info_list']['notion_info_list']
                exist_page_ids = []
                exist_document = dict()
                documents = Document.query.filter_by(
                    dataset_id=dataset.id,
                    tenant_id=current_user.current_tenant_id,
                    data_source_type='notion_import',
                    enabled=True
                ).all()
                if documents:
                    for document in documents:
                        data_source_info = json.loads(document.data_source_info)
                        exist_page_ids.append(data_source_info['notion_page_id'])
                        exist_document[data_source_info['notion_page_id']] = document.id
                for notion_info in notion_info_list:
                    workspace_id = notion_info['workspace_id']
                    data_source_binding = DataSourceBinding.query.filter(
                        db.and_(
                            DataSourceBinding.tenant_id == current_user.current_tenant_id,
                            DataSourceBinding.provider == 'notion',
                            DataSourceBinding.disabled == False,
                            DataSourceBinding.source_info['workspace_id'] == f'"{workspace_id}"'
                        )
                    ).first()
                    if not data_source_binding:
                        raise ValueError('Data source binding not found.')
                    for page in notion_info['pages']:
                        if page['page_id'] not in exist_page_ids:
                            data_source_info = {
                                "notion_workspace_id": workspace_id,
                                "notion_page_id": page['page_id'],
                                "notion_page_icon": page['page_icon'],
                                "type": page['type']
                            }
                            document = DocumentService.build_document(dataset, dataset_process_rule.id,
                                                                      document_data["data_source"]["type"],
                                                                      document_data["doc_form"],
                                                                      document_data["doc_language"],
                                                                      data_source_info, created_from, position,
                                                                      account, page['page_name'], batch)
                            db.session.add(document)
                            db.session.flush()
                            document_ids.append(document.id)
                            documents.append(document)
                            position += 1
                        else:
                            exist_document.pop(page['page_id'])
                # delete not selected documents
                if len(exist_document) > 0:
                    clean_notion_document_task.delay(list(exist_document.values()), dataset.id)
            db.session.commit()

            # trigger async task
            document_indexing_task.delay(dataset.id, document_ids)

        return documents, batch
```

1.  函数首先根据当前应用配置检查文档数量限制（仅在云端版时进行）。
2. 然后，如果数据集的`data_source_type`未设置，则用传入的`document_data`中的数据源类型更新它。 
3. 接下来，函数会检查并设置数据集的`indexing_technique`属性，并可能进一步初始化相关的嵌入模型和检索模型信息。 
4. 函数创建一个空列表`documents`，用于存储将要保存或更新的文档对象。同时生成一个批次标识符`batch`。 
5. 根据`document_data`中是否存在`original_document_id`，决定是更新已有文档还是新建文档。如果存在且非空，则调用`DocumentService.update_document_with_dataset_id`方法更新文档并将其添加到documents列表。
6.  如果不存在original_document_id或者其为空，则处理自定义或自动模式的文档处理规则，并将新文档保存到数据库中。对于不同类型的文档数据源（上传文件或Notion导入），分别执行不同的逻辑：
    -   对于上传文件，获取文件ID列表，对每个文件构建一个新的Document对象，保存到数据库，并更新相关索引位置等信息。 
    -   于从Notion导入的数据，遍历所有页面，同样构建新的Document对象并保存。同时，删除用户未选择但之前已存在的Notion文档，并触发异步任务清理。
7.  在完成文档保存后，函数提交数据库会话，触发异步任务`document_indexing_task`对新保存的文档进行索引。  
8.  最后，函数返回已保存或更新的文档列表`documents`及批次号`batch`。

其中异步任务`document_indexing_task`代码见`api/tasks/document_indexing_task.py`,内容如下：

```python
@shared_task(queue='dataset')
def document_indexing_task(dataset_id: str, document_ids: list):
    """
    Async process document
    :param dataset_id:
    :param document_ids:

    Usage: document_indexing_task.delay(dataset_id, document_id)
    """
    documents = []
    start_at = time.perf_counter()
    for document_id in document_ids:
        logging.info(click.style('Start process document: {}'.format(document_id), fg='green'))

        document = db.session.query(Document).filter(
            Document.id == document_id,
            Document.dataset_id == dataset_id
        ).first()

        if document:
            document.indexing_status = 'parsing'
            document.processing_started_at = datetime.datetime.utcnow()
            documents.append(document)
            db.session.add(document)
    db.session.commit()

    try:
        indexing_runner = IndexingRunner()
        indexing_runner.run(documents)
        end_at = time.perf_counter()
        logging.info(click.style('Processed dataset: {} latency: {}'.format(dataset_id, end_at - start_at), fg='green'))
    except DocumentIsPausedException as ex:
        logging.info(click.style(str(ex), fg='yellow'))
    except Exception:
        pass

```

`IndexingRunner`代码见`api/core/indexing_runner.py`。

```python
    def run(self, dataset_documents: List[DatasetDocument]):
        """Run the indexing process."""
        for dataset_document in dataset_documents:
            try:
                # get dataset
                dataset = Dataset.query.filter_by(
                    id=dataset_document.dataset_id
                ).first()

                if not dataset:
                    raise ValueError("no dataset found")

                # get the process rule
                processing_rule = db.session.query(DatasetProcessRule). \
                    filter(DatasetProcessRule.id == dataset_document.dataset_process_rule_id). \
                    first()

                # load file
                text_docs = self._load_data(dataset_document, processing_rule.mode == 'automatic')

                # get embedding model instance
                embedding_model_instance = None
                if dataset.indexing_technique == 'high_quality':
                    if dataset.embedding_model_provider:
                        embedding_model_instance = self.model_manager.get_model_instance(
                            tenant_id=dataset.tenant_id,
                            provider=dataset.embedding_model_provider,
                            model_type=ModelType.TEXT_EMBEDDING,
                            model=dataset.embedding_model
                        )
                    else:
                        embedding_model_instance = self.model_manager.get_default_model_instance(
                            tenant_id=dataset.tenant_id,
                            model_type=ModelType.TEXT_EMBEDDING,
                        )

                # get splitter
                splitter = self._get_splitter(processing_rule, embedding_model_instance)

                # split to documents
                documents = self._step_split(
                    text_docs=text_docs,
                    splitter=splitter,
                    dataset=dataset,
                    dataset_document=dataset_document,
                    processing_rule=processing_rule
                )
                self._build_index(
                    dataset=dataset,
                    dataset_document=dataset_document,
                    documents=documents
                )
            except DocumentIsPausedException:
                raise DocumentIsPausedException('Document paused, document id: {}'.format(dataset_document.id))
            except ProviderTokenNotInitError as e:
                dataset_document.indexing_status = 'error'
                dataset_document.error = str(e.description)
                dataset_document.stopped_at = datetime.datetime.utcnow()
                db.session.commit()
            except ObjectDeletedError:
                logging.warning('Document deleted, document id: {}'.format(dataset_document.id))
            except Exception as e:
                logging.exception("consume document failed")
                dataset_document.indexing_status = 'error'
                dataset_document.error = str(e)
                dataset_document.stopped_at = datetime.datetime.utcnow()
                db.session.commit()
```

首先会加载文件，`loader`的代码见`api/core/data_loader/file_extractor.py` ,将文件内容读取出来，读取之后返回一个`Document`列表，这个`Document`对象是`Langchain`里面的`from langchain.schema import Document`。然后获取`splitter`其中 `splitter`见文件`api/core/spiltter/fixed_text_splitter.py`，Dify 实现了两个`text_splitter`，`EnhanceRecursiveCharacterTextSplitter`和`FixedRecursiveCharacterTextSplitter`，这两个都是继承自`Langchain`中的`RecursiveCharacterTextSplitter`。然后调用`_step_split`方法，将 `Document`然后`processing_rule`分片，然后存储到`DocumentSegment`Model对应的表。最后通过`_build_index`，来向量化，并存储到向量数据库。

