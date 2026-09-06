import type {SkillRank} from "../../constants/system";

export const SKILL_SORT_MODES = ["name", "rank"] as const;
export type SkillSortMode = (typeof SKILL_SORT_MODES)[number];

const RANK_DISPLAY_ORDER: Readonly<Record<SkillRank, number>> = {
  expert: 0,
  specialized: 1,
  trained: 2,
  untrained: 3,
  inability: 4
};

export function isSkillSortMode(value: string | undefined): value is SkillSortMode {
  return SKILL_SORT_MODES.includes(value as SkillSortMode);
}

export function sortSkillList<T extends {readonly name: string; readonly rank: SkillRank}>(
  skills: readonly T[],
  mode: SkillSortMode
): T[] {
  return [...skills].sort((left, right) => {
    const rankDifference = mode === "rank" ? RANK_DISPLAY_ORDER[left.rank] - RANK_DISPLAY_ORDER[right.rank] : 0;
    return rankDifference || left.name.localeCompare(right.name, "en-US");
  });
}
