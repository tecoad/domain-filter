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
