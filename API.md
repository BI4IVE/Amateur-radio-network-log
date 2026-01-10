# API 文档

本文档提供济南黄河业余无线电台网主控日志系统的 API 接口说明。

## 基础信息

- **Base URL**: `http://localhost:5000/api` (开发环境)
- **认证方式**: 基于 localStorage 的会话认证
- **数据格式**: JSON
- **字符编码**: UTF-8

## 认证

系统使用基于 localStorage 的客户端会话管理。登录成功后，用户信息存储在浏览器的 localStorage 中。

### 登录

**端点**: `POST /api/auth/login`

**请求体**:
```json
{
  "username": "ADMIN",
  "password": "ADMIN123"
}
```

**成功响应** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "ADMIN",
    "name": "管理员",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误响应** (401):
```json
{
  "error": "用户名或密码错误"
}
```

**说明**:
- 用户名和密码不区分大小写（使用 SQL LOWER 函数）
- 登录成功后，用户信息存储在 localStorage 的 `user` 键中
- 默认管理员账号：`ADMIN` / `ADMIN123`

## 用户管理

### 获取所有用户

**端点**: `GET /api/users`

**响应** (200):
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "BG4ABC",
      "name": "张三",
      "equipment": "IC-7300",
      "antenna": "GP-3",
      "qth": "济南市",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 获取用户选项

**端点**: `GET /api/users/options`

**响应** (200):
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "张三",
      "username": "BG4ABC"
    }
  ]
}
```

### 获取单个用户

**端点**: `GET /api/users/:id`

**响应** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "BG4ABC",
    "name": "张三",
    "role": "user"
  }
}
```

**错误响应** (404):
```json
{
  "error": "用户不存在"
}
```

### 创建用户

**端点**: `POST /api/users`

**请求体**:
```json
{
  "username": "BG4ABC",
  "password": "password123",
  "name": "张三",
  "equipment": "IC-7300",
  "antenna": "GP-3",
  "qth": "济南市",
  "role": "user"
}
```

**响应** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "BG4ABC",
    "name": "张三",
    "role": "user"
  }
}
```

### 更新用户

**端点**: `PUT /api/users/:id`

**请求体**:
```json
{
  "name": "张三",
  "equipment": "IC-9700",
  "antenna": "DP-2000",
  "qth": "北京市",
  "password": "newpassword123"
}
```

**响应** (200):
```json
{
  "user": {
    "id": "uuid",
    "username": "BG4ABC",
    "name": "张三",
    "equipment": "IC-9700",
    "antenna": "DP-2000",
    "qth": "北京市",
    "role": "user"
  }
}
```

**说明**: `password` 字段为可选，不提供则不修改密码。

### 删除用户

**端点**: `DELETE /api/users/:id`

**响应** (200):
```json
{
  "message": "用户已删除"
}
```

## 会话管理

### 创建会话

**端点**: `POST /api/sessions`

**请求体**:
```json
{
  "controllerId": "uuid",
  "controllerName": "张三",
  "controllerEquipment": "IC-7300",
  "controllerAntenna": "GP-3",
  "controllerQth": "济南市",
  "sessionTime": "2024-01-01T08:00:00Z"
}
```

**响应** (200):
```json
{
  "session": {
    "id": "session-uuid",
    "controllerId": "uuid",
    "controllerName": "张三",
    "controllerEquipment": "IC-7300",
    "controllerAntenna": "GP-3",
    "controllerQth": "济南市",
    "sessionTime": "2024-01-01T08:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 获取会话记录

**端点**: `GET /api/sessions/:sessionId/records`

**响应** (200):
```json
{
  "records": [
    {
      "id": "record-uuid",
      "sessionId": "session-uuid",
      "callsign": "BI4K",
      "qth": "青岛市",
      "equipment": "FT-897",
      "antenna": "SL-17",
      "power": "100W",
      "signal": "59",
      "report": null,
      "remarks": null,
      "createdAt": "2024-01-01T08:15:00Z"
    }
  ]
}
```

### 添加记录并同步参与人员

**端点**: `POST /api/sessions/:sessionId/records/with-participant`

**请求体**:
```json
{
  "callsign": "BI4K",
  "qth": "青岛市",
  "equipment": "FT-897",
  "antenna": "SL-17",
  "power": "100W",
  "signal": "59",
  "report": null,
  "remarks": null
}
```

**响应** (200):
```json
{
  "record": {
    "id": "record-uuid",
    "callsign": "BI4K",
    "qth": "青岛市",
    "equipment": "FT-897",
    "antenna": "SL-17",
    "power": "100W",
    "signal": "59",
    "createdAt": "2024-01-01T08:15:00Z"
  },
  "updated": true
}
```

**说明**:
- 如果参与人员库中存在该呼号，则更新信息
- 如果不存在，则创建新的参与人员记录
- `updated` 字段表示是否更新了现有记录

### 更新记录

**端点**: `PUT /api/sessions/:sessionId/records/:recordId`

**请求体**:
```json
{
  "callsign": "BI4K",
  "qth": "青岛市",
  "equipment": "FT-897D",
  "antenna": "SL-17",
  "power": "50W",
  "signal": "59+20",
  "report": "QTH 青岛市南区",
  "remarks": "信号良好"
}
```

**响应** (200):
```json
{
  "record": {
    "id": "record-uuid",
    "callsign": "BI4K",
    "qth": "青岛市",
    "equipment": "FT-897D",
    "antenna": "SL-17",
    "power": "50W",
    "signal": "59+20",
    "report": "QTH 青岛市南区",
    "remarks": "信号良好",
    "createdAt": "2024-01-01T08:15:00Z"
  }
}
```

### 删除记录

**端点**: `DELETE /api/sessions/:sessionId/records/:recordId`

**响应** (200):
```json
{
  "message": "记录已删除"
}
```

### 导出 Excel

**端点**: `GET /api/sessions/:sessionId/export`

**响应**: Excel 文件 (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

**Content-Disposition**: `attachment; filename="台网日志_2024-01-01.xlsx"`

## 参与人员管理

### 获取所有参与人员

**端点**: `GET /api/participants`

**查询参数**:
- `page`: 页码（可选，默认 1）
- `limit`: 每页数量（可选，默认 50）

**响应** (200):
```json
{
  "participants": [
    {
      "id": "uuid",
      "callsign": "BI4K",
      "name": "李四",
      "qth": "青岛市",
      "equipment": "FT-897",
      "antenna": "SL-17",
      "power": "100W",
      "signal": "59",
      "report": null,
      "remarks": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T08:15:00Z"
    }
  ]
}
```

### 搜索参与人员

**端点**: `GET /api/participants/search`

**查询参数**:
- `callsign`: 呼号（必填）

**响应** (200):
```json
{
  "participants": [
    {
      "id": "uuid",
      "callsign": "BI4K",
      "name": "李四",
      "qth": "青岛市",
      "equipment": "FT-897",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 查询参与记录

**端点**: `GET /api/participants/records`

**查询参数**:
- `callsign`: 呼号（必填）

**响应** (200):
```json
{
  "records": [
    {
      "id": "record-uuid",
      "sessionId": "session-uuid",
      "callsign": "BI4K",
      "qth": "青岛市",
      "equipment": "FT-897",
      "antenna": "SL-17",
      "power": "100W",
      "signal": "59",
      "createdAt": "2024-01-01T08:15:00Z"
    }
  ]
}
```

### 创建或更新参与人员

**端点**: `POST /api/participants/upsert`

**请求体**:
```json
{
  "callsign": "BI4K",
  "name": "李四",
  "qth": "青岛市",
  "equipment": "FT-897",
  "antenna": "SL-17",
  "power": "100W",
  "signal": "59",
  "report": null,
  "remarks": null
}
```

**响应** (200):
```json
{
  "participant": {
    "id": "uuid",
    "callsign": "BI4K",
    "name": "李四",
    "qth": "青岛市",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T08:15:00Z"
  }
}
```

## 历史记录搜索

### 搜索记录字段值

**端点**: `GET /api/records/search`

**查询参数**:
- `field`: 字段名（必填）- 可选值：`qth`, `equipment`, `antenna`, `power`, `signal`, `report`, `remarks`
- `query`: 搜索关键词（必填）

**响应** (200):
```json
{
  "values": [
    "青岛市",
    "青岛市南区",
    "青岛市市北区"
  ]
}
```

## 管理统计

### 获取统计信息

**端点**: `GET /api/admin/stats`

**查询参数**:
- `startDate`: 开始日期（可选，格式：YYYY-MM-DD）
- `endDate`: 结束日期（可选，格式：YYYY-MM-DD）
- `controllerId`: 主控人员 ID（可选，用于权限控制）

**响应** (200):
```json
{
  "stats": {
    "totalSessions": 10,
    "totalRecords": 150,
    "totalUniqueCallsigns": 45
  },
  "sessions": [
    {
      "id": "session-uuid",
      "controllerId": "uuid",
      "controllerName": "张三",
      "controllerEquipment": "IC-7300",
      "controllerAntenna": "GP-3",
      "controllerQth": "济南市",
      "sessionTime": "2024-01-01T08:00:00Z",
      "recordCount": 15,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "callsignStats": [
    {
      "callsign": "BI4K",
      "count": 5
    }
  ]
}
```

### 获取会话详情

**端点**: `GET /api/admin/stats/session/:id`

**响应** (200):
```json
{
  "session": {
    "id": "session-uuid",
    "controllerId": "uuid",
    "controllerName": "张三",
    "controllerEquipment": "IC-7300",
    "controllerAntenna": "GP-3",
    "controllerQth": "济南市",
    "sessionTime": "2024-01-01T08:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "records": [
    {
      "id": "record-uuid",
      "sessionId": "session-uuid",
      "callsign": "BI4K",
      "qth": "青岛市",
      "equipment": "FT-897",
      "antenna": "SL-17",
      "power": "100W",
      "signal": "59",
      "report": null,
      "remarks": null,
      "createdAt": "2024-01-01T08:15:00Z"
    }
  ]
}
```

**错误响应** (404):
```json
{
  "error": "会话不存在"
}
```

## 证书生成

### 生成证书

**端点**: `POST /api/certificates/generate`

**请求体**:
```json
{
  "callsign": "BI4K",
  "name": "李四",
  "participations": [
    {
      "sessionDate": "2024-01-01",
      "sessionController": "张三"
    },
    {
      "sessionDate": "2024-01-08",
      "sessionController": "王五"
    }
  ],
  "issueDate": "2024-01-15",
  "certificateNo": "CERT-2024-001"
}
```

**响应** (200):
```json
{
  "certificate": {
    "id": "certificate-uuid",
    "callsign": "BI4K",
    "name": "李四",
    "participations": 2,
    "issueDate": "2024-01-15",
    "certificateNo": "CERT-2024-001",
    "fileUrl": "https://s3.amazonaws.com/bucket/certificate.pdf"
  }
}
```

## 系统初始化

### 初始化管理员

**端点**: `POST /api/init`

**响应** (200):
```json
{
  "message": "管理员已初始化"
}
```

**说明**:
- 检查是否存在管理员账户
- 如果不存在，创建默认管理员（ADMIN/ADMIN123）
- 可以多次调用，不会重复创建

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（认证失败） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 数据模型

### User（用户）
```typescript
interface User {
  id: string
  username: string
  name: string
  equipment?: string
  antenna?: string
  qth?: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt?: string
}
```

### LogSession（台网会话）
```typescript
interface LogSession {
  id: string
  controllerId: string
  controllerName: string
  controllerEquipment?: string
  controllerAntenna?: string
  controllerQth?: string
  sessionTime: string
  createdAt: string
}
```

### LogRecord（台网记录）
```typescript
interface LogRecord {
  id: string
  sessionId: string
  callsign: string
  qth?: string
  equipment?: string
  antenna?: string
  power?: string
  signal?: string
  report?: string
  remarks?: string
  createdAt: string
}
```

### Participant（参与人员）
```typescript
interface Participant {
  id: string
  callsign: string
  name?: string
  qth?: string
  equipment?: string
  antenna?: string
  power?: string
  signal?: string
  report?: string
  remarks?: string
  createdAt: string
  updatedAt?: string
}
```

## 使用示例

### 使用 curl

```bash
# 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ADMIN","password":"ADMIN123"}'

# 获取所有用户
curl http://localhost:5000/api/users

# 创建会话
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "controllerId": "uuid",
    "controllerName": "张三",
    "sessionTime": "2024-01-01T08:00:00Z"
  }'

# 添加记录
curl -X POST http://localhost:5000/api/sessions/session-uuid/records/with-participant \
  -H "Content-Type: application/json" \
  -d '{
    "callsign": "BI4K",
    "qth": "青岛市",
    "power": "100W",
    "signal": "59"
  }'
```

### 使用 JavaScript (fetch)

```javascript
// 登录
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'ADMIN',
    password: 'ADMIN123'
  })
})
const { user } = await loginResponse.json()
localStorage.setItem('user', JSON.stringify(user))

// 创建会话
const sessionResponse = await fetch('/api/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    controllerId: user.id,
    controllerName: user.name,
    sessionTime: new Date().toISOString()
  })
})
const { session } = await sessionResponse.json()

// 添加记录
const recordResponse = await fetch(`/api/sessions/${session.id}/records/with-participant`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    callsign: 'BI4K',
    qth: '青岛市',
    power: '100W',
    signal: '59'
  })
})
```

## 注意事项

1. **认证**: 大部分 API 需要先登录，用户信息存储在 localStorage 中
2. **权限**: 某些 API（如用户管理）仅限管理员访问
3. **时区**: 所有时间戳使用 UTC 时区
4. **字符集**: 呼号等字段不区分大小写（存储时自动转换为大写）
5. **数据验证**: 所有输入数据都会进行验证和清理

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- 实现基础的用户、会话、记录管理功能
- 支持 Excel 导出
- 实现权限控制（管理员/普通主控）
