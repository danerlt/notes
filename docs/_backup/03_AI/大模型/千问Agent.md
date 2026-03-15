# 千问Agent记录

本文记录了通义千问Agent RAG 应用的源码阅读笔记。

## 环境搭建

首先下载源码，创建Conda环境，然后安装依赖：

```bash
# 克隆代码
git clone https://github.com/QwenLM/Qwen-Agent.git
cd Qwen-Agent

# 创建Python3.10的环境
conda create -n qwen-agent python=3.10
# 切换到conda环境
conda activate qwen-agent
# 安装依赖
pip install -e ./
pip install -U "gradio>=4.0" "modelscope-studio>=0.2.1"
```

## RAG Agent 样例

样例代码在`Qwen-Agent\examples\assistant_rag.py`文件中。

首先需要在阿里云获取API KEY。

然后运行脚本：

```bash
python assistant_rag.py
```
运行之后使用 [http://127.0.0.1:7860](http://127.0.0.1:7860) 可以访问Web界面使用。


![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/DBp6Pl.png)

可以上传文件进行对话。

- 上传文件会调用接口：`http://127.0.0.1:7860/upload`。
- 点击提交会调用：`http://127.0.0.1:7860/run/predict`和`http://127.0.0.1:7860/queue/join?`
- 回答接口为：`http://127.0.0.1:7860/queue/data?session_hash=con80jiuyqu`

### 对话接口

点击提交会调用 `run/predict` 接口和`queue/join`接口。

`run/predict`接口参数格式示例如下：

```json
{
	"data": [{
			"files": [{
				"path": "C:\\Users\\xxx\\AppData\\Local\\Temp\\gradio\\d28094e9c193a248e371988b879b7c840d115403\\提示词工程.pdf",
				"url": "http://127.0.0.1:7860/file=C:\\Users\\xxx\\AppData\\Local\\Temp\\gradio\\d28094e9c193a248e371988b879b7c840d115403\\提示词工程.pdf",
				"orig_name": "提示词工程.pdf",
				"size": 1616780,
				"mime_type": "application/pdf",
				"meta": {
					"_type": "gradio.FileData"
				}
			}],
			"text": "什么是提示词工程"
		},
		[],
		[]
	],
	"event_data": null,
	"fn_index": 1,
	"trigger_id": 5,
	"session_hash": "con80jiuyqu"
}

```

`queue/join`接口参数格式示例如下：
```json
{
	"data": [
		[
			[{
				"id": null,
				"elem_id": null,
				"elem_classes": null,
				"name": null,
				"text": "什么是提示词工程",
				"flushing": null,
				"avatar": "",
				"files": [{
					"file": {
						"path": "C:\\Users\\xxx\\AppData\\Local\\Temp\\gradio\\d28094e9c193a248e371988b879b7c840d115403\\提示词工程.pdf",
						"url": "http://127.0.0.1:7860/file=C:\\Users\\xxx\\AppData\\Local\\Temp\\gradio\\d28094e9c193a248e371988b879b7c840d115403\\提示词工程.pdf",
						"orig_name": "提示词工程.pdf",
						"size": 1616780,
						"is_stream": false,
						"mime_type": "application/pdf",
						"meta": {
							"_type": "gradio.FileData"
						}
					},
					"alt_text": null
				}]
			}, null]
		], null
	],
	"event_data": null,
	"fn_index": 2,
	"trigger_id": 5,
	"session_hash": "con80jiuyqu"
}

```

对话最终会调用 `Assistant` 的run方法，`Assistant`继承自`FnCallAgent`，`FnCallAgent`继承自`Agent`类。

在`Agent`类中，`run`方法会调用`_run`方法。

```python
class Agent(ABC):
    """A base class for Agent.

    An agent can receive messages and provide response by LLM or Tools.
    Different agents have distinct workflows for processing messages and generating responses in the `_run` method.
    """

    def __init__(self,
                 function_list: Optional[List[Union[str, Dict, BaseTool]]] = None,
                 llm: Optional[Union[Dict, BaseChatModel]] = None,
                 system_message: Optional[str] = DEFAULT_SYSTEM_MESSAGE,
                 name: Optional[str] = None,
                 description: Optional[str] = None,
                 **kwargs):
        """Initialization the agent.

        Args:
            function_list: One list of tool name, tool configuration or Tool object,
              such as 'code_interpreter', {'name': 'code_interpreter', 'timeout': 10}, or CodeInterpreter().
            llm: The LLM model configuration or LLM model object.
              Set the configuration as {'model': '', 'api_key': '', 'model_server': ''}.
            system_message: The specified system message for LLM chat.
            name: The name of this agent.
            description: The description of this agent, which will be used for multi_agent.
        """
        if isinstance(llm, dict):
            self.llm = get_chat_model(llm)
        else:
            self.llm = llm
        self.extra_generate_cfg: dict = {}

        self.function_map = {}
        if function_list:
            for tool in function_list:
                self._init_tool(tool)

        self.system_message = system_message
        self.name = name
        self.description = description

    def run(self, messages: List[Union[Dict, Message]],
            **kwargs) -> Union[Iterator[List[Message]], Iterator[List[Dict]]]:
        """Return one response generator based on the received messages.

        This method performs a uniform type conversion for the inputted messages,
        and calls the _run method to generate a reply.

        Args:
            messages: A list of messages.

        Yields:
            The response generator.
        """
        messages = copy.deepcopy(messages)
        _return_message_type = 'dict'
        new_messages = []
        # Only return dict when all input messages are dict
        if not messages:
            _return_message_type = 'message'
        for msg in messages:
            if isinstance(msg, dict):
                new_messages.append(Message(**msg))
            else:
                new_messages.append(msg)
                _return_message_type = 'message'

        if 'lang' not in kwargs:
            if has_chinese_messages(new_messages):
                kwargs['lang'] = 'zh'
            else:
                kwargs['lang'] = 'en'

        for rsp in self._run(messages=new_messages, **kwargs):
            for i in range(len(rsp)):
                if not rsp[i].name and self.name:
                    rsp[i].name = self.name
            if _return_message_type == 'message':
                yield [Message(**x) if isinstance(x, dict) else x for x in rsp]
            else:
                yield [x.model_dump() if not isinstance(x, dict) else x for x in rsp]
```

`Assistant`类的`_run`方法会先调用`_prepend_knowledge_prompt`然后调用父类的`_run`方法。

```python
class Assistant(FnCallAgent):
    """This is a widely applicable agent integrated with RAG capabilities and function call ability."""

    def __init__(self,
                 function_list: Optional[List[Union[str, Dict, BaseTool]]] = None,
                 llm: Optional[Union[Dict, BaseChatModel]] = None,
                 system_message: Optional[str] = DEFAULT_SYSTEM_MESSAGE,
                 name: Optional[str] = None,
                 description: Optional[str] = None,
                 files: Optional[List[str]] = None,
                 rag_cfg: Optional[Dict] = None):
        super().__init__(function_list=function_list,
                         llm=llm,
                         system_message=system_message,
                         name=name,
                         description=description,
                         files=files,
                         rag_cfg=rag_cfg)

    def _run(self,
             messages: List[Message],
             lang: Literal['en', 'zh'] = 'en',
             knowledge: str = '',
             **kwargs) -> Iterator[List[Message]]:
        """Q&A with RAG and tool use abilities.

        Args:
            knowledge: If an external knowledge string is provided,
              it will be used directly without retrieving information from files in messages.

        """
        logger.debug(f"{messages=}, {lang=}, {knowledge=}, {kwargs=}")
        new_messages = self._prepend_knowledge_prompt(messages=messages, lang=lang, knowledge=knowledge, **kwargs)
        logger.debug(f"{new_messages=}")
        return super()._run(messages=new_messages, lang=lang, **kwargs)

    def _prepend_knowledge_prompt(self,
                                  messages: List[Message],
                                  lang: Literal['en', 'zh'] = 'en',
                                  knowledge: str = '',
                                  **kwargs) -> List[Message]:
        messages = copy.deepcopy(messages)
        if not knowledge:
            # Retrieval knowledge from files
            *_, last = self.mem.run(messages=messages, lang=lang, **kwargs)
            knowledge = last[-1][CONTENT]

        logger.debug(f'Retrieved knowledge of type `{type(knowledge).__name__}`:\n{knowledge}')
        if knowledge:
            knowledge = format_knowledge_to_source_and_content(knowledge)
            logger.debug(f'Formatted knowledge into type `{type(knowledge).__name__}`:\n{knowledge}')
        else:
            knowledge = []
        snippets = []
        for k in knowledge:
            snippets.append(KNOWLEDGE_SNIPPET[lang].format(source=k['source'], content=k['content']))
        knowledge_prompt = ''
        if snippets:
            knowledge_prompt = KNOWLEDGE_TEMPLATE[lang].format(knowledge='\n\n'.join(snippets))

        if knowledge_prompt:
            if messages[0][ROLE] == SYSTEM:
                messages[0][CONTENT] += '\n\n' + knowledge_prompt
            else:
                messages = [Message(role=SYSTEM, content=knowledge_prompt)] + messages
        return messages
```

在`_prepend_knowledge_prompt`方法中会调用`Memory`的`run`方法来获取知识。

在`Memory`的`_run`方法中会调用`rag_keygen_strategy`的`run`方法，默认情况是`SplitQueryThenGenKeyword`类。然后使用`retrieval`工具进行检索。

```python
class Memory(Agent):
    def _run(self, messages: List[Message], lang: str = 'en', **kwargs) -> Iterator[List[Message]]:
        """This agent is responsible for processing the input files in the message.

         This method stores the files in the knowledge base, and retrievals the relevant parts
         based on the query and returning them.
         The currently supported file types include: .pdf, .docx, .pptx, .txt, and html.

         Args:
             messages: A list of messages.
             lang: Language.

        Yields:
            The message of retrieved documents.
        """
        # process files in messages
        rag_files = self.get_rag_files(messages)

        if not rag_files:
            yield [Message(role=ASSISTANT, content='', name='memory')]
        else:
            query = ''
            # Only retrieval content according to the last user query if exists
            if messages and messages[-1].role == USER:
                query = extract_text_from_message(messages[-1], add_upload_info=False)

            # Keyword generation
            if query and self.rag_keygen_strategy.lower() != 'none':
                module_name = 'qwen_agent.agents.keygen_strategies'
                module = import_module(module_name)
                cls = getattr(module, self.rag_keygen_strategy)
                keygen = cls(llm=self.llm)
                response = keygen.run([Message(USER, query)], files=rag_files)
                last = None
                for last in response:
                    continue
                if last:
                    keyword = last[-1].content.strip()
                else:
                    keyword = ''

                if keyword.startswith('```json'):
                    keyword = keyword[len('```json'):]
                if keyword.endswith('```'):
                    keyword = keyword[:-3]
                try:
                    keyword_dict = json5.loads(keyword)
                    if 'text' not in keyword_dict:
                        keyword_dict['text'] = query
                    query = json.dumps(keyword_dict, ensure_ascii=False)
                    logger.info(query)
                except Exception:
                    query = query

            content = self._call_tool(
                'retrieval',
                {
                    'query': query,
                    'files': rag_files
                },
                **kwargs,
            )

            yield [Message(role=ASSISTANT, content=content, name='memory')]
```

`SplitQueryThenGenKeyword`的`run`方法会先调用`SplitQuery`的`run`方法然后再调用`GenKeyword`的`run`方法。

```python
class SplitQueryThenGenKeyword(Agent):

    def __init__(self,
                 function_list: Optional[List[Union[str, Dict, BaseTool]]] = None,
                 llm: Optional[Union[Dict, BaseChatModel]] = None,
                 system_message: Optional[str] = DEFAULT_SYSTEM_MESSAGE,
                 **kwargs):
        super().__init__(function_list, llm, system_message, **kwargs)
        self.split_query = SplitQuery(llm=self.llm)
        self.keygen = GenKeyword(llm=llm)

    def _run(self, messages: List[Message], lang: str = 'en', **kwargs) -> Iterator[List[Message]]:
        query = messages[-1].content

        *_, last = self.split_query.run(messages=messages, lang=lang, **kwargs)
        information = last[-1].content.strip()
        if information.startswith('```json'):
            information = information[len('```json'):]
        if information.endswith('```'):
            information = information[:-3]
        try:
            information = '\n'.join(json5.loads(information)['information']).strip()
            if 0 < len(information) <= len(query):
                query = information
        except Exception:
            query = query
        rsp = []
        for rsp in self.keygen.run([Message(USER, query)]):
            yield rsp

        if rsp:
            keyword = rsp[-1].content.strip()
            if keyword.startswith('```json'):
                keyword = keyword[len('```json'):]
            if keyword.endswith('```'):
                keyword = keyword[:-3]
            try:
                keyword_dict = json5.loads(keyword)
                keyword_dict['text'] = query
                yield [Message(role=ASSISTANT, content=json.dumps(keyword_dict, ensure_ascii=False))]
            except Exception:
                pass

```

`SplitQuery`的`_run`方法会调用父类`GenKeyword`的`_run`方法。

```python
class SplitQuery(GenKeyword):
    """This agent split the query into information."""
    PROMPT_TEMPLATE_EN = """Please extract the key information fragments that can help retrieval and the task description in the question, and give them in JSON format:
{{"information": ["information fragment 1", "information fragment 2"], "instruction": ["instruction fragment 1", "instruction fragment 2"]}}.
If it is a question, the default task description is: Answer the question

Question: What is MMDET.UTILS?
Result: {{"information": ["What is MMDET.UTILS"], "instruction": ["Answer the question"]}}
Observation: ...

Question: Summarize
Result: {{"information": [], "instruction": ["Summarize"]}}
Observation: ...

Question: Describe in great detail 2.1 DATA, 2.2 TOKENIZATION, 2.3 ARCHITECTURE. Also, can you incorporate the methods from this paper?
Result: {{"information": ["2.1 DATA, 2.2 TOKENIZATION, 2.3 ARCHITECTURE"], "instruction": ["Describe in great detail", "Also, can you incorporate the methods from this paper?"]}}
Observation: ...

Question: Help me count the performance of membership levels.
Result: {{"information": ["the performance of membership levels"], "instruction": ["Help me count"]}}
Observation: ...

Question: {user_request}
Result:
"""

    PROMPT_TEMPLATE_ZH = """请提取问题中的可以帮助检索的重点信息片段和任务描述，以JSON的格式给出：{{"information": ["重点信息片段1", "重点信息片段2"], "instruction": ["任务描述片段1", "任务描述片段2"]}}。
如果是提问，则默认任务描述为：回答问题

Question: MMDET.UTILS是什么
Result: {{"information": ["MMDET.UTILS是什么"], "instruction": ["回答问题"]}}
Observation: ...

Question: 总结
Result: {{"information": [], "instruction": ["总结"]}}
Observation: ...

Question: 要非常详细描述2.1 DATA，2.2 TOKENIZATION，2.3 ARCHITECTURE。另外你能把这篇论文的方法融合进去吗
Result: {{"information": ["2.1 DATA，2.2 TOKENIZATION，2.3 ARCHITECTURE"], "instruction": ["要非常详细描述", "另外你能把这篇论文的方法融合进去吗"]}}
Observation: ...

Question: 帮我统计不同会员等级的业绩
Result: {{"information": ["会员等级的业绩"], "instruction": ["帮我统计"]}}
Observation: ...

Question: {user_request}
Result:
"""

    PROMPT_TEMPLATE = {
        'zh': PROMPT_TEMPLATE_ZH,
        'en': PROMPT_TEMPLATE_EN,
    }

    def __init__(self,
                 function_list: Optional[List[Union[str, Dict, BaseTool]]] = None,
                 llm: Optional[Union[Dict, BaseChatModel]] = None,
                 system_message: Optional[str] = DEFAULT_SYSTEM_MESSAGE,
                 **kwargs):
        super().__init__(function_list, llm, system_message, **kwargs)
        # Currently, instruction is not utilized,
        # so in order to avoid generating redundant tokens, set 'instruction' as stop words
        self.extra_generate_cfg = merge_generate_cfgs(
            base_generate_cfg=self.extra_generate_cfg,
            new_generate_cfg={'stop': ['"], "instruction":']},
        )

    def _run(self, messages: List[Message], lang: str = 'en', **kwargs) -> Iterator[List[Message]]:
        for last in super()._run(messages=messages, lang=lang, **kwargs):
            continue
        extracted_content = last[-1].content.strip()
        logger.info(f'Extracted info from query: {extracted_content}')
        if extracted_content.endswith('}') or extracted_content.endswith('```'):
            yield [Message(role=ASSISTANT, content=extracted_content)]
        else:
            try:
                extracted_content += '"]}'
                yield [Message(role=ASSISTANT, content=extracted_content)]
            except Exception:
                yield [Message(role=ASSISTANT, content='')]
```

`GenKeyword`的`_run`方法会使用根据语言是中文还是英文从`PROMPT_TEMPLATE`获取对应的提示词，然后调用大模型生成结果。


这个对话的流程图如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/qwen%20agent%E6%B5%81%E7%A8%8B%E5%9B%BE.png)

## 参考链接

 - [Qwen-Agent](https://github.com/QwenLM/Qwen-Agent)