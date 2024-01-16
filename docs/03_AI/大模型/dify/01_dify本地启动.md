# dify本地启动

首先在服务器上面和本地克隆 `dify` 项目，然后切换到对应的分支，例如`0.4.7`分支，命令如下：

```bash
# 克隆项目
git clone https://github.com/langgenius/dify.git
# 切换到dify目录
cd dify 
# 拉取所有分支和tag
git fetch --all
# 切换到指定分支 -b 后面第一个参数是本地分支名，第二个参数是项目tag名
git checkout -b v0.4.7 0.4.7
```

## 在服务器上启动中间件

在 `docker`目录下有如下文件：

```text
docker-compose.middleware.yaml  # 服务默认的中间件配置文件
docker-compose.yaml # dify项目的docker-compose配置文件，包括中间件和前端服务和后端服务
milvus-standalone-docker-compose.yml # milvus向量库单机版的配置文件

```

默认情况使用的向量数据库为 `weaviate`，如果要使用 `milvus` 向量库的话需要修改 `milvus-standalone-docker-compose.yml` 文件。

```bash
cd dify
# 这个是服务默认的中间件配置文件 
vim docker/docker-compose.middleware.yaml
# vim milvus-standalone-docker-compose.yml 
```

修改`docker-compse` 文件, 将其中的 `ports`字段修改自己的端口，例如修改为 `18080:8080`，表示将容器的 `8080`
端口映射到服务器的 `18080` 端口，我们在本地使用就使用`18080`端口。

然后执行命令启动服务:

```bash、
# 启动服务
docker-compose -f docker-compose.middleware.yaml up -d
# 查看服务
docker-compose -f docker-compose.middleware.yaml ps -a
```

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-01-16-tliNYC.png)

## 在本地启动Web后端服务

执行完上面的命令之后，我们就可以在本地启动 Web 后端服务了。

后端服务分两个，一个是 `web api`接口，一个是 `celery 任务`。项目相关的代码都在 `api` 目录中。

首先需要在本地创建一个 `conda` 环境，然后安装对应的依赖。

```bash
# 进入dify目录
cd dify
# 创建一个名叫dify的虚拟环境，指定Python版本为3.10
conda create -n dify python=3.10
# 切换到dify环境
conda activate dify
# 切换到api目录
cd api
# 安装依赖
pip install -r requirements.txt
```

然后需要设置中间件相关的配置，在 `api` 目录下有一个 `.env.example`
文件，里面包含一些环境变量的配置，复制这个文件，重命名为 `.env`, 将其中的配置设置成自己需要的配置，其中中间件的 `host`
为服务器IP, `port` 为上一步 `docker-compose` 文件中映射出来的端口。

在第一次执行的时候，需要创建数据库，执行命令如下：

```bash
flask db upgrade
```

如果上面的命令报错，例如：

```text
> flask db upgrade
Error: While importing 'app', an ImportError was raised:
```

可以使用下面的命令重新安装依赖，然后执行 `flask db upgrade`

```bash
pip install -r requirements.txt --upgrade --force-reinstall
```

然后执行下面的命令启动 Flask Web API服务，端口默认为`5001`：

```bash
flask run --host 0.0.0.0 --port=5001 --debug
```

执行下面的命令启动 `celery` 服务：

```bash
celery -A app.celery worker -P gevent -c 1 --loglevel INFO -Q dataset,generation,mail
```

## 在本地启动Web前端服务

dify 项目前端项目在 `web` 目录中，运行需要 `Nodejs 18.x` 版本， 这里使用 `nvm` 来安装 `Nodejs`。

`nvm` 用法参考 [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)

```bash
# 切换到web目录
cd dify/web/

# 切换node环境 我的node版本是18.16.0
nvm use 18.16.0
# npm 安装依赖
npm install
# or
yarn install --frozen-lockfile

# 启动前端项目
npm run dev 
```

启动服务后默认地址为 [http://localhost:3000](http://localhost:3000)，

## app.py 分析

### 初始化App

#### create_app

```python
class DifyApp(Flask):
    pass


# -------------
# Configuration
# -------------


config_type = os.getenv('EDITION', default='SELF_HOSTED')  # ce edition first


# ----------------------------
# Application Factory Function
# ----------------------------


def create_app(test_config=None) -> Flask:
    app = DifyApp(__name__)

    if test_config:
        app.config.from_object(test_config)
    else:
        if config_type == "CLOUD":
            app.config.from_object(CloudEditionConfig())
        else:
            app.config.from_object(Config())

    app.secret_key = app.config['SECRET_KEY']

    logging.basicConfig(level=app.config.get('LOG_LEVEL', 'INFO'))

    initialize_extensions(app)
    register_blueprints(app)
    register_commands(app)

    return app

```

这段代码定义了一个名为 `DifyApp` 的 `Flask` 子类，用于创建一个 `DifyApp` 应用。`create_app` 函数是一个应用工厂函数，用于创建
Flask 应用实例。该函数根据不同的配置类型设置应用配置，并初始化应用密钥、日志和扩展。最后，该函数返回创建的 Flask 应用实例。

#### initialize_extensions

其中 `initialize_extensions`函数如下，这个函数用于初始化 `app` 的各种扩展，将 `app` 传递给每个扩展，以便将扩展绑定到 `app`。

```python 
def initialize_extensions(app):
    # Since the application instance is now created, pass it to each Flask
    # extension instance to bind it to the Flask application instance (app)
    ext_code_based_extension.init()
    ext_database.init_app(app)
    ext_migrate.init(app, db)
    ext_redis.init_app(app)
    ext_storage.init_app(app)
    ext_celery.init_app(app)
    ext_login.init_app(app)
    ext_mail.init_app(app)
    ext_hosting_provider.init_app(app)
    ext_sentry.init_app(app)
```

#### `register_blueprints`

其中 `register_blueprints`定义如下：

```python
def register_blueprints(app):
    from controllers.console import bp as console_app_bp
    from controllers.files import bp as files_bp
    from controllers.service_api import bp as service_api_bp
    from controllers.web import bp as web_bp

    CORS(service_api_bp,
         allow_headers=['Content-Type', 'Authorization', 'X-App-Code'],
         methods=['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH']
         )
    app.register_blueprint(service_api_bp)

    CORS(web_bp,
         resources={
             r"/*": {"origins": app.config['WEB_API_CORS_ALLOW_ORIGINS']}},
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-App-Code'],
         methods=['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
         expose_headers=['X-Version', 'X-Env']
         )

    app.register_blueprint(web_bp)

    CORS(console_app_bp,
         resources={
             r"/*": {"origins": app.config['CONSOLE_CORS_ALLOW_ORIGINS']}},
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
         expose_headers=['X-Version', 'X-Env']
         )

    app.register_blueprint(console_app_bp)

    CORS(files_bp,
         allow_headers=['Content-Type'],
         methods=['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH']
         )
    app.register_blueprint(files_bp)
```

其主要功能是注册多个蓝图到Flask应用实例app中，并为这些蓝图分别配置跨域资源共享（CORS）规则。

首先，它从四个不同的模块导入了四个Blueprint对象：

1. console_app_bp：来自controllers.console模块
1. files_bp：来自controllers.files模块
1. service_api_bp：来自controllers.service_api模块
1. web_bp：来自controllers.web模块

针对每个导入的蓝图，函数对其进行CORS配置，然后在使用`app.register_blueprint()`方法将蓝图注册到 Flask
应用中，这样对应的URL路由就能通过Web服务访问到相应蓝图所处理的视图函数及资源。

## 初始化

第一次使用需要打开 [http://localhost:3000/install](http://localhost:3000/install) 进行用户邮箱，用户名，密码设置。

在 [http://localhost:3000/install](http://localhost:3000/install) 页面输入完用户邮箱，用户名，密码等之后会`POST`
调用 `http://localhost:5001/console/api/setup` 接口。

`setup` 接口定义在 `api/controllers/console/setup.py`中。

```python
api.add_resource(SetupApi, '/setup')
```

`SetupApi`类定义如下：

```python
class SetupApi(Resource):

    def get(self):
        if current_app.config['EDITION'] == 'SELF_HOSTED':
            setup_status = get_setup_status()
            if setup_status:
                return {
                    'step': 'finished',
                    'setup_at': setup_status.setup_at.isoformat()
                }
            return {'step': 'not_start'}
        return {'step': 'finished'}

    @only_edition_self_hosted
    def post(self):
        # is set up
        if get_setup_status():
            raise AlreadySetupError()

        # is tenant created
        tenant_count = TenantService.get_tenant_count()
        if tenant_count > 0:
            raise AlreadySetupError()

        parser = reqparse.RequestParser()
        parser.add_argument('email', type=email,
                            required=True, location='json')
        parser.add_argument('name', type=str_len(
            30), required=True, location='json')
        parser.add_argument('password', type=valid_password,
                            required=True, location='json')
        args = parser.parse_args()

        # Register
        account = RegisterService.register(
            email=args['email'],
            name=args['name'],
            password=args['password']
        )

        setup()
        AccountService.update_last_login(account, request)

        return {'result': 'success'}, 201
```

`only_edition_self_hosted`装饰器定义如下：
```python
def only_edition_self_hosted(view):
    @wraps(view)
    def decorated(*args, **kwargs):
        if current_app.config['EDITION'] != 'SELF_HOSTED':
            abort(404)

        return view(*args, **kwargs)

    return decorated
```

这个函数是一个装饰器函数，用于检查当前应用的配置是否为'SELF_HOSTED'，如果不是，则返回404错误。如果是，则调用传入的view函数并返回结果。

`post`方法首先检查是否已经设置完成，如果已经设置，则抛出一个自定义的异常。然后检查是否存在租户，如果存在，则也抛出相同的异常。

接下来，该函数使用请求解析器来解析接收到的 `POST` 请求中的数据，并进行相应的验证。

然后调用 `RegisterService` 类中的 `register` 方法注册账户，将解析到的`email`、`name`和`password`作为参数传递给`register`方法。随后调用`setup`函数进行一些设置操作，并使用`AccountService`类中的`update_last_login`方法更新账户的最后登录时间。

最后，函数返回一个HTTP响应，状态码为201，同时返回一个包含字符串"success"的字典。

其中`setup`函数定义如下：
```python
def setup():
    dify_setup = DifySetup(
        version=current_app.config['CURRENT_VERSION']
    )
    db.session.add(dify_setup)
```
该函数会向`DifySetup`表添加一条记录。
