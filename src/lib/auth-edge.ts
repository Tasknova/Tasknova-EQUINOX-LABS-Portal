import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
)

export interface AdminSession {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'admin'
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as unknown as AdminSession
  } catch {
    return null
  }
}
