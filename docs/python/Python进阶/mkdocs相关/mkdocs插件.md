# MkDocs 插件



## 安装插件
在使用插件之前，必须先将其安装到系统中。如果您正在使用 `MkDocs` 自带的插件，则在安装MkDocs时已经完成了安装。
但是，要安装第三方插件，您需要确定适当的软件包名称，并使用 `pip` 进行安装：
```bash
pip install mkdocs-foo-plugin
```

成功安装插件后，它就可以立即使用了。只需在配置文件中[启用](https://www.mkdocs.org/dev-guide/plugins/#using-plugins)它即可。

[Best-of-MkDocs](https://github.com/mkdocs/best-of-mkdocs)页面列出了许多可以安装和使用的插件。

## 使用插件

要使用插件，您需要在配置文件中启用它。这是通过在 `mkdocs.yaml` 中的 `plugins` 部分中添加插件名称来完成的，此处列出的插件必须已经安装。

示例如下
```yaml
plugins:
  - search
  - mkdocs-foo-plugin
```

一些插件可能提供自己的配置选项。如果您想设置任何配置选项，那么可以嵌套一个键/值映射（option_name: option value），其中包含给定插件支持的任何选项。

请注意，必须在插件名称后面加上冒号（:），然后在新行上缩进并用冒号分隔选项名称和值。如果您想为单个插件定义多个选项，则每个选项都必须在单独的行上定义。

示例如下
```yaml
plugins:
  - search
  - mkdocs-foo-plugin:
      option_name: option value
      other_option: other value
```
有关特定插件可用的配置选项的信息，请参阅该插件的文档。

有关默认插件及其如何被覆盖的列表，请参阅配置文档。


## 开发插件

与MkDocs一样，插件必须用Python编写。通常期望每个插件作为一个单独的Python模块分发，尽管在同一模块中定义多个插件也是可能的。至少，MkDocs插件必须包括[BasePlugin]子类和指向它的[entry point]。

### BasePlugin

`mkdocs.plugins.BasePlugin` 的子类应该定义插件的行为。该类通常由在构建过程中执行特定事件以及针对插件的配置方案组成。

所有 `BasePlugin` 子类都包含以下属性：

#### 配置模式(config_scheme) 
一个配置验证实例的元组。每个条目必须由两个项目组成，其中第一个项目是配置选项的字符串名称，第二个项目是 `mkdocs.config.config_options.BaseConfigOption` 或其任何子类的实例。

例如，以下 `config_scheme` 定义了三个配置选项：接受字符串类型值的 `foo`、接受整数类型值的 `bar` 和接受布尔类型值的 `baz`。

```python
class MyPlugin(mkdocs.plugins.BasePlugin):
    config_scheme = (
        ('foo', mkdocs.config.config_options.Type(str, default='a default value')),
        ('bar', mkdocs.config.config_options.Type(int, default=0)),
        ('baz', mkdocs.config.config_options.Type(bool, default=True))
    )
```


> 新功能：**版本1.4中的新增内容。**
>
> ##### 通过 `Config`的子类来指定配置模式
>
> 为了获得类型安全的好处，如果你只针对MkDocs 1.4+进行目标设置，请将配置模式定义为一个类：
>
> ```python
> class MyPluginConfig(mkdocs.config.base.Config):
>     foo = mkdocs.config.config_options.Type(str, default='a default value')
>     bar = mkdocs.config.config_options.Type(int, default=0)
>     baz = mkdocs.config.config_options.Type(bool, default=True)
>
> class MyPlugin(mkdocs.plugins.BasePlugin[MyPluginConfig]):
>     ...
> ```


##### 配置定义示例

>! EXAMPLE:
>
> ```python
> from mkdocs.config import base, config_options as c
>
> class _ValidationOptions(base.Config):
>     enable = c.Type(bool, default=True)
>     verbose = c.Type(bool, default=False)
>     skip_checks = c.ListOfItems(c.Choice(('foo', 'bar', 'baz')), default=[])
>
> class MyPluginConfig(base.Config):
>     definition_file = c.File(exists=True)  # required
>     checksum_file = c.Optional(c.File(exists=True))  # can be None but must exist if specified
>     validation = c.SubConfig(_ValidationOptions)
> ```
>
> 从用户的角度来看，SubConfig类似于Type（dict），只是它还保留了完整的验证能力：您定义所有有效的键以及每个值应该遵循什么。
>
> 而ListOfItems类似于Type（list），但同样，我们定义了每个值必须遵循的约束。
>
> 这接受以下配置：
>
> ```yaml
> my_plugin:
>   definition_file: configs/test.ini  # relative to mkdocs.yml
>   validation:
>     enable: !ENV [CI, false]
>     verbose: true
>     skip_checks:
>       - foo
>       - baz
> ```
<!-- -->
>? EXAMPLE:
>
> ```python
> import numbers
> from mkdocs.config import base, config_options as c
>
> class _Rectangle(base.Config):
>     width = c.Type(numbers.Real)  # required
>     height = c.Type(numbers.Real)  # required
>
> class MyPluginConfig(base.Config):
>     add_rectangles = c.ListOfItems(c.SubConfig(_Rectangle))  # required
> ```
>
> 在这个例子中，我们定义了一个复杂项列表，通过将具体的 `SubConfig` 传递给 `ListOfItems` 来实现。
>
> 这接受以下配置：
>
> ```yaml
> my_plugin:
>   add_rectangles:
>     - width: 5
>       height: 7
>     - width: 12
>       height: 2
> ```


当用户的配置加载时，将使用上述方案验证配置并填充未由用户提供的任何设置的默认值。验证类可以是`mkdocs.config.config_options`中提供的任何类或在插件中定义的第三方子类。

由用户提供但未通过验证或未在“config_scheme”中定义的任何设置都会引发一个 `mkdocs.config.base.ValidationError`。

#### 配置(config)

一个插件配置选项的字典，由`load_config`方法在配置验证完成后填充。使用此属性访问用户提供的选项。

```python
def on_pre_build(self, config, **kwargs):
    if self.config['baz']:
        # implement "baz" functionality here...
```

> 新功能：**1.4 版本中的新增内容。**
>
> ##### 基于属性的安全访问
>
> 为了获得类型安全的好处，如果你只针对MkDocs 1.4+，请将选项作为属性访问：
>
> ```python
> def on_pre_build(self, config, **kwargs):
>     if self.config.baz:
>         print(self.config.bar ** 2)  # OK, `int ** 2` is valid.
> ```



所有`BasePlugin`子类都包含以下方法：

#### load_config(options)

从选项字典中加载配置。返回一个元组`(errors，warnings)`。此方法由MkDocs在配置验证期间调用，插件不需要调用它。


#### on_<event_name>()

可选方法，用于定义特定事件的行为。插件应在这些方法中定义其行为。将`<event_name>`替换为实际事件名称。例如，`pre_build`事件将在`on_pre_build`方法中定义。

大多数事件接受一个位置参数和各种关键字参数。通常期望位置参数会被插件修改（或替换）并返回。如果没有返回任何内容（该方法返回`None`），则使用原始未修改的对象。关键字参数仅提供上下文和/或提供可能用于确定如何修改位置参数的数据。最好接受关键字参数作为 `**kwargs` 。如果将来版本的MkDocs向某个事件提供了其他关键字，则无需更改您的插件。

例如，以下事件将向主题配置添加一个额外的静态模板：

```python
class MyPlugin(BasePlugin):
    def on_config(self, config, **kwargs):
        config['theme'].static_templates.add('my_template.html')
        return config
```

> 新功能：**1.4 版本中的新增内容。**
>
> 为了获得类型安全的好处，如果你只针对MkDocs 1.4+，请将配置选项作为属性访问：
>
> ```python
> def on_config(self, config: MkDocsConfig):
>     config.theme.static_templates.add('my_template.html')
>     return config
> ```

### Events

有三种类型的事件：[全局事件]、[页面事件]和[模板事件]。
There are three kinds of events: [全局事件], [页面事件] and
[模板事件].

查看所有插件事件之间关系的图表

- 事件本身以黄色显示，带有它们的参数。
- 箭头显示每个事件的参数和输出流。有时它们会被省略。
- 这些事件按时间顺序从上到下排列。
- 在从全局事件到每页事件的分割处出现了虚线。
- 点击事件标题以跳转到它们的描述。

![插件事件图](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/plugin-events.svg)


#### 一次性事件(One-time Events)

一次性事件每个 `mkdocs` 调用只运行一次。

The only case where these tangibly differ from global events is for mkdocs serve: global events, unlike these, will run multiple times -- once per build.

##### on_startup

> on_startup事件在mkdocs调用的最开始运行。
>
> MkDocs 1.4中新增功能
> 
> 即使是空的on_startup方法的存在，也将插件迁移到新系统，在该系统中，插件对象在一个mkdocs serve内进行多次构建时保留。
> 请注意，对于初始化变量，仍然首选__init__方法。对于初始化每个构建变量（以及任何疑问情况下），请使用on_config事件。
>
> 参数：
> - command（Literal ['build'、'gh-deploy'、'serve']）-MkDocs被调用的命令，例如“serve”表示mkdocs serve。
> - dirty（bool）-是否传递了--dirtyreload或--dirty标志。

##### on_shutdown

>
> 关闭事件在mkdocs调用的最后一次运行，然后退出。
> 此事件仅与支持mkdocs serve有关，在单个构建中，它无法与on_post_build区分开来。
>
> MkDocs 1.4中新增。
> 
> 即使是空的，存在on_shutdown方法也将插件迁移到新系统，在一个mkdocs serve内保留插件对象跨多个构建。
>
> 请注意，如果可能的话，请仍然首选使用on_post_build方法进行清理，因为它实际触发的机会要高得多。 on_shutdown是“尽力而为”，因为它依赖于检测MkDocs的优雅关闭。

##### on_serve

> serve事件仅在开发过程中使用serve命令时调用。它只运行一次，在第一次构建完成后运行。它传递了Server实例，可以在激活之前进行修改。例如，可以将其他文件或目录添加到“监视”文件列表以进行自动重新加载。

> 参数：
> - server（LiveReloadServer）- livereload.Server实例
> - config（MkDocsConfig）- 全局配置对象
> - builder（Callable）- 一个可调用的函数，会被传递给每个对server.watch的调用。
> 返回值：
> - Optional [LiveReloadServer] - livereload.Server实例

#### 全局事件

在构建过程的开始或结束时，每个构建都会调用一次全局事件。在这些事件中所做的任何更改都将对整个站点产生全局影响。

##### on_config

::: mkdocs.plugins.BasePlugin.on_config
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_pre_build

::: mkdocs.plugins.BasePlugin.on_pre_build
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_files

::: mkdocs.plugins.BasePlugin.on_files
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_nav

::: mkdocs.plugins.BasePlugin.on_nav
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_env

::: mkdocs.plugins.BasePlugin.on_env
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_post_build

::: mkdocs.plugins.BasePlugin.on_post_build
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_build_error

::: mkdocs.plugins.BasePlugin.on_build_error
    options:
        show_root_heading: false
        show_root_toc_entry: false

#### 模板事件

Template events are called once for each non-page template. Each template event
will be called for each template defined in the [extra_templates] config setting
as well as any [static_templates] defined in the theme. All template events are
called after the [env] event and before any [page events].

##### on_pre_template

::: mkdocs.plugins.BasePlugin.on_pre_template
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_template_context

::: mkdocs.plugins.BasePlugin.on_template_context
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_post_template

::: mkdocs.plugins.BasePlugin.on_post_template
    options:
        show_root_heading: false
        show_root_toc_entry: false

#### 页面事件

Page events are called once for each Markdown page included in the site. All
page events are called after the [post_template] event and before the
[post_build] event.

##### on_pre_page

::: mkdocs.plugins.BasePlugin.on_pre_page
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_page_read_source

::: mkdocs.plugins.BasePlugin.on_page_read_source
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_page_markdown

::: mkdocs.plugins.BasePlugin.on_page_markdown
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_page_content

::: mkdocs.plugins.BasePlugin.on_page_content
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_page_context

::: mkdocs.plugins.BasePlugin.on_page_context
    options:
        show_root_heading: false
        show_root_toc_entry: false

##### on_post_page

::: mkdocs.plugins.BasePlugin.on_post_page
    options:
        show_root_heading: false
        show_root_toc_entry: false

### Event Priorities

For each event type, corresponding methods of plugins are called in the order that the plugins appear in the `plugins` [config][].

Since MkDocs 1.4, plugins can choose to set a priority value for their events. Events with higher priority are called first. Events without a chosen priority get a default of 0. Events that have the same priority are ordered as they appear in the config.

#### ::: mkdocs.plugins.event_priority

### Handling Errors

MkDocs defines four error types:

#### ::: mkdocs.exceptions.MkDocsException

#### ::: mkdocs.exceptions.ConfigurationError

#### ::: mkdocs.exceptions.BuildError

#### ::: mkdocs.exceptions.PluginError

Unexpected and uncaught exceptions will interrupt the build process and produce
typical Python tracebacks, which are useful for debugging your code. However,
users generally find tracebacks overwhelming and often miss the helpful error
message. Therefore, MkDocs will catch any of the errors listed above, retrieve
the error message, and exit immediately with only the helpful message displayed
to the user.

Therefore, you might want to catch any exceptions within your plugin and raise a
`PluginError`, passing in your own custom-crafted message, so that the build
process is aborted with a helpful message.

The [on_build_error] event will be triggered for any exception.

For example:

```python
from mkdocs.exceptions import PluginError
from mkdocs.plugins import BasePlugin


class MyPlugin(BasePlugin):
    def on_post_page(self, output, page, config, **kwargs):
        try:
            # some code that could throw a KeyError
            ...
        except KeyError as error:
            raise PluginError(str(error))

    def on_build_error(self, error, **kwargs):
        # some code to clean things up
        ...
```

### Entry Point

Plugins need to be packaged as Python libraries (distributed on PyPI separate
from MkDocs) and each must register as a Plugin via a setuptools `entry_points`.
Add the following to your `setup.py` script:

```python
entry_points={
    'mkdocs.plugins': [
        'pluginname = path.to.some_plugin:SomePluginClass',
    ]
}
```

The `pluginname` would be the name used by users (in the config file) and
`path.to.some_plugin:SomePluginClass` would be the importable plugin itself
(`from path.to.some_plugin import SomePluginClass`) where `SomePluginClass` is a
subclass of [BasePlugin] which defines the plugin behavior. Naturally, multiple
Plugin classes could exist in the same module. Simply define each as a separate
entry point.

```python
entry_points={
    'mkdocs.plugins': [
        'featureA = path.to.my_plugins:PluginA',
        'featureB = path.to.my_plugins:PluginB'
    ]
}
```

Note that registering a plugin does not activate it. The user still needs to
tell MkDocs to use it via the config.

[BasePlugin]:#baseplugin
[config]: ../user-guide/configuration.md#plugins
[entry point]: #entry-point
[env]: #on_env
[events]: #events
[extra_templates]: ../user-guide/configuration.md#extra_templates
[全局事件]: #global-events
[页面事件]: #page-events
[post_build]: #on_post_build
[post_template]: #on_post_template
[static_templates]: ../user-guide/configuration.md#static_templates
[模板事件]: #template-events
[Best-of-MkDocs]: https://github.com/mkdocs/best-of-mkdocs
[on_build_error]: #on_build_error


## 参考链接
- [MkDocs插件](https://www.mkdocs.org/dev-guide/plugins/)
- [MkDocs非官方中文文档](https://hellowac.github.io/mkdocs-docs-zh/user-guide/plugins/), by [zimocode](https://github.com/zimocode)