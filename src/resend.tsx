/** @jsxImportSource react */

import { render } from "@react-email/components";
import type { Context } from "hono";
import { EmailError, EmailResults } from "./templates";

type ProcessedDomainListResult = {
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

const sendEmail = async (
	c: Context,
	to: string,
	subject: string,
	html: string,
): Promise<string | undefined> => {
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
		},
		body: JSON.stringify({
			from: `${c.env.RESEND_FROM_NAME} <${c.env.RESEND_FROM_EMAIL}>`,
			to,
			subject,
			html,
		}),
	});

	return res.json();
};

export const sendErrorEmail = async (
	c: Context,
	to: string,
	error: string,
): Promise<string | undefined> => {
	const html = await render(<EmailError error={error} />);
	return sendEmail(c, to, "Error Report", html);
};

export const sendResultsEmail = async (
	c: Context,
	data: ProcessedDomainListResult,
): Promise<string | undefined> => {
	const html = await render(<EmailResults data={data} />);
	const subject = `[Important]: Register these domains - ${new Date().toLocaleString("en-US", { month: "long" })} ${new Date().getFullYear()}`;
	return sendEmail(c, "tecoad@gmail.com", subject, html);
};
