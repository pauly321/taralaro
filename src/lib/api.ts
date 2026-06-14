const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const protocol = window.location.protocol || 'http:';

    if (host === 'localhost' || host === '127.0.0.1') {
      return `${protocol}//${host}:3001/api`;
    }
  }

  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();
