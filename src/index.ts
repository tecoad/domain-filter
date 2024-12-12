import { Hono } from 'hono'
import { handleDomainFilter } from './routes/domain-filter'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/domain-filter', handleDomainFilter)

export default app
