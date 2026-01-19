import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Create connection pool (reuse in development)
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Vercel/serverless: keep pools tiny to avoid exhausting DB connections
    max: process.env.NODE_ENV === 'production' ? 2 : 20,
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Match Prisma 6 default
  })
if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool

// Create adapter
const adapter = new PrismaPg(pool)

// Create PrismaClient with adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
