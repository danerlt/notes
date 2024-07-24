echo "结束5000端口服务"
lsof -ti :5000 | xargs kill -9

echo "启动dev后台服务"
nohup mkdocs serve -a "0.0.0.0:5000" > notes.log 2>&1 &