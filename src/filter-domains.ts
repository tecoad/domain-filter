import { VALID_TLD } from "./send-claude-batch";

// Helper function to get domain length without TLD
const getDomainLength = (domain: string) =>
	domain.slice(0, -VALID_TLD.length).length;

// Helper function to sort domains by length
const sortByLength = (a: string, b: string) =>
	getDomainLength(a) - getDomainLength(b);

export interface DomainWithScore {
	domain: string;
	score: number;
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
