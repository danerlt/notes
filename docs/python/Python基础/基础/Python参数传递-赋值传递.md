# Python参数传递-赋值传递

## C++中的参数传递

C++中,函数的参数传递主要有两种方式:

1. 值传递(pass by value)

这是C++的默认参数传递机制。调用函数时会将实参的值复制一份给形参,函数内部对形参的修改不会改变外部实参。

例如:

```cpp
void func(int a) {
  a++;
}

int main() {
  int x = 10;
  func(x);
  // x仍等于10,未改变
}
```

2. 引用传递(pass by reference)

可以通过在函数声明和定义中参数前加上&实现。这时内外都引用同一块内存,函数内的修改会影响到外部实参。

例如:

```cpp
void func(int &a) {
  a++;  
}

int main() {
  int x = 10;
  func(x);
  // x变为11
}
```



## Python中的参数传递

### Python不是值传递

示例如下：

下面是`C++`值传递的一个示例：

```cpp
#include <iostream>

using namespace std;

void add(int n) {
  cout << "start add, n: " << n << ", address: " << &n << endl; 
  n = n + 1;
  cout << "end add, n: " << n << ", address: " << &n << endl;
}

void foo() {
  int n = 9001;
  cout << "foo before add, n: " << n << ", address: " << &n << endl;
  
  add(n);

  cout << "foo after add, n: " << n << ", address: " << &n << endl;  
}

int main() {
  foo();

  return 0;
}

```
执行的结果为：
```
foo before add, n: 9001, address: 0x7fffff25014c
start add, n: 9001, address: 0x7fffff25012c
end add, n: 9002, address: 0x7fffff25012c
foo after add, n: 9001, address: 0x7fffff25014c
```

可以看出在函数传递的时候，形参和实参的地址不一样。

下面是一个`Python`参数传递的示例：
```python
def foo():
    n = 9001
    print(f"foo before add, n: {n}, id(n): {id(n)}")
    add(n)
    print(f"foo after add, n: {n}, id(n): {id(n)}")

def add(n):
    print(f"start add, n: {n}, id(n): {id(n)}")
    n = n + 1
    print(f"end add, n: {n}, id(n): {id(n)}")

foo()
```

执行结果为：
```
foo before add, n: 9001, id(n): 140609093743280
start add, n: 9001, id(n): 140609093743280
end add, n: 9002, id(n): 140609093742320
foo after add, n: 9001, id(n): 140609093743280
```

可以看出，函数参数传递的时候，形参和实参的地址是一样的，说明Python不是值传递。

### Python不是引用传递

示例如下

下面是`C++`引用传递的一个示例：

```cpp
#include <iostream>
#include <vector>

using namespace std;

void append(vector<int>& arr) {
  cout << "start append, arr: ";
  for(int i : arr) {
    cout << i << " "; 
  }
  cout << ", address: " << &arr << endl;
  
  arr.push_back(4);
  
  cout << "end append, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;
}

void bar() {
  vector<int> arr = {1, 2, 3};
  cout << "bar before append, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;

  append(arr);

  cout << "bar after append, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;
}

int main() {
  bar();
  return 0;
}
```

执行结果为：

```
bar before append, arr: 1 2 3 , address: 0x7ffdfda76a90
start append, arr: 1 2 3 , address: 0x7ffdfda76a90
end append, arr: 1 2 3 4 , address: 0x7ffdfda76a90
bar after append, arr: 1 2 3 4 , address: 0x7ffdfda76a90
```

可以看出，C++中引用传递： 形参和实参是同一个内存地址，改变了形参，实参也会发生对应的改变。



同样的，对应的Python示例如下：

```python
def bar():
    arr = [1,2,3]
    print(f"bar before append, arr: {arr}, id(arr): {id(arr)}")
    append(arr)
    print(f"bar after append, arr: {arr}, id(arr): {id(arr)}")

def append(arr):
    print(f"start append, arr: {arr}, id(arr): {id(arr)}")
    arr.append(4)
    print(f"end append, arr: {arr}, id(arr): {id(arr)}")

bar()
```

执行结果为：

```
bar before append, arr: [1, 2, 3], id(arr): 140609044388096
start append, arr: [1, 2, 3], id(arr): 140609044388096
end append, arr: [1, 2, 3, 4], id(arr): 140609044388096
bar after append, arr: [1, 2, 3, 4], id(arr): 140609044388096
```

可以看出，Python中，执行结果和`C++`类似，形参改变了，实参也发生了改变，很多人就是因为这个案例觉得Python也是引用传递。接下来看另一个案例。



`C++`代码如下：

```cpp
#include <iostream>  
#include <vector>

using namespace std;

void append2(vector<int> &arr) {
  cout << "start append2, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;

  arr = {1, 2, 3, 4};
  
  cout << "end append2, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;
}

void bar2() {
  vector<int> arr = {1, 2, 3};

  cout << "bar2 before append2, arr: ";
  for(int i : arr) {
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;

  append2(arr);

  cout << "bar2 after append2, arr: ";
  for(int i : arr) { 
    cout << i << " ";
  }
  cout << ", address: " << &arr << endl;
}

int main() {
  bar2();
  
  return 0;
}
```

这个案例和上面的案例区别在于，上面一个案例是用的`arr.push_back(4);`修改`vector`,这个案例是将`arr`重新赋值为` arr = {1, 2, 3, 4};`。

执行结果如下：

```
bar2 before append2, arr: 1 2 3 , address: 0x7ffce8217af0
start append2, arr: 1 2 3 , address: 0x7ffce8217af0
end append2, arr: 1 2 3 4 , address: 0x7ffce8217af0
bar2 after append2, arr: 1 2 3 4 , address: 0x7ffce8217af0
```

可以看出，结果和上面的结果一样， 形参和实参是同一个内存地址，改变了形参，实参也会发生对应的改变。

下面来看一个Python的案例

```python
def bar2():
    arr = [1,2,3]
    print(f"bar2 before append2, arr: {arr}, id(arr): {id(arr)}")
    append2(arr)
    print(f"bar2 after append2, arr: {arr}, id(arr): {id(arr)}")

def append2(arr):
    print(f"start append2, arr: {arr}, id(arr): {id(arr)}")
    arr = [1,2,3,4]
    print(f"end append2, arr: {arr}, id(arr): {id(arr)}")

bar2()
```

执行结果如下：

```
bar2 before append2, arr: [1, 2, 3], id(arr): 140609044388736
start append2, arr: [1, 2, 3], id(arr): 140609044388736
end append2, arr: [1, 2, 3, 4], id(arr): 140609044387136
bar2 after append2, arr: [1, 2, 3], id(arr): 140609044388736
```

可以看出在函数`append2`中的`arr`重新赋值之后，改变了形参，实参并没有发生改变。所以Python中的参数传递不是引用传递。



## 参考链接
- [Pass by Reference in Python: Background and Best Practices](https://realpython.com/python-pass-by-reference/#defining-pass-by-reference)
