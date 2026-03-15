#!/usr/bin/env python  
# -*- coding:utf-8 -*-  
""" 
@author: danerlt 
@file: play.py 
@time: 2024-03-22
@contact: danerlt001@gmail.com
@desc: 
"""
import time


def start_game_sync():
    """同步游戏"""
    players = []
    rival_count = 24
    stpes = 30
    for i in range(rival_count):
        player = f"对手{i + 1}"
        players.append(player)
    for player in players:

        # 小明的时间
        time.sleep(5)
        # 对手等待时间
        time.sleep(55)


if __name__ == "__main__":
    start = time.time()
    start_game_sync()
    elapsed = time.time() - start
    print(f"同步游戏总计用时: {elapsed:.2f}秒")
