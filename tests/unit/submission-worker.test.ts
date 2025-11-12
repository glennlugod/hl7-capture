import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { SubmissionWorker } from "../../src/main/submission-worker";

import type { HL7Session } from "../../src/common/types";
global.fetch = jest.fn();

describe("SubmissionWorker", () => {
  let tempDir: string;
  let sessionsDir: string;
  let worker: SubmissionWorker;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `sub-test-{Date.now()}`);
    sessionsDir = path.join(tempDir, "sessions");
    fs.mkdirSync(sessionsDir, { recursive: true });
    mockFetch = global.fetch as jest.Mock;
    mockFetch.mockClear();
  });

  afterEach(() => {
    if (worker) worker.stop();
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
  });

  test("should initialize with config", () => {
    worker = new SubmissionWorker({
      sessionsDir,
      endpoint: "http://localhost:3000",
      concurrency: 2,
      maxRetries: 3,
      submissionIntervalMinutes: 5,
    });
    const config = worker.getConfig();
    expect(config.endpoint).toBe("http://localhost:3000");
    expect(config.concurrency).toBe(2);
  });

  test("should start and stop without errors", async () => {
    worker = new SubmissionWorker({
      sessionsDir,
      endpoint: "http://localhost:3000",
      concurrency: 1,
      maxRetries: 1,
      submissionIntervalMinutes: 1,
    });
    await worker.start();
    expect(() => worker.stop()).not.toThrow();
  });

  test("should emit progress events", async () => {
    worker = new SubmissionWorker({
      sessionsDir,
      endpoint: "",
      concurrency: 1,
      maxRetries: 1,
      submissionIntervalMinutes: 1,
    });

    const progressSpy = jest.fn();
    worker.on("onSubmissionProgress", progressSpy);

    await worker.start();
    await new Promise((r) => setTimeout(r, 100));

    expect(progressSpy).toHaveBeenCalled();
  });

  test("should not submit if endpoint not configured", async () => {
    mockFetch.mockClear();
    worker = new SubmissionWorker({
      sessionsDir,
      endpoint: "",
      concurrency: 1,
      maxRetries: 1,
      submissionIntervalMinutes: 1,
    });
    await worker.start();
    await new Promise((r) => setTimeout(r, 100));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("should update config dynamically", () => {
    worker = new SubmissionWorker({
      sessionsDir,
      endpoint: "http://old.com",
      concurrency: 1,
      maxRetries: 1,
      submissionIntervalMinutes: 1,
    });
    worker.updateConfig({ endpoint: "http://new.com", concurrency: 3 });
    const config = worker.getConfig();
    expect(config.endpoint).toBe("http://new.com");
    expect(config.concurrency).toBe(3);
  });
});
