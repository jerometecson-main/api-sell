const ALLOWED_REFERERS = [
  "localhost",
  "http://192.168.1.2:3000/",
  "https://mnflix.com/",
  "https://www.mnflix.com/",
  "https://zxcprime.site/",
  "https://www.zxcprime.site/",
  "https://zxcstream.xyz/",
  "https://www.zxcstream.xyz/",
  "https://ridomovies.co/",
  "https://www.ridomovies.co/",
  "https://5.161.93.9/",
];

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://192.168.1.2:3000",
  "https://mnflix.com",
  "https://www.mnflix.com",
  "https://zxcprime.site",
  "https://www.zxcprime.site",
  "https://zxcstream.xyz",
  "https://www.zxcstream.xyz",
  "https://www.ridomovies.co",
  "https://ridomovies.co",
  "https://5.161.93.9",
];

export function isValidReferer(referer: string): boolean {
  return ALLOWED_REFERERS.some((allowed) => referer.includes(allowed));
}
