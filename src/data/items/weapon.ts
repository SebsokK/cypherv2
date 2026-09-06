import {
  RANGE_CATEGORIES,
  SKILL_RANKS,
  WEAPON_ATTACK_TYPES,
  WEAPON_CATEGORIES,
  type RangeCategory,
  type SkillRank,
  type WeaponCategory
} from "../../constants/system";
import {POOL_KEYS, type PoolKey} from "../../rules/core/core-types";
import {depletionRuleField, fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class WeaponDataModel extends ItemDataModelBase {
  declare category: WeaponCategory;
  declare damageOverride: number | null;
  declare baseDamage: number;
  declare attackModifier: number;
  declare bonusDamage: number;
  declare skillLevel: SkillRank;
  declare defaultPool: PoolKey | "none";

  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      category: new fields.StringField({
        required: true,
        nullable: false,
        initial: "medium",
        choices: [...WEAPON_CATEGORIES]
      }),
      attackType: new fields.StringField({
        required: true,
        nullable: false,
        initial: "melee",
        choices: [...WEAPON_ATTACK_TYPES]
      }),
      rangeCategory: new fields.StringField({
        required: true,
        nullable: false,
        initial: "immediate",
        choices: [...RANGE_CATEGORIES]
      }),
      rangeNotes: new fields.StringField({required: true, nullable: false, initial: ""}),
      skillLevel: new fields.StringField({
        required: true,
        nullable: false,
        initial: "untrained",
        choices: [...SKILL_RANKS]
      }),
      defaultPool: new fields.StringField({
        required: true,
        nullable: false,
        initial: "none",
        choices: ["none", ...POOL_KEYS]
      }),
      damageOverride: new fields.NumberField({
        required: true,
        nullable: true,
        integer: true,
        min: 0,
        initial: null
      }),
      attackModifier: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: -2,
        max: 2,
        initial: 0
      }),
      bonusDamage: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 0
      }),
      baseDamage: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: 0,
        initial: 4,
        persisted: false
      }),
      // Legacy compatibility only. Effective Weapon familiarity is derived from the Character.
      freelyUsed: new fields.BooleanField({required: true, nullable: false, initial: false}),
      ammo: new fields.SchemaField({
        enabled: new fields.BooleanField({required: true, nullable: false, initial: false}),
        value: integerField(),
        max: integerField(),
        perAttack: integerField(1, 1)
      }),
      depletion: depletionRuleField(),
      depleted: new fields.BooleanField({required: true, nullable: false, initial: false}),
      equipped: new fields.BooleanField({required: true, nullable: false, initial: false})
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    const includesDefaultPool = Object.hasOwn(migrated, "defaultPool");
    if ((!options.partial || includesDefaultPool)
      && migrated.defaultPool !== "none"
      && !POOL_KEYS.includes(migrated.defaultPool as PoolKey)) {
      migrated.defaultPool = "none";
    }
    const category = WEAPON_CATEGORIES.includes(migrated.category as WeaponCategory)
      ? migrated.category as WeaponCategory
      : "medium";
    const coreDamage: Readonly<Record<WeaponCategory, number>> = {light: 2, medium: 4, heavy: 6};
    const legacyDamage = typeof migrated.damageOverride === "number"
      ? migrated.damageOverride
      : typeof migrated.damage === "number"
        ? migrated.damage
        : null;
    if (migrated.bonusDamage === undefined && legacyDamage !== null) {
      migrated.bonusDamage = Math.max(0, legacyDamage - coreDamage[category]);
    }
    migrated.damageOverride = null;
    if (migrated.rangeCategory === undefined && typeof migrated.range === "string") {
      const range = migrated.range as RangeCategory;
      migrated.rangeCategory = RANGE_CATEGORIES.includes(range) ? range : "specified";
      if (migrated.rangeCategory === "specified" && migrated.rangeNotes === undefined) {
        migrated.rangeNotes = migrated.range;
      }
    }
    return migrated;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    const coreDamage: Readonly<Record<WeaponCategory, number>> = {light: 2, medium: 4, heavy: 6};
    this.baseDamage = Math.max(0, coreDamage[this.category] + this.bonusDamage);
  }
}
