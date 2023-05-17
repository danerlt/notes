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


## 参考链接

- [Ways to set environment variables in Compose](https://docs.docker.com/compose/environment-variables/set-environment-variables/)