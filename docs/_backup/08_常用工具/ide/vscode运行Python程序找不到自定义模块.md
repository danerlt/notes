# vscode运行Python程序找不到自定义模块

vscode 找不到python自定义模块

vscode之所以找不到自定义模块，与其PYTHONPATH有关。

首先在 .vscode 下的 launch.json 中添加 `"env": {"PYTHONPATH": "${workspaceRoot}"}`

完整的 launch.json 如下：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: 当前文件",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceRoot}"
      }
    }
  ]
}
```

在 .vscode 下的 setting.json 中添加

```json
{
  "terminal.integrated.env.windows": {
    "PYTHONPATH": "${workspaceFolder};${env:PYTHONPATH}"
  }
}
```
