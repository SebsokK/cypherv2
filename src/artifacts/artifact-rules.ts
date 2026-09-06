export interface ArtifactRuleData {
  readonly level?: unknown;
  readonly depleted?: unknown;
}

export function artifactLevelFormula(data: ArtifactRuleData): string {
  const value = String(data.level ?? "1").trim();
  return value || "1";
}

export function artifactLevelIsRollable(data: ArtifactRuleData): boolean {
  return !/^\d+$/.test(artifactLevelFormula(data));
}

export function artifactUsable(data: ArtifactRuleData): boolean {
  return data.depleted !== true;
}
