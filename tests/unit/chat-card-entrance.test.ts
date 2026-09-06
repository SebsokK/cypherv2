import {describe, expect, it} from "vitest";

import {ChatCardEntranceTracker} from "../../src/chat/chat-card-entrance";

class FakeClassList {
  readonly values = new Set<string>();
  add(value: string): void { this.values.add(value); }
}

class FakeCard {
  readonly classList = new FakeClassList();
}

class FakeRoot {
  constructor(readonly card: FakeCard | null) {}
  querySelector<T>(selector: string): T | null {
    return (selector === ".cypherv2-roll-card[data-cypherv2-entrance]" ? this.card : null) as T | null;
  }
}

describe("Chat Card entrance presentation", () => {
  it("marks a newly rendered card once and does not replay on rerender", () => {
    const tracker = new ChatCardEntranceTracker([{id: "history"}]);
    const firstCard = new FakeCard();
    const rerenderedCard = new FakeCard();

    expect(tracker.mark({id: "new"}, new FakeRoot(firstCard) as unknown as ParentNode)).toBe(true);
    expect(firstCard.classList.values).toContain("cypherv2-chat-card-enter");
    expect(tracker.mark({id: "new"}, new FakeRoot(rerenderedCard) as unknown as ParentNode)).toBe(false);
    expect(rerenderedCard.classList.values).not.toContain("cypherv2-chat-card-enter");
  });

  it("does not animate cards already present when the tracker initializes", () => {
    const tracker = new ChatCardEntranceTracker([{id: "history"}]);
    const card = new FakeCard();

    expect(tracker.mark({id: "history"}, new FakeRoot(card) as unknown as ParentNode)).toBe(false);
    expect(card.classList.values).not.toContain("cypherv2-chat-card-enter");
  });
});
