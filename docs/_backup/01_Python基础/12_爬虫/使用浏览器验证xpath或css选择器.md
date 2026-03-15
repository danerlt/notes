# 使用浏览器验证xpath或css选择器

Google Chrome 浏览器自带了叫做 "[Chrome DevTools](https://developers.google.com/chrome-developer-tools/)" 前端调试工具。 它包含一系列方便的调试工具，其中包括了在不添加额外插件的前提下，直接审查和验证 XPath/CSS 选择器的功能。

这可以通过如下两种方式完成：

-   使用 `Elements` 面板内的搜索功能来在 DOM 中审查验证并高亮 XPath/CSS 选择器。
-   在 `Console` 面板中执行命令 `$x("some_xpath")` 或 `$$("css-selectors")`来审查和验证。


在 Chrome 新版本中， 在 console 中粘贴的时候会提示`Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Please type ‘allow pasting’ below and hit Enter to allow pasting.`

直接在控制台中输入`allow pasting`即可粘贴。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/q4AU31.png)

选择需要的元素，鼠标右键点击【检查】选项会自动跳转到元素。
![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/JfzVzc.png)

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/iYC4YN.png)

然后选中对应的元素，鼠标右键`copy`选项，其中`Copy Xpath`表示使用Xpath选择器，`Copy selecor`表示使用CSS选择器。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/PlP3nb.png)

在控制台验证xpath选择器，在控制台输入复制的xpath选择器，这个默认返回的是一个列表，可以通过`[0]`来获取第一个元素，`.innerText`获取元素的文本内容，`innerH。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/TbfqLc.png)


CSS选择器同理：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/FIfQny.png)


有时候，某些操作元素需要鼠标悬停到特定元素上才会加载出来，一旦鼠标移开，这些元素就会消失，导致无法通过检查工具定位到相应的HTML元素。

可以先将鼠标悬停在对应的元素上，使其操作元素加载出来，然后点击鼠标右键，再将鼠标移动到操作元素上，这样就能成功定位到相应的HTML元素了。



