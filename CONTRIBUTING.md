# 贡献指南

感谢您对济南黄河业余无线电台网主控日志系统项目的关注！本指南将帮助您了解如何为项目做出贡献。

## 目录
- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [代码规范](#代码规范)
- [提交流程](#提交流程)
- [问题反馈](#问题反馈)

## 行为准则

- 尊重所有贡献者
- 保持友好和建设性的讨论
- 接受并建设性地批评
- 关注对社区最有利的事情

## 如何贡献

### 报告 Bug

1. 搜索现有的 [Issues](../../issues)
2. 创建新的 Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 期望行为
   - 实际行为
   - 截图或日志（如果有）
   - 环境信息（OS、Node.js 版本、浏览器等）

### 提出功能请求

1. 搜索现有的 [Issues](../../issues) 和 [Pull Requests](../../pulls)
2. 创建新的 Issue，包含：
   - 清晰的标题
   - 详细的功能描述
   - 使用场景
   - 期望的解决方案
   - 替代方案（如果有）

### 提交代码

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/your-feature-name`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feature/your-feature-name`
5. 创建 Pull Request

## 开发环境

### 设置开发环境

```bash
# 1. 克隆仓库
git clone <your-fork-url>
cd projects

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的配置

# 4. 启动开发服务器
pnpm dev
```

### 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── admin/             # 管理页面
│   ├── query/             # 查询页面
│   ├── login/             # 登录页面
│   └── page.tsx           # 主页面
├── components/            # 可复用组件（如有）
├── storage/               # 数据层
│   └── database/          # 数据库管理
└── types/                # TypeScript 类型定义（如有）
```

### 调试

```bash
# 运行开发模式
pnpm dev

# 类型检查
npx tsc --noEmit

# 构建检查
pnpm build

# Lint 检查
pnpm lint
```

## 代码规范

### TypeScript

- 使用严格的 TypeScript 模式
- 为所有函数参数和返回值添加类型注解
- 避免使用 `any` 类型
- 使用接口（Interface）定义对象结构

示例：
```typescript
// ✅ 推荐
interface User {
  id: string
  name: string
  role: 'admin' | 'user'
}

function getUser(id: string): Promise<User> {
  return userManager.getUserById(id)
}

// ❌ 不推荐
function getUser(id: any): any {
  return userManager.getUserById(id)
}
```

### React 组件

- 使用函数式组件
- 使用 Hooks（useState、useEffect 等）
- Props 使用 TypeScript 接口定义
- 组件名称使用 PascalCase

示例：
```typescript
// ✅ 推荐
interface Props {
  title: string
  onSubmit: () => void
}

export function Button({ title, onSubmit }: Props) {
  return <button onClick={onSubmit}>{title}</button>
}

// ❌ 不推荐
function button(props) {
  return <button>{props.title}</button>
}
```

### 样式

- 使用 Tailwind CSS 类名
- 避免内联样式（除特殊情况）
- 保持一致的间距和颜色方案

示例：
```tsx
// ✅ 推荐
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  ...
</div>

// ❌ 不推荐
<div style={{ display: 'flex', padding: '16px', backgroundColor: 'white' }}>
  ...
</div>
```

### 命名规范

- **文件名**：kebab-case (e.g., `user-manager.ts`)
- **组件名**：PascalCase (e.g., `UserProfile.tsx`)
- **函数名**：camelCase (e.g., `getUserById`)
- **常量名**：UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **接口名**：PascalCase (e.g., `User`, `Session`)

### 注释规范

- 为复杂逻辑添加注释
- JSDoc 格式的函数注释（可选）

示例：
```typescript
/**
 * 根据用户 ID 获取用户信息
 * @param id - 用户 ID
 * @returns 用户信息，如果不存在则返回 null
 */
async function getUserById(id: string): Promise<User | null> {
  return await db.query.users.findFirst({
    where: eq(users.id, id)
  })
}
```

## Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新增功能，也不是修复 Bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具配置
- `ci`: CI/CD 相关

### 示例

```bash
feat(api): add user authentication endpoint
feat(frontend): add session history page
fix(database): resolve connection pool issue
docs(readme): update installation instructions
style(ui): improve button hover effect
refactor(auth): simplify login logic
perf(images): optimize image loading
test(api): add unit tests for user service
chore(deps): update dependencies to latest version
```

### Commit Message 最佳实践

- ✅ 使用现在时态："add" 而不是 "added"
- ✅ 首字母小写
- ✅ 结尾不要句号
- ✅ 简洁明了（不超过 50 字符）
- ✅ 包含必要的说明（在 body 部分）

示例：
```bash
# ✅ 推荐
feat(auth): add OAuth2 support for Google login

- Implement Google OAuth2 flow
- Add user profile synchronization
- Update login UI

# ❌ 不推荐
feat: add login
Fixed some bugs.
```

## Pull Request 流程

### 1. 创建分支

```bash
# 功能分支
git checkout -b feature/your-feature-name

# Bug 修复分支
git checkout -b fix/bug-description

# 文档更新分支
git checkout -b docs/update-readme
```

### 2. 提交更改

```bash
# 添加文件
git add .

# 提交
git commit -m 'feat: add your feature description'
```

### 3. 推送到远程

```bash
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

1. 在 GitHub 上创建 Pull Request
2. 填写 PR 模板（如果有）
3. 描述更改内容
4. 关联相关的 Issue
5. 等待代码审查

### PR 标题格式

```
<type>: <subject>
```

示例：
```
feat: Add session history page
fix: Resolve database connection timeout
docs: Update API documentation
```

### PR 描述模板

```markdown
## 更改描述
简要描述此 PR 的更改内容。

## 更改类型
- [ ] 新功能 (feature)
- [ ] Bug 修复 (bugfix)
- [ ] 文档更新 (documentation)
- [ ] 性能优化 (performance)
- [ ] 代码重构 (refactor)

## 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 手动测试

## 关联 Issue
Closes #(issue number)

## 截图/演示
（如有 UI 更改，请提供截图或 GIF）

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已进行类型检查 (npx tsc --noEmit)
- [ ] 已通过 lint 检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
```

## 代码审查

### 审查要点

- 代码是否符合项目规范
- 是否有潜在的性能问题
- 是否有安全隐患
- 测试是否充分
- 文档是否需要更新

### 审查流程

1. 自动化检查（CI）
2. 同行审查
3. 修改反馈
4. 批准合并

## 问题反馈

### 报告 Bug

使用 Issue 模板报告 Bug：

```markdown
**Bug 描述**
清晰简短地描述 Bug。

**复现步骤**
1. 访问 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**期望行为**
描述您期望发生什么。

**截图**
如果适用，添加截图来帮助解释问题。

**环境**
- OS: [e.g. Ubuntu 20.04]
- Node.js 版本: [e.g. v24.x.x]
- 浏览器: [e.g. Chrome 120]
- 数据库: [e.g. PostgreSQL 15]
```

### 功能请求

```markdown
**问题描述**
清晰简短地描述您想要的功能。

**解决方案**
描述您想要的解决方案。

**替代方案**
描述您考虑过的任何替代解决方案。

**附加信息**
添加任何其他关于功能请求的上下文或截图。
```

## 项目规范总结

### 技术栈
- **框架**: Next.js 16 (App Router)
- **UI**: React 19
- **样式**: Tailwind CSS 4
- **语言**: TypeScript 5
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM

### 开发工具
- **包管理器**: pnpm
- **代码格式**: ESLint + Prettier (如配置)
- **类型检查**: TypeScript
- **版本控制**: Git

### 设计原则
- 简洁优于复杂
- 可读性优于简洁
- 可维护性优先
- 性能优化
- 安全性优先

## 获取帮助

如果您有任何问题：

1. 查看 [文档](README.md)
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue
4. 在讨论区提问

## 许可证

通过贡献代码，您同意您的贡献将根据项目的许可证进行授权。

---

感谢您的贡献！
