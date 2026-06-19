import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import url from "url";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-api-runner",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const reqUrl = req.url || "";
          if (reqUrl.startsWith("/api/")) {
            const parsedUrl = new URL(reqUrl, `http://${req.headers.host || "localhost"}`);
            const apiName = parsedUrl.pathname?.slice(5); // remove '/api/'
            const apiPath = path.resolve(__dirname, "api", `${apiName}.js`);

            if (fs.existsSync(apiPath)) {
              const originalSetHeader = res.setHeader.bind(res);
              try {
                // Clear node require cache to reload API on each request
                delete require.cache[require.resolve(apiPath)];
                const handler = require(apiPath);

                // Load environment variables from .env if present
                const envPath = path.resolve(__dirname, ".env");
                if (fs.existsSync(envPath)) {
                  const envContent = fs.readFileSync(envPath, "utf-8");
                  envContent.split("\n").forEach((line) => {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                      const key = match[1];
                      let value = match[2] || "";
                      if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                      } else if (value.startsWith("'") && value.endsWith("'")) {
                        value = value.slice(1, -1);
                      }
                      process.env[key] = value.trim();
                    }
                  });
                }

                const mockReq = req as any;
                const query: Record<string, string> = {};
                parsedUrl.searchParams.forEach((val, key) => {
                  query[key] = val;
                });
                mockReq.query = query;

                if (req.method === "POST" || req.method === "PUT") {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const bodyText = Buffer.concat(buffers).toString();
                  try {
                    mockReq.body = JSON.parse(bodyText);
                  } catch {
                    mockReq.body = bodyText;
                  }
                }

                const mockRes = res as any;
                mockRes.status = (code: number) => {
                  res.statusCode = code;
                  return mockRes;
                };
                mockRes.json = (data: any) => {
                  originalSetHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                  return mockRes;
                };
                mockRes.setHeader = (name: string, value: string) => {
                  originalSetHeader(name, value);
                  return mockRes;
                };

                await handler(mockReq, mockRes);
                return;
              } catch (err) {
                console.error("Local API execution error:", err);
                res.statusCode = 500;
                originalSetHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Local API execution error", details: String(err) }));
                return;
              }
            }
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-is")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/yahoo-finance2")) {
            return "vendor-yahoo-finance";
          }
          if (id.includes("node_modules/@google")) {
            return "vendor-google-ai";
          }
          if (id.includes("node_modules/resend") || id.includes("node_modules/@vercel")) {
            return "vendor-services";
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
});
