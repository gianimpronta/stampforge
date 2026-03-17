import { describe, expect, it } from "vitest";
import { jobTypes } from "../../src/server/jobs/jobTypes";

describe("jobTypes", () => {
  it("registers stage and image generation jobs", () => {
    expect(jobTypes).toEqual([
      "stage-execution",
      "image-generation",
      "asset-processing",
    ]);
  });
});
