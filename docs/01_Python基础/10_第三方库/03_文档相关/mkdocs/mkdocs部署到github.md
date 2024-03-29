# mkdocs部署到Github

首先需要搭建好一个 Github 仓库，将 `mkdoc.yml`文件和 `docs` 目录和 `pip` 依赖文件推送到仓库中。

然后创建一个分支叫`gh-pages`

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-12-27-Acf2oH.png)

然后需要在 Github 的 Settings -> Pages 中启用 Github Pages，并将分支设置为 `gh-pages`

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-12-27-CzfyrJ.png)



然后在 Github 的 Actions 添加一个新的工作流，点击`set up a workflow yourself`

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-12-27-bzaJIf.png)


然后将下面的内容复制到工作流中，并保存

```yaml
# 这是一个基本的 Github Actions 工作流，用于在每次提交时自动部署网站

name: deploy

# 控制 Github Actions 工作流何时运行
on:
  # 在推送或拉动请求事件中触发 Github Action ，但只针对主分支。
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  # 允许手动执行这个 workflow
  workflow_dispatch:

#  一个 workflow 的运行是由 一个或多个 job 组成的，这些 job 可以按顺序运行，也可以并行运行。
jobs:
  # 这个 workflow 包含一个名为 "build" 的 job
  build:
    # 这个 job 的运行器是 ubuntu-latest
    runs-on: ubuntu-latest

    # Steps 表示 job 中的一系列任务，这些任务将作为 job 的一部分被执行
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v3

      # 设置 Python 环境
      - uses: actions/setup-python@v4
        with:
          # 要使用的 Python 版本的版本范围或确切版本，使用 SemVer 的版本范围语法
          python-version: 3.9 # 可选，默认值为 3.x
          cache: pip # 可选，启用 pip 依赖缓存

#      # 设置 Node.js 环境
#      - uses: actions/setup-node@v3
#        with:
#          # 要使用的 Node.js 版本的版本范围或确切版本，使用 SemVer 的版本范围语法
#          node-version: 14.x # 可选，默认值为 14.x

      # 安装 Python 依赖
      - run: pip install -r requirements.txt

      # 部署网站
      - run: mkdocs gh-deploy --force
```

最后在 Settings -> Actions -> General 中将 `Workflow permissions`的权限设置成 `Read and write permissions`。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-12-27-jebavg.png)

创建好之后，每次推送到主分支，就会自动部署网站。也可以手动触发工作流，在 Actions 页面中点击`Run workflow`，选择要运行的工作流，然后点击`Run workflow`按钮。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2023-12-27-nwJ5HC.png)
