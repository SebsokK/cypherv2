import {GENRE_EFFORT_CAP_MODES} from "../../genre/genre-types";
import {GENRE_MINIMUM_TIER_MAX, GENRE_MINIMUM_TIER_MIN} from "../../genre/genre-catalog";
import {fields} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {itemSnapshotField} from "./package-fields";

function genreAbilityEntryField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    abilityUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    minimumTier: new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: GENRE_MINIMUM_TIER_MIN,
      max: GENRE_MINIMUM_TIER_MAX,
      initial: GENRE_MINIMUM_TIER_MIN
    }),
    snapshot: itemSnapshotField()
  });
}

/** A data-driven Character-level rules package. */
export class GenreDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      abilityCatalog: new fields.ArrayField(genreAbilityEntryField(), {
        required: true,
        nullable: false,
        initial: []
      }),
      options: new fields.SchemaField({
        totalEffortCapMode: new fields.StringField({
          required: true,
          nullable: false,
          initial: "core",
          choices: [...GENRE_EFFORT_CAP_MODES]
        })
      }),
      legacyKey: new fields.StringField({required: true, nullable: false, initial: ""})
    };
  }
}
