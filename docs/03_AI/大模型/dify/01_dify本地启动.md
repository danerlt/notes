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
第一次使用需要打开 [http://localhost:3000/install](http://localhost:3000/install) 进行用户邮箱，用户名，密码设置。
