export interface DepletionRule {
  readonly enabled: boolean;
  /** Normalized die notation, for example d6, d10, or d20. */
  readonly die: string;
  readonly formula?: string;
  readonly threshold: number;
}

export interface DepletionItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {readonly depletion: DepletionRule; readonly depleted?: boolean};
  readonly actor?: Actor | null;
  update?(changes: Record<string, unknown>): Promise<unknown>;
}

export interface DepletionRollResult {
  readonly itemId: string;
  readonly itemName: string;
  readonly formula: string;
  readonly total: number;
  readonly threshold: number;
  readonly depleted: boolean;
  readonly chatRoll?: unknown;
}
