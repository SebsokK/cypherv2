import {SKILL_RANKS} from "../../constants/system";
import {GRANT_KINDS, GRANT_STATUSES, PACKAGE_ROLES} from "../../packages/package-types";
import {POOL_KEYS} from "../../rules/core/core-types";
import {fields, integerField} from "../common/schema";

export function itemSnapshotField(): unknown {
  return new fields.SchemaField({
    name: new fields.StringField({required: true, nullable: false, initial: ""}),
    img: new fields.StringField({required: true, nullable: false, initial: ""}),
    system: new fields.ObjectField({required: true, nullable: false, initial: {}})
  });
}

export function provenanceField(): unknown {
  return new fields.SchemaField({
    kind: new fields.StringField({required: true, nullable: false, initial: "other", choices: [...GRANT_KINDS]}),
    sourceUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    instanceId: new fields.StringField({required: true, nullable: false, initial: ""}),
    grantId: new fields.StringField({required: true, nullable: false, initial: ""}),
    status: new fields.StringField({required: true, nullable: false, initial: "active", choices: [...GRANT_STATUSES]}),
    contentUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    contentKey: new fields.StringField({required: true, nullable: false, initial: ""}),
    replacement: new fields.SchemaField({
      active: new fields.BooleanField({required: true, nullable: false, initial: false}),
      originalName: new fields.StringField({required: true, nullable: false, initial: ""}),
      originalContentUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
      originalContentKey: new fields.StringField({required: true, nullable: false, initial: ""}),
      replacementName: new fields.StringField({required: true, nullable: false, initial: ""}),
      replacementContentUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
      replacementContentKey: new fields.StringField({required: true, nullable: false, initial: ""}),
      selectionKind: new fields.StringField({required: true, nullable: false, initial: "none", choices: ["none", "suggested", "world", "compendium", "custom"]})
    })
  });
}

export function grantAlternativeField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    itemUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    customName: new fields.StringField({required: true, nullable: false, initial: ""}),
    snapshot: itemSnapshotField()
  });
}

function selectionField(): unknown {
  return new fields.SchemaField({
    groupId: new fields.StringField({required: true, nullable: false, blank: false}),
    optionIds: new fields.ArrayField(new fields.StringField({required: true, nullable: false, blank: false}), {required: true, nullable: false, initial: []})
  });
}

function poolChoiceSelectionField(): unknown {
  return new fields.SchemaField({
    groupId: new fields.StringField({required: true, nullable: false, blank: false}),
    pools: new fields.ArrayField(
      new fields.StringField({required: true, nullable: false, blank: false, choices: [...POOL_KEYS]}),
      {required: true, nullable: false, initial: []}
    )
  });
}

export function packageInstanceField(): unknown {
  return new fields.SchemaField({
    sourceUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    instanceId: new fields.StringField({required: true, nullable: false, initial: ""}),
    role: new fields.StringField({required: true, nullable: false, initial: "primary", choices: [...PACKAGE_ROLES]}),
    attachedAt: integerField(),
    selections: new fields.SchemaField({
      edgePool: new fields.StringField({required: true, nullable: false, initial: "none", choices: ["none", "might", "speed", "intellect"]}),
      poolChoices: new fields.ArrayField(poolChoiceSelectionField(), {required: true, nullable: false, initial: []}),
      skillChoices: new fields.ArrayField(selectionField(), {required: true, nullable: false, initial: []}),
      abilityChoices: new fields.ArrayField(selectionField(), {required: true, nullable: false, initial: []}),
      suppressedGrantIds: new fields.ArrayField(new fields.StringField({required: true, nullable: false, blank: false}), {required: true, nullable: false, initial: []})
    }),
    parent: provenanceField()
  });
}

export function poolBonusChoiceGroupField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    amount: integerField(1, 1),
    choose: integerField(1, 1),
    pools: new fields.ArrayField(
      new fields.StringField({required: true, nullable: false, blank: false, choices: [...POOL_KEYS]}),
      {required: true, nullable: false, initial: []}
    )
  });
}

export function abilityGrantField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    abilityUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    snapshot: itemSnapshotField(),
    alternatives: new fields.ArrayField(grantAlternativeField(), {required: true, nullable: false, initial: []})
  });
}

export function skillOptionField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    skillUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    customName: new fields.StringField({required: true, nullable: false, initial: ""}),
    snapshot: itemSnapshotField()
  });
}

export function skillGrantField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    skillUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    customName: new fields.StringField({required: true, nullable: false, initial: ""}),
    rank: new fields.StringField({required: true, nullable: false, initial: "trained", choices: [...SKILL_RANKS]}),
    snapshot: itemSnapshotField(),
    alternatives: new fields.ArrayField(grantAlternativeField(), {required: true, nullable: false, initial: []})
  });
}

export function skillChoiceGroupField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    choose: integerField(1, 1),
    rank: new fields.StringField({required: true, nullable: false, initial: "trained", choices: [...SKILL_RANKS]}),
    options: new fields.ArrayField(skillOptionField(), {required: true, nullable: false, initial: []})
  });
}

export function abilityChoiceGroupField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    choose: integerField(1, 1),
    options: new fields.ArrayField(abilityGrantField(), {required: true, nullable: false, initial: []})
  });
}

export function categoryFlagsField(): unknown {
  return new fields.SchemaField({
    light: new fields.BooleanField({required: true, nullable: false, initial: false}),
    medium: new fields.BooleanField({required: true, nullable: false, initial: false}),
    heavy: new fields.BooleanField({required: true, nullable: false, initial: false})
  });
}
