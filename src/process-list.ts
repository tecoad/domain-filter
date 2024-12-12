import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import type { Context } from "hono";
import { z } from "zod";

export type ProcessedDomainListResult = {
	domains: {
		[score: number]: string[];
	};
	metadata: {
		listCount: number;
		filteredCount: number;
		selectedByIACount: number;
		batchSize: number;
		limit: number | "unlimited";
	};
};

const VALID_TLD = ".com.br";

// Helper function to get domain length without TLD
const getDomainLength = (domain: string) =>
	domain.slice(0, -VALID_TLD.length).length;

// Helper function to sort domains by length
const sortByLength = (a: string, b: string) =>
	getDomainLength(a) - getDomainLength(b);

export async function fetchDomains(url: string): Promise<string[]> {
	const response = await fetch(url);
	const text = await response.text();

	// Split text into lines and filter out comments and empty lines
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"))
		.filter(Boolean); // Remove empty lines
}

export function filterDomains(domains: string[]): string[] {
	return [...new Set(domains)]
		.filter((domain) => {
			if (!domain.endsWith(VALID_TLD)) return false;

			const domainWithoutTLD = domain.slice(0, -VALID_TLD.length);
			if (/[\d-]/.test(domainWithoutTLD)) return false;

			const length = domainWithoutTLD.length;
			return length >= 1 && length <= 9;
		})
		.sort(sortByLength);
}

export type DomainWithScore = {
	domain: string;
	score: number;
};

export async function processDomainsWithAI(
	c: Context,
	domains: string[],
	batchSize = 300,
): Promise<DomainWithScore[]> {
	const batches = Array.from(
		{ length: Math.ceil(domains.length / batchSize) },
		(_, i) => domains.slice(i * batchSize, (i + 1) * batchSize),
	);

	const schema = z.object({
		selectedDomains: z.array(
			z.object({
				domain: z.string(),
				score: z.number().min(1).max(5),
			}),
		),
	});

	const anthropic = createAnthropic({
		apiKey: c.env.ANTHROPIC_API_KEY,
	});

	const processedBatches = await Promise.all(
		batches.map(async (batch) => {
			const result = await generateObject({
				model: anthropic("claude-3-sonnet-20240229"),
				system:
					"You are a domain name expert who analyzes and selects the best domain names based on memorability, brandability, professional sound, and marketing potential.",
				prompt: `You will be provided with a list of domain names. Your task is to analyze each domain and assign a score from 1-5 (5 being the best) based on their potential. Here's how to proceed:

        1. Review the following list of domain names:
        <domain_list>
        ${batch.join("\n")}
        </domain_list>

        2. When evaluating each domain, consider the following criteria and assign a score (1-5):
          - Memorability: Is it easy to remember?
          - Uniqueness: Does it stand out from other domain names?
          - Relevance: Could it be associated with a brand or business?
          - Length: Is it concise without being too short?
          - Pronunciation: Is it easy to say out loud?
          - Spelling: Is it easy to spell correctly?

        3. Analyze every single domain name in the list. Do not skip any names.

        4. For each domain, provide:
           - The domain name
           - A score from 1-5 (5 being excellent, 1 being poor)

        5. It is crucial that you evaluate all domain names provided.

        Remember to return the data in the exact format specified by the schema.
        `,
				schema,
			});

			return result.object.selectedDomains;
		}),
	);

	return processedBatches.flat();
}

export async function processDomainList(
	c: Context,
	{
		url = "https://registro.br/dominio/lista-competicao.txt",
		batchSize = 500,
		limit = undefined,
	}: {
		url?: string;
		batchSize?: number;
		limit?: number;
	},
): Promise<ProcessedDomainListResult> {
	// Fetch domains from URL
	const domains = await fetchDomains(url);

	// Filter and sort domains
	let filteredDomains = filterDomains(domains);

	// Apply limit if specified
	if (limit !== undefined) {
		filteredDomains = filteredDomains.slice(0, limit);
	}

	// Process domains with AI in batches
	const selectedByIA = await processDomainsWithAI(
		c,
		filteredDomains,
		batchSize,
	);

	// Group domains by score and sort by length
	const groupedDomains = selectedByIA.reduce(
		(acc: Record<number, string[]>, domain) => {
			const score = domain.score;
			if (!acc[score]) {
				acc[score] = [];
			}
			acc[score].push(domain.domain);
			return acc;
		},
		{},
	);

	// Sort domains within each score group by length
	for (const score of Object.keys(groupedDomains)) {
		groupedDomains[Number(score)].sort((a, b) => a.length - b.length);
	}

	// Sort scores in descending order
	const sortedGroupedDomains = Object.fromEntries(
		Object.entries(groupedDomains).sort(
			([scoreA], [scoreB]) => Number(scoreB) - Number(scoreA),
		),
	);

	return {
		domains: sortedGroupedDomains,
		metadata: {
			listCount: domains.length,
			filteredCount: filteredDomains.length,
			selectedByIACount: selectedByIA.length,
			batchSize,
			limit: limit || "unlimited",
		},
	};
}
