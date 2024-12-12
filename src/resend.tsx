/** @jsxImportSource react */

import { render } from "@react-email/components";
import type { Context } from "hono";
import type { ProcessedDomainListResult } from "./process-list";
import { EmailResults } from "./template";

export const sendResultsEmail = async (
	c: Context,
	to: string,
	data: ProcessedDomainListResult,
): Promise<string | undefined> => {
	// const resend = new Resend(c.env.RESEND_API_KEY);
	// const res = await resend.emails.send({
	// 	from: `${c.env.RESEND_FROM_NAME} <${c.env.RESEND_FROM_EMAIL}>`,
	// 	to,
	// 	subject: "[ACTION NEEDED]: Register these domains",
	// 	react: <EmailTemplate />,
	// });
	// return res.data?.id;

	const html = await render(<EmailResults data={data} />);

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
		},
		body: JSON.stringify({
			from: `${c.env.RESEND_FROM_NAME} <${c.env.RESEND_FROM_EMAIL}>`,
			to: to,
			subject: `[Important]: Register these domains - ${new Date().toLocaleString("en-US", { month: "long" })} ${new Date().getFullYear()}`,
			html: html,
		}),
	});

	return res.json();
};
