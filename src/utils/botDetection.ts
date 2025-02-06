export function isBotRequest(userAgent: string): boolean {
  const botRegex =
    /Googlebot|facebookexternalhit|Twitterbot|bingbot|LinkedInBot|Yahoo|DuckDuckBot/i;
  return botRegex.test(userAgent);
}
