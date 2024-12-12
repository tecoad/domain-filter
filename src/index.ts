import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from './types';
import { fetchDomains, filterDomains, processDomainsWithAI } from './utils';

const app = new Hono<{ Bindings: Env }>()

export const querySchema = z.object({
  url: z.string().url(),
  batchSize: z.string().default('500').transform(val => parseInt(val)),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined)
});

// Set up the route with validation middleware
app.get("/", zValidator("query", querySchema), async (c) => {

   try {
    const { url, batchSize, limit } = c.req.valid("query");
    
    // URL decode the parameter (URL validation already done by Zod)
    const decodedUrl = new URL(decodeURIComponent(url)).toString();

    // Fetch domains from URL
    let domains = await fetchDomains(decodedUrl);

    // Filter and sort domains
    let filteredDomains = filterDomains(domains);

    // Apply limit if specified
    if (limit !== undefined) {
      filteredDomains = filteredDomains.slice(0, limit);
    }

    // Process domains with AI in batches
    const processedDomains = await processDomainsWithAI(filteredDomains, batchSize);

    return c.json({
      success: true,
      domains: processedDomains,
      metadata: {
        originalCount: domains.length,
        filteredCount: filteredDomains.length,
        processedCount: processedDomains.length,
        batchSize,
        limit: limit || 'unlimited'
      }
    });

  } catch (error: unknown) {
    console.error('Error processing domains:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return c.json({ 
      error: 'Failed to process domains',
      message: errorMessage 
    }, 500);
  }
  
});

export default app


