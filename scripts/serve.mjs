import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function resolveRequest(url) {
  const rawPath = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const candidate = normalize(join(root, rawPath));
  if (!candidate.startsWith(root)) return null;
  if (!existsSync(candidate)) return join(root, "index.html");
  const info = statSync(candidate);
  return info.isDirectory() ? join(candidate, "index.html") : candidate;
}

createServer((req, res) => {
  const file = resolveRequest(req.url || "/");
  if (!file || !existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": mime[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Lumentale Team Builder: http://localhost:${port}`);
});
