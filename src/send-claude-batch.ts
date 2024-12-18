import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "hono";

export const VALID_TLD = ".com.br";

export async function sendClaudeBatch(
	c: Context,
	domains: string[],
	domains_per_batch = 500,
): Promise<string> {
	const anthropic = new Anthropic({
		apiKey: c.env.ANTHROPIC_API_KEY,
	});

	// Split domains into batches
	const batches: string[][] = [];
	for (let i = 0; i < domains.length; i += domains_per_batch) {
		batches.push(domains.slice(i, i + domains_per_batch));
	}

	const response = await anthropic.messages.batches.create({
		requests: batches.map((batch, index) => ({
			custom_id: `batch-${index}`,
			params: {
				tools: [
					{
						name: "analyze_domain",
						description: "Analyze a domain name and return a score",
						input_schema: {
							type: "object",
							properties: {
								domain: {
									type: "string",
									description: "The domain name",
								},
								score: {
									type: "number",
									description: "The score of the domain",
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
						${batch.join("\n")}
						</domain_list>

						2. When evaluating each domain, consider the following criteria and assign a score (5-10):
							- Memorability: Is it easy to remember?
							- Uniqueness: Does it stand out from other domain names?
							- Relevance: Could it be associated with a brand or business?
							- Length: Is it concise?
							- Pronunciation: Is it easy to say out loud?
							- Spelling: Is it easy to spell correctly?

						3. Analyze every single domain name in the list. Do not skip any names.

						4. For each domain, provide the analysis in the following JSON format:
						{
							"selectedDomains": [
								{
									"domain": "example.com.br",
									"score": 8
								}
							]
						}

						5. It is crucial that you evaluate all domain names provided and return the results in valid JSON format.`,
					},
				],
			},
		})),
	});

	return response.id;
}
