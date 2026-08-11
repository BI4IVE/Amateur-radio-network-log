#!/bin/sh
# 一体化容器启动脚本：初始化内置 PostgreSQL -> 建库 -> 建表 -> 启动应用
set -e

# ---------- 数据库配置（均可被环境变量覆盖）----------
DB_USER=${PG_USER:-radio}
DB_PASS=${PG_PASS:-radio}
DB_NAME=${PG_DB:-radio_network_log}
DB_HOST=127.0.0.1
DB_PORT=5432
PGDATA=/var/lib/postgresql/data

# 若用户未提供 DATABASE_URL，则使用内置 PostgreSQL
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# JWT 签名密钥：未设置则自动生成随机值（重启会变化，建议用 -e 固定）
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(openssl rand -base64 48)
  echo "[entrypoint] 未设置 JWT_SECRET，已自动生成随机值（重启将变化，建议用 -e JWT_SECRET=... 固定）"
fi

# 管理员初始密码：未设置则自动生成并打印到日志
if [ -z "$ADMIN_INIT_PASSWORD" ]; then
  export ADMIN_INIT_PASSWORD=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 12)
  echo "[entrypoint] 未设置 ADMIN_INIT_PASSWORD，已自动生成管理员密码: ${ADMIN_INIT_PASSWORD}"
else
  echo "[entrypoint] 使用环境变量中的 ADMIN_INIT_PASSWORD 作为管理员密码"
fi

export PORT=5000
export NODE_ENV=production

# ---------- 初始化并启动 PostgreSQL ----------
mkdir -p "$PGDATA"
chown -R postgres "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[entrypoint] 初始化 PostgreSQL 数据目录..."
  su postgres -c "initdb -D $PGDATA --auth=trust" >/dev/null 2>&1
fi

echo "[entrypoint] 启动 PostgreSQL..."
su postgres -c "pg_ctl -D $PGDATA -o '-c listen_addresses=* -p $DB_PORT' -l /tmp/pg.log start" \
  || su postgres -c "pg_ctl -D $PGDATA -o '-c listen_addresses=* -p $DB_PORT' -l /tmp/pg.log restart"

# 等待 PostgreSQL 就绪
for i in $(seq 1 30); do
  if su postgres -c "pg_isready -h $DB_HOST -p $DB_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 创建用户与数据库（幂等）
su postgres -c "psql -h $DB_HOST -p $DB_PORT -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';\"" 2>/dev/null || true
su postgres -c "psql -h $DB_HOST -p $DB_PORT -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\"" 2>/dev/null || true

# ---------- 建表 ----------
echo "[entrypoint] 执行数据库迁移 (pnpm db:push)..."
cd /app
pnpm db:push

# ---------- 启动应用 ----------
echo "[entrypoint] 启动完成。访问 http://localhost:5000 （管理员 ADMIN / 密码见上方 ADMIN_INIT_PASSWORD）"
exec pnpm start
