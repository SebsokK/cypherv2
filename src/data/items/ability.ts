import {
  ABILITY_ACTIVATIONS,
  ABILITY_POOLS,
  ABILITY_ROLL_TYPES,
  ABILITY_TARGET_MODES,
  WOUND_SEVERITIES
} from "../../constants/system";
import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {POOL_KEYS} from "../../rules/core/core-types";
import {normalizeAbilityAllowedPools} from "../../abilities/ability-cost";

export class AbilityDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      tier: integerField(1, 0),
      category: new fields.StringField({required: true, nullable: false, initial: "general"}),
      archived: new fields.BooleanField({required: true, nullable: false, initial: false}),
      activation: new fields.StringField({
        required: true,
        nullable: false,
        initial: "action",
        choices: [...ABILITY_ACTIVATIONS]
      }),
      // Legacy V1 single-Pool source retained for safe document migration.
      // Runtime and UI use cost.allowedPools as the normalized authority.
      pool: new fields.StringField({
        required: true,
        nullable: false,
        initial: "none",
        choices: [...ABILITY_POOLS]
      }),
      cost: new fields.SchemaField({
        amount: integerField(),
        ignoresEdge: new fields.BooleanField({required: true, nullable: false, initial: false}),
        allowedPools: new fields.ArrayField(
          new fields.StringField({required: true, nullable: false, choices: [...POOL_KEYS]}),
          {required: true, nullable: false, initial: []}
        )
      }),
      roll: new fields.StringField({
        required: true,
        nullable: false,
        initial: "none",
        choices: [...ABILITY_ROLL_TYPES]
      }),
      rollModifier: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: -10,
        max: 10,
        initial: 0
      }),
      attackModifier: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        min: -10,
        max: 10,
        initial: 0
      }),
      damage: integerField(),
      woundSeverity: new fields.StringField({
        required: true,
        nullable: false,
        initial: "none",
        choices: ["none", ...WOUND_SEVERITIES]
      }),
      range: new fields.StringField({required: true, nullable: false, initial: ""}),
      targetMode: new fields.StringField({
        required: true,
        nullable: false,
        initial: "none",
        choices: [...ABILITY_TARGET_MODES]
      }),
      // Reserved for the later Focus acquisition workflow. Phase 1 never writes these fields.
      sourceFocusUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
      sourceNodeId: new fields.StringField({required: true, nullable: false, initial: ""})
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    const legacyCost = migrated.cost && typeof migrated.cost === "object"
      ? migrated.cost as Record<string, unknown>
      : {};
    if (options.partial) {
      if (Object.hasOwn(migrated, "archived")) migrated.archived = Boolean(migrated.archived);
      const hasAllowedPools = Object.hasOwn(legacyCost, "allowedPools");
      const hasLegacyPool = Object.hasOwn(migrated, "pool") || Object.hasOwn(legacyCost, "pool");
      if (hasAllowedPools || hasLegacyPool) {
        migrated.cost = {
          ...legacyCost,
          allowedPools: normalizeAbilityAllowedPools(
            hasAllowedPools ? legacyCost.allowedPools : undefined,
            migrated.pool ?? legacyCost.pool
          )
        };
      }
      if (migrated.activation === "enabler") migrated.activation = "passive";
      return migrated;
    }
    if (migrated.pool === undefined) {
      const legacyPool = String(legacyCost.pool ?? "none");
      migrated.pool = ABILITY_POOLS.includes(legacyPool as (typeof ABILITY_POOLS)[number])
        ? legacyPool
        : "none";
    }
    migrated.archived = Boolean(migrated.archived ?? false);
    migrated.cost = {
      amount: Number(legacyCost.amount ?? 0),
      ignoresEdge: Boolean(legacyCost.ignoresEdge ?? false),
      allowedPools: normalizeAbilityAllowedPools(
        legacyCost.allowedPools,
        migrated.pool ?? legacyCost.pool
      )
    };
    if (migrated.activation === "enabler") migrated.activation = "passive";
    if (migrated.roll === undefined) migrated.roll = "none";
    if (migrated.targetMode === undefined) migrated.targetMode = "none";
    return migrated;
  }
}
