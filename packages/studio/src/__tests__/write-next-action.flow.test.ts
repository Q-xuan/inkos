import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createWorkManifest, saveWorkManifest } from "@actalk/inkos-core";
import { createStudioServer } from "../api/server.js";

it("continues from the next chapter when 写下一章 is confirmed in a book session", async () => {
  const root = await mkdtemp(join(tmpdir(), "inkos-write-next-"));
  let modelCalls = 0;
  const upstream = createServer(async (request, response) => {
    for await (const _chunk of request) {}
    modelCalls += 1;
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: { message: "fixture model should not be called" } }));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  try {
    const baseUrl = `http://127.0.0.1:${(upstream.address() as { port: number }).port}/v1`;
    await mkdir(join(root, ".inkos"), { recursive: true });
    await writeFile(join(root, "inkos.json"), JSON.stringify({
      name: "fixture",
      version: "0.1.0",
      language: "en",
      llm: {
        defaultModel: "fixture-model",
        services: [{ service: "custom", name: "fixture", baseUrl, apiFormat: "chat", stream: false, models: ["fixture-model"] }],
      },
    }));
    await writeFile(join(root, ".inkos/secrets.json"), JSON.stringify({ services: { "custom:fixture": { apiKey: "fixture" } } }));
    await saveWorkManifest(root, createWorkManifest({
      id: "harbor",
      title: "Harbor",
      profileId: "longform-novel",
      language: "en",
    }));
    const chapters = join(root, "works/harbor/source/chapters");
    await mkdir(chapters, { recursive: true });
    await writeFile(join(chapters, "index.json"), JSON.stringify([{ number: 1 }]));
    await writeFile(join(chapters, "0001_Opening.md"), "The harbor is quiet.\n");

    const app = createStudioServer({} as never, root);
    const post = (body: unknown) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const created = await (await app.request("/api/v1/sessions", post({
      bookId: "harbor",
      sessionKind: "book",
    }))).json() as { session: { sessionId: string } };
    const response = await app.request("/api/v1/agent", post({
      sessionId: created.session.sessionId,
      sessionKind: "book",
      instruction: "写下一章",
      activeBookId: "harbor",
      workId: "harbor",
      actionSource: "quick-action",
      requestedIntent: "write_next",
      model: "fixture-model",
      service: "custom:fixture",
    }));
    const body = await response.json() as { error?: { message?: string }; response?: string };
    const message = body.error?.message ?? body.response ?? "";

    expect(response.status).toBe(500);
    expect(message).toContain("not ready for chapter writing");
    expect(message).not.toContain("Unable to decode");
    expect(modelCalls).toBe(0);
  } finally {
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
}, 20000);
