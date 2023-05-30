# MkDocs Awesome Pages 插件

一个简化页面标题和顺序配置的MkDocs插件

awesome-pages插件允许您自定义如何在MkDocs导航中显示页面，而无需在mkdocs.yml中配置完整结构。它使用直接放置在文档相关目录中的小型配置文件来提供详细控制。

> 注意：如果您的mkdocs.yml定义了nav或pages条目，则此插件将不起作用。要使用下面列出的功能，您必须完全删除该条目或向其添加... 条目。


## 安装

> 注意：此软件包需要 Python >=3.7 和 MkDocs 版本 1.0 或更高版本。如果您仍在使用 MkDocs 0.17，请使用此插件的第一版。

使用`pip`安装此软件包：

```bash
pip install mkdocs-awesome-pages-plugin -i https://pypi.tuna.tsinghua.edu.cn/simple
```

然后在`mkdocs.yml`文件中启用它：

```yaml
plugins:
  - search 
  - awesome-pages
```

## 特点(Features)

### 自定义导航(Customize Navigation)

在目录中创建一个名为 `.pages` 的文件，并使用 `nav` 属性自定义该级别上的导航。按照应出现在导航中的顺序列出文件和子目录。

`.pages`文件示例如下：

```yaml
nav:
    - subdirectory
    - page1.md
    - page2.md
```

#### 其他的部分(Rest)

未在列表中提及的页面或部分将不会出现在导航中。但是，您可以包含一个`...`条目来指定所有剩余项目应插入的位置。

```yaml
nav:
    - introduction.md
    - ...
    - summary.md
```

此外，还可以使用glob模式或正则表达式过滤剩余的项目。例如，只匹配以introduction-开头的Markdown文件。

```yaml
nav:
    - ... | introduction-*.md
    - ...
    - summary.md
```
> 注意：该模式是针对剩余项的基本名称（文件夹/文件名）进行检查，而不是它们的整个路径。

有关详细信息，请参阅下面的[Rest过滤器模式](#rest过滤器模式)部分。

#### 标题(Titles)

可以选择为导航条目指定一个标题。

```yaml
nav:
    - ...
    - First page: page1.md
```
> 注意：为包含定义标题的 .pages 文件的目录指定标题没有任何效果。

#### 链接(Links)

还可以使用nav属性向导航中添加其他链接。

```yaml
nav:
    - ...
    - Link Title: https://lukasgeiter.com
```

#### 章节(Sections)
可以通过创建新的章节来对项目进行分组。
```yaml
nav:
    - introduction.md
    - Section 1:
        - page1.md
        - page2.md
    - Section 2:
        - ...
```

### 更改排序方式

在目录中创建一个名为 `.pages` 的文件，并设置 `order` 属性为 `asc` 或 `desc` 以更改导航项的顺序。
```yaml
order: desc
```
> 注意：与默认顺序不同，此选项不区分文件和目录。因此页面和章节可能会混合在一起。


### 自然排序类型

在目录中创建一个名为 `.pages` 的文件，并将 `sort_type` 属性设置为 `natural` ，以使用自然排序顺序。

这可以与上面的`order`结合使用。

```yaml
sort_type: natural
```

### 排序导航栏

在目录中创建一个名为 `.pages` 的文件，并将 `order_by` 属性设置为 `filename` 或 `title` 以更改导航项的顺序。

```yaml
order_by: title
```

可以与上面的 `order`，`sort_type` 结合使用。如果未设置 `order` ，则会按升序排序。如果没有设置`order_by`，它将按文件名排序。

### 折叠单个嵌套页面

> 注意：此功能默认已禁用。有关如何使用它的更多信息，请参见下文。

如果您有仅包含单个页面的目录，`awesome-pages`可以“折叠”它们，以便该文件夹不会显示在导航中。

例如，如果您具有以下文件结构：

```yaml
docs/
├─ section1/
│  ├─ img/
│  │  ├─ image1.png
│  │  └─ image2.png
│  └─ index.md # Section 1
└─ section2/
   └─ index.md # Section 2
```
这些页面将出现在您的导航栏中：

- Section 1
- Section 2

与MkDocs默认显示方式不同：

- Section 1
    - Index
- Section 2
    - Index

**对于所有页面**

可以在 `mkdocs.yml` 中使用 `collapse_single_pages` 选项全局启用折叠。

**对于子部分**
如果您只想折叠某些页面，请在目录中创建一个名为 `.pages` 的文件，并将 `collapse_single_pages` 设置为 `true`：

```yaml
collapse_single_pages: true
```

您还可以使用插件选项全局启用折叠，然后使用 `.pages` 文件通过将 `collapse_single_pages` 设置为 `false` 来防止某些子部分被折叠。

> 注意：此功能递归工作。这意味着它也会折叠多个级别的单个页面。

**对于单个页面**

如果您想启用或禁用单个页面的折叠，而不递归应用设置，请在目录中创建名为 `.pages` 的文件，并将 `collapse` 设置为 `true` 或 `false`：
```yaml
collapse: true
```

### 隐藏目录

在目录中创建一个名为 `.pages` 的文件，并将`hide`设置为`true`，以隐藏该目录及其所有子页面和子部分不出现在导航栏中：
```yaml
hide: true
```

> 注意：此选项仅会从导航栏中隐藏该部分。它仍将包含在构建过程中，并可以通过其URL访问。

### 设置目录标题

在目录中创建一个名为 `.pages` 的文件，并将`title`设置为覆盖导航中该目录的标题：
```yaml
title: Page Title
```

### 组合自定义导航和文件结构
MkDocs提供了两种定义导航结构的方式。一种是在 `mkdocs.yml` 中手动创建自定义导航，另一种是使用文件结构生成导航。这个功能使得将两种方法相结合成为可能。您可以手动定义部分导航而无需列出所有文件。

> 注意：您可以自由地将此功能与插件的其他所有功能相结合。但它们只会影响未手动定义的部分导航。

使用 `mkdocs.yml` 中的 `nav` 条目来定义您的自定义导航部分，并在想要插入所有剩余页面的导航树处包含一个`...`条目。

以下示例基于此文件结构：
```text
docs/
├─ introduction.md
├─ page1.md
├─ page2.md
└─ folder/
   ├─ introduction.md
   ├─ page3.md
   └─ page4.md
```

如果您想让`introduction.md`、`page1.md`和`page2.md`出现在它们自己的部分中，可以这样做：

```yaml
nav:
    - Start:
        - page1.md
        - page2.md
        - summary.md
    - ...
```
这将导致以下导航：
- Start
    - Introduction
    - Page 1
    - Page 2
- Folder
  - Introduction
  - Page 3
  - Page 4

`...`也可以放置在更深层次:

```yaml
nav:
    - page1.md
    - Rest:
        - ...
```

这将导致以下导航：

-   Page 1
-   Rest
    -   Introduction
    -   Page 2
    -   Folder
        -   Introduction
        -   Page 3
        -   Page 4

此外，可以使用glob模式或正则表达式过滤剩余的项目。例如，只匹配名为`introduction.md`的文件

```yaml
nav:
    - Introductions:
        - ... | **/introduction.md
    - ...
```

得到以下结果：

-   Introductions
    -   Introduction
    -   Introduction
-   Page 1
-   Page 2
-   Folder
    -   Page 3
    -   Page 4

> 注意：该模式是针对相对于文档目录的路径进行检查的。

默认情况下，剩余的项目保留其分层结构。您可以添加“flat”以使所有匹配页面变为平面结构。有关详细信息，请参阅下面的[Rest过滤器模式](#rest过滤器模式)部分。

```yaml
nav:
    - page1.md
    - Rest:
        - ... | flat | **/introduction.md
        - ... | flat
```

得到以下结果：

-   Page 1
-   Rest
    -   Introduction
    -   Introduction
    -   Page 2
    -   Page 3
    -   Page 4


## Rest过滤器模式

在所有允许 rest entry (...) 的地方，您也可以包含 glob 模式或正则表达式来过滤要显示的项目。

```yaml
nav:
    - ... | page-*.md
    - ... | regex=page-[0-9]+.md
```
该过滤器仅对剩余项进行操作。这意味着它不会包括明确列在导航中的项目或被配置中较早出现的其他过滤器匹配到的项目。

您还可以包含一个没有过滤器的 rest entry 作为 catch-all，插入未被任何过滤器匹配到的所有内容。

### 语法细节
除非过滤器以 `regex=` 开头，否则它将被解释为 glob 模式，但您也可以使用 `glob=` 显式地指定。`...` 周围的空格是可选的，但建议为了可读性而加上。

> 注意：根据您过滤器中的字符，您可能还需要在整个条目周围使用引号。

```yaml
nav:
    # equivalent glob entries
    - ... | page-*.md
    - ... | glob=page-*.md
    - ...|page-*.md
    - '... | page-*.md'

    # equivalent regex entries
    - ... | regex=page-[0-9]+.md
    - ...|regex=page-[0-9]+.md
    - '... | regex=page-[0-9]+.md'
```

## 选项

您可以通过在 `mkdocs.yml` 中传递选项来自定义插件：

```yaml
plugins:
    - awesome-pages:
        filename: .index
        collapse_single_pages: true
        strict: false
        order: asc
        sort_type: natural
        order_by: title
```

### `filename`

用于配置目录页面的文件名。默认为 `.pages`。

### `collapse_single_pages`

启用单个嵌套页面的折叠。默认值为 `false`。

### `strict`

当出现以下情况时，请引发错误而不是警告：

- `arrange` entries cannot be found
- `nav` entries cannot be found

默认为 `true`

### `order`, `sort_type` and `order_by`

排序相关的全局属性值。默认为 `None` 或 `filename`。


## 参考链接

- [mkdocs-awesome-pages-plugin Github地址](https://github.com/lukasgeiter/mkdocs-awesome-pages-plugin)