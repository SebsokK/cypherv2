import {RECOVERY_KINDS, RECOVERY_TYPES, REST_TYPES} from "../../constants/system";
import type {
  CharacterDerivedData,
  CharacterOverrides,
  CharacterPools,
  RecoveryUsage,
  RecoverySlotData,
  RecoveryHistoryEntry,
  RestHistoryEntry,
  WoundCollection
} from "../../rules/core/core-types";
import {deriveCharacterData} from "../../rules/core/derived-data";
import {
  contributionArrayField,
  fields,
  integerField,
  statPoolField,
  stringArrayField,
  woundRecordField
} from "../common/schema";
import {ActorDataModelBase} from "./actor-base";
import type {FocusProgress} from "../../focus/focus-types";
import {
  ADVANCEMENT_RECORD_KINDS,
  FOCUS_CHOICE_SOURCES,
  GENRE_CHOICE_SOURCES,
  OTHER_ADVANCEMENT_KINDS,
  type CharacterAdvancementData
} from "../../advancement/advancement-types";
import {migrateCharacterSystemData, type CharacterMigrationOptions} from "./character-migration";
import {collectPackageDerivedData} from "../../packages/package-derived";
import type {CharacterPackageItemLike} from "../../packages/package-types";
import {GENRE_ASSOCIATION_PROVENANCES} from "../../genre/genre-types";
import {effectiveGenre} from "../../genre/genre-rules";
import type {GenreAssociationData, GenreDocumentLike} from "../../genre/genre-types";
import {
  CHARACTER_HEADER_BACKGROUND_MODES,
  type CharacterAppearanceData
} from "../../themes/character-appearance";
import {defaultRecoverySlots} from "../../rules/core/recovery-track";

function advancementPurchaseField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    kind: new fields.StringField({required: true, nullable: false, choices: [...ADVANCEMENT_RECORD_KINDS]}),
    otherKind: new fields.StringField({
      required: true,
      nullable: false,
      initial: "none",
      choices: ["none", ...OTHER_ADVANCEMENT_KINDS]
    }),
    tier: integerField(1, 1),
    xpCost: integerField(),
    resourcePointsGranted: integerField(),
    timestamp: integerField()
  });
}

function pendingFocusChoiceField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    source: new fields.StringField({required: true, nullable: false, choices: [...FOCUS_CHOICE_SOURCES]}),
    grantTier: integerField(1, 1),
    focusUuid: new fields.StringField({required: true, nullable: false, initial: ""})
  });
}

function pendingGenreChoiceField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    source: new fields.StringField({required: true, nullable: false, choices: [...GENRE_CHOICE_SOURCES]}),
    grantTier: integerField(1, 1)
  });
}

function focusAcquisitionRecordField(): unknown {
  return new fields.SchemaField({
    nodeId: new fields.StringField({required: true, nullable: false, blank: false}),
    mode: new fields.StringField({
      required: true,
      nullable: false,
      choices: ["choice", "manualOverride", "gmOverride", "gmManual", "legacy"]
    }),
    choiceId: new fields.StringField({required: true, nullable: false, initial: ""}),
    choiceSource: new fields.StringField({
      required: true,
      nullable: false,
      initial: "none",
      choices: ["none", ...FOCUS_CHOICE_SOURCES]
    }),
    choiceGrantTier: integerField(1, 1),
    choiceFocusUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    acquiredAt: integerField()
  });
}

function recoveryHistoryField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    slotId: new fields.StringField({required: true, nullable: false, blank: true, initial: ""}),
    kind: new fields.StringField({
      required: true,
      nullable: false,
      initial: "normal",
      choices: [...RECOVERY_KINDS]
    }),
    type: new fields.StringField({required: true, nullable: false, choices: [...RECOVERY_TYPES]}),
    rolled: new fields.BooleanField({required: true, nullable: false, initial: true}),
    dieResult: integerField(),
    tier: integerField(1, 1),
    bonus: integerField(),
    total: integerField(),
    might: integerField(),
    speed: integerField(),
    intellect: integerField(),
    timestamp: integerField()
  });
}

function recoverySlotField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    type: new fields.StringField({required: true, nullable: false, choices: [...RECOVERY_TYPES]}),
    used: new fields.BooleanField({required: true, nullable: false, initial: false})
  });
}

function restHistoryField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    type: new fields.StringField({required: true, nullable: false, choices: [...REST_TYPES]}),
    choice: new fields.StringField({required: true, nullable: false, initial: ""}),
    majorTaskSucceeded: new fields.BooleanField({required: true, nullable: false, initial: false}),
    removedWoundIds: stringArrayField(),
    timestamp: integerField()
  });
}

function derivedPoolField(): unknown {
  return new fields.SchemaField({
    calculatedMax: integerField(),
    calculatedEdge: integerField(0, -20),
    max: integerField(),
    edge: integerField(0, -20),
    maxContributions: contributionArrayField(),
    edgeContributions: contributionArrayField()
  });
}

export class CharacterDataModel extends ActorDataModelBase {
  declare tier: number;
  declare overrides: CharacterOverrides;
  declare cypherLimitBase: number;
  declare stats: CharacterPools & {effortBase: number};
  declare wounds: WoundCollection;
  declare recovery: {
    bonus: number;
    used: RecoveryUsage;
    slots: RecoverySlotData[];
    customized: boolean;
    rollModifier: number;
    history: RecoveryHistoryEntry[];
  };
  declare rest: {lastType: string; history: RestHistoryEntry[]};
  declare focusProgress: FocusProgress[];
  declare genre: GenreAssociationData;
  declare appearance: CharacterAppearanceData;
  declare presentation: {hideFocusInSentence: boolean};
  declare advancement: CharacterAdvancementData;
  declare derived: CharacterDerivedData;

  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      tier: integerField(1, 1),
      overrides: new fields.SchemaField({
        tier: new fields.NumberField({required: true, nullable: true, integer: true, min: 1, initial: null}),
        effort: new fields.NumberField({required: true, nullable: true, integer: true, min: 0, initial: null}),
        stats: new fields.SchemaField({
          might: new fields.SchemaField({
            max: new fields.NumberField({required: true, nullable: true, integer: true, min: 1, initial: null}),
            edge: new fields.NumberField({required: true, nullable: true, integer: true, min: -20, initial: null})
          }),
          speed: new fields.SchemaField({
            max: new fields.NumberField({required: true, nullable: true, integer: true, min: 1, initial: null}),
            edge: new fields.NumberField({required: true, nullable: true, integer: true, min: -20, initial: null})
          }),
          intellect: new fields.SchemaField({
            max: new fields.NumberField({required: true, nullable: true, integer: true, min: 1, initial: null}),
            edge: new fields.NumberField({required: true, nullable: true, integer: true, min: -20, initial: null})
          })
        }),
        wounds: new fields.SchemaField({
          minor: integerField(0, -20),
          moderate: integerField(0, -20),
          major: integerField(0, -20)
        })
      }),
      xp: integerField(),
      resourcePoints: integerField(),
      stats: new fields.SchemaField({
        effortBase: integerField(1),
        might: statPoolField(8),
        speed: statPoolField(8),
        intellect: statPoolField(8)
      }),
      recovery: new fields.SchemaField({
        bonus: integerField(),
        used: new fields.SchemaField({
          oneAction: new fields.BooleanField({required: true, nullable: false, initial: false}),
          tenMinutes: new fields.BooleanField({required: true, nullable: false, initial: false}),
          oneHour: new fields.BooleanField({required: true, nullable: false, initial: false}),
          tenHours: new fields.BooleanField({required: true, nullable: false, initial: false})
        }),
        slots: new fields.ArrayField(recoverySlotField(), {
          required: true,
          nullable: false,
          initial: defaultRecoverySlots()
        }),
        customized: new fields.BooleanField({required: true, nullable: false, initial: false}),
        rollModifier: integerField(0, -20),
        history: new fields.ArrayField(recoveryHistoryField(), {
          required: true,
          nullable: false,
          initial: []
        })
      }),
      rest: new fields.SchemaField({
        lastType: new fields.StringField({required: true, nullable: false, initial: ""}),
        history: new fields.ArrayField(restHistoryField(), {
          required: true,
          nullable: false,
          initial: []
        })
      }),
      wounds: new fields.SchemaField({
        minor: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []}),
        moderate: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []}),
        major: new fields.ArrayField(woundRecordField(), {required: true, nullable: false, initial: []})
      }),
      cypherLimitBase: integerField(2),
      build: new fields.SchemaField({
        descriptorIds: stringArrayField(),
        typeIds: stringArrayField(),
        speciesIds: stringArrayField()
      }),
      focusProgress: new fields.ArrayField(
        new fields.SchemaField({
          focusUuid: new fields.StringField({required: true, nullable: false, blank: false}),
          ownedNodeIds: stringArrayField(),
          acquisitions: new fields.ArrayField(focusAcquisitionRecordField(), {
            required: true,
            nullable: false,
            initial: []
          }),
          provenance: new fields.StringField({
            required: true,
            nullable: false,
            initial: "additional",
            choices: ["creation", "additional"]
          }),
          initialChoicesGranted: new fields.BooleanField({
            required: true,
            nullable: false,
            initial: false
          }),
          attachedAt: integerField()
        }),
        {required: true, nullable: false, initial: []}
      ),
      genre: new fields.SchemaField({
        sourceUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
        instanceId: new fields.StringField({required: true, nullable: false, initial: ""}),
        provenance: new fields.StringField({
          required: true,
          nullable: false,
          initial: "manual",
          choices: [...GENRE_ASSOCIATION_PROVENANCES]
        }),
        attachedAt: integerField()
      }),
      appearance: new fields.SchemaField({
        backgroundMode: new fields.StringField({
          required: true,
          nullable: false,
          initial: "theme",
          choices: [...CHARACTER_HEADER_BACKGROUND_MODES]
        }),
        customImage: new fields.StringField({
          required: true,
          nullable: false,
          blank: true,
          initial: ""
        }),
        color: new fields.StringField({
          required: true,
          nullable: false,
          blank: true,
          initial: "",
          validate: (value: string) => value === "" || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)
        })
      }),
      presentation: new fields.SchemaField({
        hideFocusInSentence: new fields.BooleanField({required: true, nullable: false, initial: false})
      }),
      advancement: new fields.SchemaField({
        cycle: integerField(1, 1),
        purchases: new fields.ArrayField(advancementPurchaseField(), {
          required: true,
          nullable: false,
          initial: []
        }),
        initializedFocusUuids: stringArrayField(),
        pendingFocusChoices: new fields.ArrayField(pendingFocusChoiceField(), {
          required: true,
          nullable: false,
          initial: []
        }),
        pendingGenreChoices: new fields.ArrayField(pendingGenreChoiceField(), {
          required: true,
          nullable: false,
          initial: []
        }),
        guidanceCompletedTiers: new fields.ArrayField(integerField(1, 1), {
          required: true,
          nullable: false,
          initial: []
        }),
        notes: new fields.HTMLField({required: true, nullable: false, initial: ""})
      }),
      creation: new fields.SchemaField({
        coreInitialized: new fields.BooleanField({required: true, nullable: false, initial: false}),
        mode: new fields.StringField({
          required: true,
          nullable: false,
          initial: "uninitialized",
          choices: ["uninitialized", "completed", "skipped", "manual"]
        }),
        initializedAt: integerField()
      }),
      proficiencies: new fields.SchemaField({
        weaponCategories: stringArrayField(["light"]),
        armorCategories: stringArrayField(),
        freelyUse: stringArrayField()
      }),
      derived: new fields.SchemaField(
        {
          tier: new fields.SchemaField({
            calculated: integerField(1, 1),
            value: integerField(1, 1)
          }),
          pools: new fields.SchemaField({
            might: derivedPoolField(),
            speed: derivedPoolField(),
            intellect: derivedPoolField()
          }),
          effort: new fields.SchemaField({
            calculatedMax: integerField(),
            max: integerField(),
            contributions: contributionArrayField()
          }),
          wounds: new fields.SchemaField({
            calculatedCapacities: new fields.SchemaField({
              minor: integerField(3, 1),
              moderate: integerField(3, 1),
              major: integerField(3, 1)
            }),
            capacities: new fields.SchemaField({
              minor: integerField(3, 1),
              moderate: integerField(3, 1),
              major: integerField(3, 1)
            }),
            capacityContributions: new fields.SchemaField({
              minor: contributionArrayField(),
              moderate: contributionArrayField(),
              major: contributionArrayField()
            }),
            hindrance: integerField(),
            hindranceContributions: contributionArrayField(),
            dead: new fields.BooleanField({required: true, nullable: false, initial: false})
          }),
          recovery: new fields.SchemaField({
            formula: new fields.StringField({required: true, nullable: false, initial: "1d6 + Tier"}),
            calculatedFormula: new fields.StringField({required: true, nullable: false, initial: "1d6 + Tier"}),
            calculatedBonus: integerField(0, -20),
            manualModifier: integerField(0, -20),
            bonus: integerField(),
            bonusContributions: contributionArrayField(),
            availableTypes: new fields.ArrayField(
              new fields.StringField({required: true, nullable: false, choices: [...RECOVERY_TYPES]}),
              {required: true, nullable: false, initial: []}
            )
          }),
          cypherLimit: new fields.SchemaField({max: integerField(), contributions: contributionArrayField()}),
          combat: new fields.SchemaField({
            armor: new fields.SchemaField({
              itemId: new fields.StringField({required: true, nullable: false, initial: ""}),
              category: new fields.StringField({
                required: true,
                nullable: false,
                initial: "none",
                choices: ["none", "light", "medium", "heavy"]
              }),
              freelyUsed: new fields.BooleanField({required: true, nullable: false, initial: true}),
              blockEase: integerField(),
              dodgeHindrance: integerField(),
              speedTaskHindrance: integerField(),
              blockContributions: contributionArrayField(),
              dodgeContributions: contributionArrayField(),
              speedTaskContributions: contributionArrayField()
            })
          }),
          packages: new fields.SchemaField({
            weaponCategories: stringArrayField(),
            armorCategories: stringArrayField(),
            genre: new fields.StringField({required: true, nullable: false, initial: "none"}),
            genreUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
            totalEffortCapMode: new fields.StringField({
              required: true,
              nullable: false,
              initial: "core",
              choices: ["core", "unlimited"]
            }),
            typeNames: stringArrayField(),
            descriptorNames: stringArrayField(),
            speciesNames: stringArrayField(),
            characterSentence: new fields.StringField({required: true, nullable: false, initial: ""})
          })
        },
        {required: true, nullable: false, persisted: false}
      )
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: CharacterMigrationOptions = {}
  ): Record<string, unknown> {
    return migrateCharacterSystemData(super.migrateData(source), options);
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    const allItems = [...((this.parent as Actor).items ?? [])];
    const parentItems = allItems
      .filter((item) => item.type === "armor")
      .map((item) => ({
        id: item.id,
        type: item.type,
        system: item.system as unknown as {
          category: "light" | "medium" | "heavy";
          equipped: boolean;
          freelyUsed: boolean;
          slug?: string;
        }
      }));
    const proficiencies = (this as unknown as {
      proficiencies: {armorCategories: string[]; freelyUse: string[]};
    }).proficiencies;
    const packages = collectPackageDerivedData(
      allItems.filter((item) => item.type === "characterType" || item.type === "descriptor" || item.type === "species") as unknown as CharacterPackageItemLike[],
      (proficiencies as unknown as {weaponCategories: string[]}).weaponCategories,
      proficiencies.armorCategories
    );
    const activeGenre = effectiveGenre(this.genre, (uuid) => {
      if (typeof fromUuidSync !== "function") return null;
      return fromUuidSync(uuid) as GenreDocumentLike | null;
    });
    const combinedProficiencies = {
      armorCategories: packages.armorCategories,
      freelyUse: proficiencies.freelyUse
    };
    const derived = deriveCharacterData(
      this.stats,
      this.wounds,
      this.recovery.used,
      packages.extensions,
      parentItems,
      combinedProficiencies,
      this.recovery.bonus,
      {
        weaponCategories: [...packages.weaponCategories],
        armorCategories: [...packages.armorCategories],
        genre: activeGenre?.name ?? "none",
        genreUuid: activeGenre?.sourceUuid ?? "",
        totalEffortCapMode: activeGenre?.totalEffortCapMode ?? "core",
        typeNames: [...packages.typeNames],
        descriptorNames: [...packages.descriptorNames],
        speciesNames: [...packages.speciesNames],
        characterSentence: packages.characterSentence
      },
      this.cypherLimitBase,
      this.tier,
      this.overrides,
      this.recovery.rollModifier,
      this.recovery.slots
    );

    Object.assign(this.derived.tier, derived.tier);
    Object.assign(this.derived.pools.might, derived.pools.might);
    Object.assign(this.derived.pools.speed, derived.pools.speed);
    Object.assign(this.derived.pools.intellect, derived.pools.intellect);
    Object.assign(this.derived.effort, derived.effort);
    Object.assign(this.derived.wounds.calculatedCapacities, derived.wounds.calculatedCapacities);
    Object.assign(this.derived.wounds.capacities, derived.wounds.capacities);
    Object.assign(this.derived.wounds.capacityContributions, derived.wounds.capacityContributions);
    this.derived.wounds.hindrance = derived.wounds.hindrance;
    this.derived.wounds.hindranceContributions = derived.wounds.hindranceContributions;
    this.derived.wounds.dead = derived.wounds.dead;
    Object.assign(this.derived.recovery, derived.recovery);
    Object.assign(this.derived.cypherLimit, derived.cypherLimit);
    Object.assign(this.derived.combat.armor, derived.combat.armor);
    Object.assign(this.derived.packages, derived.packages);

    // Foundry token bars expect value/max siblings. These projections are
    // non-persisted; system.derived remains the canonical calculated data.
    for (const pool of ["might", "speed", "intellect"] as const) {
      this.stats[pool].max = derived.pools[pool].max;
      this.stats[pool].edge = derived.pools[pool].edge;
    }
  }
}
