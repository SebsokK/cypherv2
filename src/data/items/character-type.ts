import {fields} from "../common/schema";
import {EDGE_GRANT_MODES, PACKAGE_GENRES} from "../../packages/package-types";
import {integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {
  abilityChoiceGroupField,
  abilityGrantField,
  categoryFlagsField,
  packageInstanceField,
  skillChoiceGroupField,
  skillGrantField
} from "./package-fields";

export class CharacterTypeDataModel extends ItemDataModelBase {
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
      abilityGrants: new fields.ArrayField(abilityGrantField(), {required: true, nullable: false, initial: []}),
      abilityChoiceGroups: new fields.ArrayField(abilityChoiceGroupField(), {required: true, nullable: false, initial: []}),
      skillGrants: new fields.ArrayField(skillGrantField(), {required: true, nullable: false, initial: []}),
      choiceGroups: new fields.ArrayField(skillChoiceGroupField(), {required: true, nullable: false, initial: []}),
      genre: new fields.StringField({required: true, nullable: false, initial: "none", choices: [...PACKAGE_GENRES]}),
      customGenreId: new fields.StringField({required: true, nullable: false, initial: ""}),
      backgroundOptions: new fields.HTMLField({required: true, nullable: false, initial: ""}),
      equipmentNotes: new fields.HTMLField({required: true, nullable: false, initial: ""}),
      equipmentBundleUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
      instance: packageInstanceField()
    };
  }
}
