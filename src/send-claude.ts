import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "hono";

export const VALID_TLD = ".com.br";

interface DomainResult {
	domain: string;
	score: number;
}

export async function sendClaude(c: Context, domains: string[]) {
	const anthropic = new Anthropic({
		apiKey: c.env.ANTHROPIC_API_KEY,
	});

	const response = await anthropic.messages.create({
		tools: [
			{
				name: "analyze_domain",
				description: "Analyze a domain name and return a score",
				input_schema: {
					type: "object",
					properties: {
						results: {
							type: "array",
							items: {
								type: "object",
								properties: {
									domain: {
										type: "string",
										description: "The domain name",
									},
									score: {
										type: "number",
										description: "The score of the domain (5-10)",
									},
								},
								required: ["domain", "score"],
							},
						},
					},
					required: ["domain", "score"],
				},
			},
		],
		tool_choice: {
			type: "tool",
			name: "analyze_domain",
		},
		model: "claude-3-5-haiku-latest",
		max_tokens: 4000,
		messages: [
			{
				role: "user",
				content: `You are a domain name expert who analyzes and selects the best domain names based on memorability, brandability, professional sound, and marketing potential.
							Your task is to analyze each domain and select only the good ones that may have potential. Then on the ones you select, assign a score from 5-10 (10 being the best) based on their potential. Here's how to proceed:
							
							1. Review the following list of domain names:
							<domain_list>
							${domains.join("\n")}
							</domain_list>
			
							2. When evaluating each domain, consider the following criteria and assign a score (5-10):
								- Memorability: Is it easy to remember?
								- Uniqueness: Does it stand out from other domain names?
								- Relevance: Could it be associated with a brand or business?
								- Length: Is it concise?
								- Pronunciation: Is it easy to say out loud?
								- Spelling: Is it easy to spell correctly?
			
							3. Analyze every single domain name in the list. Do not skip any names.
			
							4. For each domain, provide:
								 - The domain name
								 - A score from 5-10 (10 being excellent, 5 being ok)
			
							5. It is crucial that you evaluate all domain names provided.`,
			},
		],
	});

	if (!("input" in response.content[0])) {
		throw new Error("Unexpected response type from Claude");
	}

	return (response.content[0] as { input: { results: DomainResult[] } }).input
		.results;
}
