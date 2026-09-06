export type CoreCreationMode = "uninitialized" | "completed" | "skipped" | "manual";

export interface StartingSkillSelection {
  readonly sourceUuid?: string;
  readonly customName?: string;
  readonly category?: "general" | "attack" | "defense";
  readonly rank: "trained" | "inability";
}

export interface CoreCharacterSetupRequest {
  readonly pools: {readonly might: number; readonly speed: number; readonly intellect: number};
  readonly skills: readonly StartingSkillSelection[];
}
