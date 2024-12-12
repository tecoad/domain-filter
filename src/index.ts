import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { fetchDomains, filterDomains, processDomainsWithAI } from './utils';

type Bindings = {
  ANTHROPIC_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

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
    const selectedByIA = await processDomainsWithAI(c, filteredDomains, batchSize);

    // Group domains by score and sort by length
    const groupedDomains = selectedByIA.reduce((acc: Record<number, string[]>, domain) => {
      const score = domain.score;
      if (!acc[score]) {
        acc[score] = [];
      }
      acc[score].push(domain.domain);
      return acc;
    }, {});

    // Sort domains within each score group by length
    Object.keys(groupedDomains).forEach(score => {
      groupedDomains[Number(score)].sort((a, b) => a.length - b.length);
    });

    // Sort scores in descending order (highest score first)
    const sortedGroupedDomains = Object.fromEntries(
      Object.entries(groupedDomains)
        .sort(([scoreA], [scoreB]) => Number(scoreB) - Number(scoreA))
    );

    return c.json({
      domains: sortedGroupedDomains,
      metadata: {
        listCount: domains.length,
        filteredCount: filteredDomains.length,
        selectedByIACount: selectedByIA.length,
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


