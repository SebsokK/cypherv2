import {EDGE_GRANT_MODES} from "../../packages/package-types";
import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {
  abilityChoiceGroupField,
  abilityGrantField,
  categoryFlagsField,
  itemSnapshotField,
  packageInstanceField,
  skillChoiceGroupField,
  skillGrantField
} from "./package-fields";

export class SpeciesDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      poolBonuses: new fields.SchemaField({might: integerField(), speed: integerField(), intellect: integerField()}),
      woundBonuses: new fields.SchemaField({minor: integerField(), moderate: integerField(), major: integerField()}),
      edgeGrant: new fields.SchemaField({
        mode: new fields.StringField({required: true, nullable: false, initial: "none", choices: [...EDGE_GRANT_MODES]}),
        pool: new fields.StringField({required: true, nullable: false, initial: "none", choices: ["none", "might", "speed", "intellect"]}),
        amount: integerField(1)
      }),
      weaponUse: categoryFlagsField(),
      armorUse: categoryFlagsField(),
      cypherLimitBonus: integerField(),
      skillGrants: new fields.ArrayField(skillGrantField(), {required: true, nullable: false, initial: []}),
      choiceGroups: new fields.ArrayField(skillChoiceGroupField(), {required: true, nullable: false, initial: []}),
      abilityGrants: new fields.ArrayField(abilityGrantField(), {required: true, nullable: false, initial: []}),
      abilityChoiceGroups: new fields.ArrayField(abilityChoiceGroupField(), {required: true, nullable: false, initial: []}),
      descriptorGrants: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true, nullable: false, blank: false}),
        descriptorUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
        snapshot: itemSnapshotField()
      }), {required: true, nullable: false, initial: []}),
      instance: packageInstanceField()
    };
  }
}
