import { describe, expect, it } from "vitest";
import { StageExecution } from "../../src/domain/pipeline/StageExecution";

describe("StageExecution approval flow", () => {
  it("distinguishes completed from approved", () => {
    const execution = StageExecution.start({
      id: "exec-1",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ concept: "who knows, knows" });

    expect(execution.status).toBe("completed");

    const approved = execution.approve({
      actorId: "user-1",
    });

    expect(approved.status).toBe("approved");
  });

  it("stores output snapshot after complete", () => {
    const output = { result: "some output" };
    const execution = StageExecution.start({
      id: "exec-2",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete(output);

    expect(execution.outputSnapshot).toEqual(output);
    expect(execution.completedAt).toBeInstanceOf(Date);
  });

  it("stores approvedBy and approvedAt after approve", () => {
    const execution = StageExecution.start({
      id: "exec-3",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ concept: "approved concept" })
      .approve({ actorId: "user-1" });

    expect(execution.status).toBe("approved");
    expect(execution.approvedBy).toBe("user-1");
    expect(execution.approvedAt).toBeInstanceOf(Date);
  });

  it("reject flow: transitions completed → rejected with reason", () => {
    const execution = StageExecution.start({
      id: "exec-4",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    })
      .complete({ concept: "rejected concept" })
      .reject({ actorId: "user-1", reason: "not aligned with brand" });

    expect(execution.status).toBe("rejected");
    expect(execution.rejectedBy).toBe("user-1");
    expect(execution.rejectionReason).toBe("not aligned with brand");
    expect(execution.rejectedAt).toBeInstanceOf(Date);
  });

  it("fail flow: transitions running → failed", () => {
    const execution = StageExecution.start({
      id: "exec-5",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).fail(new Error("provider timeout"));

    expect(execution.status).toBe("failed");
    expect(execution.failureReason).toBe("provider timeout");
  });

  it("returns a new instance on each transition (immutability)", () => {
    const running = StageExecution.start({
      id: "exec-6",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });
    const completed = running.complete({ concept: "test" });
    const approved = completed.approve({ actorId: "user-1" });

    expect(running).not.toBe(completed);
    expect(completed).not.toBe(approved);
    expect(running.status).toBe("running");
    expect(completed.status).toBe("completed");
    expect(approved.status).toBe("approved");
  });

  it("guard: cannot approve a running execution", () => {
    const execution = StageExecution.start({
      id: "exec-7",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });

    expect(() => execution.approve({ actorId: "user-1" })).toThrow();
  });

  it("guard: cannot reject a running execution", () => {
    const execution = StageExecution.start({
      id: "exec-8",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });

    expect(() =>
      execution.reject({ actorId: "user-1", reason: "bad" }),
    ).toThrow();
  });

  it("guard: cannot approve a failed execution", () => {
    const execution = StageExecution.start({
      id: "exec-9",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).fail(new Error("crash"));

    expect(() => execution.approve({ actorId: "user-1" })).toThrow();
  });

  it("guard: cannot reject a failed execution", () => {
    const execution = StageExecution.start({
      id: "exec-10",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).fail(new Error("crash"));

    expect(() =>
      execution.reject({ actorId: "user-1", reason: "bad" }),
    ).toThrow();
  });

  it("guard: cannot complete an already completed execution", () => {
    const execution = StageExecution.start({
      id: "exec-11",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ output: "done" });

    expect(() => execution.complete({ output: "again" })).toThrow();
  });

  it("guard: cannot fail an already completed execution", () => {
    const execution = StageExecution.start({
      id: "exec-12",
      stageKey: "design-concept",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ output: "done" });

    expect(() => execution.fail(new Error("too late"))).toThrow();
  });

  it("stale flow: approved → stale when collectionContext changes", () => {
    const execution = StageExecution.start({
      id: "exec-13",
      stageKey: "composition-definition",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: { collectionContextOutputs: { "collection-briefing": {} } },
    })
      .complete({ output: "composition" })
      .approve({ actorId: "user-1" })
      .markStale();

    expect(execution.status).toBe("stale");
  });

  it("guard: cannot mark a running execution as stale", () => {
    const execution = StageExecution.start({
      id: "exec-14",
      stageKey: "composition-definition",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    });

    expect(() => execution.markStale()).toThrow();
  });

  it("guard: cannot mark a completed (not yet approved) execution as stale", () => {
    const execution = StageExecution.start({
      id: "exec-15",
      stageKey: "composition-definition",
      targetId: "item-1",
      targetType: "design_item",
      inputSnapshot: {},
    }).complete({ output: "done" });

    expect(() => execution.markStale()).toThrow();
  });
});
