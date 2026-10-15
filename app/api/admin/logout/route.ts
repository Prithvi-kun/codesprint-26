import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    const cookieStore = cookies()
    cookieStore.delete('admin_session')
    cookieStore.delete('admin_role')
    cookieStore.delete('admin_label')
    return NextResponse.json({ success: true })
}

export async function GET() {
    const cookieStore = cookies()
    cookieStore.delete('admin_session')
    cookieStore.delete('admin_role')
    cookieStore.delete('admin_label')
    return NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}
