import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`

    // Check that critical NextAuth tables exist (common production-only failure)
    const [accountTable, userTable, sessionTable] = await prisma.$queryRaw<
      Array<{ account: string | null; user: string | null; session: string | null }>
    >`
      SELECT
        to_regclass('public."Account"')::text as account,
        to_regclass('public."User"')::text as "user",
        to_regclass('public."Session"')::text as session
    `

    const tables = {
      Account: !!accountTable?.account,
      User: !!userTable?.user,
      Session: !!sessionTable?.session,
    }

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        tables,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
