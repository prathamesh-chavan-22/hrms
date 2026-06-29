export function generateCspNonce(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return btoa(String.fromCharCode(...bytes));
}

/** Apply baseline security headers to HTML responses. */
export function applySecurityHeaders(
	headers: Headers,
	request: Request,
	supabaseUrl?: string,
	nonce?: string,
) {
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("X-Frame-Options", "DENY");
	headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

	const url = new URL(request.url);
	if (url.protocol === "https:") {
		headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	}

	const connectSrc = ["'self'", "https://nominatim.openstreetmap.org"];
	if (supabaseUrl) {
		try {
			const origin = new URL(supabaseUrl).origin;
			connectSrc.push(origin);
		} catch {
			// ignore invalid URL
		}
	}

	const scriptSrc = ["'self'"];
	const styleSrcElem = ["'self'", "https://fonts.googleapis.com"];
	if (nonce) {
		scriptSrc.push(`'nonce-${nonce}'`);
		styleSrcElem.push(`'nonce-${nonce}'`);
	}

	const csp = [
		"default-src 'self'",
		`script-src ${scriptSrc.join(" ")}`,
		"style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
		`style-src-elem ${styleSrcElem.join(" ")}`,
		"style-src-attr 'unsafe-inline'",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org",
		`connect-src ${connectSrc.join(" ")}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	].join("; ");

	headers.set("Content-Security-Policy", csp);
}
