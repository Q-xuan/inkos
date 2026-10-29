import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeExplicitCapabilityTool } from "../harness/explicit-action.js";
import { createWriteChaptersTool } from "../harness/tools/longform-production.js";
import { createWorkManifest, saveWorkManifest } from "../harness/work-store.js";
import { PipelineRunner } from "../pipeline/runner.js";

describe("write_chapters continuation", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  async function bookWithChapterOne(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "inkos-write-chapters-"));
    roots.push(root);
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
    return root;
  }

  function pipeline(root: string): PipelineRunner {
    return new PipelineRunner({ projectRoot: root, client: {} as never, model: "fixture" });
  }

  async function writeNext(root: string, parameters: Record<string, unknown>) {
    return executeExplicitCapabilityTool({
      projectRoot: root,
      workId: "harbor",
      binding: { capabilityId: "longform", actionId: "write_chapters", profileId: "longform-novel", risk: "recoverable-write" },
      tool: createWriteChaptersTool(pipeline(root), "harbor"),
      parameters,
    });
  }

  it("fills the next unwritten chapter when a continuation omits startChapterNumber", async () => {
    const root = await bookWithChapterOne();
    const writeChapters = vi.spyOn(PipelineRunner.prototype, "writeChapters");

    await expect(writeNext(root, {
      instruction: "Write the next chapter for the active Work.",
      bookId: "harbor",
      chapterCount: 1,
    })).rejects.toMatchObject({ code: "WORK_NOT_READY" });

    expect(writeChapters).toHaveBeenCalledWith("harbor", 1, expect.objectContaining({ startChapterNumber: 2 }));
  });

  it("still rejects an explicit range that does not start at the next chapter", async () => {
    const root = await bookWithChapterOne();

    await expect(writeNext(root, {
      instruction: "Write chapter 1 again.",
      bookId: "harbor",
      startChapterNumber: 1,
      chapterCount: 1,
    })).rejects.toMatchObject({ code: "CHAPTER_WRITE_RANGE_CONFLICT" });
  });
});
