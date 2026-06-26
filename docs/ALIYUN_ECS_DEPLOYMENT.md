# RunwayLab 阿里云 ECS 部署指南

本文档用于把 RunwayLab 部署到普通 Linux 服务器，面向中国市场自托管运行。部署方式为 Node.js 20 + PM2 + Nginx + PostgreSQL。

不要把 `.env.production`、`DATABASE_URL`、`SESSION_SECRET`、OSS AccessKey 或任何真实密钥提交到 Git 仓库。

## 1. 推荐 ECS 配置

V1.0 MVP 可以从轻量配置开始：

- 地域：优先选择目标用户附近的中国大陆地域，例如华东 2 上海、华北 2 北京、华南 1 深圳
- 系统：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- CPU / 内存：2 vCPU / 4 GB 起步
- 磁盘：40 GB SSD 起步，图片仍使用本地存储时建议更大
- 带宽：按量或 3 Mbps 起步，视图片访问量调整
- 安全组：开放 22、80、443；不要对公网开放 PostgreSQL 端口
- 数据库：建议使用阿里云 RDS PostgreSQL；测试环境也可先使用 ECS 内 PostgreSQL

生产环境推荐将 PostgreSQL 放在 RDS 或独立数据库服务器上，应用服务器只通过内网连接数据库。

## 2. Ubuntu 初始化

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl wget unzip build-essential ca-certificates
sudo timedatectl set-timezone Asia/Shanghai
```

创建应用目录：

```bash
sudo mkdir -p /var/www/runwaylab
sudo chown -R $USER:$USER /var/www/runwaylab
```

## 3. 安装 Node.js 20

推荐使用 NodeSource：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

确认 Node.js 版本为 20.x 或更高。

## 4. 安装 npm 或 pnpm

当前项目已经包含 `package-lock.json`，生产部署可以直接使用 npm：

```bash
npm -v
```

如团队后续决定使用 pnpm，可以额外安装：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

如果切换 pnpm，需要同步提交对应 lockfile，避免 npm/pnpm 混用。

## 5. 安装 PM2

```bash
sudo npm install -g pm2
pm2 -v
```

设置开机自启：

```bash
pm2 startup systemd
```

按终端提示执行生成的 `sudo env ... pm2 startup ...` 命令。

## 6. 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

## 7. 拉取 GitHub 代码

```bash
cd /var/www
git clone https://github.com/eric251058/runwaylab.git
cd /var/www/runwaylab
```

后续更新：

```bash
cd /var/www/runwaylab
git pull
```

## 8. 配置 `.env.production`

在服务器上创建生产环境变量文件：

```bash
cd /var/www/runwaylab
cp .env.example .env.production
nano .env.production
```

示例结构如下，真实值只写在服务器，不提交到仓库：

```env
DATABASE_URL=
SESSION_SECRET=
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=public/uploads
PUBLIC_UPLOAD_BASE_URL=/uploads
```

说明：

- `DATABASE_URL`：PostgreSQL 连接字符串，建议使用阿里云 RDS PostgreSQL 内网地址
- `SESSION_SECRET`：使用足够长的随机字符串
- `STORAGE_DRIVER=local`：当前使用 ECS 本地磁盘保存图片
- `LOCAL_UPLOAD_DIR=public/uploads`：本地上传目录
- `PUBLIC_UPLOAD_BASE_URL=/uploads`：公开访问路径

生成 `SESSION_SECRET` 示例：

```bash
openssl rand -base64 48
```

## 9. 安装依赖

```bash
cd /var/www/runwaylab
npm install
```

生产服务器也可以使用：

```bash
npm ci
```

如果项目依赖有更新，优先使用 `npm ci` 保持和 `package-lock.json` 一致。

## 10. Prisma generate

```bash
npx prisma generate
```

## 11. 数据库迁移

生产环境不要使用 `prisma migrate dev`。使用：

```bash
npx prisma migrate deploy
```

这会执行已经提交到仓库的 Prisma migrations，不会创建新的迁移文件。

如需导入种子数据，只能在明确需要的测试/预生产环境手动执行：

```bash
npm run db:seed
```

正式生产环境不要在部署流程里自动 seed。

## 12. 构建项目

```bash
npm run build
```

当前构建脚本为：

```bash
prisma generate && next build
```

`next.config.ts` 已启用 `output: "standalone"`，适合普通 Linux 服务器自托管。该配置不影响本地开发，也不破坏 Vercel 部署。

## 13. 使用 PM2 启动 Next.js

项目根目录包含 `ecosystem.config.js`：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 status
pm2 logs runwaylab
```

默认应用监听 `3000` 端口。PM2 配置使用：

- app name: `runwaylab`
- script: `npm`
- args: `start`
- env: `NODE_ENV=production`
- env: `PORT=3000`

重启：

```bash
pm2 restart runwaylab
```

停止：

```bash
pm2 stop runwaylab
```

## 14. 配置 Nginx 反向代理

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/runwaylab
```

示例：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/runwaylab/public/uploads/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/runwaylab /etc/nginx/sites-enabled/runwaylab
sudo nginx -t
sudo systemctl reload nginx
```

如果使用本地图片存储，确保上传目录存在且应用用户可写：

```bash
mkdir -p /var/www/runwaylab/public/uploads
chmod -R 755 /var/www/runwaylab/public/uploads
```

## 15. HTTPS 证书

如果域名已备案并解析到 ECS，可以使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

也可以在阿里云申请免费或商业 SSL 证书，然后把证书配置到 Nginx。无论使用哪种方式，生产环境必须启用 HTTPS，保证登录 Cookie 和后台操作安全。

## 16. 图片存储与阿里云 OSS 预留

当前代码已有存储抽象：

- `src/lib/storage/service.ts` 根据 `STORAGE_DRIVER` 选择存储实现
- `src/lib/storage/local-storage.ts` 当前保存到 `public/uploads`
- `src/lib/storage/object-storage.ts` 预留对象存储实现入口

当前生产可先使用：

```env
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=public/uploads
PUBLIC_UPLOAD_BASE_URL=/uploads
```

后续切换阿里云 OSS 时，建议：

1. 在 `ObjectStorageService` 中接入 Aliyun OSS SDK
2. 新增服务器环境变量，例如 `OSS_REGION`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`OSS_PUBLIC_BASE_URL`
3. 将 `STORAGE_DRIVER` 改为 `object`
4. 新上传图片写入 OSS，旧图片可保留本地或批量迁移
5. 所有 OSS 密钥只配置在 ECS 环境变量或 `.env.production`，不要提交到代码仓库

本次部署准备不强行接入 OSS，避免影响当前已经通过的上传流程。

## 17. 常见问题排查

### 构建失败：Prisma Client 未生成

```bash
npx prisma generate
npm run build
```

确认 `DATABASE_URL` 已配置，并且服务器能连接 PostgreSQL。

### 数据库迁移失败

检查：

```bash
echo $DATABASE_URL
npx prisma migrate status
```

不要在生产环境执行 `prisma migrate dev`。生产环境只使用：

```bash
npx prisma migrate deploy
```

### 端口 3000 被占用

```bash
sudo lsof -i :3000
pm2 status
```

如需改端口，修改 `ecosystem.config.js` 中的 `PORT`，并同步 Nginx `proxy_pass`。

### Nginx 502

检查应用是否启动：

```bash
pm2 status
pm2 logs runwaylab
curl http://127.0.0.1:3000
sudo nginx -t
sudo systemctl status nginx
```

### 图片上传失败

检查上传目录权限：

```bash
ls -ld /var/www/runwaylab/public/uploads
```

确认 Nginx `client_max_body_size` 大于单张图片限制。当前作品图片最大 10MB，建议 Nginx 设置为 `20m`。

### 登录状态丢失

检查：

- `SESSION_SECRET` 是否稳定，没有每次重启变化
- 生产环境是否使用 HTTPS
- 域名和反向代理头是否配置正确

### 更新代码后重启

```bash
cd /var/www/runwaylab
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart runwaylab
```
