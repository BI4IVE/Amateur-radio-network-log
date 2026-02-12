-- 创建页面配置表
CREATE TABLE IF NOT EXISTS page_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS page_configs_category_idx ON page_configs(category);
CREATE UNIQUE INDEX IF NOT EXISTS page_configs_key_idx ON page_configs(key);

-- 插入默认配置
INSERT INTO page_configs (key, value, category, description) VALUES
  ('site_title', '济南黄河业余无线电台网', 'general', '网站标题'),
  ('version', '1.1.0', 'general', '系统版本号'),
  ('contact_email', 'contact@bi4ive.org', 'general', '联系邮箱'),
  ('contact_phone', '', 'general', '联系电话'),
  ('login_title', '济南黄河业余无线电台<br/>台网主控日志', 'login', '登录页标题'),
  ('login_subtitle', '登录系统', 'login', '登录页副标题'),
  ('home_header_title', '济南黄河业余无线电台网主控日志', 'home', '首页页头标题'),
  ('home_footer_text', 'v1.1.0 By BR4IN', 'home', '首页页脚文字'),
  ('session_detail_title', '台网会话详情', 'session', '会话详情页标题')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
