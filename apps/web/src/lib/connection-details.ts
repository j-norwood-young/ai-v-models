export function buildChatCompletionUrl(baseUrl: string): string {
	return `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
}

export function buildChatCurl(
	baseUrl: string,
	apiKey: string,
	modelId: string,
	stream = true
): string {
	const url = buildChatCompletionUrl(baseUrl);
	const payload = {
		model: modelId,
		messages: [{ role: 'user', content: 'Hello!' }],
		stream
	};
	const json = JSON.stringify(payload, null, 2);

	return [
		`curl ${url} \\`,
		`  -H "Authorization: Bearer ${apiKey}" \\`,
		`  -H "Content-Type: application/json" \\`,
		`-d @- <<'EOF'`,
		json,
		'EOF'
	].join('\n');
}
