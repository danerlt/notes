echo "启动dev后台服务"

nohup mkdocs serve -a "127.0.0.1:5000" > notes.log2>&1 &