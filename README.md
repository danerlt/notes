# notes
个人常用笔记

网站链接: [https://danerlt.github.io/notes/](https://danerlt.github.io/notes/)

![效果图](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-05-09-345dzA.png)

## 1. 为什么要写这个笔记

1. 将自己常用的命令，方法等知识记录下来，方便自己查找
2. 好记性不如烂笔头，方便自己复习

## 2. 为什么要用mkdocs
mkdocs是一个用于编写文档的工具，它的优点有：
1. 有很多优秀的主题可供选择
2. 自定义配置简单
3. 可以编书写边预览，预览速度比vuepress快多了
4. 方便的部署到github pages
5. 使用 Python 编写, 可以方便的扩展
6. 支持多种格式的问题，例如md，ipynb, py等(ipynb和py格式需要安装插件)

## 环境搭建

```bash
# 创建 conda 环境
conda activate -n docs python==3.11

# 安装 pip 依赖
pip install -r requirements.txt 

```