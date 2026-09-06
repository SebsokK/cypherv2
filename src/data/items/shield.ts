import type {WoundCapacities, WoundCollection} from "../../rules/core/core-types";
import {SHIELD_WOUND_CAPACITIES} from "../../rules/core/shield-rules";
import {depletionRuleField, fields, integerField, woundRecordField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export interface ShieldDerivedData {
  capacities: WoundCapacities;
  broken: boolean;
}

export class ShieldDataModel extends ItemDataModelBase {
  declare equipped: boolean;
  declare woundCapacities: WoundCapacities;
  declare wounds: WoundCollection;
  declare derived: ShieldDerivedData;

  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      equipped: new fields.BooleanField({required: true, nullable: false, initial: false}),
      depletion: depletionRuleField(),
      depleted: new fields.BooleanField({required: true, nullable: false, initial: false}),
      woundCapacities: new fields.SchemaField({
        minor: integerField(SHIELD_WOUND_CAPACITIES.minor),
        moderate: integerField(SHIELD_WOUND_CAPACITIES.moderate),
        major: integerField(SHIELD_WOUND_CAPACITIES.major)
      }),
      wounds: new fields.SchemaField({
        minor: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []}),
        moderate: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []}),
        major: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []})
      }),
      derived: new fields.SchemaField({
        capacities: new fields.SchemaField({
          minor: integerField(SHIELD_WOUND_CAPACITIES.minor),
          moderate: integerField(SHIELD_WOUND_CAPACITIES.moderate),
          major: integerField(SHIELD_WOUND_CAPACITIES.major)
        }),
        broken: new fields.BooleanField({required: true, nullable: false, initial: false})
      }, {required: true, nullable: false, persisted: false})
    };
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    Object.assign(this.derived.capacities, this.woundCapacities);
    this.derived.broken = this.wounds.major.length >= this.derived.capacities.major;
  }
}
