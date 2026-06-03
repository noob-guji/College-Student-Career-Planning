import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export class AuthService {
  static async registerUser(data: any) {
    const { email, password, name } = data

    if (!email || !password) {
      throw new Error('邮箱和密码不能为�?)
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error('该邮箱已被注�?)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
}
