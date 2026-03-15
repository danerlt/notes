# MkDocs literate-nav 插件

用于 MkDocs 的插件，可在 Markdown 中指定导航而非 YAML。

与section-index和gen-files配合使用效果良好，取代了awesome-pages。

```shell
pip install mkdocs-literate-nav
```

## 用法

在 mkdocs.yml 中激活插件：
```yaml
plugins:
  - search
  - literate-nav:
      nav_file: SUMMARY.md
```


如果导航栏在那里，请删除它；现在将被忽略。（除非您想保留它？）

<table markdown="1"><tr>
<td>导航栏</td>
<td>创建一个文件<b>SUMMARY.md</b>:</td>
<td>使用mkdoc的yaml文件</td>
</tr><tr><td>

* [Frob](#index.md)
* [Baz](#baz.md)
* [Borgs](#borgs/index.md)
    * [Bar](#borgs/bar.md)
    * [Foo](#borgs/foo.md)

</td><td>

```markdown
* [Frob](index.md)
* [Baz](baz.md)
* [Borgs](borgs/index.md)
    * [Bar](borgs/bar.md)
    * [Foo](borgs/foo.md)
```

</td><td>

```yaml
nav:
  - Frob: index.md
  - Baz: baz.md
  - Borgs:
    - borgs/index.md
    - Bar: borgs/bar.md
    - Foo: borgs/foo.md
```

</td></tr></table>

重要提示：导航文件必须放在`docs`目录内。

因此，该插件允许您使用链接列表指定站点的导航，并按照普通Markdown规则进行解析。

请注意，我们编写Markdown的方式似乎还将一个Section与页面关联起来。MkDocs实际上不支持这一点，也不能直接在YAML中表示它，因此该插件尝试做到最好：将链接作为Section的第一页。但是，这种结构非常适合于section-index插件，它可以使其正常工作。或者您可以选择不将链接与部分相关联：

## 参考链接

- [mkdocs-literate-nav Github地址](https://github.com/oprypin/mkdocs-literate-nav)