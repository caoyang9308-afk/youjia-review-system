#!/bin/bash
# 自动重启脚本
while true; do
  echo "[$(date)] 启动服务..."
  pnpm dev
  echo "[$(date)] 服务退出，5秒后重启..."
  sleep 5
done
