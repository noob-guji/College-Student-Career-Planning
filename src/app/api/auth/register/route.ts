import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json({ message: '该邮箱已被注册' }, { status: 400 })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ message: '内部服务器错误' }, { status: 500 })
  }
}
