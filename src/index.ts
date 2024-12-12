import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { processDomainList } from "./process-list";
import { sendResultsEmail } from "./resend";

type Bindings = {
	ANTHROPIC_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

export const querySchema = z.object({
	url: z.string().url(),
	batchSize: z
		.string()
		.default("500")
		.transform((val) => Number.parseInt(val)),
	limit: z
		.string()
		.optional()
		.transform((val) => (val ? Number.parseInt(val) : undefined)),
});

const automateSchema = z.object({
	to: z.string().email(),
});

app.get("/trigger", zValidator("query", automateSchema), async (c) => {
	try {
		const { to } = c.req.valid("query");
		// Process domains with default parameters
		const result = await processDomainList(c, { limit: 25, batchSize: 10 });
		// Send email with the results
		await sendResultsEmail(c, to, result);

		return c.json({
			message: "Email sent successfully",
			metadata: result.metadata,
		});
	} catch (error: unknown) {
		console.error("Error in automation:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		return c.json(
			{
				error: "Failed to process automation",
				message: errorMessage,
			},
			500,
		);
	}
});

app.get("/", zValidator("query", querySchema), async (c) => {
	try {
		const { url, batchSize, limit } = c.req.valid("query");
		const decodedUrl = new URL(decodeURIComponent(url)).toString();

		const result = await processDomainList(c, {
			url: decodedUrl,
			batchSize,
			limit,
		});

		return c.json(result);
	} catch (error: unknown) {
		console.error("Error processing domains:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		return c.json(
			{
				error: "Failed to process domains",
				message: errorMessage,
			},
			500,
		);
	}
});

export default app;
