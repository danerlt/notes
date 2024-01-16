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

