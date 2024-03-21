# 文本分割器（Text Splitter ）



在使用大模型生成的时候，由于大模型有上下文窗口的限制，所有需要将长文档拆分成更小的块。 



## Langchain框架中的文本分割器

文本拆分器的工作方式如下:

1.  将文本拆分为小的、语义上有意义的块（通常是句子）。
2.  将这些小块组合成较大的块，直到达到某个大小（由某个函数测量）。
3.  一旦达到该大小，将该块作为自己的文本片段，然后开始创建一个具有一定重叠的新文本块（以保持块之间的上下文）。



默认推荐的文本分割器是 RecursiveCharacterTextSplitter。该文本分割器接受一个字符列表。它尝试根据第一个字符进行分割来创建块，但如果任何块太大，则继续移动到下一个字符，依此类推。默认情况下，它尝试进行分割的字符是 `["\n\n", "\n", " ", ""]`

除了控制可以进行分割的字符之外，您还可以控制一些其他事项：

-   `length_function`：计算块长度的方法。默认只计算字符数，但通常在此处传递一个令牌计数器。- `chunk_size`：块的最大大小（由长度函数测量）。- `chunk_overlap`：块之间的最大重叠。保持一些连续性之间可能有一些重叠（例如使用滑动窗口）。- `add_start_index`：是否在元数据中包含每个块在原始文档中的起始位置。





在`Langchain`中，所有的`Splitter`都继承自`TextSplitter`。

其中有下面的子类

-   `CharacterTextSplitter`: 根据特定的分隔符将文本分割成多个块，默认为2个换行符。
-   `MarkdownHeaderTextSplitter`: 根据Markdown格式的标题来分割文本
-   `TokenTextSplitter`: 使用模型的tokenizeri来计算文本长度，并根据这个长度来分割文本，默认使用gpt2模型的tokenizer
-   `SentenceTransformersTokenTextSplitter`: 使用sentence模型的tokenizeri来计算文本长度，并根据这个长度来分割文本，默认使用`sentence-transformers/all-mpnet-base-v2`
-   `RecursiveCharacterTextSplitter`: 递归地使用不同的字符来分割文本，直到找到一个有效的分隔符
-   `NLTKTextSplitter`: 使用NLTK包的`sent_tokenize`函数，按句子进行分割来分割文本。
-   `SpacyTextSplitter`: 使用Spacy包来分割文本
-   `PythonCodeTextSplitter`, `MarkdownTextSplitter`, `LatexTextSplitter` 这些分割器是`RecursiveCharacterTextSplitter`的子类，它们针对特定类型的文本（如Python代码，Markdown文本，Latex文本）定义了特定的分隔符。



NLTK（Natural Language Toolkit）是一个用于符号和统计自然语言处理（NLP）的Python库。它提供+了大量的易于使用的接口，用于处理和分析文本数据。例如，它可以进行词汇切割（tokenization）、词干提取（stemming）、词性标注（POS tagging）、命名实体识别（NER）、句法分析（parsing）等。NLTK还包含了大量的语料库和词汇资源，例如WordNet。

Spacy是另一个强大的自然语言处理库，它专注于提供工业级的性能。与NLTK相比，Spacy的目标是提供一组精心设计的高级API，这些API可以用于执行常见的NLP任务，如词汇切割、词性标注、命名实体识别、依存句法分析等。Spacy还包含了一些先进的功能，如词向量支持和实体链接。Spacy的一个主要优点是它的性能非常好，适合在大规模文本数据上使用。

总的来说，NLTK和Spacy都是在自然语言处理任务中非常有用的库，NLTK更适合教学和研究，而Spacy更适合工业级的应用。
