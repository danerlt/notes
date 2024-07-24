echo "启动dev后台服务"

nohup mkdocs serve -a "0.0.0.0:5000" > notes.log 2>&1 &