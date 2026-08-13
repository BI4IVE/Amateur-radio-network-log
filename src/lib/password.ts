// @version v1.5.8
import bcrypt from "bcrypt"

const SALT_ROUNDS = 10

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 * 支持明文和哈希两种格式（用于迁移期间兼容）
 */
export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  // 如果是 bcrypt 哈希格式（以 $2a$ 或 $2b$ 开头）
  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$")) {
    return bcrypt.compare(password, storedPassword)
  }
  
  // 兼容旧的明文密码（迁移期间）
  // 注意：这会在使用后自动升级
  return password === storedPassword
}

/**
 * 检查密码是否已哈希
 */
export function isPasswordHashed(password: string): boolean {
  return password.startsWith("$2a$") || password.startsWith("$2b$")
}
