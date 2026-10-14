import { fileURLToPath, URL } from "node:url";
import { createHmac } from "node:crypto";
import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

interface XfyunCredentials { appId: string; apiKey: string; apiSecret: string; }

function createXfyunAuthUrl({ apiKey, apiSecret }: XfyunCredentials): string {
  const host = "ise-api.xfyun.cn";
  const path = "/v2/open-ise";
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = createHmac("sha256", apiSecret).update(signatureOrigin).digest("base64");
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const search = new URLSearchParams({
    authorization: Buffer.from(authorizationOrigin).toString("base64"),
    date,
    host,
  });
  return `wss://${host}${path}?${search.toString()}`;
}

function xfyunAuthPlugin(credentials: XfyunCredentials): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    if (request.method !== "GET") { next(); return; }
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    if (!credentials.appId || !credentials.apiKey || !credentials.apiSecret) {
      response.statusCode = 503;
      response.end(JSON.stringify({ message: "智能语音评星服务暂未就绪。" }));
      return;
    }
    response.end(JSON.stringify({ appId: credentials.appId, url: createXfyunAuthUrl(credentials) }));
  };

  return {
    name: "xfyun-ise-auth",
    configureServer(server) { server.middlewares.use("/api/xfyun/ise-auth", middleware); },
    configurePreviewServer(server) { server.middlewares.use("/api/xfyun/ise-auth", middleware); },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const credentials = { appId: env.XFYUN_APP_ID ?? "", apiKey: env.XFYUN_API_KEY ?? "", apiSecret: env.XFYUN_API_SECRET ?? "" };
  return {
    plugins: [react(), xfyunAuthPlugin(credentials)],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
