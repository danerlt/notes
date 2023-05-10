# MySQL常用命令

```mysql

# 查看索引
show index from table_name;
# 示例：
show index from nf_label;

# 删除索引
drop index index_name on table_name;
# 示例
DROP INDEX idx_ind ON nf_label;

# 创建索引 index_name 是要创建的索引的名称 table_name 表的名称，column1、column2 是要在其上创建索引的列的名称。
CREATE INDEX index_name ON table_name (column1, column2, ...);
# 创建索引 alter table 用法
ALTER TABLE table_name ADD INDEX index_name (column1 ASC, column2 ASC )
# 示例 添加唯一索引
ALTER TABLE nf_label ADD UNIQUE INDEX `unique_idx` ( `task_id` ASC, `name` ASC )



# 删除表的字段 column_name是要删除的字段的名称。
ALTER TABLE table_name DROP COLUMN column_name;
# 示例
ALTER TABLE nf_label DROP COLUMN deleted;
```