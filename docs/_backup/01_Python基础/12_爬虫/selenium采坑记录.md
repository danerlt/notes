# selenium采坑记录

## 寻找元素

```python
from selenium.webdriver.common.by import By

# 通过ID寻找
ele = driver.find_element(By.ID, ele_id)

# 通过xpath寻找
ele = driver.find_element(By.XPATH, xpath_value)

# 通过css selector 寻找
ele = driver.find_element(By.CSS_SELECTOR, css_selector)

# 通过class name寻找
ele = driver.find_element(By.CLASS_NAME, class_name)

# 通过text寻找
ele = driver.find_element(LINK_TEXT, link_txt)

```

## 显示等待

```python
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

# 超时时长最大为30s，每隔0.5s查找元素一次，通过css selector查找元素
unread_ele = WebDriverWait(driver, 30, 0.5).until(
    EC.visibility_of_element_located((By.CSS_SELECTOR, unread_css_selector))

```

## 输入框操作

```python
# 寻找到对应的输入框元素 find_element_by_css_selector是对find_element方法进行了封装
input_box = self.find_element_by_css_selector(input_css_selector)
# 点击输入框
input_box.click()
# 清空输入框
input_box.clear()
# 向输入框输入信息
input_box.send_keys(msg)
# 点击发送按钮
self.find_element_by_css_selector(send_btn_css_selector).click()
# 清空输入框
input_box.clear()

```
## 执行JavaScript代码

```python
js = f"document.getElementsByClassName('{user_operation_div_class}')[0].style.display='block'"
# 执行js代码
driver.execute_script(js)
```


## 鼠标悬停

```python
from selenium.webdriver.common.action_chains import ActionChains


new_hr_element = self.find_element_by_css_selector(new_hr_css_selector)
if not new_hr_element:
    logger.error("寻找最新的HR元素失败")
    raise Exception("寻找最新的HR元素失败")

# 鼠标悬停
ActionChains(driver).move_to_element(new_hr_element).perform()
time.sleep(1)
```
### 元素不可见导致悬停失败

当元素的display属性为none的时候，执行悬停的时候会报错`Message: javascript error: {"status":60,"value":"[object HTMLImageElement] has no size and location"}`

需要执行JavaScript代码将元素的style属性的display改成`block`。

执行JavaScript代码如下：

```python
js = f"document.getElementsByClassName('{user_operation_div_class}')[0].style.display='block'"
# 执行js代码
driver.execute_script(js)
```


