export interface ArtifactItemLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: "artifact";
  readonly system: {
    readonly level: string;
    readonly depleted: boolean;
  };
  readonly actor?: Actor | null;
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export interface ArtifactLevelRollResult {
  readonly itemId: string;
  readonly itemName: string;
  readonly formula: string;
  readonly total: number;
  readonly chatRoll?: unknown;
}
