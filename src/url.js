export function requestBaseUrl(req, publicUrl = '') {
  if (publicUrl) return String(publicUrl).replace(/\/+$/, '');

  const forwardedProto = firstHeaderValue(req.headers['x-forwarded-proto']);
  const forwardedHost = firstHeaderValue(req.headers['x-forwarded-host']);
  const protocol = ['http', 'https'].includes(forwardedProto)
    ? forwardedProto
    : req.protocol || 'http';
  const host = forwardedHost || req.headers.host || '127.0.0.1';

  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function firstHeaderValue(value) {
  const first = Array.isArray(value) ? value[0] : value;
  return String(first ?? '').split(',')[0].trim();
}
