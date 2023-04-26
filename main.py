#!/usr/bin/env python  
# -*- coding:utf-8 -*-  

from mkdocs.__main__ import serve_command


def main():
    serve_command(["-a", "127.0.0.1:5000"])


if __name__ == '__main__':
    main()
