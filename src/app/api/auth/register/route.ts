import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    // ── 输入校验
    if (!name?.trim()) {
      return NextResponse.json({ message: '姓名不能为空' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: '邮箱格式不正确' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ message: '密码至少需要8位' }, { status: 400 })
    }

    // ── 检查邮箱唯一性
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ message: '该邮箱已被注册' }, { status: 400 })
    }

    // ── 创建用户
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name: name.trim(), email, password: hashedPassword },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ message: '内部服务器错误' }, { status: 500 })
  }
}
