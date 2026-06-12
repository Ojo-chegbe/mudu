import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function serveFrontend(pathname: string): Response {
  const distDir = resolve(process.cwd(), "dist");
  const assetPath = resolve(process.cwd(), "dist", `.${pathname}`.replace("..", ""));

  if (pathname.startsWith("/assets/") && existsSync(assetPath)) {
    return new Response(Bun.file(assetPath));
  }

  if (!existsSync(distDir)) {
    return new Response(
      "Frontend build not found. Run `npm run build` first, then restart the Bun server.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  return new Response(Bun.file(resolve(distDir, "index.html")));
}
