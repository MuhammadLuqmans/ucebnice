import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Import Prisma lazily so we can return a useful JSON error if the import fails
    // (e.g. Prisma Client not generated in production).
    const { prisma } = await import('@/lib/prisma')

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

    const hasDatabaseUrl = !!process.env.DATABASE_URL
    let databaseHost: string | null = null
    try {
      if (process.env.DATABASE_URL) {
        databaseHost = new URL(process.env.DATABASE_URL).host
      }
    } catch {
      databaseHost = null
    }

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        tables,
        env: {
          hasDatabaseUrl,
          databaseHost,
          nodeEnv: process.env.NODE_ENV,
        },
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
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 503 }
    )
  }
}
