import Anthropic from "@anthropic-ai/sdk";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fetchDomains } from "./fetch-domains";
import { filterDomains } from "./filter-domains";
import { sendClaude } from "./send-claude";
import { sendClaudeBatch } from "./send-claude-batch";

type Bindings = {
	ANTHROPIC_API_KEY: string;
	REGISTROBR_TXT_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/process-all", async (c) => {
	try {
		const domains = await fetchDomains(c.env.REGISTROBR_TXT_URL);

		// Filter and sort domains
		const filteredDomains = filterDomains(domains);

		const batchId = await sendClaudeBatch(c, filteredDomains);

		return c.json({
			message: "Batch sent successfully",
			batchId,
		});
	} catch (error: unknown) {
		console.error("Error in automation:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		return c.json(
			{
				error: "Failed to process batch",
				message: errorMessage,
			},
			500,
		);
	}
});

app.get("/list-batches", async (c) => {
	const anthropic = new Anthropic({
		apiKey: c.env.ANTHROPIC_API_KEY,
	});
	const results = await anthropic.messages.batches.list();
	return c.json(results);
});

const pageSchema = z.object({
	page: z.coerce.number().min(1),
});

app.get("/process-page", zValidator("query", pageSchema), async (c) => {
	try {
		const { page } = c.req.valid("query");
		const PAGE_SIZE = 500;
		const startIndex = (page - 1) * PAGE_SIZE;
		const endIndex = startIndex + PAGE_SIZE;

		const domains = await fetchDomains(c.env.REGISTROBR_TXT_URL);
		const filteredDomains = filterDomains(domains);
		const paginatedDomains = filteredDomains.slice(startIndex, endIndex);

		const results = await sendClaude(c, paginatedDomains);

		return c.json({
			message: "Selected domains by AI:",
			results,
		});
	} catch (error: unknown) {
		console.error("Error in automation:", error);
		return c.json(
			{
				error: "Failed to process batch",
				message: error,
			},
			500,
		);
	}
});

export default app;
