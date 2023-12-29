# Docker-compose Env相关


环境变量可以通过Compose文件或CLI处理。两者都有多种方法可以替换或设置您的环境变量。下面进行了概述。

## Compose文件

### 使用`.env`文件进行替换

如果您需要存储多个环境变量，则`.env`文件非常有用。

以下是一个简单的示例：

```console
$ cat .env
TAG=v1.5

$ cat docker-compose.yml
services:
  web:
    image: "webapp:${TAG}"
```

当您运行 `docker compose up` 命令时，Compose 文件中定义的 `web` 服务会使用在 `.env` 文件中设置的镜像 `webapp:v1.5`。您可以通过 [config 命令](https://docs.docker.com/engine/reference/commandline/compose_config/) 来验证这一点，该命令将应用程序配置解析后输出到终端：
```console
$ docker compose config

services:
  web:
    image: 'webapp:v1.5'
```

`.env` 文件应该放置在项目目录的根目录，与您的 `docker-compose.yml` 文件相邻。您可以使用以下方法之一来使用替代路径：
- CLI 中的 [`--file` 选项](https://docs.docker.com/compose/reference/#use--f-to-specify-name-and-path-of-one-or-more-compose-files)
- CLI 中的 [`--env-file` 选项](https://docs.docker.com/compose/environment-variables/set-environment-variables/#substitute-with---env-file)
- Compose 文件中的 [`env_file`](https://docs.docker.com/compose/compose-file/05-services/#env_file) 属性

有关环境文件格式化信息，请参见 [Use an environment file](https://docs.docker.com/compose/environment-variables/env-file/)。

> **重要**
>
> 来自 `.env` 文件的替换是 Docker Compose CLI 的功能。
>
> 在运行 `docker stack deploy` 时，Swarm 不支持此功能。

### 使用 `environment` 属性

您可以在 Compose 文件中使用 [`environment` 属性](https://docs.docker.com/compose/compose-file/05-services/#environment) 为服务的容器设置环境变量。它与 `docker run -e VARIABLE=VALUE ...` 的方式相同。
```yaml
web:
  environment:
    - DEBUG=1
```

您可以选择不设置值，并将环境变量直接传递到服务的容器中。它与 `docker run -e VARIABLE ...` 的工作方式相同：

```yaml
web:
  environment:
    - DEBUG
```

容器中 `DEBUG` 变量的值取自在 Compose 运行时 shell 中相同变量的值。

有关更多信息，请参见 [`environment`](https://docs.docker.com/compose/compose-file/05-services/#environment) 属性。

### 使用 `env_file` 属性

您可以通过 [`env_file`](https://docs.docker.com/compose/compose-file/05-services/#env_file) 选项从外部文件传递多个环境变量到服务的容器中。这与 `docker run --env-file=FILE ...` 的工作方式相同：

```yaml
web:
  env_file:
    - web-variables.env
```

如果指定了多个文件，则按顺序进行评估，并且可以覆盖先前文件中设置的值。

> **注意**
> 
>使用此选项后，文件中声明的环境变量不能在Compose文件中单独引用或用于配置Compose。

有关更多信息，请参见[`env_file`属性](https://docs.docker.com/compose/compose-file/05-services/#env_file)。

### 从shell替换

您可以在shell中使用环境变量来填充Compose文件内部的值。 Compose使用运行“docker compose”的shell环境中的变量值。

例如，假设shell包含`POSTGRES_VERSION=9.3`并且您提供以下配置：

```yaml
db:
  image: "postgres:${POSTGRES_VERSION}"
```

当您以此配置运行`docker compose up`时，Compose会查找Shell中的 `POSTGRES_VERSION` 环境变量并进行替换。对于这个例子，在运行该配置之前，Compose将镜像解析为 `postgres:9.3`.

如果未设置环境变量，则Compose将其替换为空字符串。 在上面的示例中，如果未设置 `POSTGRES_VERSION`, 则image选项的值为 `postgres:`.

> **注意**
>
>`postgres:`不是有效的映像引用。 Docker期望没有标记（tag） 的引用（如默认情况下为最新图像），或者带有标记（tag） ，例如： postgres:15.

> **重要**
>
> Shell环境中设置的值优先于`.env` 文件、'environment' 属性和 'env_file' 属性 中设置 的 值 。有关详细信息，请参见[环境变量优先级](https://docs.docker.com/compose/environment-variables/envvars-precedence/)。

## CLI

### 使用 `--env-file` 进行替换

您可以在 [环境文件](https://docs.docker.com/compose/environment-variables/env-file/) 中设置多个环境变量的默认值，然后将该文件作为CLI中的参数传递。

此方法的优点是您可以将文件存储在任何位置并以适当的名称命名，例如 `.env.ci`, `.env.dev`, `.env.prod`. 此文件路径相对于执行Docker Compose命令时所在的当前工作目录。使用 `-- env-file` 选项来传递文件路径：

```console
$ docker compose --env-file ./config/.env.dev up
```

下面示例中有两个环境文件：`. env`和`. env.dev`。都为“TAG”设置了不同的值。

```console
$ cat .env
TAG=v1.5

$ cat ./config/.env.dev
TAG=v1.6


$ cat docker-compose.yml
services:
  web:
    image: "webapp:${TAG}"
```

如果未在命令行中使用 `-- env-file` ，则默认加载 `. env` 文件：

```console
$ docker compose config 
services:
  web:
    image: 'webapp:v1.5'
```

通过传递 `-- env-file` 参数覆盖默认文件路径：

```console
$ docker compose --env-file ./config/.env.dev config 
services:
  web:
    image: 'webapp:v1.6'
```

当传递无效的文件路径作为 `-- env- file` 参数时，Compose会返回错误：

```console
$ docker compose --env-file ./doesnotexist/.env.dev  config 
ERROR: Couldn't find env file: /home/user/./doesnotexist/.env.dev
```

> **重要**
>
> Shell环境中设置的值优先于在CLI中使用 `-- env-file` 参数时设置的值。有关详细信息，请参见[环境变量优先级](https://docs.docker.com/compose/environment-variables/envvars-precedence/)。

### 使用 `docker compose run --env` 设置环境变量

与 `docker run -- env` 类似，您可以使用 `docker compose run -- env` 或其简写形式 `docker compose run -e` 在一次性容器中设置环境变量：

```console
$ docker compose run -e DEBUG=1 web python console.py
```

您还可以通过不给它一个值来从shell传递一个变量：

```console
$ docker compose run -e DEBUG web python console.py
```

容器中DEBUG变量的值取自Compose运行时所在shell中相同变量的值。


### 样例

假设有一个`cdp`项目，其目录结构如下:

```console
[root@host cdp]# ll -al
total 32
drwxr-xr-x 3 root root 4096 May 19 10:56 .
drwx------ 3 hive livy 4096 May 18 16:51 ..
-rw-r--r-- 1 root root  727 May 19 10:56 cdp-service-swap.conf
-rw-r--r-- 1 root root  879 May 18 17:39 cdp-web.env
-rw-r--r-- 1 root root 1347 May 18 17:39 docker-compose.yaml
-rw-r--r-- 1 root root  914 May 18 17:42 .env
-rw-r--r-- 1 root root 1021 May 18 17:41 common.env
```

其中`common.env`文件内容如下：
```text
# 公共配置
TZ=Asia/Shanghai
# MySQL数据库配置
# MySQL数据库用户名
SPRING_DATASOURCE_USERNAME=root
# MySQL数据库密码
SPRING_DATASOURCE_PASSWORD=123456
```

其中`.env`文件内容如下：
```text
# RSYNC服务配置
# RSYNC服务镜像
RSYNC_IMAGE=harbor_domin/rsync:vx.y.z
# rsyncd的服务地址
RSYNC_DOMAIN_1=127.0.0.1
#RSYNC_DOMAIN_2=127.0.0.1
#RSYNC_DOMAIN_3=127.0.0.1

# ElasticSearch服务配置
ES_IMAGE=harbor_domin/es:vx.y.z
# ES挂载目录
ES_VOLUME=/data/docker/volumes/es
# ES REST服务端口
ES_REST_PORT=9200
# ES内部通信端口
ES_INTERNAL_PORT=9300

# svn服务配置
SVN_IMAGE=harbor_domin/svn:vx.y.z
# svn挂载目录
SVN_VOLUME=/data/docker/volumes/svn
# svn服务端口
SVN_PORT=80

# cdp-es服务配置
# cdp-es服务镜像
CDP_ES_IMAGE=harbor_domin/cdp-es:vx.y.z

# cdp-web服务配置
# cdp-web服务镜像
CDP_WEB_IMAGE=harbor_domin/cdp-web:vx.y.z

# cdp-service服务配置
# cdp-service服务镜像
CDP_SERVICE_IMAGE=harbor_domin/cdp-service:vx.y.z
# cdp-service服务MySQL配置文件
CDP_SERVICE_VOLUME=./cdp-service-swap.conf
```


其中`cdp-web.env`文件内容如下：
```text
SPRING_DATASOURCE_URL=jdbc:mysql://domain.db:3306/db_cdp_web?characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai&zeroDateTimeBehavior=convertToNull&connectTimeout=6000&socketTimeout=6000

```

其中`cdp-service-swap.conf`文件内容如下：
```text
- connectionURL : jdbc:mysql://domain.db:3306/db_cdp_service?serverTimezone=GMT%2B8&useUnicode=true&characterEncoding=UTF-8&zeroDateTimeBehavior=convertToNull&useSSL=false
  driversClass : com.mysql.jdbc.Driver
  username : root
  password : 123456
  minPoolSize : 1
  maxPoolSize : 30
  idleTimeout : 30
  queryTimeout : 20
  insertUpdateTimeout : 10

- connectionURL : jdbc:mysql://domain.db:3306/db_cdp_service?serverTimezone=GMT%2B8&useUnicode=true&characterEncoding=UTF-8&zeroDateTimeBehavior=convertToNull&useSSL=false
  driversClass : com.mysql.jdbc.Driver
  username : root
  password : 123456
  minPoolSize : 1
  maxPoolSize : 30
  idleTimeout : 30
  queryTimeout : 20
  insertUpdateTimeout : 10
  readonly : true
```

其中`docker-compose.yaml`文件内容如下：
```yaml


version: '3.3'
services:
  rsync:
    tty: true
    image: ${RSYNC_IMAGE}
    container_name: rsync
    network_mode: host
    volumes:
      - /opt/soft/cdp_job_jar:/opt/soft/cdp_job_jar
    extra_hosts:
      # rsyncd集群的服务地址
      - domain.rsyncd1:${RSYNC_DOMAIN_1}
#      - domain.rsyncd2:${RSYNC_DOMAIN_2}
 #     - domain.rsyncd3:${RSYNC_DOMAIN_3}
  es:
    image: ${ES_IMAGE}
    container_name: es
    restart: always
    environment:
      TZ: Asia/Shanghai
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - ${ES_VOLUME}:/usr/share/elasticsearch/data
    ports:
      - "${ES_REST_PORT}:9200"
      - "${ES_INTERNAL_PORT}:9300"
  svn:
    image: ${SVN_IMAGE}
    container_name: svn
    restart: always
    environment:
      TZ: Asia/Shanghai
    volumes:
      - ${SVN_VOLUME}:/svn
    ports:
      - ${SVN_PORT}:80
  cdp-es:
    container_name: cdp-es
    image: ${CDP_ES_IMAGE}
    restart: always
    network_mode: "host"
    environment:
      - TZ=Asia/Shanghai
  cdp-web:
    container_name: cdp-web
    image: ${CDP_WEB_IMAGE}
    restart: always
    network_mode: "host"
    env_file:
      - common.env
      - cdp-web.env
  cdp-service:
    container_name: cdp-service
    image: ${CDP_SERVICE_IMAGE}
    restart: always
    network_mode: "host"
    volumes:
      - ${CDP_SERVICE_VOLUME}:/opt/config/swap.config
    environment:
      - TZ=Asia/Shanghai

```

## 参考链接

- [Ways to set environment variables in Compose](https://docs.docker.com/compose/environment-variables/set-environment-variables/)