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
import {legacyWeaponFamilyFlags, normalizeWeaponFamilies} from "../../combat/weapon-family";

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
      weaponFamilies: new fields.ArrayField(
        new fields.StringField({required: true, nullable: false, blank: false}),
        {required: true, nullable: false, initial: []}
      ),
      armorUse: categoryFlagsField(),
      superhero: new fields.SchemaField({
        rank: new fields.NumberField({required: true, nullable: false, integer: true, min: 0, max: 5, initial: 0}),
        powerShiftCount: new fields.NumberField({required: true, nullable: false, integer: true, min: 0, max: 10, initial: 0}),
        superheroics: new fields.SchemaField({
          enabled: new fields.BooleanField({required: true, nullable: false, initial: false}),
          poolBonus: integerField()
        })
      }),
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
