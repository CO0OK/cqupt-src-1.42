# 多阶段构建：Stage 1 - 构建前端和后端
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 安装依赖
RUN npm ci

# 生成 Prisma Client
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npm run db:generate

# 复制源代码
COPY src ./src
COPY public ./public
COPY vite.config.ts tsconfig.json server.ts index.html ./
COPY eslint.config.js ./

# 构建前端
RUN npm run build && \
    npx esbuild server.ts --bundle --platform=node --outfile=dist/server.js --format=esm --packages=external

# Stage 2 - 运行时镜像
FROM node:22-alpine

WORKDIR /app

# 安装 dumb-init 处理信号转发
RUN apk add --no-cache dumb-init

# 复制 package 文件和 prisma schema
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 仅安装生产依赖
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
