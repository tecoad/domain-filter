import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from 'ai';
import { Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';

const VALID_TLD = '.com.br';

// Helper function to get domain length without TLD
const getDomainLength = (domain: string) => domain.slice(0, -VALID_TLD.length).length;

// Helper function to sort domains by length
const sortByLength = (a: string, b: string) => getDomainLength(a) - getDomainLength(b);

export async function fetchDomains(url: string): Promise<string[]> {
  const response = await fetch(url);
  const text = await response.text();
  return text.split('\n').map(domain => domain.trim().toLowerCase());
}

export function filterDomains(domains: string[]): string[] {
  return [...new Set(domains)]
    .filter(domain => {
      if (!domain.endsWith(VALID_TLD)) return false;
      
      const domainWithoutTLD = domain.slice(0, -VALID_TLD.length);
      if (/[\d-]/.test(domainWithoutTLD)) return false;
      
      const length = domainWithoutTLD.length;
      return length >= 1 && length <= 9;
    })
    .sort(sortByLength);
}

export async function processDomainsWithAI(domains: string[], batchSize: number = 500): Promise<string[]> {
  const batches = Array.from(
    { length: Math.ceil(domains.length / batchSize) },
    (_, i) => domains.slice(i * batchSize, (i + 1) * batchSize)
  );

  const schema = z.object({
    selectedDomains: z.array(
      z.object({
        domain: z.string(),
        score: z.number().min(1).max(10),
        reason: z.string()
      })
    )
  });

  const processedBatches = await Promise.all(
    batches.map(async batch => {
      const result = await generateObject({
        model: anthropic("claude-3-sonnet-20240229"),
        system: 'You are a domain name expert who analyzes and selects the best domain names based on memorability, brandability, professional sound, and marketing potential.',
        prompt: `Analyze these domains and select the better, more brandable ones:
        ${batch.join('\n')}`,
        schema
      });

      return result.object.selectedDomains
        .sort((a, b) => b.score - a.score)
        .map(item => item.domain);
    })
  );

  return processedBatches.flat().sort(sortByLength);
}

export const handleDomainFilter = async (c: Context<{ Bindings: Env }>) => {
  try {
    const url = c.req.query('url');


    if (!url) {
      return c.json({ error: 'URL parameter is required' }, 400);
    }

    // URL decode the parameter and ensure it's a valid URL
    const decodedUrl = new URL(decodeURIComponent(url)).toString();

    // Fetch domains from URL
    const domains = await fetchDomains(decodedUrl);

    // Filter and sort domains
    const filteredDomains = filterDomains(domains);


    return c.json({
      success: true,
      filteredDomains: filteredDomains
    });

    // Process domains with AI in batches
    const processedDomains = await processDomainsWithAI(filteredDomains);

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