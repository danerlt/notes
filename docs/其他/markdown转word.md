# Markdown文件转Word文件

> 本文转载自 TRICKY'S  [原来 markdown 还能这样转换成 docx (支持目录和封面)](https://www.trickyedecay.me/2020/08/04/use-pandoc-to-convert-markdown-to-docx/#%E4%B8%80%E3%80%81%E6%9C%80%E7%AE%80%E5%8D%95%E7%9A%84%E6%96%B9%E6%A1%88)



>   这篇文档需要你：
>
>   -   拥有 markdown 基础
>   -   了解 命令行 的使用方式

最近公司里需要写一些开发文档，用于提交给甲方。这件艰巨的任务落在了我身上，然而甲方要求我们提供 `docx` 格式的文档。

一想到使用 `word` 来书写文档，头不由自主地痛了起来！要是能够使用我最熟悉的 markdown 语法来书写文档，那该多好啊！

因为：

1.  我实在是太喜欢使用 markdown 来写东西了。
2.  比起 word，markdown 能够让我更专注于书写内容而不是文档格式。
3.  markdown 是纯文本文件，可以使用 git 管理以查看文档版本之间的修改差异。

## 一、最简单的方案

其实一直以来，除了书写各种 `readme.md` 以外，一些快速的 markdown 文档书写我都是使用 [typora](https://typora.io/) 这款软件。因为它提供了一种足够简单、简洁的界面和操作方式，更重要的是，这款软件跨平台。

![typora-cross-platform](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FnmJbULsFYqUGyy1DqWGL9DMaDXo)

还有一个更重要的原因，很多人接触它是因为，它能够直接将 markdown 转换成为 pdf 或 word。![typora-export](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FvjJPFom9SQmnrCLsODda2l4Sx5i)

那有这么方便的软件，为什么还要专门写这篇文章呢？不就完事了吗？

## 二、转换的些许需求

很快，你就会发现使用 typora 转换成为 docx 时，会有各种地方让你不爽。比如，转换之后的文档会变得很不好看。

这是在 typora 里面文档的样子：
![example-in-typora](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FqcpcfgE9vnDZqqwDo4SKTLWraAD)

这是通过 typora 导出成 docx 的样子：
![typora-to-word-example](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FujN6J7t1kkLLZ5BTTzobcC2v5l8)

这是通过 typora 导出成 pdf 的样子：
![typora-to-pdf-example](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FnzLDKaeKJHeA6h5VJ-5Sr-IKcV2)

你会发现，导出成 pdf 几乎保持着书写时的原样，而导出成 word 的效果难以言喻。

这时候我在想，**要不，我们去说服一下甲方使用 pdf 文档？**

很快，我就发现了新的问题需要解决：**文档需要目录**。

还好，typora为我们提供了一个特殊的标签 `[TOC]`。使用起来像这样：![usage-of-toc](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FmB3qL4zB_tuPEw8MjKz2ruuhtQE)

在 typora 渲染文档看起来像这样：![render-of-toc](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/Fv6BiZdViYJl6zEqO1m5bp4mwG9a)

这个功能很棒，导出成 `pdf` 之后，它的目录是可以 **点击** 的。但是很快也会发现新的问题，这个目录仅仅是个目录，它没有页码。没有页码有什么问题呢？有！打印出来的时候目录就显得没意义了。

显然，给甲方写的文档在验收时可能用于打印，**甲方可能会要求我们在目录上添加页码，同时，还需要一个封面图。**

我们总结一下，这次的文档工作，需求大概是这样：

1.  使用 markdown 来书写
2.  要能转换成 docx
3.  要有目录
4.  要有页码
5.  要有封面图

## 三、曲线方案

在很久之前，我也做过类似的事情，出自于对 markdown 的喜爱，我竟然：

1.  先用 markdown 书写文档
2.  使用 typora 导出成 pdf (content.pdf)
3.  使用[在线工具](http://www.pdfdo.com/page-number.aspx) 为 content.pdf 添加页码。
4.  打开 word
    -   手动创建一个封面图
    -   手动创建一个目录(手动编辑目录内容、页码)
5.  把 word 导出成 pdf (cover.pdf)
6.  使用[在线工具](https://smallpdf.com/cn/merge-pdf/) 合并两个 pdf 成为一个 pdf。

![curve-solution](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FkgaOKsT96c5qZmU4J0h1AFdiwos)

总之，太麻烦了，让我在开始写文档之前就已经原地死亡了。

>   还有，这样的在线方案让我觉得很不安全

## 四、简单使用 pandoc

typora 的导出 docx 和 pdf 功能其实需要大家先安装 `pandoc` 的。在使用 typora 导出文档时，它会指引你如何安装 [pandoc](https://pandoc.org/installing.html)。

>   typora 的导出功能，就是调用了这个软件！

那么，我们怎么模拟 typora 导出 docx 呢？非常简单，首先**在markdown文档所在的路径打开命令行工具**。然后这样：

```
pandoc -s example.md -o target.docx 
```

其中：

-   `-s <sourcefile>` 参数用于指定来源文件，那么这里肯定是你的 markdown 文件名称
-   `-o <targetfile>` 参数用于指定目标文件，就是转换后该生成一个什么名字的文件

这样一来你就能得到一个 `target.docx` 文件啦！ 但是呢，这个文件就如我们之前说的，它的格式还是一样非常丑！

## 五、优化 pandoc 对于 docx 导出的样式

pandoc 为我们提供了一个[参数](https://pandoc.org/MANUAL.html#option--reference-doc) `--reference-doc`。

这个参数是这样使用的：

```
pandoc -s example.md -o target.docx --reference-doc reference.docx
```



从命令行中可以看出，多了一个 `reference.docx`。那么这个文档是**需要我们事先准备的**。

该参数的原理就是，将 `reference.docx` 中的各种文本样式(一级标题啊、二级标题啊、列表样式啊、表格样式啊)应用到导出的 `target.docx` 中，所以我们可以称这个 `reference.docx` 文件为 **样式模板文件**。

我们可以通过以下命令行得到一个 pandoc 用于生成 docx 的 **默认样式模板文件**：

```
pandoc -o custom-reference.docx --print-default-data-file reference.docx
```


上面这个命令生成了一个 `custom-reference.docx`，这个默认样式模板文件用word打开来像这样：![custom-reference.docx](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FtvRwkib-cjT4mVdkUJUsYJxsaoQ)

那么，接下来，别着急着使用word最显眼的工具来调整这些字体的样式：![do-not-do-this](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/Fr6v61VLpWAP3eCB94pvrglzf08v)

我们应该使用 word 的[样式](https://support.microsoft.com/zh-cn/office/自定义或创建新样式-d38d6e47-f6fc-48eb-a607-1eb120dec563)功能来调整这些字体的样式。

接下来，就靠自己把这份样式文件调到最舒服的状态啦~

```bash
pandoc -s example.md -o target.docx --reference-doc templ.docx
```



>   这里有一份[我自己调好的样式模板文件](https://pan.baidu.com/s/12V00on6SwIan25tVrcytVQ)，提取码`cnn9`： 左边是 markdown ，右边是 word![my-reference-style](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FmbQWYvbJrWxqckdA58AmJVdlAcF)

使用这个方法还有一些不完美的地方，目前我也没有去解决，引用语法里面添加列表和图片在word里面渲染不正常。

## 六、添加封面图和目录

到目前为止，我们已经能比较完美地转换文档了，但是呢，还缺少目录和封面图。`pandoc`支持使用 `frontmatter` 的方式生成一个目录，但是仅能生成目录而已。

>   pandoc 支持一系列的 frontMatter 设置，文档在这：[传送门](https://pandoc.org/MANUAL.html#variables-for-latex)

如果你不知道什么是 `frontmatter` 也没关系，因为我们不会用到它。(那我说个屁)

在一次偶然的文档阅读中，我发现了 pandoc 文档中的[这一点](https://pandoc.org/MANUAL.html#extension-raw_attribute)：![pandoc-openxml](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FkviVLYnzcRGZCfEaL3G5rEuR7xc)

意思大概是，在 markdown 里面书写这段代码，可以在 word 中生成一个 **分页符**。![word-page-break-openxml](images/markdown转word/FoA5PJdzasCoDFXGYnv4UIitDrZ_)

也就是说，在 markdown 中可以插入一些特殊的代码，使用pandoc生成word的时候，这些特殊的代码会生成word概念中的一些东西。

好家伙，仔细了解了一下，这种特殊的代码是 [openxml](https://zh.wikipedia.org/wiki/Office_Open_XML)，是微软开发的以XML为基础并以ZIP格式压缩的电子文件规范，通常我们的word、ppt、excel都是由这样的代码组成。

换句话说，**如果我们懂得按照某种规范书写 xml 代码，我们也可以自制一个 word 文档**。

反过来想，是不是每一个 word 文档都可以转换成为 openxml 呢？

哈哈哈哈！确实是这样的！

### 6.1 编辑封面

让我们新建一个word文档，并对内容进行简单的编辑：![my-edition-cover](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/Fj7gEqcMZbTFhqLWKZWHvnPoU6HO)

在这一页 word 中，我添加了一个 1列4行 的表格，并在合适的地方填入了内容，比如标题和承办单位什么的。

然后保存这个文档到合适的地方。

### 6.2 提取 openxml

我们可以使用压缩软件打开刚刚保存的word文档，然后在压缩文件里找到 `word/document.xml` 文件![zip-document_xml](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/Fu1IIy7_0mHVxBvmNgzCpgnPiqNs)

我们可以在文本编辑器里面打开这个文档：![document_xml-content](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FjH58miQ1h1e4c9XAqZtQWfiyGrI)

可以看到这些 xml 标签其实也不是很难理解，`w:tbl` 显然就是代表表格的意思。所以在 `<w:tbl>` 和 `</w:tbl>` 之间应该就是我们刚刚在word里面绘制的内容。

>   哈哈哈哈？显然是表格？？？？？？？？？？因为 tbl 是 table 的缩写啊！开发人员的敏感直觉！如果你没办法猜到这些单词的意思，那么你可以移步 [openxml的文档](http://officeopenxml.com/anatomyofOOXML.php) 来真正认识这些标签。

### 6.3 写入 markdown

把上面的 `<w:tbl>` 和 `</w:tbl>` 之间的代码复制到 markdown 中，然后用代码块包起来。注意不要少了特殊标记，像这样：
![example-of-openxml-in-markdown](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/FhocJyz1jJiwdhftMPBr7JKEU6r0)

>   这一段东西可能会相当长咧，所以可能会让你的 markdown 的一开头看起来乱糟糟的，不过没事嘛，至少以后不用在写完 markdown 之后还要额外插入封面了。

一样的，我们也可以通过这种方式插入目录。目录的 `openxml` 代码是这样的，大家可以直接复制：

```
<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents" /><w:docPartUnique /></w:docPartObj></w:sdtPr><w:sdtContent><w:p><w:pPr><w:pStyle w:val="TOC" /></w:pPr><w:r><w:t xml:space="preserve">目录</w:t></w:r></w:p><w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true" /><w:instrText xml:space="preserve">TOC \o &quot;1-3&quot; \h \z \u</w:instrText><w:fldChar w:fldCharType="separate" /><w:fldChar w:fldCharType="end" /></w:r></w:p></w:sdtContent></w:sdt>
```



在目录之后，我们需要一个分页符，所以看起来会像是这样：

```
<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents" /><w:docPartUnique /></w:docPartObj></w:sdtPr><w:sdtContent><w:p><w:pPr><w:pStyle w:val="TOC" /></w:pPr><w:r><w:t xml:space="preserve">目录</w:t></w:r></w:p><w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true" /><w:instrText xml:space="preserve">TOC \o &quot;1-3&quot; \h \z \u</w:instrText><w:fldChar w:fldCharType="separate" /><w:fldChar w:fldCharType="end" /></w:r></w:p></w:sdtContent></w:sdt>

<w:p>
<w:r>
    <w:br w:type="page"/>
  </w:r>
</w:p>
```


然后使用**上文中解释过的**的命令行代码来生成docx文档吧！

```
pandoc -s example-markdown.md -o target.docx --reference-doc=templ.docx
```



学会了使用 openxml 来生成一些 word 内容之后，更多的可能性就等你自己去发挥啦~

## 七、总结

这个方案呢，可以生成一个**大致符合**内心审美的、带有封面图和目录的 docx 文档。它还有一个缺点，就是在转换的过程中**没办法自己加导出的docx加页码**，所以页码只能自己打开word动手给加上啦。

如果我以后想到什么办法可以一条命令行就解决这个问题我再来补充啦。