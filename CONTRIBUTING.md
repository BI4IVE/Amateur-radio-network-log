# 贡献指南

感谢您对济南黄河业余无线电台网主控日志系统的关注！我们欢迎所有形式的贡献。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试](#测试)
- [问题反馈](#问题反馈)
- [功能请求](#功能请求)

## 行为准则

- 尊重所有贡献者
- 保持礼貌和专业的沟通
- 欢迎新贡献者并帮助他们融入社区
- 建设性地提供建议和反馈

## 如何贡献

### 报告问题

如果您发现了bug或有功能建议：

1. 先搜索现有的Issues，确认问题未被报告
2. 创建新的Issue，提供详细信息：
   - 清晰的标题
   - 问题描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 截图（如有）
   - 环境信息（操作系统、浏览器、Node.js版本等）

### 修复问题

1. Fork项目仓库
2. 创建特性分支：`git checkout -b fix/issue-xxx`
3. 进行必要的修改
4. 添加测试（如有）
5. 提交更改
6. 推送到您的fork
7. 创建Pull Request

### 添加新功能

1. 先创建一个Issue讨论您的想法
2. 等待维护者确认
3. 创建特性分支：`git checkout -b feature/feature-name`
4. 开发新功能
5. 添加测试
6. 更新文档
7. 提交Pull Request

### 改进文档

1. Fork项目仓库
2. 创建分支：`git checkout -b docs/update-docs`
3. 修改文档
4. 提交更改
5. 创建Pull Request

## 开发流程

### 1. Fork和克隆

```bash
# Fork项目到您的GitHub账号
# 然后克隆您的fork
git clone https://github.com/your-username/radio-log-system.git
cd radio-log-system
```

### 2. 设置上游仓库

```bash
git remote add upstream https://github.com/original-owner/radio-log-system.git
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 创建分支

```bash
# 修复bug
git checkout -b fix/issue-number

# 新功能
git checkout -b feature/feature-name

# 文档更新
git checkout -b docs/update-docs
```

### 5. 开发和测试

```bash
# 运行开发服务器
pnpm dev

# 运行类型检查
npx tsc --noEmit

# 构建项目
pnpm build
```

### 6. 提交更改

```bash
git add .
git commit -m "feat: add new feature"
```

### 7. 推送到fork

```bash
git push origin feature/feature-name
```

### 8. 创建Pull Request

1. 访问GitHub上的fork仓库
2. 点击"New Pull Request"
3. 填写PR模板
4. 等待代码审查

## 代码规范

### TypeScript/JavaScript

- 使用TypeScript进行类型检查
- 使用ESLint进行代码检查
- 遵循函数式编程原则
- 避免使用`any`类型
- 使用const和let，避免使用var
- 使用箭头函数处理回调
- 使用模板字符串

#### 示例

```typescript
// ✅ 好的做法
const fetchData = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};

// ❌ 不好的做法
function fetchData(userId) {
  return fetch('/api/users/' + userId).then(r => r.json());
}
```

### React/Next.js

- 使用函数组件和Hooks
- 遵循React Hooks规则
- 组件名使用PascalCase
- 文件名使用kebab-case或camelCase
- 使用TypeScript定义Props接口

#### 示例

```typescript
// ✅ 好的做法
interface UserCardProps {
  name: string;
  email: string;
  onUpdate: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ name, email, onUpdate }) => {
  return (
    <div className="user-card">
      <h2>{name}</h2>
      <p>{email}</p>
      <button onClick={onUpdate}>Update</button>
    </div>
  );
};

// ❌ 不好的做法
function UserCard(props) {
  return (
    <div>
      <h2>{props.name}</h2>
    </div>
  )
}
```

### 样式（Tailwind CSS）

- 优先使用Tailwind CSS工具类
- 避免内联样式
- 响应式设计使用断点前缀（sm:, md:, lg:）
- 使用语义化的颜色

#### 示例

```jsx
// ✅ 好的做法
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow">
  <h2 className="text-xl font-semibold text-gray-900">标题</h2>
</div>

// ❌ 不好的做法
<div style={{ display: 'flex', padding: '24px', backgroundColor: 'white' }}>
  <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>标题</h2>
</div>
```

### API路由

- 使用Next.js App Router的API路由
- RESTful API设计
- 正确的HTTP状态码
- JSON格式的请求和响应
- 错误处理和日志记录

#### 示例

```typescript
// ✅ 好的做法
import { NextRequest, NextResponse } from 'next/server';
import { logManager } from '@/storage/database';

export async function GET(request: NextRequest) {
  try {
    const users = await logManager.getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// ❌ 不好的做法
export async function GET() {
  const users = await db.query('SELECT * FROM users');
  return Response.json(users);
}
```

### 数据库

- 使用Drizzle ORM
- 使用类型定义
- 事务处理
- SQL注入防护

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### Scope 范围（可选）

- `api`: API路由
- `ui`: 用户界面组件
- `db`: 数据库
- `auth`: 认证相关
- `deps`: 依赖更新

### 示例

```bash
# 新功能
feat(auth): add remember me functionality

# 修复bug
fix(api): resolve database connection timeout

# 文档更新
docs(readme): update installation instructions

# 重构
refactor(db): optimize query performance

# 样式调整
style(ui): improve button hover effects
```

## 测试

### 运行类型检查

```bash
npx tsc --noEmit
```

### 构建检查

```bash
pnpm build
```

### 测试用户流程

1. 启动开发服务器
2. 访问 http://localhost:5000
3. 测试主要功能：
   - 登录/登出
   - 创建台网会话
   - 添加记录
   - 智能联想
   - 数据导出
   - 查询功能
   - 统计功能

### 测试API

使用curl测试API端点：

```bash
# 测试登录
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试获取用户列表
curl http://localhost:5000/api/users
```

## Pull Request指南

### PR标题

使用清晰的描述性标题，遵循提交规范：

```
feat: add dark mode support
fix: resolve session timeout issue
docs: update API documentation
```

### PR描述模板

```markdown
## 变更类型
- [ ] Bug修复
- [ ] 新功能
- [ ] 代码重构
- [ ] 文档更新
- [ ] 其他：_______

## 变更说明
简要描述本次PR的变更内容。

## 相关Issue
Closes #xxx

## 变更截图
如有UI变更，请提供截图。

## 测试
- [ ] 代码已通过类型检查
- [ ] 功能已手动测试
- [ ] 文档已更新（如需要）

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已添加必要的注释
- [ ] 提交信息清晰明确
```

### 审查反馈

1. 维护者会审查您的PR
2. 可能会要求修改
3. 及时响应评论和建议
4. 修改后继续等待审查

## 问题反馈

### 报告bug时请提供

- 清晰的标题
- 详细的描述
- 复现步骤
- 预期行为
- 实际行为
- 截图或录屏
- 环境信息：
  - 操作系统
  - 浏览器版本
  - Node.js版本
  - PostgreSQL版本

### 功能请求时请提供

- 功能的用途和价值
- 期望的功能描述
- 使用场景
- 可能的实现方案（如有）

## 发布流程

### 版本号规范

遵循 [语义化版本](https://semver.org/)：
- `MAJOR.MINOR.PATCH`
- MAJOR：不兼容的API变更
- MINOR：向下兼容的新功能
- PATCH：向下兼容的bug修复

### 发布步骤

1. 更新版本号（package.json）
2. 更新CHANGELOG.md
3. 创建发布标签
4. 生成发布说明
5. 部署到生产环境

## 社区

### 沟通渠道

- GitHub Issues：问题报告和功能请求
- Pull Requests：代码贡献
- Discussions：一般讨论

### 认可贡献者

我们感谢所有贡献者，并在项目的README中列出贡献者。

## 许可证

通过贡献代码，您同意您的代码将在与项目相同的许可下发布。

## 获取帮助

如果您有任何问题：

1. 查看现有Issues和Discussions
2. 阅读项目文档
3. 提问时提供尽可能多的信息
4. 保持耐心和礼貌

---

再次感谢您的贡献！


