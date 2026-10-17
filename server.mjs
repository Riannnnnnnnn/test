import { createHmac } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const host = "0.0.0.0";
const port = Number(process.env.PORT || 4173);
const distDirectory = fileURLToPath(new URL("./dist/", import.meta.url));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}

function createXfyunAuthResponse() {
  const appId = process.env.XFYUN_APP_ID || "";
  const apiKey = process.env.XFYUN_API_KEY || "";
  const apiSecret = process.env.XFYUN_API_SECRET || "";
  if (!appId || !apiKey || !apiSecret) return null;

  const createUrl = (xfyunHost, xfyunPath) => {
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${xfyunHost}\ndate: ${date}\nGET ${xfyunPath} HTTP/1.1`;
    const signature = createHmac("sha256", apiSecret).update(signatureOrigin).digest("base64");
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const search = new URLSearchParams({
      authorization: Buffer.from(authorizationOrigin).toString("base64"),
      date,
      host: xfyunHost,
    });

    return `wss://${xfyunHost}${xfyunPath}?${search.toString()}`;
  };

  return { appId, url: createUrl("ise-api.xfyun.cn", "/v2/open-ise"), iatUrl: createUrl("iat-api.xfyun.cn", "/v2/iat") };
}

function sendFile(response, filePath, method) {
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
  });
  if (method === "HEAD") response.end();
  else createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  const method = request.method || "GET";
  const url = new URL(request.url || "/", "http://localhost");

  if (url.pathname === "/api/xfyun/ise-auth") {
    if (method !== "GET") {
      sendJson(response, 405, { message: "请求方式不受支持。" });
      return;
    }
    const auth = createXfyunAuthResponse();
    if (!auth) sendJson(response, 503, { message: "智能语音评星服务暂未就绪。" });
    else sendJson(response, 200, auth);
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    sendJson(response, 405, { message: "请求方式不受支持。" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendJson(response, 400, { message: "网址格式不正确。" });
    return;
  }

  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  const requestedPath = join(distDirectory, relativePath || "index.html");
  const safePath = requestedPath.startsWith(distDirectory) ? requestedPath : "";

  if (safePath && existsSync(safePath) && statSync(safePath).isFile()) {
    sendFile(response, safePath, method);
    return;
  }

  if (!extname(pathname)) {
    sendFile(response, join(distDirectory, "index.html"), method);
    return;
  }

  sendJson(response, 404, { message: "未找到该资源。" });
});

server.listen(port, host, () => {
  console.log(`口才评测服务已启动：http://${host}:${port}`);
});
