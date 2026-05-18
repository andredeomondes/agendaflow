import 'dotenv/config'
import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma', // Adicione esta linha!
  datasource: {
    url: process.env.DATABASE_URL,
  }
})