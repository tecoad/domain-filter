import { Context } from 'hono';
import { DomainFilterService } from '../services/DomainFilterService';
import type { Env } from '../types';

export const handleDomainFilter = async (c: Context<{ Bindings: Env }>) => {
  const service = new DomainFilterService();
  try {
    const url = c.req.query('url');

    if (!url) {
      return c.json({ error: 'URL parameter is required' }, 400);
    }

    // URL decode the parameter since it might be encoded in the browser
    const decodedUrl = decodeURIComponent(url);

    // Fetch domains from URL
    const domains = await service.fetchDomains(decodedUrl);

    // Filter and sort domains
    const filteredDomains = service.filterDomains(domains);

    // Process domains with AI in batches
    const processedDomains = await service.processDomainsWithAI(filteredDomains);

    return c.json({
      success: true,
      domains: processedDomains
    });

  } catch (error: unknown) {
    console.error('Error processing domains:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return c.json({ 
      error: 'Failed to process domains',
      message: errorMessage 
    }, 500);
  }
} 