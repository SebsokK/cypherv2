import {describe, expect, it} from "vitest";

import {sortSkillList} from "../../src/applications/sheets/skill-list";
import type {SkillRank} from "../../src/constants/system";

interface SkillView {
  name: string;
  rank: SkillRank;
}

const skills: SkillView[] = [
  {name: "Zoology", rank: "trained"},
  {name: "Athletics", rank: "trained"},
  {name: "Perception", rank: "specialized"},
  {name: "Ancient History", rank: "inability"},
  {name: "Etiquette", rank: "untrained"},
  {name: "Cosmology", rank: "expert"},
  {name: "Alchemy", rank: "expert"}
];

describe("Skill list display sorting", () => {
  it("defaults conceptually to a stable alphabetical name sort", () => {
    expect(sortSkillList(skills, "name").map(({name}) => name)).toEqual([
      "Alchemy",
      "Ancient History",
      "Athletics",
      "Cosmology",
      "Etiquette",
      "Perception",
      "Zoology"
    ]);
  });

  it("sorts Rank from Expert to Inability and alphabetically within each Rank", () => {
    expect(sortSkillList(skills, "rank").map(({name, rank}) => `${rank}:${name}`)).toEqual([
      "expert:Alchemy",
      "expert:Cosmology",
      "specialized:Perception",
      "trained:Athletics",
      "trained:Zoology",
      "untrained:Etiquette",
      "inability:Ancient History"
    ]);
  });

  it("does not mutate the Item view order", () => {
    const original = skills.map(({name}) => name);
    sortSkillList(skills, "rank");
    expect(skills.map(({name}) => name)).toEqual(original);
  });
});
