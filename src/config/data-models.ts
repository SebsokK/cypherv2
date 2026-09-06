import {CharacterDataModel} from "../data/actors/character";
import {NpcDataModel} from "../data/actors/npc";
import {
  AbilityDataModel,
  ArmorDataModel,
  ArtifactDataModel,
  CharacterTypeDataModel,
  CypherDataModel,
  DescriptorDataModel,
  EquipmentDataModel,
  FocusDataModel,
  GenreDataModel,
  SkillDataModel,
  ShieldDataModel,
  SpeciesDataModel,
  WeaponDataModel
} from "../data/items";

export function registerDataModels(): void {
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterDataModel,
    npc: NpcDataModel
  });

  Object.assign(CONFIG.Item.dataModels, {
    ability: AbilityDataModel,
    skill: SkillDataModel,
    weapon: WeaponDataModel,
    armor: ArmorDataModel,
    shield: ShieldDataModel,
    equipment: EquipmentDataModel,
    cypher: CypherDataModel,
    artifact: ArtifactDataModel,
    descriptor: DescriptorDataModel,
    characterType: CharacterTypeDataModel,
    focus: FocusDataModel,
    genre: GenreDataModel,
    species: SpeciesDataModel
  });

  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["stats.might", "stats.speed", "stats.intellect"],
      value: ["xp", "resourcePoints"]
    },
    npc: {
      bar: ["health"],
      value: ["level"]
    }
  };
}
