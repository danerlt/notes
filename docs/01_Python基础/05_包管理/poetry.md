# Poetry

## 1. 引言

### 什么是Poetry

Poetry是一个现代的Python包管理和构建工具，它简化了依赖管理、项目打包和发布的过程。

Poetry通过提供一种一致且用户友好的方式来管理Python项目的依赖和虚拟环境，使开发者能够更高效地开发和维护项目。

## 2. Poetry简介

### Poetry的起源和背景

Poetry的开发始于2018年，由法国开发者Sébastien Eustace创建。其诞生的背景是为了解决Python项目管理中的一些常见痛点，例如依赖管理复杂、虚拟环境配置繁琐以及包发布过程不够直观。

#### 背景

1. **依赖管理的挑战**：
    - 传统的Python依赖管理工具（如`pip`和`requirements.txt`）虽然功能强大，但在处理依赖冲突和锁定依赖版本方面存在局限性。
    - 复杂项目中，依赖树的管理和版本兼容性检查可能变得异常复杂，容易引发“依赖地狱”。

2. **虚拟环境的复杂性**：
    - Python虚拟环境工具（如`virtualenv`和`venv`）需要手动管理和配置，增加了开发者的负担。
    - 项目之间的环境隔离和配置一致性难以保证，特别是在团队协作中。

3. **包管理工具的局限**：
    - 其他工具（如`pipenv`）虽然提供了依赖管理和虚拟环境管理的集成功能，但在某些场景下表现不够稳定或缺乏特性。

#### Poetry的诞生

Sébastien Eustace认识到这些问题并决心创建一个新的工具来解决这些痛点。Poetry应运而生，目标是成为一个全能的Python项目管理工具，提供简洁而强大的功能，涵盖依赖管理、虚拟环境管理、项目打包和发布。

Poetry的设计理念包括：

- **一致性和可靠性**：通过锁定文件（`poetry.lock`）确保依赖的一致性，避免依赖冲突。
- **简化操作**：提供直观的命令行接口和自动化的虚拟环境管理，减少开发者的配置和维护工作。
- **现代化和标准化**：使用`pyproject.toml`文件进行配置，遵循PEP 517和PEP 518标准，与其他现代工具兼容。

Poetry的发布迅速获得了Python社区的关注和支持，成为许多开发者首选的项目管理工具。其不断发展的特性和稳定的性能，使其在Python生态系统中占据了重要位置，成为管理Python项目的有力工具。

### Poetry的主要功能和特性

Poetry作为一个现代的Python包管理和构建工具，集成了依赖管理、虚拟环境管理和项目打包发布等多项功能。以下是Poetry的主要功能和特性：

#### 1. 依赖管理

- **自动解析和安装依赖**：Poetry可以自动解析并安装项目的依赖，确保所有依赖项的兼容性。
- **依赖版本锁定**：通过生成`poetry.lock`文件，锁定依赖项的确切版本，确保项目在不同环境下具有一致的依赖版本。
- **开发依赖**：区分开发依赖和生产依赖，使开发环境与生产环境的依赖配置更加清晰。
- **添加和移除依赖**：使用简单的命令添加和移除依赖项，如`poetry add`和`poetry remove`。

#### 2. 项目打包和发布

- **构建项目**：使用`poetry build`命令生成项目的分发包，支持多种打包格式，如`wheel`和`sdist`。
- **发布项目**：通过`poetry publish`命令，将项目发布到PyPI或其他包管理平台，简化发布流程。
- **版本管理**：使用`poetry version`命令轻松更新项目的版本号，支持语义化版本控制（SemVer）。

#### 3. 虚拟环境管理

- **自动创建和管理虚拟环境**：Poetry可以自动创建和管理项目的虚拟环境，无需手动配置。
- **激活虚拟环境**：使用`poetry shell`命令进入项目的虚拟环境，简化虚拟环境的使用。
- **在虚拟环境中运行命令**：通过`poetry run`命令在虚拟环境中运行指定命令，确保依赖正确加载。

#### 4. 配置文件管理

- **`pyproject.toml`文件**：使用标准的`pyproject.toml`文件配置项目，包含项目元数据、依赖项、脚本和插件等配置信息。
- **直观的配置格式**：`pyproject.toml`文件采用简单明了的TOML格式，便于手动编辑和管理。

#### 5. 命令行工具

- **简洁的命令行接口**：Poetry提供了直观且功能强大的命令行工具，涵盖项目创建、依赖管理、虚拟环境管理和项目发布等常见任务。
- **丰富的命令选项**：每个命令都提供了丰富的选项，允许用户根据需求自定义操作。

#### 6. 依赖解析和兼容性检查

- **智能依赖解析**：Poetry使用先进的依赖解析算法，确保所有依赖项之间的兼容性，避免“依赖地狱”。
- **冲突检测和解决**：自动检测和解决依赖冲突，提示用户可能的解决方案。

#### 7. 与其他工具的集成

- **与CI/CD工具集成**：支持与常见的CI/CD工具（如GitHub Actions和GitLab CI）集成，简化自动化部署流程。
- **与IDE集成**：兼容主流的集成开发环境（IDE），如PyCharm和VSCode，提供更好的开发体验。

## 3. 安装Poetry

### 系统要求

Poetry需要Python 3.7或更高版本。确保你的系统上已经安装了合适版本的Python。

### 安装Poetry的步骤

使用安装脚本

这是推荐的安装方法，它会下载并安装Poetry最新版本。

```bash
# linux 
# 可以通过 POETRY_HOME指定安装目录
curl -sSL https://install.python-poetry.org |  python3 -
# 可以通过 POETRY_HOME指定安装目录
curl -sSL https://install.python-poetry.org | POETRY_HOME=/opt/poetry python3 -
# windows powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

默认情况下，Poetry 安装在在用户特定的目录中：

`~/Library/Application Support/pypoetry` 在 MacOS上。
`~/.local/share/pypoetry` 在 Linux上。
`%APPDATA%\pypoetry` 在Window上。

如果你需要在其他位置安装Poetry，你可以通过以下命令安装：

添加 Poetry 到环境变量中：

`~/Library/Application Support/pypoetry/venv/bin/poetry` on MacOS.
`~/.local/share/pypoetry/venv/bin/poetry` on Linux/Unix.
`C:\Users\username\AppData\Roaming\pypoetry\venv\Scripts\` on Windows.

查看 Poetry 版本

```bash
poetry --version
```

## 4. 创建和初始化项目

### 使用`poetry new`创建新项目

```bash
poetry new poetry_demo
```

会自动创建一个`poetry_demo`的项目，结构如下：

```text
poetry-demo
├── pyproject.toml
├── README.md
├── poetry_demo
│   └── __init__.py
└── tests
    └── __init__.py
```

`pyproject.toml` 文件在此至关重要，它将统筹管理您的项目及其依赖项。目前，其内容大致如下：

```text
[tool.poetry]
name = "poetry-demo"
version = "0.1.0"
description = ""
authors = ["author <author@example.com>"]
readme = "README.md"
packages = [{include = "poetry_demo"}]
package-model = false

[tool.poetry.dependencies]
python = "^3.11"


[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

Poetry 假定您的包包含一个与  `tool.poetry.name `项目根目录中同名的包。如果不是这种情况，请填充 `tool.poetry.packages`
以指定包及其位置。

与其他软件包不同，Poetry 不会自动为您安装 python 解释器。如果要在包中运行 Python 文件（如脚本或应用程序），则必须自带 Python
解释器才能运行它们。

例如，在此 pyproject.toml 文件中：

```text
[tool.poetry.dependencies]
python = "^3.11"
```

表示 Python 版本必须大于 3.11。

poetry 可以以两种不同的模式运行。默认模式是打包模式，如果要将项目打包到 sdist 或 wheel
中，并可能将其发布到包索引中，则这是正确的模式。在此模式下，打包所需的某些元数据（如 name 和 version ）是必需的。此外，项目本身将在运行
poetry install 时以可编辑模式安装。

如果只想将 Poetry 用于依赖管理，而不用于打包，则可以使用非打包模式：

```text
[tool.poetry]
package-mode = false
```

在此模式下，元数据（如 name 和 version ）是可选的。因此，无法构建发行版或将项目发布到包索引。此外，在运行 `poetry install`
时，Poetry 不会尝试安装项目本身，而只是安装它的依赖项（与 poetry install --no-root 相同）。

### 使用`poetry init`初始化现有项目

要使用 `poetry init` 初始化一个现有项目，请按照以下步骤进行：

1. **打开终端**：确保你在项目的根目录下。
2. **运行 `poetry init` 命令**：
    ```bash
    poetry init
    ```

3. **填写项目信息**：`poetry init` 会引导你通过一系列提示来设置项目的基本信息，比如项目名称、版本、描述、作者、许可等。你可以按提示填写，或者直接按
   Enter 使用默认值或跳过某些设置。

4. **添加依赖**：在提示添加依赖时，可以输入项目所需的包的名称和版本。如果你不确定，可以稍后手动编辑 `pyproject.toml`
   文件或使用 `poetry add` 命令添加依赖。

5. **完成**：完成所有提示后，`poetry` 会生成一个 `pyproject.toml` 文件，其中包含你的项目配置和依赖信息。

## 5. 虚拟环境管理

默认情况下，poetry 会在全局缓存目录(`C:\Users\username\AppData\Local\pypoetry\Cache\virtualenvs`)中创建虚拟环境。你可以通过配置
poetry 来改变这一行为，使虚拟环境在项目目录中创建。为此，你需要运行：

```bash
# 修改缓存目录为指定目录
poetry config cache-dir "D:\Program Files\poetry\"

# poetry 设置本地pypi源 设置清华大学源：
poetry config repositories.pypi "https://pypi.tuna.tsinghua.edu.cn/simple"

# 在项目中创建虚拟环境
poetry config virtualenvs.in-project true
```

```bash
# 查看poetry 配置
poetry config --list
```

结果如下

```text
cache-dir = "D:\\Program Files\\poetry"
experimental.system-git-client = false
installer.max-workers = null
installer.modern-installation = true
installer.no-binary = null
installer.parallel = true
keyring.enabled = true
repositories.pypi.url = "https://pypi.tuna.tsinghua.edu.cn/simple"
solver.lazy-wheel = true
virtualenvs.create = true
virtualenvs.in-project = true
virtualenvs.options.always-copy = false
virtualenvs.options.no-pip = false
virtualenvs.options.no-setuptools = false
virtualenvs.options.system-site-packages = false
virtualenvs.path = "{cache-dir}\\virtualenvs"  # D:\Program Files\poetry\virtualenvs
virtualenvs.prefer-active-python = false
virtualenvs.prompt = "{project_name}-py{python_version}"
warnings.export = true
```

其中 `virtualenvs.create = true` 若改为 `false`，则 poetry 在检查不到虚拟环境不自动创建虚拟环境，但是建议不要改动。

用指令`poetry env use python`创建虚拟环境，使用当前命令行下激活的 python。

解释器创建虚拟环境。虚拟环境的命名模式为 `项目名-随机数-python版本`

另外使用`poetry install`和`poetry add`会自动创建虚拟环境。

使用`poetry shell`激活虚拟环境。

`poetry shell` 指令会检查当前目录或上层目录是否存在 `pyproject，toml` 来确定需要启动的虚拟环境，所以如果不移动到项目的目录下，则会出现错误。

退出虚拟环境就更简单了，只要输入 `exit` 就可以了。

```bash
poetry shell
```

使用`poetry run`在虚拟环境中运行命令

```bash
poetry run python main.py 
```

## 5. 管理依赖项

### 添加依赖项

如果要向项目添加依赖项，可以在 `tool.poetry.dependencies` 中指定它们。

```text
[tool.poetry.dependencies]
pendulum = "^2.1"

```

它需要包名称和版本约束的映射。

版本约束如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/20240614163549.png)

此外，还可以使用 `poetry add` 命令，而不是手动修改 `pyproject.toml` 文件。

```
$ poetry add flask
Using version ^2.3.2 for flask

Updating dependencies
Resolving dependencies...

Writing lock file

Package operations: 8 installs, 0 updates, 0 removals

  • Installing colorama (0.4.6)
  • Installing markupsafe (2.1.3)
  • Installing blinker (1.6.2)
  • Installing click (8.1.6)
  • Installing itsdangerous (2.1.2)
  • Installing jinja2 (3.1.2)
  • Installing werkzeug (2.3.6)
```

相较于 `pip install`，我们试试安装 `flask` 看看会有什么样的变化。可以看到 poetry 会将所有的信息全部列出来，并且清楚的告知了新增了那些第三方模块。

此时项目中的 pyproject.toml 也发生了变化

```text
[tool.poetry.dependencies]
python = "^3.11"
flask = "^2.3.2"  # 新增部分
```

它会自动找到合适的版本约束，并安装包和子依赖。这里要说明，安装 flask ，则 `pyproject.toml` 只会新增 flask = "^2.3.2"
这个字段的第三方模块，其余依赖不会出现在 toml 文件中。

这里是一个非常大的优点，以便区分那些是用户安装的第三方模块，那些是第三方模块一并安装的依赖。

### 新增模块至 dev-dependencies

有些模块，比如 `pytest` 、 `black` 等等，只会在开发环境中使用，产品的部署环境并不需要。

Poetry 允许你区分这两者，将上述的模块安装至 `dev-dependencies` 区块，方便让你轻松建立一份「不包含」 `dev-dependencies`
开发模块的安装清单。

在此以 Black 为例，安装方式如下：

```bash
poetry add black --group dev
```

结果的区别显示在 `pyproject.toml` 里：

```text
    [tool.poetry.dependencies]
    python = "^3.10"
    flask = "^2.3.2"
    
    
    [tool.poetry.group.dev.dependencies]
    black = "^23.7.0"

```

可以看到 `black` 被列在不同区块： `tool.poetry.dev-dependencies` 。

**强烈建议善用 dev-dependencies**

善用 `--group dev` 参数，明确区分开发环境，我认为非常必要。

首先，这些模块常常属于「检测型」工具，相关的依赖模块着实不少！比如 `flake8` ，它依赖了 `pycodestyle` 、 `pyflakes` 、 `mccabe`
等等，还有 `black` 、 `pre-commit` ，依赖模块数量也都很可观。

### 移除依赖项

使用`poetry remove` 移除依赖项

```bash
poetry remove flask
```

使用 `poetry remove` 指令。和 `poetry add` 一样，可以加上 `-D` 参数来移除置于开发区的模块。

而移除模块时的依赖解析能力，正是 Poetry 远优于 pip 的主要环节，因为 pip 没有！也是使用 Poetry 的关键理由——为了顺利移除模块与依赖。

pip 的 `pip uninstall` 只会移除你所指定的模块，而不会连同依赖模块一起移除。

这是基于安全考量，因为 pip 没有依赖解析功能。如果贸然移除所有安装时一并安装的依赖模块，可能会造成巨大灾难，让别的模块失去效用。

所以，使用 pip 时，我们鲜少会去移除已经不再使用的模块。毕竟依赖关系错综复杂，移除模块可能造成许多副作用，实在是太麻烦了。

### 更新依赖项

这个就很简单了，使用 `poetry update` 指令即可：

```bash
poetry update
```

上面指令会更新全部可能可以更新的模块，也可以仅指定特定模块，比如：

```bash
poetry update requests toml
```

### 版本约束和依赖解析

除了更新 `pyproject.toml` ，此时项目中还会新增一个文件，名为 `poetry.lock` ，它实际上就相当于 `pip` 的 `requirements.txt`
，详细记录了所有安装的模块与版本。

当使用 `poetry add` 指令时，`poetry` 会自动依序帮你做完这三件事：

1. 更新 `pyproject.toml`。
2. 依照 `pyproject.toml` 的内容，更新 `poetry.lock` 。
3. 依照 `poetry.lock` 的内容，更新虚拟环境。

由此可见， `poetry.lock` 的内容是取决于 `pyproject.toml`
，但两者并不会自己连动，一定要基于特定指令才会进行同步与更新， `poetry add` 就是一个典型案例。

此时项目目录结构如下：

```text
    poetry-demo
    ├── poetry.lock
    └── pyproject.toml
    
    0 directories, 2 files
```

### 更新 poetry.lock

**当你自行修改了 `pyproject.toml`
内容，比如变更特定模块的版本（这是有可能的，尤其在手动处理版本冲突的时候），此时 `poetry.lock` 的内容与 `pyproject.toml`
出现了脱钩，必须让它依照新的 `pyproject.toml` 内容更新、同步，使用指令：**

```bash
poetry lock
```

如此一来，才能确保手动修改的内容，也更新到 `poetry.lock` 中，毕竟虚拟环境如果要重新建立，是基于 `poetry.lock`
的内容来安装模块，而非 `pyproject.toml` 。

还是那句话：

> poetry.lock 相当于 Poetry 的 requirements.txt 。

但要特别注意的是， `poetry lock` 指令，仅会更新 `poetry.lock` ，不会同时安装模块至虚拟环境

**因此，在执行完 `poetry lock` 指令后，必须再使用 `poetry install` 来安装模块。否则就会出现 `poetry.lock`
和虚拟环境不一致的状况。**

更多 `poetry lock` 细节可参考官方文档，其中特别值得注意的是 `--no-update` 参数。

### 查看所有依赖项

类似 `pip list` ，这里要使用 `poetry show`

```bash
poetry show
```

特别提醒的是，这里的清单内容并不是来自于虚拟环境，这点和 pip 不同，而是来自于 `poetry.lock` 的内容。

你可能会想，来自于 `poetry.lock` 或虚拟环境，有差吗？两者不是应该要一致？

没错，理论上是，但也有不一致的时候，比如你使用了 `pip install` 指令安装模块，就不会记载在 `poetry.lock` 中，那 `poetry show`
自然也不会显示。

**树状显示模块依赖层级**

```bash
poetry show --tree
```

让主要模块与其依赖模块的关系与层次，一目了然。

而且很贴心的是，它也可以只显示指定模块的依赖层级，以 `celery` 为例：

```bash
poetry show celery --tree
```

## 7. 项目构建和发布

- 构建项目
    - 使用`poetry build`生成分发包
- 发布项目
    - 使用`poetry publish`发布到PyPI或其他仓库
- 版本管理
    - 使用`poetry version`更新版本号
    - 遵循语义化版本控制（SemVer）

## 8. 项目配置文件（pyproject.toml）

- 配置文件简介
- `tool.poetry`部分详解
    - 项目元数据（名称、版本、作者等）
    - 依赖项和开发依赖项
- 其他配置部分（如脚本、插件等）

## 9. 与其他工具的集成

### Dockerfile中使用

下面的代码参考自[MaxKb项目](https://github.com/1Panel-dev/MaxKB/blob/main/installer/Dockerfile)

```
RUN python3 -m venv /opt/py3 && \
    pip install poetry --break-system-packages && \
    poetry config virtualenvs.create false && \
    . /opt/py3/bin/activate && \
    if [ "$(uname -m)" = "x86_64" ]; then sed -i 's/^torch.*/torch = {version = "^2.2.1+cpu", source = "pytorch"}/g' pyproject.toml; fi && \
    poetry install

ENV LANG=en_US.UTF-8 \
    PATH=/opt/py3/bin:$PATH    
```

### 输出 Poetry 虚拟环境的 requirements.txt

理论上，全面改用 Poetry 后，项目中是不需要存在 `requirements.txt` ，因为它的角色已经完全被 `poetry.lock` 所取代。

但事实是，你可能还是需要它，甚至希望它随着 `poetry.lock` 的内容更新！至少对我而言就是如此，我在 Docker 部署环境中并不使用
Poetry，所以我需要一份完全等价于 `poetry.lock` 的 `requirements.txt` ，用于 Docker 部署。

你可能想说，那我就在 Poetry 的虚拟环境下，使用以往熟悉的指令 `pip freeze > requirements.txt`
来产生一份就可以了吧？我本来也是这么想，但实际的产出却是如此：（提醒：目前 poetry-demo 专案中仅剩下 Black 和它的依赖模块）

```text
black @ file:///Users/username/Library/Caches/pypoetry/artifacts/11/4c/fc/cd6d885e9f5be135b161e365b11312cff5920d7574c8446833d7a9b1a3/black-22.3.0-cp38-cp38-macosx_10_9_x86_64.whl
click @ file:///Users/username/Library/Caches/pypoetry/artifacts/f0/23/09/b13d61d1fa8b3cd7c26f67505638d55002e7105849de4c4432c28e1c0d/click-8.1.2-py3-none-any.whl
mypy-extensions @ file:///Users/username/Library/Caches/pypoetry/artifacts/b6/a0/b0/a5dc9acd6fd12aba308634f21bb7cf0571448f20848797d7ecb327aa12/mypy_extensions-0.4.3-py2.py3-none-any.whl
...
```

这呈现好像不是我们以前熟悉的那样：

```text
black==22.3.0
click==8.1.2
...
```

没错，只要是使用 `poetry add` 安装的模块，在 `pip freeze` 就会变成这样。此时想输出类似 `requirements.txt`
的格式，需要使用 `poetry export` 。

```bash
poetry export -f requirements.txt -o requirements.txt --without-hashes
```

### 与CI/CD工具的集成

#### 使用GitHub Actions

### 与IDE的集成

#### PyCharm

#### VSCode

## 10. 常见问题和解决方案

- 依赖冲突
- 锁定文件更新问题
- 虚拟环境问题
- 其他常见错误和调试技巧

## 参考链接

- [poetry 官方文档](https://python-poetry.org/docs/)
- [poetry Github](https://github.com/python-poetry/poetry)
- [poetry 入门完全指南](https://notes.zhengxinonly.com/environment/use-poetry.html)