/** @jsxImportSource react */

import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import type { ProcessedDomainListResult } from "./process-list";

const Layout = ({ children }: { children: React.ReactNode }) => (
	<Html>
		<Head />
		<Preview>Domain Registration Recommendations</Preview>
		<Body style={main}>
			<Container style={container}>
				<Heading style={h1}>Hi there!</Heading>
				{children}
			</Container>
		</Body>
	</Html>
);

export const EmailResults = ({ data }: { data: ProcessedDomainListResult }) => (
	<Layout>
		<Text style={heroText}>Here are the domains you need to register:</Text>
		<Section style={codeBox}>
			{Object.entries(data.domains)
				.sort(([scoreA], [scoreB]) => Number(scoreB) - Number(scoreA))
				.map(([score, domains]) => (
					<div key={score} style={scoreSection}>
						<Text style={scoreText}>Score: {score}</Text>
						<ul style={domainList}>
							{domains.map((domain) => (
								<li key={domain} style={domainItem}>
									{domain}
								</li>
							))}
						</ul>
					</div>
				))}
		</Section>
	</Layout>
);

export const EmailError = ({ error }: { error: string }) => (
	<Layout>
		<Text style={heroText}>There was an error processing domain routine:</Text>
		<Section style={codeBox}>{error}</Section>
	</Layout>
);

const main = {
	backgroundColor: "#ffffff",
	// margin: "0 auto",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
	// margin: "0 auto",
	padding: "10px",
};

const h1 = {
	color: "#1d1c1d",
	fontSize: "24px",
	fontWeight: "700",
	margin: "30px 0",
	padding: "0",
	lineHeight: "42px",
};

const heroText = {
	fontSize: "18px",
	lineHeight: "28px",
	marginBottom: "30px",
};

const codeBox = {
	background: "rgb(245, 244, 245)",
	borderRadius: "10px",
	marginBottom: "30px",
	padding: "20px",
};

const text = {
	color: "#000",
	fontSize: "14px",
	lineHeight: "24px",
};

const scoreSection = {
	marginBottom: "20px",
};

const scoreText = {
	fontSize: "18px",
	fontWeight: "bold",
	marginBottom: "10px",
};

const domainList = {
	margin: "0",
	padding: "0 0 0 20px",
};

const domainItem = {
	fontSize: "16px",
	lineHeight: "24px",
	marginBottom: "5px",
};
