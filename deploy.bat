@echo off
REM CQUPT SRC - Docker 部署启动脚本 (Windows)
REM 用法: deploy.bat [命令]
REM 命令: start | stop | restart | logs | status | init | clean | rebuild

setlocal enabledelayedexpansion

REM 配置
set PROJECT_NAME=cqupt-src
set DOCKER_COMPOSE_FILE=docker-compose.yml

REM 检查 Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker 未安装或未添加到 PATH
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose 未安装或未添加到 PATH
    exit /b 1
)

echo [OK] Docker 环境检查通过

REM 检查 .env 文件
if not exist ".env" (
    echo [WARNING] .env 文件不存在
    if exist ".env.example" (
        echo [INFO] 正在复制 .env.example 为 .env
        copy .env.example .env
        echo [WARNING] 请编辑 .env 文件并设置正确的配置
    )
)

REM 处理命令
if "%1"=="" (
    call :show_help
    exit /b 0
) else if "%1"=="start" (
    call :start_services
) else if "%1"=="stop" (
    call :stop_services
) else if "%1"=="restart" (
    call :restart_services
) else if "%1"=="logs" (
    call :show_logs
) else if "%1"=="status" (
    call :show_status
) else if "%1"=="init" (
    call :init_database
) else if "%1"=="backup" (
    call :backup_database
) else if "%1"=="clean" (
    call :clean_volumes
) else if "%1"=="rebuild" (
    call :rebuild_images
) else if "%1"=="shell" (
    call :enter_app_shell
) else if "%1"=="db-shell" (
    call :enter_db_shell
) else (
    echo [ERROR] 未知命令: %1
    echo 执行 "%0" 查看帮助
    exit /b 1
)

goto :eof

REM ============ 函数定义 ============

:show_help
echo.
echo ========================================
echo   CQUPT SRC - Docker 部署工具 (Windows)
echo ========================================
echo.
echo 用法: %0 [命令]
echo.
echo 可用命令：
echo   start       - 启动所有服务
echo   stop        - 停止所有服务
echo   restart     - 重启所有服务
echo   logs        - 查看服务日志
echo   status      - 查看服务状态
echo   init        - 初始化数据库（执行迁移和 seed）
echo   backup      - 备份数据库
echo   clean       - 清理数据卷（谨慎！）
echo   rebuild     - 重建镜像
echo   shell       - 进入应用容器
echo   db-shell    - 进入数据库容器
echo.
echo 示例：
echo   %0 start
echo   %0 logs
echo   %0 init
echo.
exit /b 0

:start_services
echo.
echo ========================================
echo   启动所有服务
echo ========================================
echo.
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 启动失败
    exit /b 1
)
echo [OK] 服务已启动
echo.
echo [INFO] 等待服务就绪...
timeout /t 10 /nobreak
echo.
echo ========================================
echo   服务状态
echo ========================================
docker-compose ps
exit /b 0

:stop_services
echo.
echo ========================================
echo   停止所有服务
echo ========================================
echo.
docker-compose down
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 停止失败
    exit /b 1
)
echo [OK] 服务已停止
exit /b 0

:restart_services
echo.
echo ========================================
echo   重启所有服务
echo ========================================
echo.
docker-compose restart
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 重启失败
    exit /b 1
)
echo [OK] 服务已重启
exit /b 0

:show_logs
echo.
echo ========================================
echo   服务日志 (按 Ctrl+C 退出)
echo ========================================
echo.
docker-compose logs -f --tail=100
exit /b 0

:show_status
echo.
echo ========================================
echo   服务状态
echo ========================================
docker-compose ps
echo.
echo ========================================
echo   资源使用
echo ========================================
docker stats --no-stream
exit /b 0

:init_database
echo.
echo ========================================
echo   初始化数据库
echo ========================================
echo.

REM 检查 PostgreSQL 是否运行
docker ps | findstr /C:"cqupt-src-postgres" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL 容器未运行，请先执行 "%0 start"
    exit /b 1
)

echo [INFO] 执行数据库迁移...
docker-compose exec -T app npx prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 迁移失败
    exit /b 1
)
echo [OK] 数据库迁移完成
echo.

echo [INFO] 执行数据库初始化...
docker-compose exec -T app npx prisma db seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 初始化失败
    exit /b 1
)
echo [OK] 数据库初始化完成
exit /b 0

:backup_database
echo.
echo ========================================
echo   备份数据库
echo ========================================
echo.

REM 检查 PostgreSQL 是否运行
docker ps | findstr /C:"cqupt-src-postgres" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL 容器未运行
    exit /b 1
)

if not exist "backups" mkdir backups

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=backups\postgres_%TIMESTAMP%.sql

echo [INFO] 备份数据库到 %BACKUP_FILE%...
docker-compose exec -T postgres pg_dump -U postgres cqupt_src > %BACKUP_FILE%
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 备份失败
    exit /b 1
)
echo [OK] 数据库备份完成
dir /s %BACKUP_FILE%

REM 备份 Redis
docker ps | findstr /C:"cqupt-src-redis" >nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] 备份 Redis...
    set REDIS_BACKUP=backups\redis_%TIMESTAMP%.rdb
    docker cp cqupt-src-redis:/data/dump.rdb !REDIS_BACKUP!
    echo [OK] Redis 备份完成
)
exit /b 0

:clean_volumes
echo.
echo ========================================
echo   清理数据卷
echo ========================================
echo.
echo [WARNING] 这将删除所有数据库和 Redis 数据！
set /p confirm=确认删除？(y/N):
if /i "%confirm%"=="y" (
    docker-compose down -v
    echo [OK] 数据卷已清理
) else (
    echo [INFO] 操作已取消
)
exit /b 0

:rebuild_images
echo.
echo ========================================
echo   重建镜像
echo ========================================
echo.
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo [OK] 镜像重建完成
exit /b 0

:enter_app_shell
echo.
echo ========================================
echo   进入应用容器
echo ========================================
echo.
docker-compose exec app sh
exit /b 0

:enter_db_shell
echo.
echo ========================================
echo   进入数据库容器
echo ========================================
echo.
docker-compose exec postgres psql -U postgres -d cqupt_src
exit /b 0
