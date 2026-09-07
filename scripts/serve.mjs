import http from 'node:http';
import handler from 'serve-handler';
const port = Number(process.env.PORT || 4173);
http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return handler(req, res, { public: 'public', cleanUrls: true });
}).listen(port, () => console.log(`serving public/ on http://localhost:${port}`));
