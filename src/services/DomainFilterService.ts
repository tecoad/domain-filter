import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from 'ai';
import { z } from 'zod';

const VALID_TLD = '.com.br';

export class DomainFilterService {
  async fetchDomains(url: string): Promise<string[]> {
    const response = await fetch(url);
    const text = await response.text();
    return text.split('\n').map(domain => domain.trim().toLowerCase());
  }

  filterDomains(domains: string[]): string[] {
    // Remove duplicates using Set
    const uniqueDomains = [...new Set(domains)];

    return uniqueDomains
      .filter(domain => {
        // Check if domain ends with .com.br
        if (!domain.endsWith(VALID_TLD)) return false;

        // Remove domain extension for length check
        const domainWithoutTLD = domain.slice(0, -VALID_TLD.length);

        // Check if domain contains numbers or hyphens
        if (/[\d-]/.test(domainWithoutTLD)) return false;

        // Check if domain length is between 1 and 9 characters (excluding TLD)
        const length = domainWithoutTLD.length;
        return length >= 1 && length <= 9;
      })
      .sort((a, b) => {
        // Sort by domain length (excluding TLD)
        const lengthA = a.slice(0, -VALID_TLD.length).length;
        const lengthB = b.slice(0, -VALID_TLD.length).length;
        return lengthA - lengthB;
      });
  }

  async processDomainsWithAI(
    domains: string[],
    batchSize: number = 500
  ): Promise<string[]> {
    const batches: string[][] = [];
    
    // Split domains into batches
    for (let i = 0; i < domains.length; i += batchSize) {
      batches.push(domains.slice(i, i + batchSize));
    }

    // Process batches concurrently
    const processedBatches = await Promise.all(
      batches.map(batch => this.processBatchWithAI(batch))
    );

    // Flatten and sort results
    return processedBatches
      .flat()
      .sort((a, b) => {
        const lengthA = a.slice(0, -VALID_TLD.length).length;
        const lengthB = b.slice(0, -VALID_TLD.length).length;
        return lengthA - lengthB;
      });
  }

  private async processBatchWithAI(domains: string[]): Promise<string[]> {
    const schema = z.object({
      selectedDomains: z.array(
        z.object({
          domain: z.string().describe('The full domain name including .com.br'),
          score: z.number().min(1).max(10).describe('Rating from 1-10 based on domain quality'),
          reason: z.string().describe('Brief explanation of why this domain was selected')
        })
      ).describe('Array of selected domains with their evaluation')
    });

    const result = await generateObject({
      model: anthropic("claude-3-sonnet-20240229"),
      system: 'You are a domain name expert who analyzes and selects the best domain names based on memorability, brandability, professional sound, and marketing potential.',
      prompt: `You will be provided with a list of domain names. Your task is to analyze each domain and select the ones that are better and more brandable. Here's how to proceed:

      1. Review the following list of domain names:
      <domain_list>
      ${domains.join('\n')}
      </domain_list>

      2. When evaluating each domain, consider the following criteria:
      - Memorability: Is it easy to remember?
      - Uniqueness: Does it stand out from other domain names?
      - Relevance: Could it be associated with a brand or business?
      - Length: Is it concise without being too short?
      - Pronunciation: Is it easy to say out loud?
      - Spelling: Is it easy to spell correctly?

      3. Analyze every single domain name in the list. Do not skip any names.

      4. Create a list of the domain names that you consider better and more brandable based on the criteria above.

      5. It is crucial that you evaluate all domain names provided. Do not overlook any name in your analysis.

      6. Present your final selection as a simple list of domain names. Do not provide any explanations or justifications for your choices.

      Output your list of selected domain names within <selected_domains> tags. Each domain name should be on a new line.

      Remember, your task is to analyze all domains thoroughly and return only the list of better, more brandable domain names without any additional commentary.

      `, schema});

    // Extract just the domain names from the result and return them
    return result.object.selectedDomains
      .sort((a, b) => b.score - a.score)
      .map(item => item.domain);
  }
} 