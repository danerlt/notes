#!/usr/bin/env python  
# -*- coding:utf-8 -*-  

from mkdocs.__main__ import serve_command


def main():
    serve_command(["-a", "0.0.0.0:5000", "-w", "overrides"])


if __name__ == '__main__':
    main()
