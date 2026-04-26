#!/bin/bash

# CQUPT SRC - Docker 部署启动脚本
# 用法: ./deploy.sh [命令]
# 命令: start | stop | restart | logs | status | init | clean | backup

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_NAME="cqupt-src"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# 函数定义
print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    print_success "Docker 环境检查通过"
}

check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在"
        if [ -f ".env.example" ]; then
            print_info "正在复制 .env.example 为 .env"
            cp .env.example .env
            print_warning "请编辑 .env 文件并设置正确的配置"
        fi
    fi
}

start_services() {
    print_header "启动所有服务"
    check_env
    docker-compose up -d
    print_success "服务已启动"
    
    print_info "等待服务就绪..."
    sleep 10
    
    # 检查服务状态
    print_header "服务状态"
    docker-compose ps
}

stop_services() {
    print_header "停止所有服务"
    docker-compose down
    print_success "服务已停止"
}

restart_services() {
    print_header "重启所有服务"
    docker-compose restart
    print_success "服务已重启"
}

show_logs() {
    print_header "服务日志"
    docker-compose logs -f --tail=100
}

show_status() {
    print_header "服务状态"
    docker-compose ps
    
    print_header "资源使用"
    docker stats --no-stream
}

init_database() {
    print_header "初始化数据库"
    
    if [ ! "$(docker ps -q -f name=postgres)" ]; then
        print_error "PostgreSQL 容器未运行，请先执行 'deploy.sh start'"
        exit 1
    fi
    
    print_info "执行数据库迁移..."
    docker-compose exec -T app npx prisma migrate deploy
    print_success "数据库迁移完成"
    
    print_info "执行数据库初始化..."
    docker-compose exec -T app npx prisma db seed
    print_success "数据库初始化完成"
}

backup_database() {
    print_header "备份数据库"
    
    if [ ! "$(docker ps -q -f name=postgres)" ]; then
        print_error "PostgreSQL 容器未运行"
        exit 1
    fi
    
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/postgres_${TIMESTAMP}.sql"
    
    print_info "备份数据库到 $BACKUP_FILE..."
    docker-compose exec -T postgres pg_dump -U postgres cqupt_src > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "数据库备份完成"
        ls -lh "$BACKUP_FILE"
    else
        print_error "备份失败"
        exit 1
    fi
    
    # 备份 Redis
    if [ "$(docker ps -q -f name=redis)" ]; then
        print_info "备份 Redis..."
        REDIS_BACKUP="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
        docker cp cqupt-src-redis:/data/dump.rdb "$REDIS_BACKUP"
        print_success "Redis 备份完成"
        ls -lh "$REDIS_BACKUP"
    fi
}

clean_volumes() {
    print_header "清理数据卷"
    print_warning "这将删除所有数据库和 Redis 数据！"
    read -p "确认删除？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        print_success "数据卷已清理"
    else
        print_info "操作已取消"
    fi
}

rebuild_images() {
    print_header "重建镜像"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    print_success "镜像重建完成"
}

enter_app_shell() {
    print_header "进入应用容器"
    docker-compose exec app sh
}

enter_db_shell() {
    print_header "进入数据库容器"
    docker-compose exec postgres psql -U postgres -d cqupt_src
}

# 主逻辑
main() {
    if [ $# -eq 0 ]; then
        print_header "CQUPT SRC - Docker 部署工具"
        echo ""
        echo "用法: $0 [命令]"
        echo ""
        echo "可用命令："
        echo "  start       - 启动所有服务"
        echo "  stop        - 停止所有服务"
        echo "  restart     - 重启所有服务"
        echo "  logs        - 查看服务日志"
        echo "  status      - 查看服务状态"
        echo "  init        - 初始化数据库（执行迁移和 seed）"
        echo "  backup      - 备份数据库"
        echo "  clean       - 清理数据卷（谨慎！）"
        echo "  rebuild     - 重建镜像"
        echo "  shell       - 进入应用容器"
        echo "  db-shell    - 进入数据库容器"
        echo ""
        echo "示例："
        echo "  $0 start"
        echo "  $0 logs"
        echo "  $0 init"
        exit 0
    fi
    
    check_docker
    
    case "$1" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        init)
            init_database
            ;;
        backup)
            backup_database
            ;;
        clean)
            clean_volumes
            ;;
        rebuild)
            rebuild_images
            ;;
        shell)
            enter_app_shell
            ;;
        db-shell)
            enter_db_shell
            ;;
        *)
            print_error "未知命令: $1"
            echo "执行 '$0' 查看帮助"
            exit 1
            ;;
    esac
}

main "$@"
