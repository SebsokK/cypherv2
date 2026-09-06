import {fields, integerField} from "../common/schema";
import {ActorDataModelBase} from "./actor-base";

export class NpcDataModel extends ActorDataModelBase {
  declare health: {value: number; baseMax: number; max: number};
  declare dead: boolean;
  declare armor: number;

  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      level: integerField(1, 0),
      health: new fields.SchemaField({
        value: integerField(3),
        baseMax: integerField(3, 1),
        max: new fields.NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 1,
          initial: 3,
          persisted: false
        })
      }),
      dead: new fields.BooleanField({
        required: true,
        nullable: false,
        initial: false,
        persisted: false
      }),
      // GM-facing reference only. NPC combat intentionally continues to use
      // the legacy armorBase field where that older automation is required.
      armor: integerField(),
      armorBase: integerField(),
      damage: new fields.SchemaField({
        amount: integerField(1),
        woundSeverity: new fields.StringField({
          required: true,
          nullable: false,
          initial: "minor",
          choices: ["minor", "moderate", "major"]
        }),
        defense: new fields.SchemaField({
          allowBlock: new fields.BooleanField({required: true, nullable: false, initial: true}),
          allowDodge: new fields.BooleanField({required: true, nullable: false, initial: true})
        }),
        notes: new fields.StringField({required: true, nullable: false, initial: ""})
      }),
      movement: new fields.SchemaField({
        category: new fields.StringField({required: true, nullable: false, initial: "short"}),
        distance: new fields.StringField({required: true, nullable: false, initial: ""}),
        notes: new fields.StringField({required: true, nullable: false, initial: ""})
      }),
      modifications: new fields.ArrayField(
        new fields.SchemaField({
          id: new fields.StringField({required: true, nullable: false, blank: false}),
          label: new fields.StringField({required: true, nullable: false, initial: ""}),
          contexts: new fields.ArrayField(
            new fields.StringField({required: true, nullable: false, blank: false}),
            {required: true, nullable: false, initial: []}
          ),
          mode: new fields.StringField({
            required: true,
            nullable: false,
            initial: "levelOverride",
            choices: ["levelOverride", "levelDelta", "ease", "hinder"]
          }),
          value: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0}),
          visibility: new fields.StringField({
            required: true,
            nullable: false,
            initial: "gm",
            choices: ["public", "gm"]
          }),
          predicate: new fields.ObjectField({required: true, nullable: false, initial: {}}),
          description: new fields.HTMLField({required: true, nullable: false, initial: ""})
        }),
        {required: true, nullable: false, initial: []}
      ),
      gmIntrusion: new fields.HTMLField({required: true, nullable: false, initial: ""})
    };
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.health.max = this.health.baseMax;
    this.dead = this.health.value <= 0;
  }
}
