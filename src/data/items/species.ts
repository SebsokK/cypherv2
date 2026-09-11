import {EDGE_GRANT_MODES} from "../../packages/package-types";
import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {
  abilityChoiceGroupField,
  abilityGrantField,
  categoryFlagsField,
  descriptorChoiceGroupField,
  descriptorGrantField,
  packageInstanceField,
  skillChoiceGroupField,
  skillGrantField
} from "./package-fields";
import {legacyWeaponFamilyFlags, normalizeWeaponFamilies} from "../../combat/weapon-family";

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
      weaponFamilies: new fields.ArrayField(
        new fields.StringField({required: true, nullable: false, blank: false}),
        {required: true, nullable: false, initial: []}
      ),
      armorUse: categoryFlagsField(),
      cypherLimitBonus: integerField(),
      skillGrants: new fields.ArrayField(skillGrantField(), {required: true, nullable: false, initial: []}),
      choiceGroups: new fields.ArrayField(skillChoiceGroupField(), {required: true, nullable: false, initial: []}),
      abilityGrants: new fields.ArrayField(abilityGrantField(), {required: true, nullable: false, initial: []}),
      abilityChoiceGroups: new fields.ArrayField(abilityChoiceGroupField(), {required: true, nullable: false, initial: []}),
      descriptorGrants: new fields.ArrayField(descriptorGrantField(), {required: true, nullable: false, initial: []}),
      descriptorChoiceGroups: new fields.ArrayField(descriptorChoiceGroupField(), {required: true, nullable: false, initial: []}),
      instance: packageInstanceField()
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const legacy = legacyWeaponFamilyFlags(source.weaponFamilyUse);
    const migrated = super.migrateData(source, options);
    if (!options.partial || Object.hasOwn(source, "weaponFamilies") || legacy.length > 0) {
      migrated.weaponFamilies = normalizeWeaponFamilies([
        ...(Array.isArray(source.weaponFamilies) ? source.weaponFamilies : []),
        ...legacy
      ]);
    }
    delete migrated.weaponFamilyUse;
    return migrated;
  }
}
