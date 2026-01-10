# API 文档

本文档详细描述了济南黄河业余无线电台网主控日志系统的所有API接口。

## 目录

- [认证相关](#认证相关)
- [用户管理](#用户管理)
- [会话管理](#会话管理)
- [记录管理](#记录管理)
- [参与人员管理](#参与人员管理)
- [统计与分析](#统计与分析)
- [系统管理](#系统管理)
- [调试接口](#调试接口)

## 通用信息

### 基础URL

```
开发环境: http://localhost:5000
生产环境: https://your-domain.com
```

### 请求格式

所有API请求和响应均使用JSON格式。

```
Content-Type: application/json
```

### 响应格式

#### 成功响应

```json
{
  "data": { ... },
  "message": "操作成功"
}
```

#### 错误响应

```json
{
  "error": "错误描述"
}
```

### HTTP状态码

- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未授权
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器错误

## 认证相关

### 登录

```http
POST /api/auth/login
```

**请求体：**

```json
{
  "username": "ADMIN",
  "password": "ADMIN123"
}
```

**响应：**

```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "管理员",
    "role": "admin",
    "equipment": null,
    "antenna": null,
    "qth": null
  },
  "token": "jwt_token"
}
```

**说明：**
- 用户名和密码不区分大小写
- 成功后返回用户信息和token（如果使用JWT）

---

## 用户管理

### 获取用户列表

```http
GET /api/users
```

**响应：**

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "admin",
      "name": "管理员",
      "role": "admin",
      "equipment": "IC-7300",
      "antenna": "GP天线",
      "qth": "济南",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 创建用户

```http
POST /api/users
```

**请求体：**

```json
{
  "username": "bi4k",
  "password": "password123",
  "name": "张三",
  "equipment": "FT-991A",
  "antenna": "八木天线",
  "qth": "济南历下",
  "role": "user"
}
```

**响应：**

```json
{
  "user": {
    "id": "uuid",
    "username": "bi4k",
    "name": "张三",
    "role": "user",
    "equipment": "FT-991A",
    "antenna": "八木天线",
    "qth": "济南历下"
  }
}
```

### 更新用户

```http
PUT /api/users/:id
```

**请求体：**

```json
{
  "name": "张三",
  "equipment": "FT-991A",
  "antenna": "八木天线",
  "qth": "济南历下",
  "password": "newpassword123"
}
```

**响应：**

```json
{
  "user": {
    "id": "uuid",
    "username": "bi4k",
    "name": "张三",
    "equipment": "FT-991A",
    "antenna": "八木天线",
    "qth": "济南历下"
  }
}
```

### 删除用户

```http
DELETE /api/users/:id
```

**响应：**

```json
{
  "message": "用户删除成功"
}
```

### 获取用户选项

```http
GET /api/users/options
```

**响应：**

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "bi4k",
      "name": "张三"
    }
  ]
}
```

---

## 会话管理

### 获取会话列表

```http
GET /api/sessions
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| controllerId | string | 否 | 按主控ID过滤 |

**响应：**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "controllerId": "uuid",
      "controllerName": "张三",
      "controllerEquipment": "FT-991A",
      "controllerAntenna": "八木天线",
      "controllerQth": "济南历下",
      "sessionTime": "2024-01-01T19:00:00Z",
      "createdAt": "2024-01-01T19:00:00Z"
    }
  ]
}
```

### 创建会话

```http
POST /api/sessions
```

**请求体：**

```json
{
  "controllerId": "uuid",
  "controllerName": "张三",
  "controllerEquipment": "FT-991A",
  "controllerAntenna": "八木天线",
  "controllerQth": "济南历下",
  "sessionTime": "2024-01-01T19:00:00Z"
}
```

**响应：**

```json
{
  "session": {
    "id": "uuid",
    "controllerId": "uuid",
    "controllerName": "张三",
    "controllerEquipment": "FT-991A",
    "controllerAntenna": "八木天线",
    "controllerQth": "济南历下",
    "sessionTime": "2024-01-01T19:00:00Z"
  }
}
```

### 导出会话记录为Excel

```http
GET /api/sessions/:sessionId/export
```

**响应：**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 返回Excel文件流

---

## 记录管理

### 获取会话的所有记录

```http
GET /api/sessions/:sessionId/records
```

**响应：**

```json
{
  "records": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "callsign": "BI4K",
      "qth": "济南",
      "equipment": "FT-991A",
      "antenna": "GP天线",
      "power": "100W",
      "signal": "59",
      "report": "QSL",
      "remarks": "信号很好",
      "createdAt": "2024-01-01T19:05:00Z"
    }
  ]
}
```

### 添加记录（同步到参与人员库）

```http
POST /api/sessions/:sessionId/records/with-participant
```

**请求体：**

```json
{
  "callsign": "BI4K",
  "qth": "济南",
  "equipment": "FT-991A",
  "antenna": "GP天线",
  "power": "100W",
  "signal": "59",
  "report": "QSL",
  "remarks": "信号很好"
}
```

**响应：**

```json
{
  "record": {
    "id": "uuid",
    "sessionId": "uuid",
    "callsign": "BI4K",
    "qth": "济南",
    "equipment": "FT-991A",
    "antenna": "GP天线",
    "power": "100W",
    "signal": "59",
    "report": "QSL",
    "remarks": "信号很好",
    "createdAt": "2024-01-01T19:05:00Z"
  },
  "updated": false
}
```

**说明：**
- `updated`字段表示参与人员库是否已存在并更新

### 更新记录

```http
PUT /api/sessions/:sessionId/records/:recordId
```

**请求体：**

```json
{
  "callsign": "BI4K",
  "qth": "济南",
  "equipment": "FT-991A",
  "antenna": "GP天线",
  "power": "100W",
  "signal": "59",
  "report": "QSL",
  "remarks": "信号很好"
}
```

**响应：**

```json
{
  "record": {
    "id": "uuid",
    "sessionId": "uuid",
    "callsign": "BI4K",
    "qth": "济南",
    "equipment": "FT-991A",
    "antenna": "GP天线",
    "power": "100W",
    "signal": "59",
    "report": "QSL",
    "remarks": "信号很好",
    "createdAt": "2024-01-01T19:05:00Z"
  }
}
```

### 删除记录

```http
DELETE /api/sessions/:sessionId/records/:recordId
```

**响应：**

```json
{
  "message": "记录删除成功"
}
```

### 搜索历史记录字段值

```http
GET /api/records/search?field=<field>&query=<query>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| field | string | 是 | 字段名称（qth/equipment/antenna/power/signal/report/remarks） |
| query | string | 是 | 搜索关键词 |

**响应：**

```json
{
  "values": [
    "济南",
    "青岛",
    "烟台"
  ]
}
```

### 获取呼号统计

```http
GET /api/records/callsign-stats
```

**响应：**

```json
{
  "stats": [
    {
      "callsign": "BI4K",
      "count": 10
    },
    {
      "callsign": "BI4L",
      "count": 8
    }
  ]
}
```

---

## 参与人员管理

### 获取参与人员列表

```http
GET /api/participants
```

**响应：**

```json
{
  "participants": [
    {
      "id": "uuid",
      "callsign": "BI4K",
      "name": "张三",
      "qth": "济南",
      "equipment": "FT-991A",
      "antenna": "GP天线",
      "power": "100W",
      "signal": "59",
      "report": "QSL",
      "remarks": "信号很好",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 搜索参与人员

```http
GET /api/participants/search?callsign=<callsign>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| callsign | string | 是 | 呼号（支持模糊搜索） |

**响应：**

```json
{
  "participants": [
    {
      "id": "uuid",
      "callsign": "BI4K",
      "name": "张三",
      "qth": "济南",
      "equipment": "FT-991A",
      "antenna": "GP天线",
      "power": "100W",
      "signal": "59"
    }
  ]
}
```

### 更新或插入参与人员

```http
POST /api/participants/upsert
```

**请求体：**

```json
{
  "callsign": "BI4K",
  "name": "张三",
  "qth": "济南",
  "equipment": "FT-991A",
  "antenna": "GP天线",
  "power": "100W",
  "signal": "59",
  "report": "QSL",
  "remarks": "信号很好"
}
```

**响应：**

```json
{
  "participant": {
    "id": "uuid",
    "callsign": "BI4K",
    "name": "张三",
    "qth": "济南",
    "equipment": "FT-991A"
  },
  "updated": false
}
```

**说明：**
- 如果呼号已存在，则更新记录，`updated`为true
- 如果呼号不存在，则创建新记录，`updated`为false

### 获取参与人员选项

```http
GET /api/participants/options
```

**响应：**

```json
{
  "participants": [
    {
      "id": "uuid",
      "callsign": "BI4K",
      "name": "张三"
    }
  ]
}
```

### 删除参与人员

```http
DELETE /api/participants/:id
```

**响应：**

```json
{
  "message": "参与人员删除成功"
}
```

---

## 统计与分析

### 获取台网统计

```http
GET /api/admin/stats
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期（YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（YYYY-MM-DD） |
| controllerId | string | 否 | 主控ID（非管理员仅能查询自己） |

**响应：**

```json
{
  "stats": {
    "totalSessions": 5,
    "totalRecords": 50,
    "totalUniqueCallsigns": 20
  },
  "sessions": [
    {
      "id": "uuid",
      "controllerId": "uuid",
      "controllerName": "张三",
      "controllerEquipment": "FT-991A",
      "controllerAntenna": "八木天线",
      "controllerQth": "济南历下",
      "sessionTime": "2024-01-01T19:00:00Z",
      "createdAt": "2024-01-01T19:00:00Z",
      "recordCount": 10
    }
  ],
  "callsignStats": [
    {
      "callsign": "BI4K",
      "count": 10
    },
    {
      "callsign": "BI4L",
      "count": 8
    }
  ]
}
```

### 获取会话详情

```http
GET /api/admin/stats/session/:id
```

**响应：**

```json
{
  "session": {
    "id": "uuid",
    "controllerId": "uuid",
    "controllerName": "张三",
    "controllerEquipment": "FT-991A",
    "controllerAntenna": "八木天线",
    "controllerQth": "济南历下",
    "sessionTime": "2024-01-01T19:00:00Z",
    "createdAt": "2024-01-01T19:00:00Z"
  },
  "records": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "callsign": "BI4K",
      "qth": "济南",
      "equipment": "FT-991A",
      "antenna": "GP天线",
      "power": "100W",
      "signal": "59",
      "report": "QSL",
      "remarks": "信号很好",
      "createdAt": "2024-01-01T19:05:00Z"
    }
  ]
}
```

---

## 系统管理

### 初始化系统

```http
POST /api/init
```

**说明：**
- 创建默认管理员账号（ADMIN/ADMIN123）
- 初始化数据库表（如果不存在）

**响应：**

```json
{
  "message": "系统初始化成功"
}
```

### 重置管理员密码

```http
POST /api/reset-admin
```

**请求体：**

```json
{
  "newPassword": "newadmin123"
}
```

**响应：**

```json
{
  "message": "管理员密码重置成功"
}
```

---

## 调试接口

> 注意：调试接口仅供开发使用，生产环境应禁用。

### 检查登录状态

```http
GET /api/debug/login-check
```

**响应：**

```json
{
  "loggedIn": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "管理员",
    "role": "admin"
  }
}
```

### 获取所有用户（调试用）

```http
GET /api/debug/users
```

**响应：**

```json
{
  "users": [...]
}
```

---

## 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|----------|-----------|------|
| INVALID_CREDENTIALS | 401 | 用户名或密码错误 |
| USER_NOT_FOUND | 404 | 用户不存在 |
| SESSION_NOT_FOUND | 404 | 会话不存在 |
| RECORD_NOT_FOUND | 404 | 记录不存在 |
| PARTICIPANT_NOT_FOUND | 404 | 参与人员不存在 |
| DATABASE_ERROR | 500 | 数据库错误 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 数据模型

### User（用户）

```typescript
{
  id: string;              // UUID
  username: string;        // 用户名（唯一）
  password: string;        // 密码（加密）
  name: string;            // 姓名
  equipment: string | null; // 设备
  antenna: string | null;  // 天线
  qth: string | null;      // QTH（位置）
  role: string;           // 角色（admin/user）
  createdAt: string;       // 创建时间
  updatedAt: string | null; // 更新时间
}
```

### LogSession（台网会话）

```typescript
{
  id: string;                    // UUID
  controllerId: string;          // 主控用户ID
  controllerName: string;        // 主控姓名
  controllerEquipment: string | null; // 主控设备
  controllerAntenna: string | null;   // 主控天线
  controllerQth: string | null;      // 主控QTH
  sessionTime: string;          // 会话时间
  createdAt: string;            // 创建时间
}
```

### LogRecord（台网记录）

```typescript
{
  id: string;               // UUID
  sessionId: string;       // 会话ID
  callsign: string;        // 呼号
  qth: string | null;      // QTH
  equipment: string | null; // 设备
  antenna: string | null;   // 天线
  power: string | null;    // 功率
  signal: string | null;   // 信号报告
  report: string | null;   // 其他报告
  remarks: string | null;  // 备注
  createdAt: string;       // 创建时间
}
```

### Participant（参与人员）

```typescript
{
  id: string;               // UUID
  callsign: string;        // 呼号（唯一）
  name: string | null;     // 姓名
  qth: string | null;      // QTH
  equipment: string | null; // 设备
  antenna: string | null;   // 天线
  power: string | null;    // 功率
  signal: string | null;   // 信号报告
  report: string | null;   // 其他报告
  remarks: string | null;  // 备注
  createdAt: string;       // 创建时间
  updatedAt: string | null; // 更新时间
}
```

## 使用示例

### 使用curl

```bash
# 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取用户列表
curl http://localhost:5000/api/users

# 创建会话
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "controllerId": "uuid",
    "controllerName": "张三",
    "controllerEquipment": "FT-991A",
    "controllerAntenna": "八木天线",
    "controllerQth": "济南历下",
    "sessionTime": "2024-01-01T19:00:00Z"
  }'

# 添加记录
curl -X POST http://localhost:5000/api/sessions/uuid/records/with-participant \
  -H "Content-Type: application/json" \
  -d '{
    "callsign": "BI4K",
    "qth": "济南",
    "equipment": "FT-991A",
    "antenna": "GP天线",
    "power": "100W",
    "signal": "59",
    "report": "QSL",
    "remarks": "信号很好"
  }'
```

### 使用JavaScript

```javascript
// 登录
const login = async () => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const data = await response.json();
  return data.user;
};

// 创建会话
const createSession = async (sessionData) => {
  const response = await fetch('http://localhost:5000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  return await response.json();
};

// 添加记录
const addRecord = async (sessionId, recordData) => {
  const response = await fetch(`http://localhost:5000/api/sessions/${sessionId}/records/with-participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recordData)
  });
  return await response.json();
};
```

---

济南黄河业余无线电中继台 © 2024
