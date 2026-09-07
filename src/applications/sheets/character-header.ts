import {type RecoveryType, type WoundSeverity} from "../../constants/system";
import {
  type RecoverySlotData,
  type RecoveryUsage,
  type WoundCapacities
} from "../../rules/core/core-types";
import type {PackageRole} from "../../packages/package-types";
import {defaultRecoverySlots} from "../../rules/core/recovery-track";

export interface HeaderIdentityReference {
  readonly id?: string;
  readonly uuid?: string;
  readonly name: string;
  readonly role?: PackageRole;
  readonly instanceId?: string;
  readonly attachedAt?: number;
}

export interface HeaderIdentitySlot extends HeaderIdentityReference {
  readonly kind: "descriptor" | "species" | "type" | "focus";
  readonly accepts: "descriptor" | "species" | "characterType" | "focus";
  readonly missing: boolean;
  readonly displayName: string;
}

export interface HeaderPip {
  readonly index: number;
  readonly filled: boolean;
  readonly targetCount: number;
}

export interface HeaderWoundTrack {
  readonly severity: WoundSeverity;
  readonly count: number;
  readonly capacity: number;
  readonly overCapacity: number;
  readonly pips: readonly HeaderPip[];
}

export interface HeaderRecoveryButton {
  readonly id: string;
  readonly type: RecoveryType;
  readonly used: boolean;
  readonly available: boolean;
  readonly shortLabel: string;
}

export interface HeaderPoolGauge {
  readonly current: number;
  readonly max: number;
  readonly ratio: number;
  readonly percent: number;
}

const IDENTITY_META = {
  descriptor: {accepts: "descriptor", placeholder: "[DESCRIPTOR]"},
  species: {accepts: "species", placeholder: "[SPECIES]"},
  type: {accepts: "characterType", placeholder: "[TYPE]"},
  focus: {accepts: "focus", placeholder: "[FOCUS]"}
} as const;

const RECOVERY_SHORT_LABELS: Readonly<Record<RecoveryType, string>> = {
  "one-action": "CYPHERV2.Hud.Recovery.Action",
  "10-minutes": "CYPHERV2.Hud.Recovery.TenMinutes",
  "1-hour": "CYPHERV2.Hud.Recovery.OneHour",
  "10-hours": "CYPHERV2.Hud.Recovery.TenHours"
};

export function identitySlot(
  kind: HeaderIdentitySlot["kind"],
  reference?: HeaderIdentityReference
): HeaderIdentitySlot {
  const meta = IDENTITY_META[kind];
  return {
    kind,
    accepts: meta.accepts,
    missing: !reference,
    displayName: reference?.name.toLocaleUpperCase("en-US") ?? meta.placeholder,
    name: reference?.name ?? meta.placeholder,
    ...(reference?.id ? {id: reference.id} : {}),
    ...(reference?.uuid ? {uuid: reference.uuid} : {}),
    ...(reference?.role ? {role: reference.role} : {}),
    ...(reference?.instanceId ? {instanceId: reference.instanceId} : {}),
    ...(reference?.attachedAt !== undefined ? {attachedAt: reference.attachedAt} : {})
  };
}

const DESCRIPTOR_ROLE_ORDER: Readonly<Record<PackageRole, number>> = {
  primary: 0,
  additional: 1,
  custom: 1,
  speciesGranted: 2
};

function descriptorIdentity(reference: HeaderIdentityReference): string {
  return reference.instanceId
    || reference.id
    || reference.uuid
    || `${reference.role ?? "custom"}:${reference.name.trim().toLocaleLowerCase("en-US")}`;
}

export function orderedHeaderDescriptors(
  references: readonly HeaderIdentityReference[] = []
): readonly HeaderIdentityReference[] {
  const unique = new Map<string, HeaderIdentityReference>();
  for (const reference of references) {
    const key = descriptorIdentity(reference);
    if (!unique.has(key)) unique.set(key, reference);
  }
  return [...unique.values()].sort((left, right) => (
    (DESCRIPTOR_ROLE_ORDER[left.role ?? "custom"] - DESCRIPTOR_ROLE_ORDER[right.role ?? "custom"])
    || ((left.attachedAt ?? 0) - (right.attachedAt ?? 0))
    || left.name.localeCompare(right.name, "en-US")
    || descriptorIdentity(left).localeCompare(descriptorIdentity(right), "en-US")
  ));
}

export function indefiniteArticle(value: string): "A" | "AN" {
  const word = value.trim().replace(/^[^a-z]+/i, "").toLocaleLowerCase("en-US");
  if (/^(honest|honor|hour|heir)/.test(word)) return "AN";
  if (/^(one|once|euro|user|use|uni(?:t|v|q))/.test(word)) return "A";
  return /^[aeiou]/.test(word) ? "AN" : "A";
}

export interface CharacterHeaderIdentityInput {
  readonly descriptors?: readonly HeaderIdentityReference[];
  readonly species?: HeaderIdentityReference;
  readonly type?: HeaderIdentityReference;
  readonly focus?: HeaderIdentityReference;
  readonly hideFocus?: boolean;
}

export function characterHeaderIdentity(input: CharacterHeaderIdentityInput = {}): {
  readonly article: "A" | "AN";
  readonly descriptors: readonly HeaderIdentitySlot[];
  readonly species: HeaderIdentitySlot | null;
  readonly type: HeaderIdentitySlot;
  readonly focus: HeaderIdentitySlot;
  readonly showFocus: boolean;
  readonly sentence: string;
} {
  const orderedDescriptors = orderedHeaderDescriptors(input.descriptors);
  const descriptorSlots = orderedDescriptors.map((descriptor) => identitySlot("descriptor", descriptor));
  if (!orderedDescriptors.some((descriptor) => descriptor.role === "primary")) {
    descriptorSlots.unshift(identitySlot("descriptor"));
  }
  const speciesSlot = input.species ? identitySlot("species", input.species) : null;
  const typeSlot = identitySlot("type", input.type);
  const focusSlot = identitySlot("focus", input.focus);
  const showFocus = input.hideFocus !== true;
  const article = indefiniteArticle(descriptorSlots[0]!.displayName);
  const descriptorText = descriptorSlots.map((descriptor) => descriptor.displayName).join(" AND ");
  const identityText = [descriptorText, speciesSlot?.displayName, typeSlot.displayName].filter(Boolean).join(" ");
  return {
    article,
    descriptors: descriptorSlots,
    species: speciesSlot,
    type: typeSlot,
    focus: focusSlot,
    showFocus,
    sentence: showFocus
      ? `I AM ${article} ${identityText} WHO ${focusSlot.displayName}`
      : `I AM ${article} ${identityText}`
  };
}

export function headerPips(count: number, capacity: number): readonly HeaderPip[] {
  const safeCapacity = Math.max(0, Math.trunc(capacity));
  const safeCount = Math.max(0, Math.min(safeCapacity, Math.trunc(count)));
  return Array.from({length: safeCapacity}, (_, index) => ({
    index,
    filled: index < safeCount,
    targetCount: index + 1 === safeCount ? safeCount - 1 : index + 1
  }));
}

export function headerWoundTracks(
  counts: Readonly<Record<WoundSeverity, number>>,
  capacities: WoundCapacities
): readonly HeaderWoundTrack[] {
  return (["minor", "moderate", "major"] as const).map((severity) => ({
    severity,
    count: counts[severity],
    capacity: capacities[severity],
    overCapacity: Math.max(0, counts[severity] - capacities[severity]),
    pips: headerPips(counts[severity], capacities[severity])
  }));
}

export function headerRecoveries(
  source: RecoveryUsage | readonly RecoverySlotData[]
): readonly HeaderRecoveryButton[] {
  const slots = Array.isArray(source)
    ? source as readonly RecoverySlotData[]
    : defaultRecoverySlots(source as RecoveryUsage);
  return slots.map((slot) => {
    const used = slot.used;
    return {id: slot.id, type: slot.type, used, available: !used, shortLabel: RECOVERY_SHORT_LABELS[slot.type]};
  });
}

export function headerPoolGauge(current: number, maximum: number): HeaderPoolGauge {
  const safeMaximum = Number.isFinite(maximum) ? Math.max(0, maximum) : 0;
  const safeCurrent = Number.isFinite(current)
    ? Math.max(0, Math.min(safeMaximum, current))
    : 0;
  const ratio = safeMaximum > 0 ? safeCurrent / safeMaximum : 0;
  return {current: safeCurrent, max: safeMaximum, ratio, percent: ratio * 100};
}
