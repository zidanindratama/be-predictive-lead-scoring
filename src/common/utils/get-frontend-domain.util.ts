export function getFrontendDomain(headers: Record<string, any>): string {
  const frontendDomain = headers['x-frontend-domain'];

  if (frontendDomain) {
    const hasProtocol =
      frontendDomain.startsWith('http://') ||
      frontendDomain.startsWith('https://');

    const isLocalhost =
      frontendDomain.includes('localhost') ||
      frontendDomain.includes('127.0.0.1');

    if (hasProtocol) {
      return frontendDomain;
    }

    if (isLocalhost) {
      return `http://${frontendDomain}`;
    }

    return `https://${frontendDomain}`;
  }

  return 'http://localhost:3000';
}

export function buildFrontendUrl(
  headers: Record<string, any>,
  path: string,
): string {
  const domain = getFrontendDomain(headers);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;

  return `${normalizedDomain}${normalizedPath}`;
}
