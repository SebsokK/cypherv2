const H = "cypherv2", Qr = "0.1.0";
const X = [
  "inability",
  "untrained",
  "trained",
  "specialized",
  "expert"
], wa = ["choose", "might", "speed", "intellect"], Te = ["light", "medium", "heavy"], Ca = ["melee", "ranged"], sn = ["immediate", "short", "long", "very-long", "specified"], ze = ["light", "medium", "heavy"], Ea = ["block", "blockWithShield", "dodge"], Zr = ["d6", "d10", "d20"], Sn = ["subtle", "manifest"], kn = ["low", "medium", "advanced", "high", "ultra"], ie = ["minor", "moderate", "major"], Ra = ["action", "passive", "reaction", "special"], oo = ["none", "might", "speed", "intellect", "choose"], Pa = ["none", "task", "attack", "defense"], Sa = ["none", "single", "multiple"], Ce = ["one-action", "10-minutes", "1-hour", "10-hours"], es = ["normal", "nonRest"], ts = ["10-minutes", "1-hour", "10-hours"];
function is(n, e, t) {
  return Object.freeze({
    version: Qr,
    rules: n,
    services: e,
    themes: t
  });
}
const I = ["might", "speed", "intellect"], Ut = {
  "one-action": "oneAction",
  "10-minutes": "tenMinutes",
  "1-hour": "oneHour",
  "10-hours": "tenHours"
};
function ut(n = !1) {
  return { oneAction: n, tenMinutes: n, oneHour: n, tenHours: n };
}
function ka(n) {
  return Ce.filter((e) => !n[Ut[e]]);
}
let ao = 0;
const Ue = () => {
  const n = globalThis.crypto?.randomUUID;
  return n ? n.call(globalThis.crypto) : (ao += 1, `cypherv2-${Date.now()}-${ao}`);
};
function te(n) {
  if (n.type !== "character") throw new Error("Core Character services require a Character Actor.");
}
function Ye(n) {
  if (te(n), n.system.derived.wounds.dead) throw new Error("A dead Character cannot use this service.");
}
function ot(n) {
  return {
    minor: n.minor.map((e) => ({ ...e })),
    moderate: n.moderate.map((e) => ({ ...e })),
    major: n.major.map((e) => ({ ...e }))
  };
}
const Vi = [
  "tier",
  "effort",
  "mightMax",
  "mightEdge",
  "speedMax",
  "speedEdge",
  "intellectMax",
  "intellectEdge"
];
function ns() {
  return {
    tier: null,
    effort: null,
    stats: {
      might: { max: null, edge: null },
      speed: { max: null, edge: null },
      intellect: { max: null, edge: null }
    },
    wounds: { minor: 0, moderate: 0, major: 0 }
  };
}
function at(n, e) {
  return Number.isInteger(e) ? Number(e) : n;
}
function An(n) {
  return n.startsWith("might") ? "might" : n.startsWith("speed") ? "speed" : n.startsWith("intellect") ? "intellect" : null;
}
function lt(n) {
  return n === "tier" || n === "effort" ? `system.overrides.${n}` : `system.overrides.stats.${An(n)}.${n.endsWith("Max") ? "max" : "edge"}`;
}
function Xt(n, e, t) {
  if (!Number.isFinite(t)) throw new Error("Character progression delta must be finite.");
  if (e === "tier") {
    const l = Number.isInteger(n.overrides?.tier);
    return {
      path: l ? lt(e) : "system.tier",
      value: (l ? Number(n.overrides.tier) : n.tier) + t,
      overrideActive: l
    };
  }
  if (e === "effort") {
    const l = Number.isInteger(n.overrides?.effort);
    return {
      path: l ? lt(e) : "system.stats.effortBase",
      value: (l ? Number(n.overrides.effort) : n.stats.effortBase) + t,
      overrideActive: l
    };
  }
  const i = An(e), o = e.endsWith("Max") ? "max" : "edge", a = n.overrides?.stats?.[i]?.[o], r = Number.isInteger(a), s = o === "max" ? n.stats[i].baseMax : n.stats[i].baseEdge;
  return {
    path: r ? lt(e) : `system.stats.${i}.${o === "max" ? "baseMax" : "baseEdge"}`,
    value: (r ? Number(a) : s) + t,
    overrideActive: r
  };
}
function O(n) {
  return n.derived?.tier?.value ?? at(n.tier, n.overrides?.tier);
}
function ln(n, e) {
  if (e === "tier") return {
    key: e,
    path: lt(e),
    calculated: n.derived.tier.calculated,
    override: n.overrides?.tier ?? null,
    effective: n.derived.tier.value,
    minimum: 1
  };
  if (e === "effort") return {
    key: e,
    path: lt(e),
    calculated: n.derived.effort.calculatedMax,
    override: n.overrides?.effort ?? null,
    effective: n.derived.effort.max,
    minimum: 0
  };
  const t = An(e), i = e.endsWith("Max") ? "max" : "edge", o = n.derived.pools[t];
  return {
    key: e,
    path: lt(e),
    calculated: i === "max" ? o.calculatedMax : o.calculatedEdge,
    override: n.overrides?.stats?.[t]?.[i] ?? null,
    effective: o[i],
    minimum: i === "max" ? 1 : -20
  };
}
const os = [
  { id: "core-recovery-action", type: "one-action" },
  { id: "core-recovery-ten-minutes", type: "10-minutes" },
  { id: "core-recovery-one-hour", type: "1-hour" },
  { id: "core-recovery-ten-hours", type: "10-hours" }
];
function Qe(n = ut(!1)) {
  return os.map((e) => ({
    ...e,
    used: n[Ut[e.type]]
  }));
}
function as(n, e = ut(!1)) {
  if (!Array.isArray(n) || n.length === 0) return Qe(e);
  const t = /* @__PURE__ */ new Set(), i = [];
  for (const o of n) {
    if (!o || typeof o != "object") continue;
    const a = o, r = typeof a.id == "string" ? a.id.trim() : "", s = String(a.type ?? "");
    !r || t.has(r) || !Ce.includes(s) || (t.add(r), i.push({ id: r, type: s, used: a.used === !0 }));
  }
  return i.length > 0 ? i : Qe(e);
}
function mt(n) {
  const e = ut(!1);
  for (const t of Ce) {
    const i = n.filter((o) => o.type === t);
    e[Ut[t]] = i.length > 0 && i.every((o) => o.used);
  }
  return e;
}
function It(n) {
  return n.filter((e) => !e.used).map((e) => ({ ...e }));
}
function ro(n, e, t) {
  const i = n.find((o) => o.id === e && o.type === t);
  if (!i) throw new Error(`Recovery slot '${e}' is not available for '${t}'.`);
  if (i.used) throw new Error(`Recovery slot '${e}' has already been used today.`);
  return t === "10-hours" ? n.map((o) => ({ ...o, used: !1 })) : n.map((o) => o.id === e ? { ...o, used: !0 } : { ...o });
}
function rs(n) {
  const e = ut(!1);
  for (const t of Ce)
    e[Ut[t]] = n.some((i) => i.type === t && i.used);
  return Qe(e);
}
const Yi = Object.freeze({
  light: 1,
  medium: 2,
  heavy: 3
});
function he(n) {
  return n.reduce((e, t) => e + t.value, 0);
}
function ge(n, e, t, i, o) {
  return { id: n, sourceId: e, sourceType: t, label: i, value: o };
}
function ss(n, e, t, i = {}, o = [], a = { armorCategories: [], freelyUse: [] }, r = 0, s = {
  weaponCategories: [],
  armorCategories: [],
  genre: "none",
  genreUuid: "",
  totalEffortCapMode: "core",
  typeNames: [],
  descriptorNames: [],
  speciesNames: [],
  characterSentence: ""
}, l = 2, u = 1, c = ns(), p = 0, f = []) {
  const m = {};
  for (const k of I) {
    const T = [
      ge(
        `pool.${k}.max.base`,
        `system.stats.${k}.baseMax`,
        "base",
        `${k} base maximum`,
        n[k].baseMax
      ),
      ...i.poolMax?.[k] ?? []
    ], L = [
      ge(
        `pool.${k}.edge.base`,
        `system.stats.${k}.baseEdge`,
        "base",
        `${k} base Edge`,
        n[k].baseEdge
      ),
      ...i.poolEdge?.[k] ?? []
    ], j = he(T), v = he(L);
    m[k] = {
      calculatedMax: j,
      calculatedEdge: v,
      max: at(j, c.stats?.[k]?.max),
      edge: at(v, c.stats?.[k]?.edge),
      maxContributions: T,
      edgeContributions: L
    };
  }
  const b = [
    ge(
      "effort.max.base",
      "system.stats.effortBase",
      "base",
      "Base Effort",
      n.effortBase ?? 0
    ),
    ...i.effortMax ?? []
  ], g = Math.max(0, he(b)), y = [
    ge(
      "recovery.bonus.base",
      "system.recovery.bonus",
      "base",
      "Permanent Recovery bonus",
      r
    ),
    ...i.recoveryBonus ?? []
  ], w = he(y), A = [
    ge("cypher-limit.base", "system.cypherLimitBase", "base", "Base Cypher Limit", l),
    ...i.cypherLimit ?? []
  ], P = {}, Y = {}, $ = {};
  for (const k of ie) {
    const T = [
      ge(
        `wound.${k}.capacity.core`,
        "cypherv2.core",
        "core",
        `${k} Wound capacity`,
        3
      ),
      ...i.woundCapacity?.[k] ?? []
    ], L = Math.max(1, he(T)), j = c.wounds?.[k] ?? 0;
    Y[k] = L, P[k] = j === 0 ? T : [...T, ge(
      `wound.${k}.capacity.manual`,
      `system.overrides.wounds.${k}`,
      "base",
      `Manual ${k} Wound capacity modifier`,
      j
    )], $[k] = Math.max(1, L + j);
  }
  const D = [];
  e.moderate.length >= $.moderate && D.push(
    ge(
      "wound.moderate.full.hindrance",
      "cypherv2.core",
      "core",
      "Moderate Wounds full",
      1
    )
  );
  for (const k of e.major)
    D.push(
      ge(
        `wound.major.${k.id}.hindrance`,
        k.id,
        "wound",
        k.label || "Major Wound",
        1
      )
    );
  D.push(...i.hindrance ?? []);
  const U = [...o].filter((k) => k.type === "armor" && k.system.equipped).filter((k) => ze.includes(k.system.category)).sort((k, T) => Yi[T.system.category] - Yi[k.system.category] || k.id.localeCompare(T.id))[0], Ee = U?.system.category ?? "none", S = U ? Yi[U.system.category] : 0, _ = U ? a.armorCategories.includes(U.system.category) : !0, me = (k, T, L) => U && L > 0 ? [ge(
    `armor.${U.id}.${k}`,
    U.id,
    "item",
    T,
    L
  )] : [], Re = me("block", "Armor: Block", S), se = me("dodge", "Armor: Dodge", S), pe = me(
    "speed-task",
    "Unfamiliar armor: Speed task",
    _ ? 0 : S
  );
  return {
    tier: {
      calculated: u,
      value: at(u, c.tier)
    },
    pools: m,
    effort: {
      calculatedMax: g,
      max: Math.max(0, at(g, c.effort)),
      contributions: b
    },
    wounds: {
      calculatedCapacities: Y,
      capacities: $,
      capacityContributions: P,
      hindrance: he(D),
      hindranceContributions: D,
      dead: e.major.length >= $.major
    },
    recovery: {
      formula: so(w + p),
      calculatedFormula: so(w),
      calculatedBonus: w,
      manualModifier: p,
      bonus: w + p,
      bonusContributions: y,
      availableTypes: f.length > 0 ? [...new Set(It(f).map((k) => k.type))] : ka(t)
    },
    cypherLimit: { max: Math.max(0, he(A)), contributions: A },
    combat: {
      armor: {
        itemId: U?.id ?? "",
        category: Ee,
        freelyUsed: _,
        blockEase: he(Re),
        dodgeHindrance: he(se),
        speedTaskHindrance: he(pe),
        blockContributions: Re,
        dodgeContributions: se,
        speedTaskContributions: pe
      }
    },
    packages: s
  };
}
function so(n) {
  return n === 0 ? "1d6 + Tier" : `1d6 + Tier ${n > 0 ? "+" : "-"} ${Math.abs(n)}`;
}
const {
  ArrayField: Hn,
  BooleanField: Ei,
  HTMLField: Aa,
  NumberField: pt,
  ObjectField: ls,
  SchemaField: yt,
  StringField: ce
} = foundry.data.fields, d = {
  ArrayField: Hn,
  BooleanField: Ei,
  HTMLField: Aa,
  NumberField: pt,
  ObjectField: ls,
  SchemaField: yt,
  StringField: ce
};
function E(n = 0, e = 0) {
  return new pt({ required: !0, nullable: !1, integer: !0, min: e, initial: n });
}
function Z(n = []) {
  return new Hn(
    new ce({ required: !0, nullable: !1, blank: !1 }),
    { required: !0, nullable: !1, initial: [...n] }
  );
}
function Di(n = 10) {
  return new yt({
    value: E(n),
    baseMax: E(n, 1),
    baseEdge: E(0, -20),
    max: new pt({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: n,
      persisted: !1
    }),
    edge: new pt({
      required: !0,
      nullable: !1,
      integer: !0,
      min: -20,
      initial: 0,
      persisted: !1
    })
  });
}
function ct() {
  return new yt({
    id: new ce({ required: !0, nullable: !1, blank: !1 }),
    label: new ce({ required: !0, nullable: !1, initial: "" }),
    description: new Aa({ required: !0, nullable: !1, initial: "" }),
    sourceUuid: new ce({ required: !0, nullable: !1, initial: "" }),
    treated: new Ei({ required: !0, nullable: !1, initial: !1 })
  });
}
function cs() {
  return new yt({
    id: new ce({ required: !0, nullable: !1, blank: !1 }),
    sourceId: new ce({ required: !0, nullable: !1, blank: !1 }),
    sourceType: new ce({
      required: !0,
      nullable: !1,
      choices: ["base", "core", "rule-module", "wound", "item"]
    }),
    label: new ce({ required: !0, nullable: !1, initial: "" }),
    value: new pt({ required: !0, nullable: !1, integer: !0, initial: 0 })
  });
}
function le() {
  return new Hn(cs(), {
    required: !0,
    nullable: !1,
    initial: [],
    persisted: !1
  });
}
function ds() {
  return new yt({
    enabled: new Ei({ required: !0, nullable: !1, initial: !1 }),
    trigger: new ce({
      required: !0,
      nullable: !1,
      initial: "recovery",
      choices: [
        "recovery",
        "10-minute-or-longer",
        "1-hour-or-longer",
        "10-hour",
        "non-rest-recovery"
      ]
    })
  });
}
function Ri(n = "") {
  return new yt({
    enabled: new Ei({ required: !0, nullable: !1, initial: !1 }),
    die: new ce({
      required: !0,
      nullable: !1,
      initial: "d6",
      validate: (e) => /^d(?:[2-9]|[1-9]\d{1,2}|1000)$/i.test(e)
    }),
    formula: new ce({ required: !0, nullable: !1, initial: n }),
    threshold: new pt({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: 1
    })
  });
}
class Ha extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: E(1, 1),
      description: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      gmNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
const $n = [
  "increaseCapabilities",
  "moveTowardPerfection",
  "extraEffort",
  "skillTraining"
], $a = [
  "recovery",
  "focus",
  "armor",
  "weapons",
  "genre"
], us = [...$n, "other"], Ia = [
  "characterCreation",
  "additionalFocus",
  "otherAdvancement",
  "newTier"
], ms = ["otherAdvancement", "newTier"], Va = Object.freeze({
  xpCost: 4,
  purchasesPerTier: 4,
  capabilityPoints: 4,
  effortMaximum: 6,
  recoveryBonus: 2,
  resourcePointsForTier: (n) => n >= 5 ? 3 : n >= 3 ? 2 : 1,
  genreChoiceForTier: (n) => n >= 3 && n % 3 === 0,
  attackDefenseTrainingTier: 2,
  attackDefenseSpecializationTier: 4
});
function Jt(n, e) {
  return Number.isInteger(n) && Number(n) >= e ? Number(n) : null;
}
function lo(n, e = !1) {
  const t = {}, i = n.stats && typeof n.stats == "object" ? n.stats : {}, o = (a) => {
    const r = i[a] && typeof i[a] == "object" ? i[a] : {}, s = {};
    return (!e || N(r, "max")) && (s.max = Jt(r.max, 1)), (!e || N(r, "edge")) && (s.edge = Jt(r.edge, -20)), s;
  };
  if ((!e || N(n, "tier")) && (t.tier = Jt(n.tier, 1)), (!e || N(n, "effort")) && (t.effort = Jt(n.effort, 0)), !e || N(n, "stats")) {
    const a = {};
    for (const r of ["might", "speed", "intellect"])
      (!e || N(i, r)) && (a[r] = o(r));
    t.stats = a;
  }
  if (!e || N(n, "wounds")) {
    const a = n.wounds && typeof n.wounds == "object" ? n.wounds : {}, r = {};
    for (const s of ["minor", "moderate", "major"])
      (!e || N(a, s)) && (r[s] = Number.isInteger(a[s]) ? Number(a[s]) : 0);
    t.wounds = r;
  }
  return t;
}
function N(n, e) {
  return Object.prototype.hasOwnProperty.call(n, e);
}
function ps(n, e) {
  const t = { ...n };
  return (!e || N(n, "cycle")) && (t.cycle = Number.isInteger(n.cycle) ? n.cycle : 1), (!e || N(n, "purchases")) && (t.purchases = Array.isArray(n.purchases) ? n.purchases : []), (!e || N(n, "initializedFocusUuids")) && (t.initializedFocusUuids = Array.isArray(n.initializedFocusUuids) ? n.initializedFocusUuids : []), (!e || N(n, "pendingFocusChoices")) && (t.pendingFocusChoices = Array.isArray(n.pendingFocusChoices) ? n.pendingFocusChoices : []), (!e || N(n, "pendingGenreChoices")) && (t.pendingGenreChoices = Array.isArray(n.pendingGenreChoices) ? n.pendingGenreChoices : []), (!e || N(n, "guidanceCompletedTiers")) && (t.guidanceCompletedTiers = Array.isArray(n.guidanceCompletedTiers) ? [...new Set(n.guidanceCompletedTiers.filter((i) => Number.isInteger(i) && Number(i) >= 1).map(Number))].sort((i, o) => i - o) : []), (!e || N(n, "notes")) && (t.notes = typeof n.notes == "string" ? n.notes : ""), t;
}
function fs(n, e) {
  const t = { ...n };
  if ((!e || N(n, "coreInitialized")) && (t.coreInitialized = n.coreInitialized === !0), !e || N(n, "mode")) {
    const i = n.mode === "setup" ? "completed" : String(n.mode);
    t.mode = ["completed", "skipped", "manual"].includes(i) ? i : "uninitialized";
  }
  return (!e || N(n, "initializedAt")) && (t.initializedAt = Number.isInteger(n.initializedAt) ? n.initializedAt : 0), t;
}
function co(n, e) {
  const t = {};
  if (!e || N(n, "backgroundMode")) {
    const i = String(n.backgroundMode ?? "theme");
    t.backgroundMode = ["theme", "portrait", "custom"].includes(i) ? i : "theme";
  }
  if ((!e || N(n, "customImage")) && (t.customImage = typeof n.customImage == "string" ? n.customImage : ""), !e || N(n, "color")) {
    const i = typeof n.color == "string" ? n.color.trim() : "";
    t.color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(i) ? i.toLocaleLowerCase("en-US") : "";
  }
  return t;
}
function hs(n, e = {}) {
  const t = e.partial === !0;
  if (t ? n.overrides && typeof n.overrides == "object" && (n.overrides = lo(n.overrides, !0)) : n.overrides = lo(
    n.overrides && typeof n.overrides == "object" ? n.overrides : {}
  ), !t && (!n.genre || typeof n.genre != "object") && (n.genre = { sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0 }), t ? n.appearance && typeof n.appearance == "object" && (n.appearance = co(n.appearance, !0)) : n.appearance = co(
    n.appearance && typeof n.appearance == "object" ? n.appearance : {},
    !1
  ), Array.isArray(n.focusProgress) && (n.focusProgress = n.focusProgress.map((i) => {
    const o = i, a = Array.isArray(o.ownedNodeIds) ? o.ownedNodeIds : [], r = Array.isArray(o.acquisitions) ? o.acquisitions : a.map((s) => ({
      nodeId: s,
      mode: "legacy",
      choiceId: "",
      choiceSource: "none",
      choiceGrantTier: 1,
      choiceFocusUuid: "",
      acquiredAt: 0
    }));
    return {
      focusUuid: String(o.focusUuid ?? o.focusItemId ?? ""),
      ownedNodeIds: a,
      acquisitions: r,
      provenance: o.provenance === "creation" ? "creation" : "additional",
      initialChoicesGranted: o.initialChoicesGranted === !0,
      attachedAt: Number.isInteger(o.attachedAt) ? o.attachedAt : 0
    };
  })), n.advancement && typeof n.advancement == "object" && (n.advancement = ps(n.advancement, t)), !t || n.recovery && typeof n.recovery == "object") {
    const i = n.recovery && typeof n.recovery == "object" ? n.recovery : {}, o = i.used && typeof i.used == "object" ? { ...ut(!1), ...i.used } : ut(!1), a = { ...i };
    (!t || N(i, "bonus")) && (a.bonus = Number.isInteger(i.bonus) ? i.bonus : 0), (!t || N(i, "slots")) && (a.slots = as(i.slots, o), a.used = mt(a.slots)), (!t || N(i, "customized")) && (a.customized = i.customized === !0), (!t || N(i, "rollModifier")) && (a.rollModifier = Number.isInteger(i.rollModifier) ? Number(i.rollModifier) : 0), (!t || N(i, "history")) && (a.history = Array.isArray(i.history) ? i.history.map((r) => r && typeof r == "object" ? { slotId: "", ...r } : r) : []), n.recovery = a;
  }
  if (t) {
    if (n.presentation && typeof n.presentation == "object") {
      const i = n.presentation;
      N(i, "hideFocusInSentence") && (n.presentation = { hideFocusInSentence: i.hideFocusInSentence === !0 });
    }
  } else {
    const i = n.presentation && typeof n.presentation == "object" ? n.presentation : {};
    n.presentation = { hideFocusInSentence: i.hideFocusInSentence === !0 };
  }
  return n.creation && typeof n.creation == "object" && (n.creation = fs(n.creation, t)), n;
}
function Et(n, e, t) {
  return {
    id: `package.${n.system.instance.instanceId || n.id}.${e}`,
    sourceId: n.id,
    sourceType: "item",
    label: n.name,
    value: t
  };
}
function _e(n) {
  return Number.isInteger(n) && Number(n) > 0 ? Number(n) : 0;
}
function Ya(n) {
  if (n.type !== "descriptor") return [];
  const e = n.system, t = e.instance?.selections?.poolChoices ?? [];
  return (e.poolBonusChoiceGroups ?? []).flatMap((i) => {
    const o = _e(i.amount), a = new Set(i.pools.filter((l) => I.includes(l))), r = t.find((l) => l.groupId === i.id)?.pools ?? [], s = [...new Set(r)].filter((l) => a.has(l)).slice(0, _e(i.choose));
    return o ? s.map((l) => ({ groupId: i.id, pool: l, amount: o })) : [];
  });
}
function gs(n, e, t = []) {
  const i = [...n, ...e].join(" ").trim(), o = t.length > 0 ? `who ${t.join(" and ")}` : "";
  return [i, o].filter(Boolean).join(" ");
}
function ys(n, e = [], t = [], i = []) {
  const o = {}, a = {}, r = {}, s = new Set(e.filter((m) => Te.includes(m))), l = new Set(t.filter((m) => ze.includes(m))), u = [], c = [], p = [], f = [];
  for (const m of n) {
    if (m.type === "characterType" || m.type === "species") {
      const g = m.system;
      if (m.type === "characterType")
        u.push(m.name);
      else {
        p.push(m.name);
        const w = _e(g.cypherLimitBonus);
        w && f.push(Et(m, "cypher-limit", w));
      }
      for (const w of ["minor", "moderate", "major"]) {
        const A = _e(g.woundBonuses[w]);
        A && (r[w] ??= []).push(Et(m, `wound.${w}`, A));
      }
      const y = g.edgeGrant.mode === "choice" ? g.instance.selections.edgePool : g.edgeGrant.pool;
      if (y !== "none" && I.includes(y)) {
        const w = _e(g.edgeGrant.amount);
        w && (a[y] ??= []).push(Et(m, `edge.${y}`, w));
      }
      for (const w of Te) g.weaponUse[w] && s.add(w);
      for (const w of ze) g.armorUse[w] && l.add(w);
    } else
      c.push(m.name);
    const b = m.system.poolBonuses;
    for (const g of I) {
      const y = _e(b[g]);
      y && (o[g] ??= []).push(Et(m, `pool.${g}`, y));
    }
    for (const g of Ya(m))
      (o[g.pool] ??= []).push(Et(
        m,
        `pool-choice.${g.groupId}.${g.pool}`,
        g.amount
      ));
  }
  return {
    extensions: { poolMax: o, poolEdge: a, woundCapacity: r, cypherLimit: f },
    weaponCategories: [...s],
    armorCategories: [...l],
    typeNames: u,
    descriptorNames: c,
    speciesNames: p,
    characterSentence: gs(c, u, i)
  };
}
function Fi(n) {
  const e = n.system, t = Object.fromEntries(I.map((i) => [i, _e(e.poolBonuses[i])]));
  for (const i of Ya(n)) t[i.pool] += i.amount;
  return t;
}
function Da(n, e, t) {
  const i = Math.max(0, e - n);
  return Math.max(0, Math.min(t, t - i));
}
const bs = ["core", "unlimited"], vs = ["manual", "typeSuggestion", "migration"], ws = 6;
function Cs(n, e) {
  if (!n.sourceUuid) return null;
  const t = e(n.sourceUuid);
  return !t || t.type !== "genre" ? null : {
    sourceUuid: t.uuid,
    name: t.name,
    totalEffortCapMode: t.system.options.totalEffortCapMode
  };
}
function Es(n) {
  return n === "unlimited" ? null : ws;
}
const Fa = ["theme", "portrait", "custom"], Rs = "#96082a", Ps = { r: 23, g: 24, b: 27 };
function In(n) {
  const e = n.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  return e ? `#${(e[1].length === 3 ? [...e[1]].map((i) => `${i}${i}`).join("") : e[1]).toLocaleLowerCase("en-US")}` : null;
}
function Ta(n) {
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16)
  };
}
function za({ r: n, g: e, b: t }) {
  return `#${[n, e, t].map((i) => Math.max(0, Math.min(255, Math.round(i))).toString(16).padStart(2, "0")).join("")}`;
}
function Na(n, e, t) {
  const i = 1 - t;
  return {
    r: n.r * t + e.r * i,
    g: n.g * t + e.g * i,
    b: n.b * t + e.b * i
  };
}
function Ss(n) {
  const e = Ta(n);
  return Math.max(e.r, e.g, e.b) < 96 ? za(Na(e, { r: 255, g: 255, b: 255 }, 0.72)) : n;
}
function Ma(n) {
  const e = In(n);
  return e ? za(Na(Ta(e), Ps, 0.2)) : null;
}
function xa(n) {
  const e = In(n);
  return e ? Ss(e) : null;
}
function ks(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function Ua(n, e = (t) => foundry.utils.getRoute(t)) {
  const t = n.trim();
  return t ? /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(t) ? t : e(t) : "";
}
function As(n, e, t) {
  const i = Fa.includes(n.backgroundMode) ? n.backgroundMode : "theme", o = n.customImage.trim(), a = In(n.color), r = a ? xa(a) : null, s = a ? Ma(a) : null, l = i === "portrait" ? e.trim() : i === "custom" ? o : "", u = Ua(l, t), c = [
    ...r ? [`--cypherv2-character-accent: ${r}`] : [],
    ...s ? [`--cypherv2-character-tint: ${s}`] : [],
    ...u ? [`--cypherv2-character-background-image: ${ks(u)}`] : []
  ];
  return {
    backgroundMode: i,
    customImage: o,
    color: a ?? "",
    backgroundImage: u,
    hasBackgroundImage: !!u,
    hasCharacterColor: !!a,
    accent: r,
    tint: s,
    colorInput: a ?? Rs,
    isTheme: i === "theme",
    isPortrait: i === "portrait",
    isCustom: i === "custom",
    style: c.join("; ")
  };
}
function Hs() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    kind: new d.StringField({ required: !0, nullable: !1, choices: [...us] }),
    otherKind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "none",
      choices: ["none", ...$a]
    }),
    tier: E(1, 1),
    xpCost: E(),
    resourcePointsGranted: E(),
    timestamp: E()
  });
}
function $s() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...Ia] }),
    grantTier: E(1, 1),
    focusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" })
  });
}
function Is() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...ms] }),
    grantTier: E(1, 1)
  });
}
function Vs() {
  return new d.SchemaField({
    nodeId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    mode: new d.StringField({
      required: !0,
      nullable: !1,
      choices: ["choice", "manualOverride", "gmOverride", "gmManual", "legacy"]
    }),
    choiceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    choiceSource: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "none",
      choices: ["none", ...Ia]
    }),
    choiceGrantTier: E(1, 1),
    choiceFocusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    acquiredAt: E()
  });
}
function Ys() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    slotId: new d.StringField({ required: !0, nullable: !1, blank: !0, initial: "" }),
    kind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "normal",
      choices: [...es]
    }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...Ce] }),
    rolled: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
    dieResult: E(),
    tier: E(1, 1),
    bonus: E(),
    total: E(),
    might: E(),
    speed: E(),
    intellect: E(),
    timestamp: E()
  });
}
function Ds() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...Ce] }),
    used: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
  });
}
function Fs() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...ts] }),
    choice: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    majorTaskSucceeded: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    removedWoundIds: Z(),
    timestamp: E()
  });
}
function Ti() {
  return new d.SchemaField({
    calculatedMax: E(),
    calculatedEdge: E(0, -20),
    max: E(),
    edge: E(0, -20),
    maxContributions: le(),
    edgeContributions: le()
  });
}
class Ts extends Ha {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tier: E(1, 1),
      overrides: new d.SchemaField({
        tier: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: 1, initial: null }),
        effort: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: 0, initial: null }),
        stats: new d.SchemaField({
          might: new d.SchemaField({
            max: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: 1, initial: null }),
            edge: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: -20, initial: null })
          }),
          speed: new d.SchemaField({
            max: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: 1, initial: null }),
            edge: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: -20, initial: null })
          }),
          intellect: new d.SchemaField({
            max: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: 1, initial: null }),
            edge: new d.NumberField({ required: !0, nullable: !0, integer: !0, min: -20, initial: null })
          })
        }),
        wounds: new d.SchemaField({
          minor: E(0, -20),
          moderate: E(0, -20),
          major: E(0, -20)
        })
      }),
      xp: E(),
      resourcePoints: E(),
      stats: new d.SchemaField({
        effortBase: E(1),
        might: Di(8),
        speed: Di(8),
        intellect: Di(8)
      }),
      recovery: new d.SchemaField({
        bonus: E(),
        used: new d.SchemaField({
          oneAction: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenMinutes: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          oneHour: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenHours: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
        }),
        slots: new d.ArrayField(Ds(), {
          required: !0,
          nullable: !1,
          initial: Qe()
        }),
        customized: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        rollModifier: E(0, -20),
        history: new d.ArrayField(Ys(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      rest: new d.SchemaField({
        lastType: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        history: new d.ArrayField(Fs(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] })
      }),
      cypherLimitBase: E(2),
      build: new d.SchemaField({
        descriptorIds: Z(),
        typeIds: Z(),
        speciesIds: Z()
      }),
      focusProgress: new d.ArrayField(
        new d.SchemaField({
          focusUuid: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
          ownedNodeIds: Z(),
          acquisitions: new d.ArrayField(Vs(), {
            required: !0,
            nullable: !1,
            initial: []
          }),
          provenance: new d.StringField({
            required: !0,
            nullable: !1,
            initial: "additional",
            choices: ["creation", "additional"]
          }),
          initialChoicesGranted: new d.BooleanField({
            required: !0,
            nullable: !1,
            initial: !1
          }),
          attachedAt: E()
        }),
        { required: !0, nullable: !1, initial: [] }
      ),
      genre: new d.SchemaField({
        sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        provenance: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "manual",
          choices: [...vs]
        }),
        attachedAt: E()
      }),
      appearance: new d.SchemaField({
        backgroundMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "theme",
          choices: [...Fa]
        }),
        customImage: new d.StringField({
          required: !0,
          nullable: !1,
          blank: !0,
          initial: ""
        }),
        color: new d.StringField({
          required: !0,
          nullable: !1,
          blank: !0,
          initial: "",
          validate: (e) => e === "" || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(e)
        })
      }),
      presentation: new d.SchemaField({
        hideFocusInSentence: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
      }),
      advancement: new d.SchemaField({
        cycle: E(1, 1),
        purchases: new d.ArrayField(Hs(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        initializedFocusUuids: Z(),
        pendingFocusChoices: new d.ArrayField($s(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        pendingGenreChoices: new d.ArrayField(Is(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        guidanceCompletedTiers: new d.ArrayField(E(1, 1), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
      }),
      creation: new d.SchemaField({
        coreInitialized: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        mode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "uninitialized",
          choices: ["uninitialized", "completed", "skipped", "manual"]
        }),
        initializedAt: E()
      }),
      proficiencies: new d.SchemaField({
        weaponCategories: Z(["light"]),
        armorCategories: Z(),
        freelyUse: Z()
      }),
      derived: new d.SchemaField(
        {
          tier: new d.SchemaField({
            calculated: E(1, 1),
            value: E(1, 1)
          }),
          pools: new d.SchemaField({
            might: Ti(),
            speed: Ti(),
            intellect: Ti()
          }),
          effort: new d.SchemaField({
            calculatedMax: E(),
            max: E(),
            contributions: le()
          }),
          wounds: new d.SchemaField({
            calculatedCapacities: new d.SchemaField({
              minor: E(3, 1),
              moderate: E(3, 1),
              major: E(3, 1)
            }),
            capacities: new d.SchemaField({
              minor: E(3, 1),
              moderate: E(3, 1),
              major: E(3, 1)
            }),
            capacityContributions: new d.SchemaField({
              minor: le(),
              moderate: le(),
              major: le()
            }),
            hindrance: E(),
            hindranceContributions: le(),
            dead: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
          }),
          recovery: new d.SchemaField({
            formula: new d.StringField({ required: !0, nullable: !1, initial: "1d6 + Tier" }),
            calculatedFormula: new d.StringField({ required: !0, nullable: !1, initial: "1d6 + Tier" }),
            calculatedBonus: E(0, -20),
            manualModifier: E(0, -20),
            bonus: E(),
            bonusContributions: le(),
            availableTypes: new d.ArrayField(
              new d.StringField({ required: !0, nullable: !1, choices: [...Ce] }),
              { required: !0, nullable: !1, initial: [] }
            )
          }),
          cypherLimit: new d.SchemaField({ max: E(), contributions: le() }),
          combat: new d.SchemaField({
            armor: new d.SchemaField({
              itemId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
              category: new d.StringField({
                required: !0,
                nullable: !1,
                initial: "none",
                choices: ["none", "light", "medium", "heavy"]
              }),
              freelyUsed: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
              blockEase: E(),
              dodgeHindrance: E(),
              speedTaskHindrance: E(),
              blockContributions: le(),
              dodgeContributions: le(),
              speedTaskContributions: le()
            })
          }),
          packages: new d.SchemaField({
            weaponCategories: Z(),
            armorCategories: Z(),
            genre: new d.StringField({ required: !0, nullable: !1, initial: "none" }),
            genreUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
            totalEffortCapMode: new d.StringField({
              required: !0,
              nullable: !1,
              initial: "core",
              choices: ["core", "unlimited"]
            }),
            typeNames: Z(),
            descriptorNames: Z(),
            speciesNames: Z(),
            characterSentence: new d.StringField({ required: !0, nullable: !1, initial: "" })
          })
        },
        { required: !0, nullable: !1, persisted: !1 }
      )
    };
  }
  static migrateData(e, t = {}) {
    return hs(super.migrateData(e), t);
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = [...this.parent.items ?? []], t = e.filter((l) => l.type === "armor").map((l) => ({
      id: l.id,
      type: l.type,
      system: l.system
    })), i = this.proficiencies, o = ys(
      e.filter((l) => l.type === "characterType" || l.type === "descriptor" || l.type === "species"),
      i.weaponCategories,
      i.armorCategories
    ), a = Cs(this.genre, (l) => typeof fromUuidSync != "function" ? null : fromUuidSync(l)), r = {
      armorCategories: o.armorCategories,
      freelyUse: i.freelyUse
    }, s = ss(
      this.stats,
      this.wounds,
      this.recovery.used,
      o.extensions,
      t,
      r,
      this.recovery.bonus,
      {
        weaponCategories: [...o.weaponCategories],
        armorCategories: [...o.armorCategories],
        genre: a?.name ?? "none",
        genreUuid: a?.sourceUuid ?? "",
        totalEffortCapMode: a?.totalEffortCapMode ?? "core",
        typeNames: [...o.typeNames],
        descriptorNames: [...o.descriptorNames],
        speciesNames: [...o.speciesNames],
        characterSentence: o.characterSentence
      },
      this.cypherLimitBase,
      this.tier,
      this.overrides,
      this.recovery.rollModifier,
      this.recovery.slots
    );
    Object.assign(this.derived.tier, s.tier), Object.assign(this.derived.pools.might, s.pools.might), Object.assign(this.derived.pools.speed, s.pools.speed), Object.assign(this.derived.pools.intellect, s.pools.intellect), Object.assign(this.derived.effort, s.effort), Object.assign(this.derived.wounds.calculatedCapacities, s.wounds.calculatedCapacities), Object.assign(this.derived.wounds.capacities, s.wounds.capacities), Object.assign(this.derived.wounds.capacityContributions, s.wounds.capacityContributions), this.derived.wounds.hindrance = s.wounds.hindrance, this.derived.wounds.hindranceContributions = s.wounds.hindranceContributions, this.derived.wounds.dead = s.wounds.dead, Object.assign(this.derived.recovery, s.recovery), Object.assign(this.derived.cypherLimit, s.cypherLimit), Object.assign(this.derived.combat.armor, s.combat.armor), Object.assign(this.derived.packages, s.packages);
    for (const l of ["might", "speed", "intellect"])
      this.stats[l].max = s.pools[l].max, this.stats[l].edge = s.pools[l].edge;
  }
}
class zs extends Ha {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: E(1, 0),
      health: new d.SchemaField({
        value: E(3),
        baseMax: E(3, 1),
        max: new d.NumberField({
          required: !0,
          nullable: !1,
          integer: !0,
          min: 1,
          initial: 3,
          persisted: !1
        })
      }),
      dead: new d.BooleanField({
        required: !0,
        nullable: !1,
        initial: !1,
        persisted: !1
      }),
      // GM-facing reference only. NPC combat intentionally continues to use
      // the legacy armorBase field where that older automation is required.
      armor: E(),
      armorBase: E(),
      damage: new d.SchemaField({
        amount: E(1),
        woundSeverity: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "minor",
          choices: ["minor", "moderate", "major"]
        }),
        defense: new d.SchemaField({
          allowBlock: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
          allowDodge: new d.BooleanField({ required: !0, nullable: !1, initial: !0 })
        }),
        notes: new d.StringField({ required: !0, nullable: !1, initial: "" })
      }),
      movement: new d.SchemaField({
        category: new d.StringField({ required: !0, nullable: !1, initial: "short" }),
        distance: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        notes: new d.StringField({ required: !0, nullable: !1, initial: "" })
      }),
      modifications: new d.ArrayField(
        new d.SchemaField({
          id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
          label: new d.StringField({ required: !0, nullable: !1, initial: "" }),
          contexts: new d.ArrayField(
            new d.StringField({ required: !0, nullable: !1, blank: !1 }),
            { required: !0, nullable: !1, initial: [] }
          ),
          mode: new d.StringField({
            required: !0,
            nullable: !1,
            initial: "levelOverride",
            choices: ["levelOverride", "levelDelta", "ease", "hinder"]
          }),
          value: new d.NumberField({ required: !0, nullable: !1, integer: !0, initial: 0 }),
          visibility: new d.StringField({
            required: !0,
            nullable: !1,
            initial: "gm",
            choices: ["public", "gm"]
          }),
          predicate: new d.ObjectField({ required: !0, nullable: !1, initial: {} }),
          description: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
        }),
        { required: !0, nullable: !1, initial: [] }
      ),
      gmIntrusion: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
    };
  }
  prepareDerivedData() {
    super.prepareDerivedData(), this.health.max = this.health.baseMax, this.dead = this.health.value <= 0;
  }
}
const Ns = ["none", "fantasy", "scienceFiction", "superhero", "custom"], Ms = ["primary", "additional", "speciesGranted", "custom"], qa = ["none", "fixed", "choice"], xs = ["type", "descriptor", "focus", "genre", "species", "other"], Us = ["active", "retained"];
function bt() {
  return new d.SchemaField({
    name: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    img: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    system: new d.ObjectField({ required: !0, nullable: !1, initial: {} })
  });
}
function Ga() {
  return new d.SchemaField({
    kind: new d.StringField({ required: !0, nullable: !1, initial: "other", choices: [...xs] }),
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    grantId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    status: new d.StringField({ required: !0, nullable: !1, initial: "active", choices: [...Us] }),
    contentUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    contentKey: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    replacement: new d.SchemaField({
      active: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      originalName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      originalContentUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      originalContentKey: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      replacementName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      replacementContentUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      replacementContentKey: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      selectionKind: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "suggested", "world", "compendium", "custom"] })
    })
  });
}
function Oa() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    itemUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: bt()
  });
}
function uo() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    optionIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
  });
}
function qs() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    pools: new d.ArrayField(
      new d.StringField({ required: !0, nullable: !1, blank: !1, choices: [...I] }),
      { required: !0, nullable: !1, initial: [] }
    )
  });
}
function Vn() {
  return new d.SchemaField({
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    role: new d.StringField({ required: !0, nullable: !1, initial: "primary", choices: [...Ms] }),
    attachedAt: E(),
    selections: new d.SchemaField({
      edgePool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
      poolChoices: new d.ArrayField(qs(), { required: !0, nullable: !1, initial: [] }),
      skillChoices: new d.ArrayField(uo(), { required: !0, nullable: !1, initial: [] }),
      abilityChoices: new d.ArrayField(uo(), { required: !0, nullable: !1, initial: [] }),
      suppressedGrantIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
    }),
    parent: Ga()
  });
}
function Gs() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    amount: E(1, 1),
    choose: E(1, 1),
    pools: new d.ArrayField(
      new d.StringField({ required: !0, nullable: !1, blank: !1, choices: [...I] }),
      { required: !0, nullable: !1, initial: [] }
    )
  });
}
function Yn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: bt(),
    alternatives: new d.ArrayField(Oa(), { required: !0, nullable: !1, initial: [] })
  });
}
function Os() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: bt()
  });
}
function Dn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [...X] }),
    snapshot: bt(),
    alternatives: new d.ArrayField(Oa(), { required: !0, nullable: !1, initial: [] })
  });
}
function Fn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [...X] }),
    options: new d.ArrayField(Os(), { required: !0, nullable: !1, initial: [] })
  });
}
function Ba() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    options: new d.ArrayField(Yn(), { required: !0, nullable: !1, initial: [] })
  });
}
function fi() {
  return new d.SchemaField({
    light: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    medium: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    heavy: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
  });
}
class re extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: E(1, 1),
      slug: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      description: new d.StringField({ required: !1, nullable: !1, initial: "" }),
      source: new d.SchemaField({
        uuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        book: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        page: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        license: new d.StringField({ required: !0, nullable: !1, initial: "original" })
      }),
      automation: new d.SchemaField({
        mode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "descriptive",
          choices: ["descriptive", "assisted", "automatic"]
        }),
        duration: ds(),
        rollDefaults: new d.ObjectField({ required: !0, nullable: !1, initial: {} })
      }),
      ruleElements: new d.ArrayField(
        new d.ObjectField({ required: !0, nullable: !1 }),
        { required: !0, nullable: !1, initial: [] }
      ),
      tags: new d.ArrayField(
        new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        { required: !0, nullable: !1, initial: [] }
      ),
      grantedBy: Ga()
    };
  }
}
const Bs = [...I];
function cn(n, e = "none") {
  return Array.isArray(n) ? I.filter((t) => n.includes(t)) : e === "choose" || e === "any" ? [...I] : I.includes(e) ? [e] : [];
}
function Me(n) {
  return cn(n.system.cost.allowedPools, n.system.pool);
}
function Ls(n, e, t) {
  const i = I.filter((o) => n.includes(o));
  return i.length === 0 ? "" : i.length === 1 ? e(i[0]) : i.length === 2 ? `${e(i[0])}${t.pair}${e(i[1])}` : `${e(i[0])}${t.middle}${e(i[1])}${t.final}${e(i[2])}`;
}
function La(n, e, t, i) {
  return !Number.isInteger(n) || n <= 0 || e.length === 0 ? "" : `${n} ${Ls(e, t, i)}`;
}
class js extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      tier: E(1, 0),
      category: new d.StringField({ required: !0, nullable: !1, initial: "general" }),
      archived: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      activation: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "action",
        choices: [...Ra]
      }),
      // Legacy V1 single-Pool source retained for safe document migration.
      // Runtime and UI use cost.allowedPools as the normalized authority.
      pool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...oo]
      }),
      cost: new d.SchemaField({
        amount: E(),
        ignoresEdge: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        allowedPools: new d.ArrayField(
          new d.StringField({ required: !0, nullable: !1, choices: [...I] }),
          { required: !0, nullable: !1, initial: [] }
        )
      }),
      roll: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...Pa]
      }),
      rollModifier: new d.NumberField({
        required: !0,
        nullable: !1,
        integer: !0,
        min: -10,
        max: 10,
        initial: 0
      }),
      attackModifier: new d.NumberField({
        required: !0,
        nullable: !1,
        integer: !0,
        min: -10,
        max: 10,
        initial: 0
      }),
      damage: E(),
      woundSeverity: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: ["none", ...ie]
      }),
      range: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      targetMode: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...Sa]
      }),
      // Reserved for the later Focus acquisition workflow. Phase 1 never writes these fields.
      sourceFocusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      sourceNodeId: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), o = i.cost && typeof i.cost == "object" ? i.cost : {};
    if (t.partial) {
      Object.hasOwn(i, "archived") && (i.archived = !!i.archived);
      const a = Object.hasOwn(o, "allowedPools"), r = Object.hasOwn(i, "pool") || Object.hasOwn(o, "pool");
      return (a || r) && (i.cost = {
        ...o,
        allowedPools: cn(
          a ? o.allowedPools : void 0,
          i.pool ?? o.pool
        )
      }), i.activation === "enabler" && (i.activation = "passive"), i;
    }
    if (i.pool === void 0) {
      const a = String(o.pool ?? "none");
      i.pool = oo.includes(a) ? a : "none";
    }
    return i.archived = !!(i.archived ?? !1), i.cost = {
      amount: Number(o.amount ?? 0),
      ignoresEdge: !!(o.ignoresEdge ?? !1),
      allowedPools: cn(
        o.allowedPools,
        i.pool ?? o.pool
      )
    }, i.activation === "enabler" && (i.activation = "passive"), i.roll === void 0 && (i.roll = "none"), i.targetMode === void 0 && (i.targetMode = "none"), i;
  }
}
const We = Object.freeze({
  minor: 3,
  moderate: 2,
  major: 1
});
class Ws extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: Ri(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      woundCapacities: new d.SchemaField({
        minor: E(We.minor),
        moderate: E(We.moderate),
        major: E(We.major)
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(ct(), { required: !0, nullable: !1, initial: [] })
      }),
      derived: new d.SchemaField({
        capacities: new d.SchemaField({
          minor: E(We.minor),
          moderate: E(We.moderate),
          major: E(We.major)
        }),
        broken: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
      }, { required: !0, nullable: !1, persisted: !1 })
    };
  }
  prepareDerivedData() {
    super.prepareDerivedData(), Object.assign(this.derived.capacities, this.woundCapacities), this.derived.broken = this.wounds.major.length >= this.derived.capacities.major;
  }
}
class _s extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "light",
        choices: [...ze]
      }),
      // Legacy compatibility only. Effective Armor familiarity is derived from the Character.
      freelyUsed: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: Ri(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
}
class Ks extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: new d.StringField({ required: !0, nullable: !1, initial: "1", blank: !1 }),
      identified: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
      depletion: Ri("1d6"),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      uses: E()
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t);
    if (Object.hasOwn(i, "level") && (i.level = String(i.level || "1")), typeof i.depletion == "string") {
      const o = i.depletion.match(/(\d+)\s*(?:in|on)\s*(\d*d\d+(?:\s*[+-]\s*\d+)?)/i), a = o?.[2] ?? "1d6", r = a.match(/^1?d(6|10|20)$/i)?.[1];
      i.depletion = o ? { enabled: !0, die: r ? `d${r}` : "d6", formula: a, threshold: Number(o[1]) } : { enabled: !1, die: "d6", formula: "1d6", threshold: 1 };
    } else if (!t.partial && i.depletion && typeof i.depletion == "object") {
      const o = i.depletion;
      i.depletion = {
        ...o,
        formula: String(o.formula ?? `1${String(o.die ?? "d6")}`)
      };
    }
    return i;
  }
}
class Xs extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...qa] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: fi(),
      armorUse: fi(),
      abilityGrants: new d.ArrayField(Yn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(Ba(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Dn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(Fn(), { required: !0, nullable: !1, initial: [] }),
      genre: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...Ns] }),
      customGenreId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      backgroundOptions: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentBundleUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      instance: Vn()
    };
  }
}
class Js extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: E(1, 1),
      levelOverride: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      category: new d.StringField({ required: !0, nullable: !1, initial: "general" }),
      manifest: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      manifestation: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "subtle",
        choices: [...Sn]
      }),
      form: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      power: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "low",
        choices: [...kn]
      }),
      identified: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
      uses: E(1)
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), o = Object.hasOwn(i, "manifestation"), a = Object.hasOwn(i, "manifest");
    if (o ? i.manifest = i.manifestation === "manifest" : (!t.partial || a) && (i.manifestation = i.manifest === !0 ? "manifest" : "subtle"), !t.partial && !Object.hasOwn(i, "levelOverride")) {
      const r = Number(i.level);
      i.levelOverride = Object.hasOwn(i, "level") && Number.isInteger(r) && r > 1;
    }
    return i;
  }
}
class Qs extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      poolBonusChoiceGroups: new d.ArrayField(Gs(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Dn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(Fn(), { required: !0, nullable: !1, initial: [] }),
      instance: Vn()
    };
  }
}
class Zs extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: E(),
      quantity: E(1),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      price: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
function el() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    abilitySnapshot: new d.SchemaField({
      name: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      description: new d.StringField({ required: !1, nullable: !1, initial: "" })
    }),
    tier: new d.NumberField({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      max: 6,
      initial: 1
    }),
    position: new d.SchemaField({
      x: new d.NumberField({ required: !0, nullable: !0, initial: null }),
      y: new d.NumberField({ required: !0, nullable: !0, initial: null })
    })
  });
}
function tl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    from: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    to: new d.StringField({ required: !0, nullable: !1, blank: !1 })
  });
}
class il extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      graph: new d.SchemaField({
        version: E(1, 1),
        nodes: new d.ArrayField(el(), { required: !0, nullable: !1, initial: [] }),
        connections: new d.ArrayField(tl(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t);
    if (t.partial || i.graph && typeof i.graph == "object") return i;
    const o = Array.isArray(i.nodes) ? i.nodes : [], a = Array.isArray(i.connections) ? i.connections : [];
    return i.graph = {
      version: Number(i.graphVersion ?? 1),
      nodes: o.map((r) => {
        const s = r, l = s.abilitySnapshot && typeof s.abilitySnapshot == "object" ? s.abilitySnapshot : {}, u = s.position && typeof s.position == "object" ? s.position : {};
        return {
          id: String(s.id ?? ""),
          abilityUuid: String(s.abilitySourceUuid ?? ""),
          abilitySnapshot: {
            name: String(l.name ?? s.title ?? ""),
            description: String(l.description ?? "")
          },
          tier: Number(s.tierRequired ?? 1),
          position: {
            x: typeof u.x == "number" ? u.x : null,
            y: typeof u.y == "number" ? u.y : null
          }
        };
      }),
      connections: a.map((r) => {
        const s = r;
        return {
          id: String(s.id ?? ""),
          from: String(s.from ?? ""),
          to: String(s.to ?? "")
        };
      })
    }, delete i.graphVersion, delete i.startNodeIds, delete i.nodes, delete i.connections, i;
  }
}
const Xe = 1, zt = 6;
class Tn extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreCatalogError";
  }
  code;
}
function ja(n) {
  const e = Number(n);
  if (!Number.isInteger(e) || e < Xe || e > zt)
    throw new Tn(
      "invalid-minimum-tier",
      `Genre Ability Minimum Tier must be an integer from ${Xe} to ${zt}.`
    );
  return e;
}
function nl(n, e, t) {
  const i = ja(t);
  let o = !1;
  const a = n.map((r) => r.id !== e ? r : (o = !0, { ...r, minimumTier: i }));
  if (!o) throw new Tn("entry-missing", "Genre Ability catalog entry not found.");
  return a;
}
function ol(n, e, t) {
  let i = !1;
  const o = n.map((a) => a.id !== e ? a : (i = !0, { ...a, snapshot: t }));
  if (!i) throw new Tn("entry-missing", "Genre Ability catalog entry not found.");
  return o;
}
function al(n, e) {
  return n.filter((t) => t.id !== e);
}
function rl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    minimumTier: new d.NumberField({
      required: !0,
      nullable: !1,
      integer: !0,
      min: Xe,
      max: zt,
      initial: Xe
    }),
    snapshot: bt()
  });
}
class sl extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      abilityCatalog: new d.ArrayField(rl(), {
        required: !0,
        nullable: !1,
        initial: []
      }),
      options: new d.SchemaField({
        totalEffortCapMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "core",
          choices: [...bs]
        })
      }),
      legacyKey: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
class ll extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [...X]
      }),
      defaultPool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "choose",
        choices: [...wa]
      }),
      category: new d.StringField({ required: !0, nullable: !1, initial: "general" }),
      contexts: new d.ArrayField(
        new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        { required: !0, nullable: !1, initial: [] }
      ),
      initiative: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      acquisition: new d.SchemaField({
        minimumTier: E(1, 1),
        grantedByUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
      })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), o = Object.hasOwn(i, "defaultPool");
    return (!t.partial || o) && (i.defaultPool === "" || i.defaultPool === null || i.defaultPool === void 0) && (i.defaultPool = "choose"), i;
  }
}
class cl extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...qa] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: fi(),
      armorUse: fi(),
      cypherLimitBonus: E(),
      skillGrants: new d.ArrayField(Dn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(Fn(), { required: !0, nullable: !1, initial: [] }),
      abilityGrants: new d.ArrayField(Yn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(Ba(), { required: !0, nullable: !1, initial: [] }),
      descriptorGrants: new d.ArrayField(new d.SchemaField({
        id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        descriptorUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        snapshot: bt()
      }), { required: !0, nullable: !1, initial: [] }),
      instance: Vn()
    };
  }
}
class dl extends re {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "medium",
        choices: [...Te]
      }),
      attackType: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "melee",
        choices: [...Ca]
      }),
      rangeCategory: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "immediate",
        choices: [...sn]
      }),
      rangeNotes: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      skillLevel: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [...X]
      }),
      defaultPool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: ["none", ...I]
      }),
      damageOverride: new d.NumberField({
        required: !0,
        nullable: !0,
        integer: !0,
        min: 0,
        initial: null
      }),
      attackModifier: new d.NumberField({
        required: !0,
        nullable: !1,
        integer: !0,
        min: -2,
        max: 2,
        initial: 0
      }),
      bonusDamage: new d.NumberField({
        required: !0,
        nullable: !1,
        integer: !0,
        min: 0,
        initial: 0
      }),
      baseDamage: new d.NumberField({
        required: !0,
        nullable: !1,
        integer: !0,
        min: 0,
        initial: 4,
        persisted: !1
      }),
      // Legacy compatibility only. Effective Weapon familiarity is derived from the Character.
      freelyUsed: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      ammo: new d.SchemaField({
        enabled: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        value: E(),
        max: E(),
        perAttack: E(1, 1)
      }),
      depletion: Ri(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), o = Object.hasOwn(i, "defaultPool");
    (!t.partial || o) && i.defaultPool !== "none" && !I.includes(i.defaultPool) && (i.defaultPool = "none");
    const a = Te.includes(i.category) ? i.category : "medium", r = { light: 2, medium: 4, heavy: 6 }, s = typeof i.damageOverride == "number" ? i.damageOverride : typeof i.damage == "number" ? i.damage : null;
    if (i.bonusDamage === void 0 && s !== null && (i.bonusDamage = Math.max(0, s - r[a])), i.damageOverride = null, i.rangeCategory === void 0 && typeof i.range == "string") {
      const l = i.range;
      i.rangeCategory = sn.includes(l) ? l : "specified", i.rangeCategory === "specified" && i.rangeNotes === void 0 && (i.rangeNotes = i.range);
    }
    return i;
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = { light: 2, medium: 4, heavy: 6 };
    this.baseDamage = Math.max(0, e[this.category] + this.bonusDamage);
  }
}
function ul() {
  Object.assign(CONFIG.Actor.dataModels, {
    character: Ts,
    npc: zs
  }), Object.assign(CONFIG.Item.dataModels, {
    ability: js,
    skill: ll,
    weapon: dl,
    armor: _s,
    shield: Ws,
    equipment: Zs,
    cypher: Js,
    artifact: Ks,
    descriptor: Qs,
    characterType: Xs,
    focus: il,
    genre: sl,
    species: cl
  }), CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["stats.might", "stats.speed", "stats.intellect"],
      value: ["xp", "resourcePoints"]
    },
    npc: {
      bar: ["health"],
      value: ["level"]
    }
  };
}
const B = "systems/cypherv2/assets", mo = {
  character: `${B}/icons/cypherpc.png`,
  npc: `${B}/icons/cyphernpc.png`
}, po = {
  ability: `${B}/icons/cypherability.png`,
  armor: `${B}/icons/cypherarmor.png`,
  artifact: `${B}/icons/cypherartefact.png`,
  cypher: `${B}/icons/cyphercypher.png`,
  descriptor: `${B}/icons/cypherdescriptor.png`,
  equipment: `${B}/icons/cypherequipment.png`,
  focus: `${B}/icons/cypherfocus.png`,
  genre: `${B}/icons/cyphergenre.png`,
  shield: `${B}/icons/cyphershield.png`,
  skill: `${B}/icons/cypherskill.png`,
  species: `${B}/icons/cypherspecies.png`,
  characterType: `${B}/icons/cyphertype.png`,
  weapon: `${B}/icons/cypherweapons.png`
}, zn = {
  gamePaused: `${B}/ui/cyphergamepaused.png`,
  lobby: `${B}/cypherlobby.png`,
  turnMarker: `${B}/ui/cypherturnmarker.png`
};
function ml(n) {
  return n in mo ? mo[n] : null;
}
function pl(n) {
  return n in po ? po[n] : null;
}
function fl(n) {
  if ("prototypeToken.actorLink" in n) return !0;
  const e = n.prototypeToken;
  return !!(e && typeof e == "object" && "actorLink" in e);
}
function hl(n, e) {
  return n === "character" && !fl(e);
}
class gl extends Actor {
  static getDefaultArtwork(e) {
    const t = ml(String(e.type ?? ""));
    return t ? { img: t, texture: { src: t } } : super.getDefaultArtwork(e);
  }
  async _preCreate(e, t, i) {
    const o = await super._preCreate(e, t, i);
    return o === !1 ? !1 : (hl(this.type, e) && this.prototypeToken.updateSource({ actorLink: !0 }), o);
  }
  /**
   * Rule actions will be delegated to services in later phases.
   * The document shell intentionally contains no roll or wound logic.
   */
}
function yl(n) {
  return Object.keys(n).some((e) => e === "system.poolBonuses" || e.startsWith("system.poolBonuses.") || e === "system.poolBonusChoiceGroups" || e.startsWith("system.poolBonusChoiceGroups.") || e === "system.instance.selections.poolChoices" || e.startsWith("system.instance.selections.poolChoices.") || e === "system" && typeof n.system == "object" && n.system !== null && ("poolBonuses" in n.system || "poolBonusChoiceGroups" in n.system || "instance" in n.system && typeof n.system.instance == "object" && n.system.instance !== null && "selections" in n.system.instance && typeof n.system.instance.selections == "object" && n.system.instance.selections !== null && "poolChoices" in n.system.instance.selections));
}
function bl(n) {
  if (n["system.equipped"] === !0) return !0;
  const e = n.system;
  return !!(e && typeof e == "object" && e.equipped === !0);
}
class vl extends Item {
  static getDefaultArtwork(e) {
    const t = pl(String(e.type ?? ""));
    return t ? { img: t } : super.getDefaultArtwork(e);
  }
  async update(e, t = {}) {
    const i = this.actor?.type === "character" ? this.actor : null, o = i && (this.type === "characterType" || this.type === "descriptor" || this.type === "species") && yl(e), a = o ? Object.fromEntries(I.map((l) => [
      l,
      Number(i.system.derived.pools[l].max)
    ])) : null, r = o ? Object.fromEntries(I.map((l) => [
      l,
      Number(i.system.stats[l].value)
    ])) : null, s = await super.update(e, t);
    if (i && (this.type === "shield" || this.type === "armor") && bl(e) && t.cypherv2CombatEquipmentSync !== !0 && t.cypherv2ShieldEquipmentSync !== !0)
      for (const l of i.items)
        l.id === this.id || l.type !== this.type || l.system.equipped && await l.update(
          { "system.equipped": !1 },
          { cypherv2CombatEquipmentSync: !0 }
        );
    if (i && a && r) {
      const l = {};
      for (const u of I) {
        const c = Number(i.system.derived.pools[u].max);
        l[`system.stats.${u}.value`] = Da(r[u], a[u], c);
      }
      await i.update(l, { cypherv2PackagePoolSync: !0 });
    }
    return s;
  }
}
function wl() {
  CONFIG.Actor.documentClass = gl, CONFIG.Item.documentClass = vl;
}
const Ze = 1, qt = 20, Nn = 1;
function vt(n) {
  const e = Number(n);
  return Number.isFinite(e) ? Math.min(
    qt,
    Math.max(Ze, Math.trunc(e))
  ) : Nn;
}
function Cl(n) {
  return Number.isInteger(n) && Number(n) >= Ze && Number(n) <= qt;
}
function Wa(n) {
  const e = vt(n);
  return e === 1 ? "neutral" : e <= 3 ? "low" : e <= 5 ? "elevated" : e <= 8 ? "severe" : e <= 12 ? "extreme" : e <= 16 ? "catastrophic" : "maximum";
}
function _a(n) {
  return (vt(n) - Ze) / (qt - Ze) * 100;
}
const x = {
  difficultyVisibility: "difficultyVisibility",
  showGmRollAudit: "showGmRollAudit",
  defaultDifficultyCeiling: "defaultDifficultyCeiling",
  enabledRuleModules: "enabledRuleModules",
  interfaceHiddenDifficulty: "interfaceHiddenDifficulty",
  debugRules: "debugRules",
  worldSchemaVersion: "worldSchemaVersion",
  theme: "theme",
  horrorIntrusionRange: "horrorIntrusionRange",
  pendingIntrusionXP: "gmIntrusions"
};
function El(n) {
  game.settings.register(H, x.difficultyVisibility, {
    name: "CYPHERV2.Settings.DifficultyVisibility.Name",
    hint: "CYPHERV2.Settings.DifficultyVisibility.Hint",
    scope: "world",
    // Legacy compatibility only. Roll cards now have fixed, unambiguous disclosure rules.
    config: !1,
    type: String,
    choices: {
      full: "CYPHERV2.Settings.DifficultyVisibility.Full",
      resultOnly: "CYPHERV2.Settings.DifficultyVisibility.ResultOnly",
      rollOnly: "CYPHERV2.Settings.DifficultyVisibility.RollOnly"
    },
    default: "full"
  }), game.settings.register(H, x.showGmRollAudit, {
    name: "CYPHERV2.Settings.ShowGmRollAudit.Name",
    hint: "CYPHERV2.Settings.ShowGmRollAudit.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(H, x.defaultDifficultyCeiling, {
    name: "CYPHERV2.Settings.DifficultyCeiling.Name",
    hint: "CYPHERV2.Settings.DifficultyCeiling.Hint",
    scope: "world",
    config: !0,
    type: Number,
    default: 10,
    range: { min: 0, max: 15, step: 1 }
  }), game.settings.register(H, x.interfaceHiddenDifficulty, {
    name: "CYPHERV2.Settings.HiddenDifficulty.Name",
    hint: "CYPHERV2.Settings.HiddenDifficulty.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !0
  }), game.settings.register(H, x.enabledRuleModules, {
    scope: "world",
    config: !1,
    type: Array,
    default: []
  }), game.settings.register(H, x.debugRules, {
    name: "CYPHERV2.Settings.DebugRules.Name",
    hint: "CYPHERV2.Settings.DebugRules.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(H, x.worldSchemaVersion, {
    scope: "world",
    config: !1,
    type: Number,
    default: 1
  }), game.settings.register(H, x.theme, {
    name: "CYPHERV2.Settings.Theme.Name",
    hint: "CYPHERV2.Settings.Theme.Hint",
    scope: "world",
    config: !0,
    type: String,
    choices: n.choices(),
    default: "core",
    onChange: (e) => n.apply(e)
  }), game.settings.register(H, x.horrorIntrusionRange, {
    name: "CYPHERV2.Horror.SettingName",
    hint: "CYPHERV2.Horror.SettingHint",
    scope: "world",
    config: !1,
    type: Number,
    default: Nn,
    range: {
      min: Ze,
      max: qt,
      step: 1
    },
    onChange: (e) => Hooks.callAll(
      "cypherv2HorrorIntrusionRangeChanged",
      vt(e)
    )
  }), game.settings.register(H, x.pendingIntrusionXP, {
    scope: "world",
    config: !1,
    type: Array,
    default: [],
    onChange: (e) => Hooks.callAll("cypherv2IntrusionPendingChanged", e)
  });
}
function De() {
  const n = Je();
  return {
    base: {
      difficultyCeiling: Number(
        game.settings.get(H, x.defaultDifficultyCeiling)
      ),
      assetLimit: 0
    },
    enabledRuleModuleIds: n
  };
}
function Je() {
  const n = game.settings.get(H, x.enabledRuleModules);
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
function Pi() {
  const n = game.settings.get(H, x.difficultyVisibility);
  return n === "resultOnly" || n === "rollOnly" ? n : "full";
}
function Ka() {
  return game.settings.get(H, x.interfaceHiddenDifficulty) === !0;
}
function Si() {
  return game.settings.get(H, x.showGmRollAudit) === !0;
}
function dn() {
  return typeof game > "u" ? Nn : vt(
    game.settings.get(H, x.horrorIntrusionRange)
  );
}
async function Rl(n) {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  if (!Cl(n))
    throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.InvalidRange"));
  return await game.settings.set(H, x.horrorIntrusionRange, n), n;
}
const Mn = {
  tag: "form",
  form: {
    closeOnSubmit: !1,
    submitOnChange: !0
  }
};
function xn(n) {
  return n.system.schema.fields;
}
function Un(n, e) {
  return Object.fromEntries(Object.entries(n).map(([t, i]) => [
    t,
    e.has(t) ? function(...a) {
      if (this.isEditable)
        return i.apply(this, a);
    } : i
  ]));
}
function qn(n, e, t) {
  if (!e) {
    for (const i of n.querySelectorAll(
      "input[name], select[name], textarea[name]"
    )) i.disabled = !0;
    for (const i of n.querySelectorAll("[data-edit]"))
      i.removeAttribute("data-edit");
    for (const i of n.querySelectorAll("[data-action]"))
      t.has(i.dataset.action ?? "") && (i.setAttribute("aria-disabled", "true"), i instanceof HTMLButtonElement ? i.disabled = !0 : (i.removeAttribute("tabindex"), i.setAttribute("inert", "")));
  }
}
const Pl = Object.freeze({ minor: 2, moderate: 5 }), Xa = 10;
class Sl {
  #e;
  constructor(e) {
    this.#e = e;
  }
  costFor(e) {
    return Pl[e];
  }
  canApply(e) {
    try {
      Ye(e);
    } catch {
      return !1;
    }
    const { wounds: t, stats: i } = e.system;
    return this.rally(t, i.might.value, "minor").success || this.rally(t, i.might.value, "moderate").success;
  }
  preview(e, t, i = this.costFor(t)) {
    try {
      Ye(e);
    } catch {
      return {
        success: !1,
        severity: t,
        cost: i,
        mightValue: e.system.stats.might.value,
        wounds: e.system.wounds,
        removed: null,
        failure: "no-wound"
      };
    }
    return this.rally(
      e.system.wounds,
      e.system.stats.might.value,
      t,
      void 0,
      i
    );
  }
  rally(e, t, i, o, a) {
    if (i === "major")
      return {
        success: !1,
        severity: i,
        cost: 0,
        mightValue: t,
        wounds: e,
        removed: null,
        failure: "major-not-rallyable"
      };
    const r = a ?? this.costFor(i);
    if (!Number.isInteger(r) || r < 0 || r > Xa)
      return {
        success: !1,
        severity: i,
        cost: r,
        mightValue: t,
        wounds: e,
        removed: null,
        failure: "invalid-cost"
      };
    const s = this.#e.removeOne(e, i, o);
    return s.removed ? t < r ? {
      success: !1,
      severity: i,
      cost: r,
      mightValue: t,
      wounds: e,
      removed: null,
      failure: "insufficient-might"
    } : {
      success: !0,
      severity: i,
      cost: r,
      mightValue: t - r,
      wounds: s.wounds,
      removed: s.removed,
      failure: null
    } : {
      success: !1,
      severity: i,
      cost: r,
      mightValue: t,
      wounds: s.wounds,
      removed: null,
      failure: "no-wound"
    };
  }
  async apply(e, t, i, o) {
    Ye(e);
    const a = this.rally(
      e.system.wounds,
      e.system.stats.might.value,
      t,
      i,
      o
    );
    return a.success && await e.update({
      "system.stats.might.value": a.mightValue,
      "system.wounds": a.wounds
    }), a;
  }
}
function Ja(n) {
  return n === "one-action" ? ["normal", "lastAction", "nonRest"] : ["normal", "nonRest"];
}
function kl(n, e) {
  if (!Ja(n).includes(e))
    throw new Error(`Recovery mode '${e}' is not available for '${n}'.`);
  return e === "nonRest" ? { kind: "nonRest", lastAction: !1 } : { kind: "normal", lastAction: e === "lastAction" };
}
function Vt(n, e) {
  return Number(n[e] ?? 0);
}
function Fe(n, e) {
  return String(n[e] ?? "");
}
function fo(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function xe(n) {
  const e = n instanceof Error ? n.message : String(n);
  ui.notifications.error(e);
}
async function Gn(n, e, t = game.i18n.localize("CYPHERV2.Actions.Apply")) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: e,
    rejectClose: !1,
    ok: { label: t }
  });
}
function hi(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function Al(n, e, t) {
  const i = n.system.wounds[e].find((a) => a.id === t);
  if (!i) {
    xe(new Error(`Wound '${t}' was not found in ${e} Wounds.`));
    return;
  }
  const o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text" value="${hi(i.label)}">
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}
        <textarea name="description">${hi(i.description)}</textarea>
      </label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (o)
    try {
      await game.cypherv2.services.wounds.edit(n, e, t, {
        label: Fe(o, "label"),
        description: Fe(o, "description")
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Updated"));
    } catch (a) {
      xe(a);
    }
}
async function Hl(n, e, t) {
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.DeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Wounds.DeleteConfirm")}</p></div>`,
    rejectClose: !1,
    modal: !0,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }))
    try {
      await game.cypherv2.services.wounds.delete(n, e, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Deleted"));
    } catch (o) {
      xe(o);
    }
}
async function $l(n) {
  const e = await Gn(
    game.i18n.localize("CYPHERV2.Actions.ApplyWound"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}
        <select name="severity">
          ${ie.map((t) => `<option value="${t}">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${t}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text">
      </label>
    </div>`
  );
  if (e)
    try {
      const t = Fe(e, "label"), i = await game.cypherv2.services.wounds.apply(
        n,
        Fe(e, "severity"),
        t ? { label: t } : {}
      ), o = i.applied ? `${i.appliedSeverity}${i.dead ? ` — ${game.i18n.localize("CYPHERV2.Wounds.Dead")}` : ""}` : game.i18n.localize("CYPHERV2.Wounds.NoFourthMajor");
      ui.notifications.info(o);
    } catch (t) {
      xe(t);
    }
}
async function Il(n) {
  const e = await Gn(
    game.i18n.localize("CYPHERV2.Actions.PoolDamage"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
        <select name="pool">
          <option value="might">${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
          <option value="speed">${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
          <option value="intellect">${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Damage")}
        <input name="damage" type="number" value="1" min="0" step="1">
      </label>
    </div>`
  );
  if (e)
    try {
      const t = await game.cypherv2.services.wounds.damagePool(
        n,
        Fe(e, "pool"),
        Vt(e, "damage")
      );
      ui.notifications.info(
        t.overflowSeverity ? `${t.pool}: ${t.value}; ${t.overflowSeverity} Wound` : `${t.pool}: ${t.value}`
      );
    } catch (t) {
      xe(t);
    }
}
async function ho(n, e, t) {
  const i = n.system.recovery.slots?.length ? n.system.recovery.slots : Qe(n.system.recovery.used), o = It(i);
  if (o.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.NoneAvailable"));
    return;
  }
  if (t && !o.some((u) => u.id === t && u.type === e)) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
    return;
  }
  let a = e, r = t;
  if (!a || !r) {
    const u = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Recovery.Choose") },
      content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Available")}</span>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Recovery.Choose")}
            <select name="slotId">${o.map((c) => `<option value="${c.id}">${game.i18n.localize(`CYPHERV2.Recovery.${c.type}`)}</option>`).join("")}</select>
          </label>
        </section>
      </div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Next") }
    });
    if (!u) return;
    if (r = Fe(u, "slotId"), a = o.find((c) => c.id === r)?.type, !a || !r) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
      return;
    }
  }
  const s = Ja(a), l = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${game.i18n.localize(`CYPHERV2.Recovery.${a}`)}` },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
      <header class="cypherv2-dialog-heading">
        <span>${game.i18n.localize("CYPHERV2.Actions.Recovery")}</span>
        <strong>${game.i18n.localize(`CYPHERV2.Recovery.${a}`)}</strong>
      </header>
      <section class="cypherv2-dialog-section cypherv2-recovery-formula">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Roll")}</span>
        <strong class="cypherv2-dialog-value">${hi(n.system.derived.recovery.formula)}</strong>
      </section>
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}</span>
        <div class="cypherv2-dialog-button-group recovery-mode-buttons" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}">
          ${s.map((u) => `<label class="cypherv2-dialog-toggle"><input name="mode" type="radio" value="${u}"${u === "normal" ? " checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Recovery.Kind.${u}`)}</span></label>`).join("")}
        </div>
      </section>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Recovery.Recover") }
  });
  if (l)
    try {
      const u = kl(a, Fe(l, "mode"));
      if (u.kind === "nonRest") {
        await game.cypherv2.services.recovery.completeNonRest(n, a, r), ui.notifications.info(game.i18n.localize("CYPHERV2.Recovery.NonRestCompleted"));
        return;
      }
      const c = await game.cypherv2.services.recovery.rollNormal(
        n,
        a,
        u.lastAction,
        r
      ), p = a === "1-hour" ? `<label>${game.i18n.localize("CYPHERV2.Rest.OneHourChoice")}
          <select name="oneHourChoice">
            <option value="remove-moderate">${game.i18n.localize("CYPHERV2.Rest.RemoveModerate")}</option>
            <option value="remove-minors">${game.i18n.localize("CYPHERV2.Rest.RemoveMinors")}</option>
          </select>
        </label>` : a === "10-hours" ? `<label><input name="exchange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.ExchangeMinor")}</label>
          <label><input name="majorSuccess" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.MajorTaskSuccess")}</label>` : a === "10-minutes" ? `<p>${game.i18n.localize("CYPHERV2.Recovery.TenMinuteBenefit")}</p>` : "", f = await Gn(
        `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${c.total}`,
        `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog cypherv2-recovery-allocation-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Result")}</span>
          <div class="cypherv2-dialog-summary-row"><span>${hi(n.system.derived.recovery.formula)}</span><strong>${c.total}</strong></div>
          ${c.lastAction ? `<div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Recovery.Kind.lastAction")}</span><strong>+2</strong></div>` : ""}
        </section>
        <section class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Might")} <input name="might" type="number" value="0" min="0" max="${c.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Speed")} <input name="speed" type="number" value="0" min="0" max="${c.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Intellect")} <input name="intellect" type="number" value="0" min="0" max="${c.total}" step="1"></label>
        </section>
        ${p ? `<section class="cypherv2-dialog-section cypherv2-dialog-fields">${p}</section>` : ""}
      </div>`,
        game.i18n.localize("CYPHERV2.Recovery.Recover")
      );
      if (!f) return;
      const m = await game.cypherv2.services.recovery.completeNormal(
        n,
        c,
        {
          might: Vt(f, "might"),
          speed: Vt(f, "speed"),
          intellect: Vt(f, "intellect")
        },
        {
          oneHourChoice: Fe(f, "oneHourChoice"),
          removeMinorsInsteadOfOneModerate: fo(f, "exchange"),
          majorTaskSucceeded: fo(f, "majorSuccess")
        }
      ), b = c.total - m.recovery.unspent, g = m.rest?.result.removed.length ?? 0;
      ui.notifications.info(
        `${game.i18n.localize("CYPHERV2.Recovery.Restored")}: ${b}; ${game.i18n.localize("CYPHERV2.Rest.Removed")}: ${g}`
      );
    } catch (u) {
      xe(u);
    }
}
async function Vl(n) {
  const e = game.cypherv2.services.rally, t = n.system.stats.might.value, i = n.system.derived.pools.might.max, o = e.costFor("minor"), a = e.costFor("moderate"), r = e.preview(n, "minor", o), s = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Actions.Rally") },
    content: Yl(
      t,
      i,
      o,
      a,
      r.success ? r.mightValue : null
    ),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Rally") },
    render: (l, u) => Dl(u.element, n)
  });
  if (s)
    try {
      const l = await game.cypherv2.services.rally.apply(
        n,
        Fe(s, "severity"),
        void 0,
        Vt(s, "cost")
      );
      if (!l.success) throw new Error(l.failure ?? "Rally failed.");
      ui.notifications.info(`${game.i18n.localize("CYPHERV2.Actions.Rally")}: -${l.cost} Might`);
    } catch (l) {
      xe(l);
    }
}
function Yl(n, e, t = 2, i = 5, o = null) {
  const a = game.i18n.localize("CYPHERV2.Wounds.Severity.minor"), r = game.i18n.localize("CYPHERV2.Wounds.Severity.moderate");
  return `<div class="cypherv2 cypherv2-dialog cypherv2-rally-dialog" data-current-might="${n}" data-max-might="${e}">
    <header class="cypherv2-dialog-heading"><span>${game.i18n.localize("CYPHERV2.Actions.Rally")}</span><strong data-rally-heading>${a}</strong></header>
    <section class="cypherv2-dialog-section">
      <div class="cypherv2-dialog-button-group" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}">
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="minor" data-default-cost="${t}" checked><span>${a}</span></label>
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="moderate" data-default-cost="${i}"><span>${r}</span></label>
      </div>
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Rally.Cost")}
        <input name="cost" type="number" min="0" max="${Xa}" step="1" value="${t}">
      </label>
    </section>
    <section class="cypherv2-dialog-section" aria-label="${game.i18n.localize("CYPHERV2.Roll.Summary")}">
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.Cost")}</span><strong><span data-rally-cost>${t}</span> Might</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.CurrentMight")}</span><strong>${n} / ${e}</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.AfterRally")}</span><strong><span data-rally-after>${o ?? "—"}</span> / ${e}</strong></div>
      <p class="cypherv2-dialog-callout is-danger" data-rally-error ${o === null ? "" : "hidden"}>${game.i18n.localize("CYPHERV2.Rally.Unavailable")}</p>
    </section>
  </div>`;
}
function Dl(n, e) {
  const t = n.querySelector('input[name="cost"]'), i = [...n.querySelectorAll('input[name="severity"]')], o = n.querySelector("[data-rally-cost]"), a = n.querySelector("[data-rally-after]"), r = n.querySelector("[data-rally-heading]"), s = n.querySelector("[data-rally-error]"), l = n.querySelector('button[data-action="ok"]');
  if (!t) return;
  const u = () => {
    const c = Number(t.value), p = i.find((m) => m.checked)?.value, f = p ? game.cypherv2.services.rally.preview(e, p, c) : null;
    o && (o.textContent = Number.isInteger(c) ? String(c) : "—"), a && (a.textContent = f?.success ? String(f.mightValue) : "—"), s && (s.hidden = f?.success === !0, s.textContent = game.i18n.localize(f?.failure === "insufficient-might" ? "CYPHERV2.Rally.InsufficientMight" : f?.failure === "invalid-cost" ? "CYPHERV2.Rally.InvalidCost" : "CYPHERV2.Rally.NoWound")), l && (l.disabled = f?.success !== !0);
  };
  for (const c of i) c.addEventListener("change", () => {
    c.checked && (t.value = String(Number(c.dataset.defaultCost ?? 0)), r && (r.textContent = c.nextElementSibling?.textContent ?? c.value), u());
  });
  t.addEventListener("input", u), u();
}
async function Fl(n, e) {
  const t = ln(n.system, e), i = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Overrides.Edit") },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-override-dialog">
      <section class="cypherv2-dialog-section">
        <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Overrides.Calculated")}</span><strong>${t.calculated}</strong></div>
        <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Overrides.Override")}
          <input name="value" type="number" min="${t.minimum}" step="1" value="${t.override ?? t.effective}">
        </label>
        <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Overrides.Effective")}</span><strong>${t.effective}</strong></div>
      </section>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Apply") }
  });
  if (!i) return;
  const o = Number(i.value);
  if (!Number.isInteger(o) || o < t.minimum) {
    xe(new Error(game.i18n.localize("CYPHERV2.Overrides.Invalid")));
    return;
  }
  await n.update({ [t.path]: o });
}
function go(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function ci(n, e) {
  const t = Number(n);
  if (!Number.isInteger(t)) throw new Error(`${e} must be a whole number.`);
  return t;
}
function Qa(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
function Tl(n, e) {
  for (const t of ie) {
    if (!Number.isInteger(e[t])) throw new Error(`${t} modifier must be a whole number.`);
    if (n[t] + e[t] < 1)
      throw new Error(`${t} Wound capacity must remain at least 1.`);
  }
  return { ...e };
}
async function zl(n) {
  const e = n.system.derived.wounds.calculatedCapacities, t = n.system.overrides.wounds ?? { minor: 0, moderate: 0, major: 0 }, i = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Overrides.WoundsEdit") },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-wound-override-dialog">
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.WoundModifiers")}</span>
        <div class="cypherv2-dialog-field-grid">
          ${ie.map((o) => `<label class="cypherv2-dialog-field">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${o}`)}
            <input name="${o}" type="number" step="1" value="${t[o]}">
            <small>${game.i18n.localize("CYPHERV2.Overrides.Calculated")}: ${e[o]}</small>
          </label>`).join("")}
        </div>
      </section>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (i)
    try {
      const o = Tl(e, {
        minor: ci(i.minor, "Minor"),
        moderate: ci(i.moderate, "Moderate"),
        major: ci(i.major, "Major")
      });
      await n.update({ "system.overrides.wounds": o });
    } catch (o) {
      Qa(o);
    }
}
function Nl(n) {
  return Ce.map((e) => `<option value="${e}"${e === n ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Recovery.${e}`)}</option>`).join("");
}
function Za(n) {
  return `<div class="recovery-override-slot" data-recovery-slot-id="${go(n.id)}">
    <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
    <select name="slotType__${go(n.id)}" aria-label="${game.i18n.localize("CYPHERV2.Overrides.RecoverySlotType")}">${Nl(n.type)}</select>
    <span class="recovery-slot-state">${n.used ? game.i18n.localize("CYPHERV2.Overrides.Used") : game.i18n.localize("CYPHERV2.Overrides.Available")}</span>
    <span class="character-settings-row-actions">
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="up" title="${game.i18n.localize("CYPHERV2.Actions.MoveUp")}"><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="down" title="${game.i18n.localize("CYPHERV2.Actions.MoveDown")}"><i class="fa-solid fa-arrow-down"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-remove title="${game.i18n.localize("CYPHERV2.Actions.Remove")}"><i class="fa-solid fa-trash"></i></button>
    </span>
  </div>`;
}
function Ml(n, e) {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-override-dialog">
    <section class="cypherv2-dialog-section">
      <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.RecoveryTrack")}</span>
      <input type="hidden" name="slotOrder" value="${n.map((t) => t.id).join(",")}">
      <div class="recovery-override-slots">${n.map(Za).join("")}</div>
      <button type="button" class="compact-inline-action recovery-slot-add" data-recovery-slot-add><i class="fa-solid fa-plus"></i> ${game.i18n.localize("CYPHERV2.Overrides.AddRecoverySlot")}</button>
    </section>
    <section class="cypherv2-dialog-section">
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Overrides.RecoveryRollModifier")}
        <input name="rollModifier" type="number" min="-20" max="20" step="1" value="${e}">
      </label>
    </section>
  </div>`;
}
function zi(n) {
  const e = [...n.querySelectorAll("[data-recovery-slot-id]")], t = n.querySelector('input[name="slotOrder"]');
  t && (t.value = e.map((i) => i.dataset.recoverySlotId ?? "").filter(Boolean).join(","));
  for (const [i, o] of e.entries()) {
    const a = o.querySelector('[data-recovery-slot-move="up"]'), r = o.querySelector('[data-recovery-slot-move="down"]'), s = o.querySelector("[data-recovery-slot-remove]");
    a && (a.disabled = i === 0), r && (r.disabled = i === e.length - 1), s && (s.disabled = e.length <= 1);
  }
}
function xl(n) {
  zi(n), n.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target.closest("button") : null;
    if (!t) return;
    const i = t.closest("[data-recovery-slot-id]"), o = n.querySelector(".recovery-override-slots");
    if (t.hasAttribute("data-recovery-slot-add") && o) {
      const a = { id: Ue(), type: "one-action", used: !1 };
      o.insertAdjacentHTML("beforeend", Za(a)), zi(n);
      return;
    }
    !i || !o || (t.hasAttribute("data-recovery-slot-remove") && i.remove(), t.dataset.recoverySlotMove === "up" && i.previousElementSibling && o.insertBefore(i, i.previousElementSibling), t.dataset.recoverySlotMove === "down" && i.nextElementSibling && o.insertBefore(i.nextElementSibling, i), zi(n));
  });
}
function Ul(n, e) {
  const t = String(n.slotOrder ?? "").split(",").filter(Boolean);
  if (t.length === 0 || new Set(t).size !== t.length) throw new Error("Recovery track must contain unique slots.");
  const i = new Map(e.map((r) => [r.id, r])), o = t.map((r) => {
    const s = String(n[`slotType__${r}`] ?? "");
    if (!Ce.includes(s)) throw new Error(`Invalid Recovery type '${s}'.`);
    return { id: r, type: s, used: i.get(r)?.used ?? !1 };
  }), a = ci(n.rollModifier, "Recovery roll modifier");
  if (a < -20 || a > 20) throw new Error("Recovery roll modifier must be between -20 and 20.");
  return { slots: o, rollModifier: a };
}
async function ql(n) {
  const e = n.system.recovery.slots, t = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Overrides.RecoveryEdit") },
    content: Ml(e, n.system.recovery.rollModifier),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") },
    render: (i, o) => xl(o.element)
  });
  if (t)
    try {
      const i = Ul(t, e);
      await n.update({
        "system.recovery.slots": i.slots,
        "system.recovery.used": mt(i.slots),
        "system.recovery.customized": !0,
        "system.recovery.rollModifier": i.rollModifier
      });
    } catch (i) {
      Qa(i);
    }
}
async function Gl(n) {
  await n.update({ "system.overrides.wounds": { minor: 0, moderate: 0, major: 0 } });
}
async function Ol(n) {
  const e = rs(n.system.recovery.slots);
  await n.update({
    "system.recovery.slots": e,
    "system.recovery.used": mt(e),
    "system.recovery.customized": !1,
    "system.recovery.rollModifier": 0
  });
}
function Bl(n) {
  const e = n?.token?.texture?.src;
  if (typeof e == "string" && e.trim()) return e;
  const t = n?.img;
  return typeof t == "string" ? t.trim() : "";
}
function ve(n) {
  const e = Bl(n), t = n?.system && typeof n.system == "object" ? n.system : null, i = t?.appearance && typeof t.appearance == "object" ? t.appearance : null, o = typeof i?.color == "string" ? i.color : "", a = xa(o), r = Ma(o), s = [
    ...a ? [`--cypherv2-chat-accent: ${a}`] : [],
    ...r ? [`--cypherv2-chat-tint: ${r}`] : []
  ].join("; ");
  return {
    ...e ? { actorImage: e } : {},
    ...s ? { chatCardStyle: s } : {}
  };
}
function Ll(n, e = []) {
  return {
    kind: "gm-intrusion",
    intrusionId: n.id,
    mode: n.mode,
    sourceActorId: n.targets[0]?.actorId ?? "",
    sourceActorName: n.targets[0]?.actorName ?? "",
    targetXp: n.targetXp,
    sharedXp: n.sharedXp,
    status: n.mode === "targeted" && n.sharedXp > 0 ? "pending" : "resolved",
    recipients: [...e],
    affectedCharacters: n.targets.map((t) => ({
      actorId: t.actorId,
      actorName: t.actorName,
      actorImage: t.actorImage ?? ""
    }))
  };
}
function jl(n) {
  const e = n.affectedCharacters ?? [], t = e.find((i) => i.actorId === n.sourceActorId) ?? (n.sourceActorId ? {
    actorId: n.sourceActorId,
    actorName: n.sourceActorName,
    actorImage: ""
  } : void 0);
  return {
    mode: n.mode,
    isTargeted: n.mode === "targeted",
    isGroup: n.mode === "group",
    isFree: n.mode === "free",
    sourceActorName: n.sourceActorName,
    targetXp: n.targetXp,
    sharedXp: n.sharedXp,
    pending: n.status === "pending",
    resolving: n.status === "resolving",
    resolved: n.status === "resolved",
    recipients: n.recipients,
    hasRecipients: n.recipients.length > 0,
    affectedCharacters: e,
    hasAffectedCharacters: e.length > 0,
    ...t ? { sourceCharacter: t } : {},
    ...n.resolvedRecipient ? { resolvedRecipient: n.resolvedRecipient } : {}
  };
}
function Ni(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return e.kind === "gm-intrusion" && typeof e.intrusionId == "string" && typeof e.sourceActorId == "string" && (e.mode === "targeted" || e.mode === "group" || e.mode === "free") && (e.status === "pending" || e.status === "resolving" || e.status === "resolved") && Array.isArray(e.recipients);
}
class Wl {
  async publish(e, t, i = []) {
    const o = Ll(e, i), a = await this.render(o, t);
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(
        t ? { actor: t } : void 0
      ),
      content: a,
      flags: { cypherv2: { gmIntrusion: o } }
    });
  }
  async update(e, t, i) {
    const o = await this.render(t, i);
    await e.update({ content: o, "flags.cypherv2.gmIntrusion": t });
  }
  async render(e, t) {
    return foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/gm-intrusion-card.hbs",
      {
        ...jl(e),
        ...ve(t)
      }
    );
  }
}
const Rt = "system." + H;
function Nt() {
  return [...game.users];
}
function er() {
  return Nt().filter((n) => n.active);
}
function Qt() {
  return [...game.actors].filter((n) => n.type === "character").map((n) => n);
}
function Se(n) {
  const e = game.actors.get(n);
  return e?.type === "character" ? e : null;
}
function Mi() {
  return er().filter((n) => n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function Pt(n, e) {
  return Nt().filter((t) => !t.isGM && (!e || t.active)).filter((t) => n.testUserPermission(t, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).sort((t, i) => t.id.localeCompare(i.id));
}
function xi(n) {
  const e = n.filter((t) => !t.isGM).sort((t, i) => t.id.localeCompare(i.id));
  return e.find((t) => t.active) ?? e[0] ?? null;
}
function Zt(n, e) {
  const t = new Set(Nt().filter((o) => !o.isGM).map((o) => o.character?.id).filter((o) => typeof o == "string" && o.length > 0));
  return [...new Map(n.filter((o) => o.type === "character").map((o) => [o.id, o])).values()].filter((o) => o.id !== e).filter((o) => t.has(o.id)).map((o) => ({ actorId: o.id, actorName: o.name, actorImage: o.img ?? "" })).sort((o, a) => o.actorName.localeCompare(a.actorName));
}
function yo(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && typeof e.messageId == "string" && e.messageId.length > 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function _l(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && e.messageId === void 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function Kl(n, e) {
  return JSON.stringify(n) === JSON.stringify(e);
}
class Xl {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Map();
  #o = !1;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(Rt, (e) => {
      this.#d(e).catch((t) => {
        console.error(H + " | GM Intrusion socket error", t), game.user.isGM && ui.notifications.error(t instanceof Error ? t.message : String(t));
      });
    }), Hooks.on("renderChatMessageHTML", (e, t) => {
      this.#a(e, t);
    }), Hooks.on("updateUser", () => {
      this.#m() && this.retryPendingDistributions();
    }), Hooks.on("createActor", () => {
      this.#m() && this.retryPendingDistributions();
    }), Hooks.on("deleteActor", () => {
      this.#m() && setTimeout(() => {
        this.#y();
      }, 0);
    }), Hooks.on("updateActor", () => {
      this.#m() && this.retryPendingDistributions();
    }), Hooks.on("cypherv2IntrusionPendingChanged", () => {
      this.#m() && this.retryPendingDistributions();
    }), this.#m() && setTimeout(() => {
      this.#y().then(() => this.retryPendingDistributions());
    }, 1e3);
  }
  async createManual(e) {
    if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.GMOnly"));
    if (this.#o) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyCreating"));
    this.#o = !0;
    try {
      const t = e.actorIds.map(Se).filter((r) => r !== null), i = De();
      let o;
      if (e.mode === "group")
        o = await this.#e.createGroup(t, i.enabledRuleModuleIds ?? []);
      else {
        const r = t[0];
        if (!r) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.ChooseCharacter"));
        o = e.mode === "free" ? await this.#e.createFree(r, 0, i.enabledRuleModuleIds ?? []) : await this.#e.createTargeted(r, i.enabledRuleModuleIds ?? []);
      }
      const a = t[0];
      if (o.mode !== "targeted" || o.sharedXp <= 0 || !a)
        await this.#t.publish(o, a);
      else {
        const r = xi(Pt(a, !1)), s = Zt(Qt(), a.id), l = await this.#t.publish(o, a, s), u = {
          intrusionId: o.id,
          messageId: l.id,
          sourceActorId: a.id,
          amount: o.sharedXp,
          ...r ? { responderUserId: r.id } : {}
        };
        await this.#p(u), await this.#l(u, !0);
      }
      return Hooks.callAll("cypherv2GMIntrusionCreated", o), o;
    } finally {
      this.#o = !1;
    }
  }
  async requestFreeFromNaturalResult(e, t) {
    if (!(!t.naturalEffects.some(
      (o) => o.status === "applied" && o.triggersGMIntrusion === !0
    ) || t.naturalRoll === null)) {
      if (this.#m()) {
        await this.#r(e.id, t.naturalRoll);
        return;
      }
      if (!Mi()) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoActiveGM"));
        return;
      }
      game.socket.emit(Rt, { type: "create-free", actorId: e.id, naturalRoll: t.naturalRoll });
    }
  }
  async retryPendingDistributions() {
    if (this.#m())
      for (const e of this.#u()) await this.#l(e);
  }
  async requestDistribution(e, t) {
    const i = this.#b(e), o = Se(i.sourceActorId);
    if (!o || !this.#c(o, i))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
    if (this.#m()) {
      await this.#s(e, t, game.user.id);
      return;
    }
    if (!Mi()) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NoActiveGM"));
    const a = Ue();
    await new Promise((r, s) => {
      const l = setTimeout(() => {
        this.#n.delete(a), s(new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RequestTimeout")));
      }, 1e4);
      this.#n.set(a, { resolve: r, reject: s, timeout: l }), game.socket.emit(Rt, {
        type: "distribution-choice",
        intrusionId: e,
        recipientActorId: t,
        requesterUserId: game.user.id,
        requestId: a
      });
    });
  }
  async #r(e, t) {
    const i = Se(e);
    if (!i) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
    const o = De(), a = await this.#e.createFree(i, t, o.enabledRuleModuleIds ?? []);
    Hooks.callAll("cypherv2GMIntrusionCreated", a);
  }
  #a(e, t) {
    const i = e.getFlag(H, "gmIntrusion");
    if (!Ni(i)) return;
    const o = this.#u().find((s) => s.intrusionId === i.intrusionId), a = o ? Se(o.sourceActorId) : null, r = i.status === "pending" && (game.user.isGM || !!(o && a && this.#c(a, o)));
    for (const s of t.querySelectorAll("[data-action='assignSharedIntrusionXp']")) {
      if (!r) {
        s.remove();
        continue;
      }
      s.dataset.cypherv2IntrusionBound !== "true" && (s.dataset.cypherv2IntrusionBound = "true", s.addEventListener("click", (l) => {
        l.preventDefault(), l.stopPropagation();
        const u = s.dataset.recipientActorId;
        !u || s.disabled || (s.disabled = !0, this.requestDistribution(i.intrusionId, u).catch((c) => {
          s.disabled = !1, ui.notifications.error(c instanceof Error ? c.message : String(c));
        }));
      }));
    }
  }
  #c(e, t) {
    return game.user.isGM ? !0 : game.user.id === t.responderUserId && e.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  }
  async #l(e, t = !1) {
    const i = Se(e.sourceActorId), o = game.messages.get(e.messageId);
    if (!i || !o) {
      await this.#f(e.intrusionId);
      return;
    }
    let a = e.responderUserId ? Nt().find((l) => l.id === e.responderUserId) ?? null : null;
    (!a || !Pt(i, !1).some((l) => l.id === a?.id)) && (a = xi(Pt(i, !1)), a && (e = { ...e, responderUserId: a.id }, await this.#p(e)));
    const r = o.getFlag(H, "gmIntrusion");
    if (!Ni(r) || r.status !== "pending") return;
    const s = Zt(Qt(), i.id);
    (t || !Kl(r.recipients, s)) && await this.#t.update(o, { ...r, recipients: s }, i);
  }
  async #s(e, t, i) {
    if (this.#i.has(e))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    this.#i.add(e);
    let o = !1, a = null, r = null, s = null;
    try {
      const l = this.#b(e);
      s = Se(l.sourceActorId);
      const u = Se(t);
      if (r = game.messages.get(l.messageId) ?? null, !s || !u || !r)
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
      const c = r.getFlag(H, "gmIntrusion");
      if (!Ni(c) || c.intrusionId !== e || c.status !== "pending")
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
      a = c;
      const p = er().find((g) => g.id === i);
      if (!(p?.isGM === !0 || !!(p && p.id === l.responderUserId && Pt(s, !0).some((g) => g.id === p.id)))) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
      const b = Zt(Qt(), s.id).find((g) => g.actorId === u.id);
      if (!b) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable"));
      await this.#t.update(r, { ...c, status: "resolving" }, s), await this.#e.distributeSecondXp(s, u, l.amount), o = !0, await this.#f(e), await this.#t.update(r, {
        ...c,
        status: "resolved",
        recipients: [],
        resolvedRecipient: b
      }, s), Hooks.callAll("cypherv2GMIntrusionXPDistributed", e, s, u);
    } catch (l) {
      throw !o && a && r && s && await this.#t.update(r, a, s), l;
    } finally {
      this.#i.delete(e);
    }
  }
  async #d(e) {
    if (e.type === "distribution-result") {
      if (e.recipientUserId !== game.user.id) return;
      const t = this.#n.get(e.requestId);
      if (!t) return;
      clearTimeout(t.timeout), this.#n.delete(e.requestId), e.success ? t.resolve() : t.reject(new Error(e.error ?? game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable")));
      return;
    }
    if (this.#m()) {
      if (e.type === "create-free") await this.#r(e.actorId, e.naturalRoll);
      else if (e.type === "distribution-choice")
        try {
          await this.#s(e.intrusionId, e.recipientActorId, e.requesterUserId), game.socket.emit(Rt, {
            type: "distribution-result",
            requestId: e.requestId,
            recipientUserId: e.requesterUserId,
            success: !0
          });
        } catch (t) {
          throw game.socket.emit(Rt, {
            type: "distribution-result",
            requestId: e.requestId,
            recipientUserId: e.requesterUserId,
            success: !1,
            error: t instanceof Error ? t.message : String(t)
          }), t;
        }
    }
  }
  #u() {
    const e = game.settings.get(H, x.pendingIntrusionXP);
    return Array.isArray(e) ? e.filter(yo).map((t) => ({
      intrusionId: t.intrusionId,
      messageId: t.messageId,
      sourceActorId: t.sourceActorId,
      amount: t.amount,
      ...t.responderUserId ? { responderUserId: t.responderUserId } : {}
    })) : [];
  }
  #b(e) {
    const t = this.#u().find((i) => i.intrusionId === e);
    if (!t) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    return t;
  }
  async #p(e) {
    const t = this.#u(), i = t.findIndex((o) => o.intrusionId === e.intrusionId);
    i < 0 ? t.push(e) : t[i] = e, await game.settings.set(H, x.pendingIntrusionXP, t);
  }
  async #f(e) {
    await game.settings.set(
      H,
      x.pendingIntrusionXP,
      this.#u().filter((t) => t.intrusionId !== e)
    );
  }
  async #y() {
    const e = game.settings.get(H, x.pendingIntrusionXP), t = [];
    for (const i of Array.isArray(e) ? e : []) {
      if (yo(i)) {
        Se(i.sourceActorId) && game.messages.get(i.messageId) && t.push({
          intrusionId: i.intrusionId,
          messageId: i.messageId,
          sourceActorId: i.sourceActorId,
          amount: i.amount,
          ...i.responderUserId ? { responderUserId: i.responderUserId } : {}
        });
        continue;
      }
      if (!_l(i)) continue;
      const o = Se(i.sourceActorId), a = [...game.messages].find(
        (u) => u.getFlag(H, "gmIntrusionId") === i.intrusionId
      );
      if (!o || !a) continue;
      const r = i.responderUserId ? Nt().find((u) => u.id === i.responderUserId) : xi(Pt(o, !1)), s = this.#e.policy(De().enabledRuleModuleIds ?? []), l = {
        kind: "gm-intrusion",
        intrusionId: i.intrusionId,
        mode: "targeted",
        sourceActorId: o.id,
        sourceActorName: o.name,
        targetXp: s.targetedXpToTarget,
        sharedXp: i.amount,
        status: "pending",
        recipients: Zt(Qt(), o.id)
      };
      await this.#t.update(a, l, o), t.push({
        intrusionId: i.intrusionId,
        messageId: a.id,
        sourceActorId: i.sourceActorId,
        amount: i.amount,
        ...r ? { responderUserId: r.id } : {}
      });
    }
    (!Array.isArray(e) || JSON.stringify(e) !== JSON.stringify(t)) && await game.settings.set(H, x.pendingIntrusionXP, t);
  }
  #m() {
    return game.user.isGM && Mi()?.id === game.user.id;
  }
}
let Yt = null;
function Jl(n, e) {
  return Yt = new Xl(n, e), Yt.initialize(), Yt;
}
function Gt() {
  if (!Yt) throw new Error("GM Intrusion controller is not ready.");
  return Yt;
}
async function On(n, e) {
  await game.cypherv2.services.rollChat.publish(n, e, Pi(), {
    showGmAudit: Si()
  }), await Gt().requestFreeFromNaturalResult(n, e.result);
}
function we(n, e) {
  if (!Number.isFinite(e)) throw new Error("Step modifier amount must be finite.");
  const t = Math.abs(Math.trunc(e));
  return t === 0 ? "0" : `${n === "ease" ? "+" : "-"}${t}`;
}
function Ql(n) {
  if (!Number.isFinite(n)) throw new Error("Net step modifier must be finite.");
  return n === 0 ? "0" : we(n > 0 ? "ease" : "hinder", n);
}
const bo = /* @__PURE__ */ new Set([
  "manual.skill",
  "manual.other-ease",
  "manual.other-hindrance",
  "core.assets",
  "core.effort.paid",
  "core.effort.free"
]);
function et(n) {
  return String(n).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function Bn(n) {
  return game.i18n.localize(n);
}
function Ln(n, e) {
  return e(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function vo(n, e) {
  return e.context.difficulty.mode === "hidden" && n.id.startsWith("npc-modification.");
}
function wo(n, e) {
  return {
    id: n.id,
    label: e(n.label),
    modifier: we(n.direction, n.steps),
    direction: n.direction
  };
}
function Zl(n, e, t) {
  const i = n.breakdown.filter((c) => vo(c, n)), o = n.breakdown.filter((c) => !vo(c, n)), a = o.filter((c) => bo.has(c.id)).map((c) => wo(c, t)), r = o.filter((c) => !bo.has(c.id)).map((c) => wo(c, t)), s = n.context.difficulty.mode === "known", l = n.context.pool;
  if (l === null) throw new Error("Configured rolls require a Pool.");
  const u = e.system.stats[l].value;
  return {
    rollLabel: t(n.context.label),
    pool: l,
    poolLabel: Ln(l, t),
    modifiers: a,
    automaticModifiers: r,
    netModifier: i.length === 0 ? Ql(n.netSteps) : null,
    hiddenModifierCount: i.length,
    difficultyMode: n.context.difficulty.mode,
    baseDifficulty: s ? n.context.difficulty.value : null,
    finalDifficulty: s ? n.finalDifficulty : null,
    targetNumber: s ? n.targetNumber : null,
    automaticSuccess: s && n.finalDifficulty === 0,
    actionCost: n.actionCostBeforeEdge,
    effortCost: n.effortCostBeforeEdge,
    edgeApplied: n.edgeApplied,
    totalCost: n.poolCost,
    poolValue: u,
    poolAfter: Math.max(0, u - n.poolCost),
    effortUsed: n.paidEffortApplied,
    effortMaximum: n.context.limits.paidEffortMaximum,
    totalEffortApplied: n.totalEffortApplied,
    totalEffortMaximum: n.totalEffortMaximum,
    paidEffortApplied: n.paidEffortApplied,
    freeEffortApplied: n.freeEffortApplied
  };
}
function Co(n) {
  const e = {};
  for (const t of n.querySelectorAll("[name]"))
    e[t.name] = t instanceof HTMLInputElement && t.type === "checkbox" ? t.checked : t.value;
  return e;
}
function ne(n, e) {
  return String(n[e] ?? "");
}
function G(n, e) {
  return Number(n[e] ?? 0);
}
function ec(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function Ot(n, e) {
  const t = ne(n, "difficulty").trim();
  return t ? {
    mode: ec(n, "hidden") ? "hidden" : "known",
    value: Number(t)
  } : { mode: "unknown" };
}
function Bt(n) {
  const e = G(n, "situationalSteps");
  return ne(n, "situationalDirection") === "hinder" ? { otherEase: 0, otherHindrance: e } : { otherEase: e, otherHindrance: 0 };
}
function de(n, e = 0) {
  return Array.from({ length: n + 1 }, (t, i) => `<option value="${i}"${i === e ? " selected" : ""}>${i}</option>`).join("");
}
function tr(n) {
  return ["might", "speed", "intellect"].map((e) => `<option value="${e}"${e === n ? " selected" : ""}>${et(Ln(e, Bn))}</option>`).join("");
}
const tc = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function rt(n) {
  return tc[n];
}
function jn(n = 0, e = "") {
  return X.map((t) => {
    const i = rt(t), o = game.i18n.localize(`CYPHERV2.Skill.Ranks.${t}`), a = i === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : we(i > 0 ? "ease" : "hinder", i);
    return `<option value="${e}${i}"${n !== null && i === n ? " selected" : ""}>${et(o)} · ${a}</option>`;
  }).join("");
}
function Lt() {
  return `<div class="roll-dialog-inline-field roll-dialog-situational">
    <span class="roll-dialog-field-label">${game.i18n.localize("CYPHERV2.Roll.SituationalModifier")}</span>
    <select name="situationalDirection" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierDirection")}">
      <option value="ease">${game.i18n.localize("CYPHERV2.Roll.Ease")}</option>
      <option value="hinder">${game.i18n.localize("CYPHERV2.Roll.Hinder")}</option>
    </select>
    <input name="situationalSteps" type="number" value="0" min="0" max="10" step="1" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierSteps")}">
  </div>`;
}
function jt(n, e) {
  return `<div class="roll-dialog-inline-field roll-dialog-difficulty-field">
    <label>${game.i18n.localize("CYPHERV2.Roll.BaseDifficulty")}
      <input name="difficulty" type="number" min="0" max="${n}" step="1" placeholder="${game.i18n.localize("CYPHERV2.Roll.Optional")}">
    </label>
    ${e ? `<label class="roll-dialog-checkbox"><input name="hidden" type="checkbox"> ${game.i18n.localize("CYPHERV2.Roll.HiddenDifficulty")}</label>` : ""}
  </div>`;
}
function Wt(n) {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-dialog-fields cypherv2-roll-dialog">
    <div class="roll-dialog-layout">
      <section class="roll-dialog-settings" aria-labelledby="cypherv2-roll-settings-heading">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-settings-heading">${game.i18n.localize("CYPHERV2.Roll.Settings")}</span>
          <strong>${et(n.identity)}</strong>
        </header>
        <div class="roll-dialog-settings-grid">${n.settings}</div>
      </section>
      <aside class="roll-dialog-summary" aria-labelledby="cypherv2-roll-summary-heading" aria-live="polite">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-summary-heading">${game.i18n.localize("CYPHERV2.Roll.Summary")}</span>
          <strong data-roll-summary="label">${et(n.identity)}</strong>
          <span data-roll-summary="pool"></span>
        </header>
        <section class="roll-summary-section" data-roll-summary-section="automatic" hidden>
          <h4>${game.i18n.localize("CYPHERV2.Roll.AutomaticModifiers")}</h4>
          <div class="roll-summary-rows" data-roll-summary="automatic"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="modifiers">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Modifiers")}</h4>
          <div class="roll-summary-rows" data-roll-summary="modifiers"></div>
          <div class="roll-summary-total"><span>${game.i18n.localize("CYPHERV2.Roll.NetSteps")}</span><strong data-roll-summary="net">0</strong></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="effort" hidden>
          <h4>${game.i18n.localize("CYPHERV2.Roll.Effort")}</h4>
          <div class="roll-summary-rows" data-roll-summary="effort"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="difficulty">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</h4>
          <div class="roll-summary-rows" data-roll-summary="difficulty"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="attack"${n.attackSummary ? "" : " hidden"}>
          <h4>${game.i18n.localize("CYPHERV2.Combat.Attack")}</h4>
          <div class="roll-summary-rows" data-roll-summary="attack">${n.attackSummary ?? ""}</div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="cost">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Cost")}</h4>
          <div class="roll-summary-rows" data-roll-summary="cost"></div>
        </section>
        <section class="roll-summary-section roll-summary-character">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Character")}</h4>
          <div class="roll-summary-pools" data-roll-summary="character"></div>
        </section>
        <p class="roll-preview-error" data-roll-summary="error"></p>
      </aside>
    </div>
  </div>`;
}
function ee(n, e, t = "") {
  return `<div class="roll-summary-row ${t}"><span>${et(n)}</span><strong>${et(e)}</strong></div>`;
}
function Eo(n) {
  return n.length === 0 ? `<p class="roll-summary-empty">${game.i18n.localize("CYPHERV2.Common.None")}</p>` : n.map((e) => ee(
    e.label,
    e.modifier,
    e.direction === "ease" ? "is-ease" : "is-hindrance"
  )).join("");
}
function qe(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.innerHTML = t);
}
function kt(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.textContent = t);
}
function ic(n, e, t) {
  kt(n, "label", e.rollLabel), kt(n, "pool", e.poolLabel), qe(n, "modifiers", Eo(e.modifiers)), kt(n, "net", e.netModifier ?? game.i18n.localize("CYPHERV2.Roll.HiddenValue"));
  const i = n.querySelector('[data-roll-summary-section="automatic"]');
  i && (i.hidden = e.automaticModifiers.length === 0), qe(n, "automatic", Eo(e.automaticModifiers));
  const o = n.querySelector('[data-roll-summary-section="effort"]');
  o && (o.hidden = e.totalEffortApplied === 0), qe(n, "effort", [
    ee(
      game.i18n.localize("CYPHERV2.Roll.PaidAppliedEffort"),
      `${e.paidEffortApplied} / ${e.effortMaximum}`
    ),
    ee(game.i18n.localize("CYPHERV2.Roll.FreeAppliedEffort"), String(e.freeEffortApplied)),
    ee(
      game.i18n.localize("CYPHERV2.Roll.TotalAppliedEffort"),
      e.totalEffortMaximum === null ? `${e.totalEffortApplied} / ${game.i18n.localize("CYPHERV2.Genre.Unlimited")}` : `${e.totalEffortApplied} / ${e.totalEffortMaximum}`,
      e.totalEffortMaximum !== null && e.totalEffortApplied === e.totalEffortMaximum ? "is-total" : ""
    )
  ].join(""));
  const a = e.difficultyMode === "hidden" ? ee(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.HiddenValue")) : e.difficultyMode === "unknown" ? ee(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.NotProvided")) : [
    ee(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), String(e.baseDifficulty)),
    ee(
      game.i18n.localize("CYPHERV2.Roll.FinalDifficulty"),
      e.automaticSuccess ? game.i18n.localize("CYPHERV2.Roll.AutomaticSuccess") : String(e.finalDifficulty)
    ),
    ee(game.i18n.localize("CYPHERV2.Roll.TargetNumber"), String(e.targetNumber))
  ].join("");
  qe(n, "difficulty", a);
  const r = n.querySelector('[data-roll-summary-section="attack"]');
  r && t !== void 0 && (r.hidden = !t, qe(n, "attack", t));
  const s = [
    ...e.actionCost > 0 ? [ee(game.i18n.localize("CYPHERV2.Roll.ActionCost"), String(e.actionCost))] : [],
    ...e.effortCost > 0 ? [ee(game.i18n.localize("CYPHERV2.Roll.EffortCost"), String(e.effortCost))] : [],
    ...e.edgeApplied > 0 ? [ee(game.i18n.localize("CYPHERV2.Roll.EdgeApplied"), `-${e.edgeApplied}`)] : [],
    ee(game.i18n.localize("CYPHERV2.Roll.TotalCost"), `${e.totalCost} ${e.poolLabel}`, "is-total"),
    ee(game.i18n.localize("CYPHERV2.Roll.PoolAfterRoll"), `${e.poolValue} → ${e.poolAfter}`)
  ];
  qe(n, "cost", s.join(""));
  const l = ["might", "speed", "intellect"].map((u) => {
    const c = e.pool === u ? e.poolAfter : null, p = e.pool === u ? e.poolValue : null, f = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}`], m = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Max`], b = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Edge`];
    return `<div class="roll-summary-pool${e.pool === u ? " is-selected" : ""}">
      <span>${et(Ln(u, Bn))}</span>
      <strong>${p === null ? f : `${p} → ${c}`} / ${m}</strong>
      <small>${game.i18n.localize("CYPHERV2.Pools.Edge")} ${b}</small>
    </div>`;
  }).join("");
  qe(n, "character", `${l}<div class="roll-summary-effort"><span>${game.i18n.localize("CYPHERV2.Character.Effort")}</span><strong>${e.effortUsed} / ${e.effortMaximum}</strong></div>`), kt(n, "error", e.poolValue < e.totalCost ? game.i18n.localize("CYPHERV2.Roll.InsufficientPool") : "");
}
function _t(n, e) {
  for (const i of ["might", "speed", "intellect"]) {
    const o = `pool${i[0].toUpperCase()}${i.slice(1)}`;
    n.dataset[o] = String(e.actor.system.stats[i].value), n.dataset[`${o}Max`] = String(e.actor.system.derived.pools[i].max), n.dataset[`${o}Edge`] = String(e.actor.system.derived.pools[i].edge);
  }
  const t = () => {
    try {
      const i = e.buildRequest(Co(n)), o = game.cypherv2.services.rolls.preview(e.actor, i, e.policyRequest);
      ic(
        n,
        Zl(o, e.actor, Bn),
        e.attackSummary?.(Co(n), o)
      );
    } catch (i) {
      kt(n, "error", i instanceof Error ? i.message : String(i));
    }
  };
  return n.addEventListener("input", t), n.addEventListener("change", t), t(), t;
}
function Ro(n) {
  return {
    label: "CYPHERV2.Roll.TaskRoll",
    pool: ne(n, "pool"),
    difficulty: Ot(n),
    skillSteps: G(n, "skillSteps"),
    assets: G(n, "assets"),
    paidEffort: G(n, "paidEffort"),
    freeEffort: G(n, "freeEffort"),
    ...Bt(n),
    purpose: "task"
  };
}
function nc(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
async function oc(n, e = "might") {
  const t = De(), i = game.cypherv2.rules.resolveDifficultyPolicy(
    t.base,
    t.enabledRuleModuleIds ?? []
  ), o = `
    ${jt(i.difficultyCeiling, Ka())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
      <select name="pool">${tr(e)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}
      <select name="skillSteps">${jn()}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}
      <select name="assets">${de(i.assetLimit)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}
      <select name="paidEffort">${de(n.system.derived.effort.max)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}
      <input name="freeEffort" type="number" value="0" min="0" step="1">
    </label>
    ${Lt()}`, a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Roll.TaskRoll"), resizable: !0 },
    position: { width: 800 },
    content: Wt({
      identity: `${n.name} · ${game.i18n.localize("CYPHERV2.Roll.Task")}`,
      settings: o
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (r, s) => {
      _t(s.element, {
        actor: n,
        policyRequest: t,
        buildRequest: Ro
      });
    }
  });
  if (a)
    try {
      const r = await game.cypherv2.services.rolls.execute(
        n,
        Ro(a),
        t
      );
      await On(n, r);
    } catch (r) {
      nc(r);
    }
}
function Ui(n, e) {
  return n === e ? " selected" : "";
}
function ac(n, e) {
  const t = ne(n, "skillRank");
  return X.includes(t) ? t : e;
}
function Po(n, e, t) {
  const i = ne(e, "pool");
  return game.cypherv2.services.skills.buildRollRequest(n, {
    ...i === "might" || i === "speed" || i === "intellect" ? { pool: i } : {},
    rankOverride: ac(e, n.system.rank),
    difficulty: Ot(e),
    assets: G(e, "assets"),
    paidEffort: G(e, "paidEffort"),
    freeEffort: G(e, "freeEffort"),
    ...Bt(e),
    enabledRuleModuleIds: t
  });
}
async function rc(n, e) {
  const t = De(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = game.cypherv2.services.skills.configuredPool(e) ?? "choose", r = `
    ${a === "choose" ? `<option value="" selected disabled>${game.i18n.localize("CYPHERV2.Skill.ChoosePool")}</option>` : ""}
    <option value="might"${Ui(a, "might")}>${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
    <option value="speed"${Ui(a, "speed")}>${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
    <option value="intellect"${Ui(a, "intellect")}>${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>`, s = X.map((c) => `<option value="${c}"${c === e.system.rank ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${c}`)} · ${rt(c) === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : rt(c) > 0 ? `+${rt(c)}` : rt(c)}</option>`).join(""), l = `
    ${jt(o.difficultyCeiling, Ka())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${r}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillRank">${s}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${de(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${de(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Lt()}`, u = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Skill.Roll")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Wt({ identity: e.name, settings: l }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (c, p) => {
      _t(p.element, {
        actor: n,
        policyRequest: t,
        buildRequest: (f) => Po(e, f, i)
      });
    }
  });
  if (u)
    try {
      const c = Po(e, u, i), p = await game.cypherv2.services.rolls.execute(n, c, t);
      await On(n, p);
    } catch (c) {
      ui.notifications.error(c instanceof Error ? c.message : String(c));
    }
}
function gi(n) {
  const e = n.token, t = n.tokenId ?? e?.id, i = n.tokenUuid ?? e?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...t ? { tokenId: t } : {},
    ...i ? { tokenUuid: i } : {}
  };
}
function Mt(n, e) {
  return Object.assign(Object.create(n), {
    ...e.actorUuid ? { actorUuid: e.actorUuid } : {},
    ...e.tokenId ? { tokenId: e.tokenId } : {},
    ...e.tokenUuid ? { tokenUuid: e.tokenUuid } : {},
    update: n.update.bind(n),
    testUserPermission: n.testUserPermission.bind(n)
  });
}
function ir(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "npc" ? null : Mt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function nr(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "character" ? null : Mt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function un(n) {
  if (n.tokenId) {
    const e = canvas.tokens?.get(n.tokenId)?.actor;
    return e instanceof Actor ? e : null;
  }
  return n.tokenUuid ? null : game.actors.get(n.actorId) ?? null;
}
async function mn(n) {
  if (n.tokenUuid)
    try {
      const e = await fromUuid(n.tokenUuid);
      if (e?.actor instanceof Actor) return e.actor;
    } catch {
    }
  if (n.tokenId) {
    const e = canvas.tokens?.get(n.tokenId)?.actor;
    if (e instanceof Actor) return e;
  }
  return n.tokenId || n.tokenUuid ? null : un(n);
}
function sc(n, e) {
  return String(n[e] ?? "");
}
function or(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function ar(n, e = "manual:0") {
  const t = e.startsWith("manual:") ? Number(e.slice(7)) : null;
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${jn(t, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...or(n).map((i) => `<option value="${i.id}"${i.id === e ? " selected" : ""}>${i.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${i.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function rr(n, e) {
  return or(n).find((t) => t.id === e);
}
function sr(n) {
  const e = ne(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function lc(n, e) {
  const t = e === "dodge";
  return {
    pool: t ? "speed" : "might",
    armorDirection: t ? "hinder" : "ease",
    armorSteps: t ? n.system.derived.combat.armor.dodgeHindrance : n.system.derived.combat.armor.blockEase
  };
}
async function lr(n) {
  if (!n.flatMap((o) => o.execution.result.naturalEffects).find((o) => o.status === "available")) return null;
  const t = n[0]?.execution.result.naturalRoll ?? 19, i = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Combat.NaturalChoice.Title") },
    content: `<div class="cypherv2-dialog-fields">
      <p>${game.i18n.format("CYPHERV2.Combat.NaturalChoice.Prompt", { natural: t })}</p>
      <label>${game.i18n.localize("CYPHERV2.Combat.NaturalChoice.Label")}
        <select name="choice">
          <option value="damage">${game.i18n.localize(t === 19 ? "CYPHERV2.Roll.NaturalEffects.Damage19" : "CYPHERV2.Roll.NaturalEffects.Damage20")}</option>
          <option value="effect">${game.i18n.localize(t === 19 ? "CYPHERV2.Roll.NaturalEffects.Minor" : "CYPHERV2.Roll.NaturalEffects.Major")}</option>
        </select>
      </label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Apply") }
  });
  return i && sc(i, "choice") === "damage" ? "damage" : "effect";
}
async function cc(n, e) {
  const t = De(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = game.cypherv2.services.combat.policy(i), r = game.cypherv2.services.targets.nativeNpcTargets(), l = r.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${r.map((y) => y.name).join(", ")}</span><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : jt(o.difficultyCeiling, !0), u = game.cypherv2.services.combat.weaponAttackPool(e), c = `manual:${rt(e.system.skillLevel ?? "untrained")}`, p = (y) => {
    const w = rr(n, ne(y, "skillId"));
    return {
      pool: ne(y, "pool"),
      targets: r,
      difficulty: Ot(y),
      ...w ? { skill: w } : {},
      skillSteps: sr(y),
      assets: G(y, "assets"),
      paidEffort: G(y, "paidEffort"),
      damageEffort: G(y, "damageEffort"),
      freeDamageEffort: G(y, "freeDamageEffort"),
      freeEffort: G(y, "freeEffort"),
      ...Bt(y),
      extremeRange: ne(y, "extremeRange") === "true" || y.extremeRange === !0 || y.extremeRange === "on",
      enabledRuleModuleIds: i
    };
  }, f = (y) => {
    const w = game.cypherv2.services.combat.buildWeaponAttackPlan(n, e, p(y)).requests[0];
    if (!w) throw new Error("Weapon attack preview did not produce a roll request.");
    return w;
  }, m = game.cypherv2.services.combat.weaponBaseDamage(e, a), b = `
    ${l}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${tr(u)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${ar(n, c)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${de(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${de(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${de(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Lt()}
    ${e.system.attackType === "ranged" ? `<label class="roll-dialog-checkbox"><input name="extremeRange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</label>` : ""}`, g = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Combat.Attack")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Wt({ identity: e.name, settings: b, attackSummary: " " }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Combat.Attack") },
    render: (y, w) => {
      _t(w.element, {
        actor: n,
        policyRequest: t,
        buildRequest: f,
        attackSummary: (A, P) => [
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${m}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${P.context.damageEffort ?? 0}</strong></div>`,
          ...(P.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${P.context.freeDamageEffort}</strong></div>`] : [],
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${P.damageEffortApplied}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${a.damageEffortBonus}</strong></div>`,
          ...e.system.rangeCategory !== "immediate" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${game.i18n.localize(`CYPHERV2.Combat.Range.${e.system.rangeCategory}`)}</strong></div>`] : [],
          ...ne(A, "extremeRange") === "true" || A.extremeRange === !0 ? [`<div class="roll-summary-row is-hindrance"><span>${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</span><strong>-1</strong></div>`] : []
        ].join("")
      });
    }
  });
  if (g)
    try {
      let y = await game.cypherv2.services.combat.executeWeaponAttack(
        n,
        e,
        p(g),
        t
      );
      const w = await lr(y);
      w && (y = game.cypherv2.services.combat.chooseAttackOutcomes(
        y,
        w,
        i
      ));
      for (const P of y)
        await game.cypherv2.services.combatChat.publishWeaponAttack(
          n,
          P,
          Pi(),
          Si()
        );
      const A = y[0];
      A && await Gt().requestFreeFromNaturalResult(n, A.execution.result);
    } catch (y) {
      ui.notifications.error(y instanceof Error ? y.message : String(y));
    }
}
async function pn(n, e, t) {
  if (e === "blockWithShield")
    try {
      const m = await game.cypherv2.services.shields.normalizeEquipped(n);
      if (!m || game.cypherv2.services.shields.isBroken(m))
        return ui.notifications.warn(game.i18n.localize("CYPHERV2.Shield.BlockUnavailable")), !1;
    } catch (m) {
      return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
    }
  const i = De(), o = i.enabledRuleModuleIds ?? [], a = game.cypherv2.rules.resolveDifficultyPolicy(i.base, o), r = t ? `<div class="roll-dialog-context"><strong>${t.source.name} → ${n.name}</strong><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : jt(a.difficultyCeiling, !0), s = game.cypherv2.services.combat.applicableDefenseSkills(
    n,
    e,
    o
  )[0], l = lc(n, e), u = (m) => {
    const b = rr(n, ne(m, "skillId"));
    return {
      ...b ? { skill: b } : {},
      skillSteps: sr(m),
      assets: G(m, "assets"),
      paidEffort: G(m, "paidEffort"),
      freeEffort: G(m, "freeEffort"),
      ...Bt(m),
      enabledRuleModuleIds: o
    };
  }, c = (m) => t ? game.cypherv2.services.combat.buildDefenseAgainstNpcRequest(
    n,
    t.source,
    e,
    u(m)
  ) : game.cypherv2.services.combat.buildDefenseRequest(n, e, {
    ...u(m),
    difficulty: Ot(m)
  }), p = `
    ${r}
    <div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${l.pool === "speed" ? "Speed" : "Might"}`)}</span></div>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${ar(n, s?.id)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${de(a.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${de(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Lt()}`, f = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`), resizable: !0 },
    position: { width: 800 },
    content: Wt({
      identity: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`),
      settings: p
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (m, b) => {
      _t(b.element, { actor: n, policyRequest: i, buildRequest: c });
    }
  });
  if (!f) return !1;
  try {
    const m = c(f), b = await game.cypherv2.services.rolls.execute(n, m, i), y = (t ? await game.cypherv2.services.combat.resolveDefenseWound(
      n,
      b.result,
      e,
      t.woundSeverity,
      t.source,
      o
    ) : null) ?? {
      recipient: "none",
      severity: "none"
    };
    return await game.cypherv2.services.combatChat.publishDefense(
      n,
      b,
      y,
      t?.source ?? null,
      Pi(),
      Si()
    ), await Gt().requestFreeFromNaturalResult(n, b.result), !0;
  } catch (m) {
    return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
  }
}
async function dc(n) {
  if (!game.user.isGM) return;
  const e = [...game.user.targets ?? []].map((i) => nr(i)).filter((i) => i !== null).map((i) => i);
  if (e.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.NoCharacterTargets"));
    return;
  }
  const t = [];
  if (n.system.damage.defense.allowBlock && t.push("block"), n.system.damage.defense.allowDodge && t.push("dodge"), t.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.NoDefenseAllowed"));
    return;
  }
  for (const i of e)
    await game.cypherv2.services.combatChat.createDefenseRequest(
      n,
      i,
      n.system.damage.woundSeverity,
      t
    );
}
async function yi(n) {
  try {
    const e = await game.cypherv2.services.depletion.roll(n);
    await game.cypherv2.services.depletionChat.publish(n, e);
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
const So = 2, ko = 1e3;
function xt(n) {
  const e = String(n.die).trim().match(/^d(\d+)$/i), t = Number(e?.[1]);
  if (!Number.isInteger(t) || t < So || t > ko)
    throw new Error(`Depletion die must have ${So} to ${ko} sides.`);
  return t;
}
function uc(n) {
  return `1d${xt(n)}`;
}
function qi(n) {
  const e = xt(n), t = Number(n.threshold);
  if (!Number.isInteger(t) || t < 1 || t > e)
    throw new Error(`Depletion threshold must be between 1 and ${e}.`);
  return `${cr(t)} in 1d${e}`;
}
function cr(n) {
  return n === 1 ? "1" : `1-${n}`;
}
function mc(n) {
  const e = [...n.querySelectorAll(
    ".cypherv2-sheet.cypherv2-character > .tab[data-tab]"
  )], t = e.find((o) => o.classList.contains("active")), i = [...n.querySelectorAll(
    "details[data-persistent-disclosure]"
  )];
  return {
    activeTab: t?.dataset.tab ?? "skills",
    tabScroll: Object.fromEntries(e.map((o) => [o.dataset.tab ?? "", o.scrollTop])),
    disclosures: Object.fromEntries(i.map((o) => [
      o.dataset.persistentDisclosure ?? "",
      o.open
    ]))
  };
}
function pc(n, e) {
  for (const t of n.querySelectorAll(
    ".cypherv2-sheet.cypherv2-character > .tab[data-tab]"
  ))
    t.scrollTop = e.tabScroll[t.dataset.tab ?? ""] ?? 0;
  for (const t of n.querySelectorAll(
    "details[data-persistent-disclosure]"
  )) {
    const i = t.dataset.persistentDisclosure ?? "";
    Object.hasOwn(e.disclosures, i) && (t.open = e.disclosures[i] ?? !1);
  }
}
function fc(n) {
  return n.replace(/[&<>'"]/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[e]);
}
async function dr(n, e) {
  const t = n.system.graph.nodes.find((r) => r.id === e);
  if (!t) throw new Error(`Focus node '${e}' was not found.`);
  if (t.abilityUuid)
    try {
      const r = await fromUuid(t.abilityUuid);
      if (r?.sheet) {
        await r.sheet.render(!0);
        return;
      }
    } catch {
    }
  const i = t.abilitySnapshot.name || t.id, o = fc(i), a = t.abilitySnapshot.description || game.i18n.localize("CYPHERV2.Focus.MissingAbility");
  await foundry.applications.api.DialogV2.input({
    window: { title: i },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-focus-snapshot"><h3>${o}</h3><div>${a}</div></div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Close") }
  });
}
function Ao(n, e) {
  return {
    left: n.left - e.left,
    top: n.top - e.top,
    width: n.width,
    height: n.height
  };
}
function hc(n, e) {
  const t = {
    x: n.left + n.width / 2,
    y: n.top + n.height / 2
  }, i = {
    x: e.left + e.width / 2,
    y: e.top + e.height / 2
  }, o = i.x - t.x, a = i.y - t.y;
  if (o === 0 && a === 0) return {
    x1: t.x,
    y1: t.y,
    x2: i.x,
    y2: i.y
  };
  const r = (u) => Math.min(
    o === 0 ? Number.POSITIVE_INFINITY : u.width / 2 / Math.abs(o),
    a === 0 ? Number.POSITIVE_INFINITY : u.height / 2 / Math.abs(a)
  ), s = r(n), l = r(e);
  return {
    x1: t.x + o * s,
    y1: t.y + a * s,
    x2: i.x - o * l,
    y2: i.y - a * l
  };
}
function gc(n) {
  const e = n.querySelector(".focus-tree-canvas"), t = e?.querySelector(".focus-tree-connections");
  if (!e || !t) return;
  const i = e.getBoundingClientRect(), o = i.width, a = i.height;
  if (o <= 0 || a <= 0) return;
  t.setAttribute("width", String(o)), t.setAttribute("height", String(a)), t.setAttribute("viewBox", `0 0 ${o} ${a}`);
  const r = /* @__PURE__ */ new Map();
  for (const s of e.querySelectorAll(".focus-tree-node[data-node-id]")) {
    const l = s.dataset.nodeId;
    l && r.set(l, s);
  }
  for (const s of t.querySelectorAll("line[data-from][data-to]")) {
    const l = r.get(s.dataset.from ?? ""), u = r.get(s.dataset.to ?? "");
    if (!l || !u) continue;
    const c = hc(
      Ao(l.getBoundingClientRect(), i),
      Ao(u.getBoundingClientRect(), i)
    );
    s.setAttribute("x1", String(c.x1)), s.setAttribute("y1", String(c.y1)), s.setAttribute("x2", String(c.x2)), s.setAttribute("y2", String(c.y2));
  }
}
class ur {
  #e = null;
  #t = null;
  #i = [];
  bind(e) {
    if (this.disconnect(), this.#i = [...e.querySelectorAll(".cypherv2-focus-tree-section")], this.#i.length !== 0) {
      this.#e = new ResizeObserver(() => this.scheduleRefresh());
      for (const t of this.#i) {
        this.#e.observe(t);
        for (const i of t.querySelectorAll(
          ".focus-tree-scroll, .focus-tree-canvas, .focus-tree-node"
        )) this.#e.observe(i);
      }
      this.scheduleRefresh();
    }
  }
  /** Public refresh point for future node movement and editor interactions. */
  refresh() {
    for (const e of this.#i) gc(e);
  }
  scheduleRefresh() {
    this.#t === null && (this.#t = requestAnimationFrame(() => {
      this.#t = null, this.refresh();
    }));
  }
  disconnect() {
    this.#e?.disconnect(), this.#e = null, this.#t !== null && cancelAnimationFrame(this.#t), this.#t = null, this.#i = [];
  }
}
function yc(n, e, t, i = 8) {
  const o = n.right + i, a = o + e.width <= t.width - i ? o : n.left - e.width - i;
  return {
    left: Math.max(i, Math.min(a, t.width - e.width - i)),
    top: Math.max(i, Math.min(n.top, t.height - e.height - i))
  };
}
class mr {
  #e = null;
  #t = null;
  #i = null;
  bind(e) {
    this.disconnect();
    const t = new AbortController();
    this.#e = t;
    const i = (a) => {
      const r = a.target;
      if (!(r instanceof Element)) return;
      const s = r.closest("[data-cypherv2-tooltip]");
      !s || !e.contains(s) || this.#n(s);
    }, o = (a) => {
      if (!(a instanceof PointerEvent) || !this.#i) return;
      const r = a.relatedTarget;
      r instanceof Node && this.#i.contains(r) || this.hide();
    };
    e.addEventListener("pointerover", i, { signal: t.signal }), e.addEventListener("pointerout", o, { signal: t.signal }), e.addEventListener("focusin", i, { signal: t.signal }), e.addEventListener("focusout", () => this.hide(), { signal: t.signal }), e.addEventListener("scroll", () => this.hide(), { capture: !0, signal: t.signal }), e.addEventListener("click", () => this.hide(), { signal: t.signal }), e.ownerDocument.addEventListener("visibilitychange", () => this.hide(), {
      signal: t.signal
    }), e.ownerDocument.defaultView?.addEventListener("blur", () => this.hide(), {
      signal: t.signal
    });
  }
  hide() {
    this.#t?.remove(), this.#t = null, this.#i = null;
  }
  disconnect() {
    this.#e?.abort(), this.#e = null, this.hide();
  }
  #n(e) {
    if (this.#i === e && this.#t) return;
    this.hide();
    const t = e.parentElement?.querySelector(
      ":scope > .cypherv2-tooltip-template"
    );
    if (!t) return;
    const i = e.ownerDocument.createElement("div");
    i.className = "cypherv2-system-tooltip", i.id = e.getAttribute("aria-describedby") ?? `cypherv2-tooltip-${crypto.randomUUID()}`, i.role = "tooltip", i.append(t.content.cloneNode(!0)), e.ownerDocument.body.append(i);
    const o = e.getBoundingClientRect(), a = i.getBoundingClientRect(), r = e.ownerDocument.defaultView, s = yc(o, a, {
      width: r?.innerWidth ?? e.ownerDocument.documentElement.clientWidth,
      height: r?.innerHeight ?? e.ownerDocument.documentElement.clientHeight
    });
    i.style.left = `${s.left}px`, i.style.top = `${s.top}px`, this.#i = e, this.#t = i;
  }
}
class ft extends Error {
  diagnostics;
  constructor(e) {
    super(e.map((t) => t.message).join("; ")), this.name = "FocusGraphValidationError", this.diagnostics = e;
  }
}
function bc(n, e) {
  const t = /* @__PURE__ */ new Map();
  for (const s of e) t.set(s, []);
  for (const s of n.connections)
    s.from !== s.to && t.get(s.from)?.push(s.to);
  const i = /* @__PURE__ */ new Map(), o = [], a = /* @__PURE__ */ new Set(), r = (s) => {
    const l = i.get(s);
    if (l !== void 0) return o.length - l > 2;
    if (a.has(s)) return !1;
    i.set(s, o.length), o.push(s);
    for (const u of t.get(s) ?? []) if (r(u)) return !0;
    return o.pop(), i.delete(s), a.add(s), !1;
  };
  return [...e].some((s) => r(s));
}
function fn(n) {
  const e = [];
  (!Number.isInteger(n.version) || n.version < 1) && e.push({ severity: "error", code: "invalid-version", message: "Focus graph version must be at least 1." });
  const t = /* @__PURE__ */ new Set();
  for (const a of n.nodes) {
    if (!a.id.trim()) {
      e.push({ severity: "error", code: "blank-node-id", message: "Focus node IDs cannot be blank." });
      continue;
    }
    t.has(a.id) && e.push({ severity: "error", code: "duplicate-node-id", nodeId: a.id, message: `Duplicate Focus node ID '${a.id}'.` }), t.add(a.id), (!Number.isInteger(a.tier) || a.tier < 1 || a.tier > 6) && e.push({ severity: "error", code: "invalid-tier", nodeId: a.id, message: `Focus node '${a.id}' must use a Tier from 1 to 6.` });
    for (const [r, s] of Object.entries(a.position ?? {}))
      s !== null && !Number.isFinite(s) && e.push({ severity: "error", code: "invalid-position", nodeId: a.id, message: `Focus node '${a.id}' has an invalid ${r} position.` });
  }
  const i = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
  for (const a of n.connections) {
    (!a.id.trim() || i.has(a.id)) && e.push({ severity: "error", code: "duplicate-connection-id", connectionId: a.id, message: `Duplicate or blank Focus connection ID '${a.id}'.` }), i.add(a.id);
    const r = `${a.from}\0${a.to}`;
    o.has(r) && e.push({ severity: "error", code: "duplicate-connection", connectionId: a.id, message: `Duplicate Focus connection '${a.from}' -> '${a.to}'.` }), o.add(r), (!t.has(a.from) || !t.has(a.to)) && e.push({ severity: "error", code: "missing-connection-node", connectionId: a.id, message: `Focus connection '${a.id}' references a missing node.` }), a.from === a.to && e.push({ severity: "error", code: "self-connection", connectionId: a.id, message: `Focus connection '${a.id}' cannot target itself.` });
  }
  return !e.some((a) => a.severity === "error") && bc(n, t) && e.push({
    severity: "warning",
    code: "directed-cycle",
    message: "Focus graph contains a directed cycle; evaluation remains direct and deterministic."
  }), e;
}
function vc(n) {
  const e = fn(n), t = e.filter((i) => i.severity === "error");
  if (t.length > 0) throw new ft(t);
  return e;
}
class Wn {
  evaluate(e, t) {
    if (!Number.isInteger(t.tier) || t.tier < 1)
      throw new Error("Character Tier must be an integer of at least 1.");
    const i = [...vc(e)], o = new Set(e.nodes.map((c) => c.id)), a = new Set(t.ownedNodeIds);
    for (const c of a)
      o.has(c) || i.push({
        severity: "warning",
        code: "unknown-owned-node",
        nodeId: c,
        message: `Focus progression references unknown node '${c}'.`
      });
    const r = /* @__PURE__ */ new Map();
    for (const c of e.nodes) r.set(c.id, []);
    for (const c of e.connections)
      r.get(c.to).push(c.from);
    const s = new Set(e.nodes.filter((c) => c.tier === 1 && a.has(c.id)).map((c) => c.id));
    let l = !0;
    for (; l; ) {
      l = !1;
      for (const c of e.connections)
        s.has(c.from) && a.has(c.to) && !s.has(c.to) && (s.add(c.to), l = !0);
    }
    for (const c of e.nodes)
      c.tier > 1 && a.has(c.id) && !s.has(c.id) && i.push({
        severity: "warning",
        code: "invalid-owned-progression",
        nodeId: c.id,
        message: `Owned node '${c.abilitySnapshot.name || c.id}' is no longer connected to an owned Tier 1 path.`
      });
    const u = e.nodes.map((c) => {
      const p = [...new Set((r.get(c.id) ?? []).filter((f) => s.has(f)))].sort((f, m) => f.localeCompare(m));
      return a.has(c.id) ? {
        node: c,
        state: "owned",
        reason: "owned",
        requiredTier: c.tier,
        reachableFrom: p
      } : c.tier === 1 ? {
        node: c,
        state: "available",
        reason: "tier-one-choice",
        requiredTier: c.tier,
        reachableFrom: []
      } : p.length > 0 && c.tier > t.tier ? {
        node: c,
        state: "future",
        reason: "tier-too-low",
        requiredTier: c.tier,
        reachableFrom: p
      } : p.length > 0 ? {
        node: c,
        state: "available",
        reason: "connected-from-owned",
        requiredTier: c.tier,
        reachableFrom: p
      } : {
        node: c,
        state: "locked",
        reason: "no-owned-prerequisite",
        requiredTier: c.tier,
        reachableFrom: []
      };
    }).sort((c, p) => c.node.tier - p.node.tier || c.node.id.localeCompare(p.node.id));
    return {
      characterTier: t.tier,
      ownedNodeIds: [...a].sort((c, p) => c.localeCompare(p)),
      nodes: u,
      diagnostics: i
    };
  }
  evaluateProgress(e, t, i) {
    return this.evaluate(e, { tier: t, ownedNodeIds: i.ownedNodeIds });
  }
  evaluateCharacterFocus(e, t, i) {
    const o = t.focusProgress.find((a) => a.focusUuid === i);
    return this.evaluate(e, {
      tier: t.tier,
      ownedNodeIds: o?.ownedNodeIds ?? []
    });
  }
  invalidOwnedNodeIds(e, t, i) {
    return this.evaluate(e, { tier: t, ownedNodeIds: i }).diagnostics.filter((o) => o.code === "invalid-owned-progression" && o.nodeId).map((o) => o.nodeId);
  }
}
class Ne extends Error {
  constructor() {
    super("Grant conflict resolution was cancelled."), this.name = "GrantConflictCancelledError";
  }
}
function pr(n, e) {
  return `${n}:${String(e ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}
function be(n, e, t = "") {
  return { type: n, contentUuid: t, contentKey: pr(n, e) };
}
function wc(n) {
  if (n.type !== "ability" && n.type !== "skill") return null;
  const e = n.system.grantedBy ?? {};
  return {
    type: n.type,
    contentUuid: String(e.contentUuid ?? ""),
    contentKey: String(e.contentKey || pr(n.type, n.name))
  };
}
function Cc(n, e) {
  return n.type !== e.type ? !1 : n.contentUuid && e.contentUuid ? n.contentUuid === e.contentUuid : n.contentKey === e.contentKey;
}
function fr(n, e) {
  return !!ki(n, e);
}
function ki(n, e) {
  return [...n].find((t) => {
    const i = wc(t);
    return i ? Cc(i, e) : !1;
  }) ?? null;
}
class oe extends Error {
  code;
  dependentNodeIds;
  constructor(e, t, i = []) {
    super(t), this.name = "FocusAcquisitionError", this.code = e, this.dependentNodeIds = i;
  }
}
const Ec = async (n) => {
  if (!n) return null;
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "ability" ? t : null;
  } catch {
    return null;
  }
};
function ei(n, e) {
  return n.focusUuid === e.uuid || n.focusUuid === e.id;
}
function Ho(n, e, t) {
  return n.type === "ability" && n.system.sourceFocusUuid === e && n.system.sourceNodeId === t;
}
function Gi(n, e) {
  const t = `${n}\0${e}`;
  let i = 2166136261, o = 2654435769;
  for (let a = 0; a < t.length; a += 1) {
    const r = t.charCodeAt(a);
    i = Math.imul(i ^ r, 16777619) >>> 0, o = Math.imul(o ^ r + a, 2246822507) >>> 0;
  }
  return `${i.toString(16).padStart(8, "0")}${o.toString(16).padStart(8, "0")}`;
}
class Rc {
  #e;
  #t;
  #i;
  #n = /* @__PURE__ */ new Map();
  constructor(e = new Wn(), t = Ec, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  missingOwnedNodeIds(e, t, i) {
    const o = [...e.items];
    return new Set(i.ownedNodeIds.filter((a) => !o.some((r) => Ho(r, t.uuid, a))));
  }
  async acquire(e, t, i, o) {
    return this.#w(this.#v(e), () => this.#o(e, t, i, !1, !0, o));
  }
  /** Character-facing permissive acquisition. Pending choices remain untouched. */
  async acquireManual(e, t, i, o) {
    return this.#w(this.#v(e), () => this.#o(e, t, i, !1, !1, o));
  }
  /** Explicit GM-only sheet action; callers must enforce GM authorization. */
  async acquireWithGmOverride(e, t, i) {
    return this.#w(this.#v(e), () => this.#o(e, t, i, !0, !1));
  }
  /** GM repair/import action. It intentionally bypasses both eligibility and choices. */
  async markOwnedWithGmOverride(e, t, i) {
    return this.#w(this.#v(e), () => this.#r(e, t, i));
  }
  async undo(e, t, i, o = {}) {
    return this.#w(this.#v(e), () => this.#a(e, t, i, o));
  }
  hasEmbeddedAbility(e, t, i) {
    return !!this.#d(e, t, i);
  }
  async restoreAbility(e, t, i) {
    return this.#w(this.#v(e), () => this.#l(e, t, i));
  }
  async #o(e, t, i, o, a, r) {
    this.#m(e);
    const s = this.#y(t, i), l = this.#f(e, t);
    if (l.ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let u;
    try {
      u = this.#e.evaluateProgress(t.system.graph, O(e.system), l).nodes.find((y) => y.node.id === i);
    } catch (y) {
      if (!(y instanceof ft)) throw y;
    }
    const c = e.system.advancement.pendingFocusChoices.find((y) => y.focusUuid === "" || y.focusUuid === t.uuid || y.focusUuid === t.id), p = a && !o && u?.state === "available" && !!c;
    let f = !1, m = !1, b = null;
    if (!this.#d(e, t.uuid, i)) {
      const y = await this.#s(t, s);
      if (!this.#d(e, t.uuid, i)) {
        const w = this.#b(e, t, s, y);
        if (w) {
          if (!r)
            throw new oe(
              "duplicate-grant",
              `Focus node '${i}' grants an Ability already present on this Character; choose a replacement with the GM.`
            );
          const A = await r(w);
          if (A.action === "cancel") throw new Ne();
          if (A.action !== "gmOverride")
            throw new oe(
              "duplicate-grant",
              "A Focus node cannot be replaced by an arbitrary Ability. Choose another valid node or use an explicit GM Override."
            );
          m = !0;
        } else
          b = await this.#p(e, t, i, y), f = !!b;
      }
    }
    if (!this.#f(e, t).ownedNodeIds.includes(i)) {
      const y = e.system.focusProgress.map((w) => ei(w, t) ? {
        ...w,
        ownedNodeIds: [...w.ownedNodeIds, i],
        acquisitions: [
          ...w.acquisitions ?? [],
          this.#u(
            i,
            o || m ? "gmOverride" : p ? "choice" : "manualOverride",
            p ? c : null
          )
        ]
      } : { ...w, ownedNodeIds: [...w.ownedNodeIds], acquisitions: [...w.acquisitions ?? []] });
      try {
        await e.update({
          "system.focusProgress": y,
          ...p && !m && c ? {
            "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((w) => w.id !== c.id)
          } : {}
        });
      } catch (w) {
        throw b?.delete && await b.delete(), w;
      }
    }
    return { status: "acquired", abilityCreated: f };
  }
  async #r(e, t, i) {
    this.#m(e);
    const o = this.#y(t, i);
    if (this.#f(e, t).ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let r = null;
    if (!this.#d(e, t.uuid, i)) {
      const l = await this.#s(t, o);
      this.#d(e, t.uuid, i) || (r = await this.#p(e, t, i, l));
    }
    const s = e.system.focusProgress.map((l) => ei(l, t) ? {
      ...l,
      ownedNodeIds: [...l.ownedNodeIds, i],
      acquisitions: [
        ...l.acquisitions ?? [],
        this.#u(i, "gmManual", null)
      ]
    } : { ...l, ownedNodeIds: [...l.ownedNodeIds], acquisitions: [...l.acquisitions ?? []] });
    try {
      await e.update({ "system.focusProgress": s });
    } catch (l) {
      throw r?.delete && await r.delete(), l;
    }
    return { status: "acquired", abilityCreated: !!r };
  }
  async #a(e, t, i, o) {
    this.#m(e), this.#y(t, i);
    const a = this.#f(e, t);
    if (!a.ownedNodeIds.includes(i))
      throw new oe("undo-not-owned", `Focus node '${i}' is not owned.`);
    const r = a.ownedNodeIds.filter((g) => g !== i), s = new Set(this.#c(
      t,
      O(e.system),
      a.ownedNodeIds
    )), l = this.#c(t, O(e.system), r), u = l.filter((g) => !s.has(g));
    if (u.length > 0 && !o.force)
      throw new oe(
        "undo-dependent-nodes",
        `Undo would invalidate acquired descendant nodes: ${u.join(", ")}.`,
        u
      );
    const c = (a.acquisitions ?? []).find((g) => g.nodeId === i), p = c && c.choiceSource !== "none" && c.choiceId ? {
      id: c.choiceId,
      source: c.choiceSource,
      grantTier: c.choiceGrantTier,
      focusUuid: c.choiceFocusUuid
    } : null, f = e.system.focusProgress.map((g) => ei(g, t) ? {
      ...g,
      ownedNodeIds: r,
      acquisitions: (g.acquisitions ?? []).filter((y) => y.nodeId !== i)
    } : { ...g, ownedNodeIds: [...g.ownedNodeIds], acquisitions: [...g.acquisitions ?? []] }), m = p && !e.system.advancement.pendingFocusChoices.some((g) => g.id === p.id) ? [...e.system.advancement.pendingFocusChoices, p] : [...e.system.advancement.pendingFocusChoices];
    await e.update({
      "system.focusProgress": f,
      "system.advancement.pendingFocusChoices": m
    });
    let b = !1;
    if (o.deleteAbility) {
      const g = this.#d(e, t.uuid, i);
      g?.delete && (await g.delete(), b = !0);
    }
    return { choiceRestored: p, abilityDeleted: b, invalidOwnedNodeIds: l };
  }
  #c(e, t, i) {
    try {
      return this.#e.invalidOwnedNodeIds(e.system.graph, t, i);
    } catch (o) {
      if (o instanceof ft) return [];
      throw o;
    }
  }
  async #l(e, t, i) {
    this.#m(e);
    const o = this.#y(t, i);
    if (!this.#f(e, t).ownedNodeIds.includes(i))
      throw new oe(
        "restore-not-owned",
        `Focus node '${i}' is not owned and cannot be restored.`
      );
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const r = await this.#s(t, o);
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const s = !!await this.#p(e, t, i, r);
    return {
      status: s ? "restored" : "already-present",
      abilityCreated: s
    };
  }
  async #s(e, t) {
    const i = await this.#t(t.abilityUuid);
    if (i?.type === "ability" && i.name.trim()) {
      const a = i.toObject?.() ?? {}, r = a.system && typeof a.system == "object" ? a.system : i.system;
      return {
        _id: Gi(e.uuid, t.id),
        name: i.name,
        type: "ability",
        ...typeof i.img == "string" ? { img: i.img } : {},
        system: {
          ...structuredClone(r),
          sourceFocusUuid: e.uuid,
          sourceNodeId: t.id,
          grantedBy: { kind: "focus", sourceUuid: e.uuid, instanceId: e.uuid, grantId: t.id, status: "active", contentUuid: t.abilityUuid, contentKey: `ability:${i.name.trim().toLocaleLowerCase()}` }
        }
      };
    }
    const o = t.abilitySnapshot.name.trim();
    if (!o)
      throw new oe(
        "ability-data-unavailable",
        `Focus node '${t.id}' has neither a valid source Ability nor a usable snapshot.`
      );
    return {
      _id: Gi(e.uuid, t.id),
      name: o,
      type: "ability",
      system: {
        tier: t.tier,
        description: t.abilitySnapshot.description ?? "",
        sourceFocusUuid: e.uuid,
        sourceNodeId: t.id,
        grantedBy: { kind: "focus", sourceUuid: e.uuid, instanceId: e.uuid, grantId: t.id, status: "active", contentUuid: t.abilityUuid, contentKey: `ability:${o.toLocaleLowerCase()}` }
      }
    };
  }
  #d(e, t, i) {
    return [...e.items].find((o) => Ho(o, t, i)) ?? null;
  }
  #u(e, t, i) {
    return {
      nodeId: e,
      mode: t,
      choiceId: i?.id ?? "",
      choiceSource: i?.source ?? "none",
      choiceGrantTier: i?.grantTier ?? 1,
      choiceFocusUuid: i?.focusUuid ?? "",
      acquiredAt: this.#i()
    };
  }
  #b(e, t, i, o) {
    const r = (o.system ?? {}).grantedBy ?? {}, s = be("ability", String(o.name ?? i.abilitySnapshot.name), String(r.contentUuid ?? i.abilityUuid)), l = ki(e.items, s);
    if (!l) return null;
    const c = (l.system ?? {}).grantedBy ?? {}, p = be("ability", l.name ?? "", String(c.contentUuid ?? ""));
    return {
      id: `${t.uuid}:${i.id}`,
      type: "ability",
      packageName: t.name,
      packageSourceUuid: t.uuid,
      grantId: i.id,
      existing: {
        id: String(l.id ?? p.contentKey),
        name: String(l.name ?? ""),
        type: "ability",
        rank: "",
        contentUuid: String(c.contentUuid ?? p.contentUuid),
        contentKey: String(c.contentKey ?? p.contentKey)
      },
      proposed: {
        id: Gi(t.uuid, i.id),
        name: String(o.name ?? i.abilitySnapshot.name),
        type: "ability",
        rank: "",
        contentUuid: s.contentUuid,
        contentKey: s.contentKey
      },
      suggestions: [],
      allowCustom: !1,
      allowSuppress: !1,
      allowGmOverride: !0,
      context: "focus"
    };
  }
  async #p(e, t, i, o) {
    const r = (o.system ?? {}).grantedBy ?? {};
    if (fr(e.items, {
      type: "ability",
      contentUuid: String(r.contentUuid ?? ""),
      contentKey: String(r.contentKey ?? `ability:${String(o.name ?? "").trim().toLocaleLowerCase()}`)
    }))
      throw new oe(
        "duplicate-grant",
        `Focus node '${i}' grants an Ability already present on this Character; choose a replacement with the GM.`
      );
    try {
      return (await e.createEmbeddedDocuments("Item", [o], { keepId: !0 }))[0] ?? null;
    } catch (s) {
      if (this.#d(e, t.uuid, i)) return null;
      throw s;
    }
  }
  #f(e, t) {
    const i = e.system.focusProgress.filter((o) => ei(o, t));
    if (i.length === 0)
      throw new oe(
        "progress-missing",
        `Character has no progression entry for Focus '${t.uuid}'.`
      );
    if (i.length > 1)
      throw new oe(
        "progress-duplicated",
        `Character has duplicate progression entries for Focus '${t.uuid}'.`
      );
    return i[0];
  }
  #y(e, t) {
    const i = e.system.graph.nodes.find((o) => o.id === t);
    if (!i)
      throw new oe("node-not-found", `Focus node '${t}' was not found.`);
    return i;
  }
  #m(e) {
    if (e.type !== "character")
      throw new oe("not-character", "Focus acquisition requires a Character.");
  }
  #v(e) {
    return e.uuid;
  }
  async #w(e, t) {
    const o = (this.#n.get(e) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#n.set(e, o);
    try {
      return await o;
    } finally {
      this.#n.get(e) === o && this.#n.delete(e);
    }
  }
}
class W extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "AdvancementError";
  }
  code;
}
const Pc = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
}, Sc = () => globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function kc(n) {
  return n.system.category === "attack" || n.system.category === "defense" || n.system.contexts.some((e) => e === "attack" || e.startsWith("attack.") || e === "defense" || e.startsWith("defense."));
}
function Ac(n) {
  return n === "inability" ? "untrained" : n === "untrained" ? "trained" : n === "trained" ? "specialized" : null;
}
function $o(n) {
  return [...new Set(n)];
}
class Hc {
  #e;
  #t;
  #i;
  #n;
  #o = /* @__PURE__ */ new Map();
  constructor(e, t = Sc, i = Date.now, o = Pc) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  policy(e = []) {
    return this.#e.resolveAdvancementPolicy(Va, e);
  }
  view(e, t = []) {
    const i = this.policy(t), o = e.system.advancement.purchases, a = o.length >= i.purchasesPerTier;
    return {
      policy: i,
      purchasedCount: o.length,
      remainingCount: Math.max(0, i.purchasesPerTier - o.length),
      canAdvanceTier: o.length === i.purchasesPerTier,
      options: $n.map((r) => {
        const s = o.some((u) => u.kind === r), l = r === "extraEffort" ? this.#s(e) < i.effortMaximum : !0;
        return { kind: r, purchased: s, available: !a && !s && l };
      }),
      other: {
        purchased: o.some((r) => r.kind === "other"),
        available: !a && !o.some((r) => r.kind === "other")
      }
    };
  }
  progressionGuidance(e, t = []) {
    const i = O(e.system);
    return {
      tier: i,
      completed: (e.system.advancement.guidanceCompletedTiers ?? []).includes(i),
      focusAbilityCount: i === 1 ? 2 : 1,
      includesGenreAbility: this.policy(t).genreChoiceForTier(i)
    };
  }
  async completeProgressionGuidance(e) {
    return this.#u(e, async () => {
      this.#l(e);
      const t = new Set(e.system.advancement.guidanceCompletedTiers ?? []);
      t.add(O(e.system)), await e.update({
        "system.advancement.guidanceCompletedTiers": [...t].sort((i, o) => i - o)
      });
    });
  }
  async resetProgressionGuidance(e) {
    return this.#u(e, async () => {
      this.#l(e), await e.update({
        "system.advancement.guidanceCompletedTiers": (e.system.advancement.guidanceCompletedTiers ?? []).filter((t) => t !== O(e.system))
      });
    });
  }
  skillTrainingOptions(e, t = []) {
    const i = this.policy(t);
    return [...e.items].filter((o) => o.type === "skill" && X.includes(o.system.rank)).map((o) => {
      const a = Ac(o.system.rank), r = a === "trained" ? i.attackDefenseTrainingTier : a === "specialized" ? i.attackDefenseSpecializationTier : 0, s = !!(a && kc(o) && O(e.system) < r);
      return {
        id: o.id,
        name: o.name,
        currentRank: o.system.rank,
        nextRank: a,
        eligible: !!(a && !s),
        reason: a ? s ? "tier" : "eligible" : "maximum",
        abilityLinked: !!o.system.acquisition?.grantedByUuid
      };
    }).sort((o, a) => o.name.localeCompare(a.name));
  }
  async purchase(e, t, i = []) {
    return this.#u(e, () => this.#r(e, t, i, !1));
  }
  /** Explicit integration point for GM tooling; Core slot and benefit validation still applies. */
  async purchaseWithGmOverride(e, t, i = []) {
    return this.#u(e, () => this.#r(e, t, i, !0));
  }
  async advanceTier(e, t = []) {
    return this.#u(e, async () => {
      this.#l(e);
      const i = this.policy(t);
      if (e.system.advancement.purchases.length !== i.purchasesPerTier)
        throw new W("tier-not-ready", "Four Advancements are required before advancing Tier.");
      const o = Xt(e.system, "tier", 1), a = o.value, r = {
        id: this.#t(),
        source: "newTier",
        grantTier: a,
        focusUuid: ""
      }, s = i.genreChoiceForTier(a) ? {
        id: this.#t(),
        source: "newTier",
        grantTier: a
      } : null;
      return await e.update({
        [o.path]: a,
        "system.advancement.cycle": e.system.advancement.cycle + 1,
        "system.advancement.purchases": [],
        "system.advancement.pendingFocusChoices": [
          ...e.system.advancement.pendingFocusChoices,
          r
        ],
        ...s ? {
          "system.advancement.pendingGenreChoices": [
            ...e.system.advancement.pendingGenreChoices,
            s
          ]
        } : {}
      }), { tier: a, focusChoice: r, genreChoice: s };
    });
  }
  async #r(e, t, i, o) {
    this.#l(e);
    const a = this.policy(i), r = e.system.advancement.purchases;
    if (r.length >= a.purchasesPerTier)
      throw new W("cycle-complete", "This advancement cycle is complete.");
    if (t.kind === "other") {
      if (r.some((g) => g.kind === "other"))
        throw new W("other-already-purchased", "Other Advancement is unique per cycle.");
    } else if (r.some((g) => g.kind === t.kind))
      throw new W("already-purchased", "That Advancement was already purchased this cycle.");
    const s = o ? 0 : a.xpCost;
    if (e.system.xp < s)
      throw new W("insufficient-xp", "This Character does not have enough XP.");
    const l = O(e.system), u = a.resourcePointsForTier(l);
    if (!Number.isInteger(u) || u < 0)
      throw new Error("Advancement policy Resource Points must be a non-negative integer.");
    const c = {};
    let p = null, f = null, m;
    if (t.kind === "increaseCapabilities") {
      const g = Object.values(t.allocation);
      if (g.some((y) => !Number.isInteger(y) || y < 0) || g.reduce((y, w) => y + w, 0) !== a.capabilityPoints)
        throw new W("invalid-allocation", "Pool allocation must distribute exactly four points.");
      for (const y of ["might", "speed", "intellect"]) {
        const w = t.allocation[y], A = Xt(
          e.system,
          `${y}Max`,
          w
        );
        c[A.path] = A.value;
        const P = A.overrideActive ? A.value : e.system.derived.pools[y].max + w;
        c[`system.stats.${y}.value`] = Math.min(
          e.system.stats[y].value + w,
          P
        );
      }
    } else if (t.kind === "moveTowardPerfection") {
      const g = Xt(
        e.system,
        `${t.pool}Edge`,
        1
      );
      c[g.path] = g.value;
    } else if (t.kind === "extraEffort") {
      if (this.#s(e) >= a.effortMaximum)
        throw new W("effort-maximum", "Core Effort is already at its maximum.");
      const g = Xt(e.system, "effort", 1);
      c[g.path] = g.value;
    } else if (t.kind === "skillTraining")
      if (t.mode === "improve") {
        const g = this.skillTrainingOptions(e, i).find((w) => w.id === t.skillId), y = [...e.items].find((w) => w.id === t.skillId && w.type === "skill");
        if (!g || !y) throw new W("skill-not-found", "Skill Item not found.");
        if (g.reason === "maximum" || !g.nextRank)
          throw new W("skill-maximum", "This Skill cannot be improved by Core Advancement.");
        if (g.reason === "tier")
          throw new W("skill-tier", "Attack and defense training is not available at this Tier.");
        p = { skill: y, rank: y.system.rank }, m = g.nextRank;
      } else {
        const g = await this.#a(e, t, a);
        if (f = (await e.createEmbeddedDocuments("Item", [g]))[0] ?? null, !f) throw new Error("Foundry did not create the learned Skill Item.");
        m = "trained";
      }
    else
      this.#c(e, t.otherKind, a, c);
    const b = {
      id: this.#t(),
      kind: t.kind,
      otherKind: t.kind === "other" ? t.otherKind : "none",
      tier: l,
      xpCost: s,
      resourcePointsGranted: u,
      timestamp: this.#i()
    };
    Object.assign(c, {
      "system.xp": e.system.xp - s,
      "system.resourcePoints": e.system.resourcePoints + u,
      "system.advancement.purchases": [...r, b]
    }), p && m && await p.skill.update({ "system.rank": m });
    try {
      await e.update(c);
    } catch (g) {
      throw p && await p.skill.update({ "system.rank": p.rank }), f?.delete && await f.delete(), g;
    }
    return { ...m ? { skillRank: m } : {}, record: b, resourcePointsGranted: u };
  }
  async #a(e, t, i) {
    const o = t.sourceUuid ? await this.#n(t.sourceUuid) : null;
    if (t.sourceUuid && !o)
      throw new W("skill-not-found", "The selected Skill source is unavailable.");
    const a = o?.name.trim() || t.customName?.trim() || "";
    if (!a) throw new W("skill-not-found", "A new custom Skill requires a name.");
    if ([...e.items].some((c) => c.type === "skill" && (c.name.trim().toLocaleLowerCase() === a.toLocaleLowerCase() || !!(o?.uuid && c.system.acquisition?.grantedByUuid === o.uuid))))
      throw new W("duplicate-skill", "This Character already owns that Skill.");
    const s = o?.system.category ?? t.customCategory ?? "general", l = o?.system.contexts ?? (s === "general" ? [] : [s]), u = s === "attack" || s === "defense" || l.some((c) => c === "attack" || c.startsWith("attack.") || c === "defense" || c.startsWith("defense."));
    if (u && O(e.system) < i.attackDefenseTrainingTier)
      throw new W("skill-tier", "Attack and defense training is not available at this Tier.");
    return {
      name: a,
      type: "skill",
      system: {
        ...o ? structuredClone(o.system) : {},
        rank: "trained",
        category: s,
        contexts: l,
        acquisition: {
          ...o?.system.acquisition ?? {},
          minimumTier: u ? i.attackDefenseTrainingTier : 1,
          grantedByUuid: o?.uuid ?? "",
          notes: ""
        }
      }
    };
  }
  #c(e, t, i, o) {
    if (t === "recovery")
      o["system.recovery.bonus"] = e.system.recovery.bonus + i.recoveryBonus;
    else if (t === "focus") {
      const a = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: O(e.system),
        focusUuid: ""
      };
      o["system.advancement.pendingFocusChoices"] = [
        ...e.system.advancement.pendingFocusChoices,
        a
      ];
    } else if (t === "armor")
      o["system.proficiencies.armorCategories"] = $o([
        ...e.system.proficiencies.armorCategories,
        ...ze
      ]);
    else if (t === "weapons")
      o["system.proficiencies.weaponCategories"] = $o([
        ...e.system.proficiencies.weaponCategories,
        ...Te
      ]);
    else {
      if (O(e.system) < 3)
        throw new W("genre-tier", "Genre Advancement requires Tier 3 or higher.");
      const a = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: O(e.system)
      };
      o["system.advancement.pendingGenreChoices"] = [
        ...e.system.advancement.pendingGenreChoices,
        a
      ];
    }
  }
  #l(e) {
    if (e.type !== "character")
      throw new W("not-character", "Advancement requires a Character.");
  }
  #s(e) {
    return e.system.derived.effort?.max ?? at(e.system.stats.effortBase, e.system.overrides?.effort);
  }
  #d(e) {
    return e.uuid ?? e.id;
  }
  async #u(e, t) {
    const i = this.#d(e), a = (this.#o.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#o.set(i, a);
    try {
      return await a;
    } finally {
      this.#o.get(i) === a && this.#o.delete(i);
    }
  }
}
function ti(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
const $c = {
  "not-character": "CYPHERV2.Advancement.Errors.NotCharacter",
  "cycle-complete": "CYPHERV2.Advancement.Errors.CycleComplete",
  "already-purchased": "CYPHERV2.Advancement.Errors.AlreadyPurchased",
  "other-already-purchased": "CYPHERV2.Advancement.Errors.OtherAlreadyPurchased",
  "insufficient-xp": "CYPHERV2.Advancement.Errors.InsufficientXP",
  "invalid-allocation": "CYPHERV2.Advancement.Errors.InvalidAllocation",
  "effort-maximum": "CYPHERV2.Advancement.Errors.EffortMaximum",
  "skill-not-found": "CYPHERV2.Advancement.Errors.SkillNotFound",
  "duplicate-skill": "CYPHERV2.Advancement.Errors.DuplicateSkill",
  "skill-maximum": "CYPHERV2.Advancement.Errors.SkillMaximum",
  "skill-tier": "CYPHERV2.Advancement.Errors.SkillTier",
  "genre-tier": "CYPHERV2.Advancement.Errors.GenreTier",
  "tier-not-ready": "CYPHERV2.Advancement.Errors.TierNotReady"
};
function Ge(n, e) {
  return String(n[e] ?? "");
}
function Oi(n, e) {
  return Number(n[e] ?? 0);
}
function Ic() {
  return ["might", "speed", "intellect"].map((n) => `<option value="${n}">${game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`)}</option>`).join("");
}
async function it(n, e) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Advancement.Purchase") }
  });
}
function hr(n) {
  n instanceof W ? ui.notifications.error(game.i18n.localize($c[n.code])) : (console.error(n), ui.notifications.error(game.i18n.localize("CYPHERV2.Advancement.Errors.Unexpected")));
}
async function Vc(n, e) {
  const t = game.i18n.localize(`CYPHERV2.Advancement.Option.${e}`);
  if (e === "increaseCapabilities") {
    const i = await it(t, `
      <p>${game.i18n.localize("CYPHERV2.Advancement.CapabilitiesPrompt")}</p>
      <label>${game.i18n.localize("CYPHERV2.Pools.Might")}<input name="might" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Speed")}<input name="speed" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")}<input name="intellect" type="number" min="0" max="4" value="0"></label>`);
    return i ? { kind: e, allocation: {
      might: Oi(i, "might"),
      speed: Oi(i, "speed"),
      intellect: Oi(i, "intellect")
    } } : null;
  }
  if (e === "moveTowardPerfection") {
    const i = await it(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChoosePool")}<select name="pool">${Ic()}</select></label>`);
    return i ? { kind: e, pool: Ge(i, "pool") } : null;
  }
  if (e === "skillTraining") {
    const i = await it(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.SkillMode")}<select name="mode">
      <option value="learn">${game.i18n.localize("CYPHERV2.Advancement.LearnNewSkill")}</option>
      <option value="improve">${game.i18n.localize("CYPHERV2.Advancement.ImproveExistingSkill")}</option>
    </select></label>`);
    if (!i) return null;
    if (Ge(i, "mode") === "learn") {
      const s = [...game.items].filter((c) => c.type === "skill").sort((c, p) => c.name.localeCompare(p.name)), l = await it(t, `
        <label>${game.i18n.localize("CYPHERV2.Advancement.SkillSource")}<select name="sourceUuid">
          <option value="custom">${game.i18n.localize("CYPHERV2.Advancement.CustomSkill")}</option>
          ${s.map((c) => `<option value="${ti(c.uuid)}">${ti(c.name)}</option>`).join("")}
        </select></label>
        <label>${game.i18n.localize("CYPHERV2.Advancement.CustomSkillName")}<input name="customName" type="text"></label>
        <label>${game.i18n.localize("CYPHERV2.Skill.Category")}<select name="customCategory">
          <option value="general">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.general")}</option>
          <option value="attack">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.attack")}</option>
          <option value="defense">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.defense")}</option>
        </select></label>`);
      if (!l) return null;
      const u = Ge(l, "sourceUuid");
      return u === "custom" ? {
        kind: e,
        mode: "learn",
        customName: Ge(l, "customName"),
        customCategory: Ge(l, "customCategory")
      } : { kind: e, mode: "learn", sourceUuid: u };
    }
    const a = game.cypherv2.services.advancement.skillTrainingOptions(
      n,
      Je()
    ).filter((s) => s.eligible);
    if (a.length === 0)
      return ui.notifications.warn(game.i18n.localize("CYPHERV2.Advancement.NoEligibleSkills")), null;
    const r = await it(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChooseSkill")}<select name="skillId">${a.map((s) => `<option value="${ti(s.id)}">${ti(s.name)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s.currentRank}`)} → ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s.nextRank}`)}</option>`).join("")}</select></label>`);
    return r ? { kind: e, mode: "improve", skillId: Ge(r, "skillId") } : null;
  }
  if (e === "other") {
    const i = $a.filter((a) => a !== "genre" || O(n.system) >= 3), o = await it(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.OtherType")}<select name="otherKind">${i.map((a) => `<option value="${a}">${game.i18n.localize(`CYPHERV2.Advancement.Other.${a}`)}</option>`).join("")}</select></label>`);
    return o ? { kind: e, otherKind: Ge(o, "otherKind") } : null;
  }
  return { kind: e };
}
async function Yc(n, e) {
  const t = await Vc(n, e);
  if (t)
    try {
      const i = await game.cypherv2.services.advancement.purchase(
        n,
        t,
        Je()
      );
      ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.PurchasedNotice", {
        resourcePoints: i.resourcePointsGranted
      }));
    } catch (i) {
      hr(i);
    }
}
async function Dc(n) {
  try {
    const e = await game.cypherv2.services.advancement.advanceTier(
      n,
      Je()
    );
    ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.TierAdvancedNotice", { tier: e.tier }));
  } catch (e) {
    hr(e);
  }
}
class Ie extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusAssociationError";
  }
  code;
}
const Fc = () => globalThis.crypto?.randomUUID?.() ?? `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`;
class Tc {
  #e;
  #t;
  #i = /* @__PURE__ */ new Map();
  constructor(e = Fc, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async attach(e, t, i) {
    return this.#a(e, async () => {
      if (this.#n(e, t), e.system.focusProgress.some((l) => this.#o(l, t)))
        throw new Ie("duplicate", "This Focus is already attached.");
      if (i === "creation") {
        if (O(e.system) !== 1)
          throw new Ie("creation-tier", "A creation Focus requires a Tier 1 Character.");
        if (e.system.focusProgress.some((l) => l.provenance === "creation"))
          throw new Ie("creation-focus-exists", "This Character already has a creation Focus.");
      }
      const o = e.system.advancement.initializedFocusUuids.includes(t.uuid), a = {
        focusUuid: t.uuid,
        ownedNodeIds: [],
        acquisitions: [],
        provenance: i,
        initialChoicesGranted: !o,
        attachedAt: this.#t()
      }, r = i === "creation" ? "characterCreation" : "additionalFocus", s = o ? [] : Array.from({ length: 2 }, () => ({
        id: this.#e(),
        source: r,
        grantTier: 1,
        focusUuid: t.uuid
      }));
      return await e.update({
        "system.focusProgress": [...e.system.focusProgress, a],
        "system.advancement.pendingFocusChoices": [
          ...e.system.advancement.pendingFocusChoices,
          ...s
        ],
        "system.advancement.initializedFocusUuids": o ? [...e.system.advancement.initializedFocusUuids] : [...e.system.advancement.initializedFocusUuids, t.uuid]
      }), { progress: a, choicesGranted: s };
    });
  }
  async remove(e, t) {
    return this.#a(e, async () => {
      if (e.type !== "character")
        throw new Ie("not-character", "Focus association requires a Character.");
      const i = e.system.focusProgress.find((a) => a.focusUuid === t);
      if (!i) throw new Ie("progress-missing", "Focus progression was not found.");
      const o = e.system.advancement.pendingFocusChoices.filter((a) => a.focusUuid === t).map((a) => a.id);
      return await e.update({
        "system.focusProgress": e.system.focusProgress.filter((a) => a !== i),
        "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((a) => a.focusUuid !== t)
      }), { progress: i, removedPendingChoiceIds: o };
    });
  }
  #n(e, t) {
    if (e.type !== "character")
      throw new Ie("not-character", "Focus association requires a Character.");
    if (t.type !== "focus" || !t.uuid)
      throw new Ie("not-focus", "Only a Focus Item can be attached.");
  }
  #o(e, t) {
    return e.focusUuid === t.uuid || e.focusUuid === t.id;
  }
  #r(e) {
    return e.uuid ?? e.id;
  }
  async #a(e, t) {
    const i = this.#r(e), a = (this.#i.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#i.set(i, a);
    try {
      return await a;
    } finally {
      this.#i.get(i) === a && this.#i.delete(i);
    }
  }
}
function Bi(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function gr(n) {
  const e = n instanceof Ie ? `CYPHERV2.Focus.Association.Errors.${n.code}` : "CYPHERV2.Focus.Errors.Unexpected";
  n instanceof Ie || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function Io(n, e) {
  let t = e;
  if (!t) {
    const a = [...game.items].filter((s) => s.type === "focus").sort((s, l) => s.name.localeCompare(l.name));
    if (a.length === 0) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Association.NoWorldFoci"));
      return;
    }
    const r = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Add") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Focus.Association.Focus")}
        <select name="focusUuid">${a.map((s) => `<option value="${Bi(s.uuid)}">${Bi(s.name)}</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Focus.Association.Add") }
    });
    if (!r) return;
    t = await fromUuid(String(r.focusUuid ?? "")) ?? void 0;
  }
  if (!t) return;
  const i = O(n.system) === 1 && !n.system.focusProgress.some((a) => a.provenance === "creation"), o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Add") },
    content: `<div class="cypherv2-dialog-fields">
      <p><strong>${Bi(t.name)}</strong></p>
      <label>${game.i18n.localize("CYPHERV2.Focus.Association.Provenance")}
        <select name="provenance">
          ${i ? `<option value="creation">${game.i18n.localize("CYPHERV2.Focus.Association.Creation")}</option>` : ""}
          <option value="additional">${game.i18n.localize("CYPHERV2.Focus.Association.Additional")}</option>
        </select>
      </label>
    </div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Focus.Association.Add") }
  });
  if (o)
    try {
      const a = await game.cypherv2.services.focusAssociations.attach(
        n,
        t,
        String(o.provenance)
      );
      ui.notifications.info(game.i18n.localize(
        a.choicesGranted.length > 0 ? "CYPHERV2.Focus.Association.Added" : "CYPHERV2.Focus.Association.Reattached"
      ));
    } catch (a) {
      gr(a);
    }
}
async function zc(n, e) {
  const t = n.system.focusProgress.find((a) => a.focusUuid === e);
  if (!t) return;
  const i = t.ownedNodeIds.length > 0 ? game.i18n.format("CYPHERV2.Focus.Association.RemoveOwnedWarning", { count: t.ownedNodeIds.length }) : game.i18n.localize("CYPHERV2.Focus.Association.RemoveWarning");
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Remove") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${i}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.Association.Remove") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }))
    try {
      await game.cypherv2.services.focusAssociations.remove(n, e), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Association.Removed"));
    } catch (a) {
      gr(a);
    }
}
class ae extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "CharacterInitializationError";
  }
  code;
}
const Nc = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
};
function Vo(n) {
  return n.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
class Mc {
  #e;
  #t;
  constructor(e = Nc, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async setup(e, t) {
    this.#n(e);
    const i = Object.values(t.pools);
    if (i.some((p) => !Number.isInteger(p) || p < 0) || i.reduce((p, f) => p + f, 0) !== 6)
      throw new ae("invalid-pools", "Core Setup must distribute exactly six Pool points.");
    const o = t.skills.filter((p) => p.rank === "trained"), a = t.skills.filter((p) => p.rank === "inability");
    if (!(o.length === 2 && a.length === 0 || o.length === 3 && a.length === 1))
      throw new ae(
        "invalid-skills",
        "Core Setup requires two trained Skills, or three trained Skills and one different Inability."
      );
    const s = await Promise.all(t.skills.map((p) => this.#i(p))), l = new Set([...e.items].filter((p) => p.type === "skill").map((p) => Vo(p.name))), u = /* @__PURE__ */ new Set();
    for (const p of s) {
      const f = Vo(String(p.name));
      if (!f || l.has(f) || u.has(f))
        throw new ae("duplicate-skill", "Starting Skills must all be different.");
      u.add(f);
    }
    const c = await e.createEmbeddedDocuments("Item", s);
    try {
      if (await e.update({
        "system.tier": 1,
        "system.stats.might.value": 8 + t.pools.might,
        "system.stats.might.baseMax": 8 + t.pools.might,
        "system.stats.might.baseEdge": 0,
        "system.stats.speed.value": 8 + t.pools.speed,
        "system.stats.speed.baseMax": 8 + t.pools.speed,
        "system.stats.speed.baseEdge": 0,
        "system.stats.intellect.value": 8 + t.pools.intellect,
        "system.stats.intellect.baseMax": 8 + t.pools.intellect,
        "system.stats.intellect.baseEdge": 0,
        "system.stats.effortBase": 1,
        "system.cypherLimitBase": 2,
        "system.proficiencies.weaponCategories": ["light"],
        "system.proficiencies.armorCategories": [],
        "system.creation": {
          coreInitialized: !0,
          mode: "completed",
          initializedAt: this.#t()
        }
      }), !e.system.creation.coreInitialized)
        throw new ae(
          "state-not-persisted",
          "Foundry did not expose the persisted Core initialization state after update."
        );
    } catch (p) {
      throw await Promise.allSettled(c.map((f) => f.delete?.())), p;
    }
  }
  async markInitialized(e, t) {
    if (e.type !== "character")
      throw new ae("not-character", "Core Setup requires a Character.");
    if (!e.system.creation.coreInitialized && (await e.update({ "system.creation": {
      coreInitialized: !0,
      mode: t,
      initializedAt: this.#t()
    } }), !e.system.creation.coreInitialized))
      throw new ae(
        "state-not-persisted",
        "Foundry did not expose the persisted Core initialization state after update."
      );
  }
  async #i(e) {
    if (e.sourceUuid) {
      const o = await this.#e(e.sourceUuid);
      if (!o)
        throw new ae("skill-source-missing", "A selected Skill source is unavailable.");
      return {
        name: o.name,
        type: "skill",
        system: {
          ...structuredClone(o.system),
          rank: e.rank,
          acquisition: {
            ...o.system.acquisition ?? {},
            grantedByUuid: o.uuid
          }
        }
      };
    }
    const t = e.customName?.trim() ?? "";
    if (!t)
      throw new ae("invalid-skills", "A custom Skill requires a name.");
    const i = e.category ?? "general";
    return {
      name: t,
      type: "skill",
      system: {
        rank: e.rank,
        category: i,
        contexts: i === "general" ? [] : [i],
        acquisition: { minimumTier: 1, grantedByUuid: "", notes: "" }
      }
    };
  }
  #n(e) {
    if (e.type !== "character")
      throw new ae("not-character", "Core Setup requires a Character.");
    if (e.system.creation.coreInitialized)
      throw new ae("already-initialized", "Core Setup has already been finalized.");
  }
}
function Li(n, e) {
  return Number(n[e] ?? 0);
}
function Yo(n, e) {
  return String(n[e] ?? "").trim();
}
function hn(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function xc() {
  return [
    `<option value="custom">${game.i18n.localize("CYPHERV2.Creation.CustomSkill")}</option>`,
    ...[...game.items].filter((n) => n.type === "skill").sort((n, e) => n.name.localeCompare(e.name)).map((n) => `<option value="${hn(n.uuid)}">${hn(n.name)}</option>`)
  ].join("");
}
function ii(n, e) {
  return `<fieldset><legend>${e}</legend>
    <label>${game.i18n.localize("CYPHERV2.Creation.SkillSource")}<select name="source${n}">${xc()}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Creation.CustomSkillName")}<input name="name${n}" type="text"></label>
  </fieldset>`;
}
function ni(n, e, t) {
  const i = Yo(n, `source${e}`);
  return i === "custom" ? { customName: Yo(n, `name${e}`), category: "general", rank: t } : { sourceUuid: i, rank: t };
}
async function ji(n, e, t) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    render: t ? (i, o) => t(o.element) : void 0,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Apply") }
  });
}
function Uc(n) {
  const e = [...n.querySelectorAll(
    'input[name="might"], input[name="speed"], input[name="intellect"]'
  )], t = n.querySelector("[data-core-points-remaining]"), i = n.querySelector('button[data-action="ok"]'), o = () => {
    const a = e.map((l) => Number(l.value)), r = a.every((l) => Number.isInteger(l) && l >= 0 && l <= 6), s = 6 - a.reduce((l, u) => l + u, 0);
    t && (t.value = String(s)), i && (i.disabled = !r || s !== 0);
  };
  e.forEach((a) => a.addEventListener("input", o)), o();
}
function gn(n) {
  const e = n instanceof ae ? `CYPHERV2.Creation.Errors.${n.code}` : "CYPHERV2.Creation.Errors.Unexpected";
  n instanceof ae || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function qc(n) {
  const e = await ji(
    game.i18n.localize("CYPHERV2.Creation.StepPools"),
    `<p>${game.i18n.localize("CYPHERV2.Creation.PoolsPrompt")}</p>
     <label>${game.i18n.localize("CYPHERV2.Pools.Might")} 8 + <input name="might" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Speed")} 8 + <input name="speed" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")} 8 + <input name="intellect" type="number" min="0" max="6" value="0"></label>
     <p>${game.i18n.localize("CYPHERV2.Creation.PointsRemaining")}: <output data-core-points-remaining>6</output> / 6</p>`,
    Uc
  );
  if (!e) return;
  const t = { might: Li(e, "might"), speed: Li(e, "speed"), intellect: Li(e, "intellect") };
  if (Object.values(t).reduce((u, c) => u + c, 0) !== 6 || Object.values(t).some((u) => !Number.isInteger(u) || u < 0)) {
    gn(new ae("invalid-pools", "Invalid Pool allocation."));
    return;
  }
  const i = await ji(
    game.i18n.localize("CYPHERV2.Creation.StepSkills"),
    ii(1, game.i18n.localize("CYPHERV2.Creation.SkillOne")) + ii(2, game.i18n.localize("CYPHERV2.Creation.SkillTwo"))
  );
  if (!i) return;
  const o = [ni(i, 1, "trained"), ni(i, 2, "trained")];
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.OptionalThird") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Creation.OptionalThirdPrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.AddThird") },
    no: { label: game.i18n.localize("CYPHERV2.Creation.KeepTwo") }
  })) {
    const u = await ji(
      game.i18n.localize("CYPHERV2.Creation.OptionalThird"),
      ii(3, game.i18n.localize("CYPHERV2.Creation.SkillThree")) + ii(4, game.i18n.localize("CYPHERV2.Creation.Inability"))
    );
    if (!u) return;
    o.push(ni(u, 3, "trained"), ni(u, 4, "inability"));
  }
  const r = o.map((u) => u.customName || [...game.items].find((c) => c.uuid === u.sourceUuid)?.name || game.i18n.localize("CYPHERV2.Creation.UnknownSkill"));
  if (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.StepReview") },
    content: `<div class="cypherv2-dialog-fields">
      <p>${game.i18n.localize("CYPHERV2.Pools.Might")} ${8 + t.might} · ${game.i18n.localize("CYPHERV2.Pools.Speed")} ${8 + t.speed} · ${game.i18n.localize("CYPHERV2.Pools.Intellect")} ${8 + t.intellect}</p>
      <ul>${r.map((u, c) => `<li>${hn(u)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${o[c].rank}`)}</li>`).join("")}</ul>
    </div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.Finalize") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const l = { pools: t, skills: o };
  try {
    await game.cypherv2.services.characterInitialization.setup(n, l), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize("CYPHERV2.Creation.Completed"));
  } catch (u) {
    gn(u);
  }
}
async function Do(n, e) {
  try {
    await game.cypherv2.services.characterInitialization.markInitialized(n, e), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize(
      e === "skipped" ? "CYPHERV2.Creation.Skipped" : "CYPHERV2.Creation.Marked"
    ));
  } catch (t) {
    gn(t);
  }
}
function oi(n, e) {
  return e.map((t) => n.system.graph.nodes.find((i) => i.id === t)?.abilitySnapshot.name || t).join(", ");
}
async function Gc(n, e, t) {
  return game.cypherv2.services.focusAcquisition.hasEmbeddedAbility(n, e.uuid, t) ? !!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoDeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.UndoDeletePrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoDeleteAbility") },
    no: { label: game.i18n.localize("CYPHERV2.Focus.UndoKeepAbility") }
  }) : !1;
}
async function Fo(n, e, t, i = !1) {
  const o = e.system.graph.nodes.find((s) => s.id === t);
  if (!o || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.UndoConfirm", { name: o.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const r = await Gc(n, e, t);
  try {
    const s = await game.cypherv2.services.focusAcquisition.undo(
      n,
      e,
      t,
      { deleteAbility: r, force: i }
    );
    ui.notifications.info(game.i18n.localize(s.choiceRestored ? "CYPHERV2.Focus.UndoChoiceRestored" : "CYPHERV2.Focus.UndoCompleted")), s.invalidOwnedNodeIds.length > 0 && ui.notifications.warn(game.i18n.format("CYPHERV2.Focus.ProgressionEdit.InvalidWarning", {
      nodes: oi(e, s.invalidOwnedNodeIds)
    }));
  } catch (s) {
    if (s instanceof oe && s.code === "undo-dependent-nodes") {
      if (!game.user.isGM) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Focus.Errors.UndoDependencies", {
          nodes: oi(e, s.dependentNodeIds)
        }));
        return;
      }
      if (await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.ForceUndo") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.ForceUndoWarning", {
          nodes: oi(e, s.dependentNodeIds)
        })}</p></div>`,
        yes: { label: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.ForceUndo") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) {
        const u = await game.cypherv2.services.focusAcquisition.undo(
          n,
          e,
          t,
          { deleteAbility: r, force: !0 }
        );
        ui.notifications.warn(game.i18n.format("CYPHERV2.Focus.ProgressionEdit.InvalidWarning", {
          nodes: oi(e, u.invalidOwnedNodeIds)
        }));
      }
      return;
    }
    console.error(s), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
  }
}
async function Oc(n, e, t) {
  if (!game.user.isGM) return;
  const i = e.system.graph.nodes.find((a) => a.id === t);
  !i || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.MarkOwnedConfirm", { name: i.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (await game.cypherv2.services.focusAcquisition.markOwnedWithGmOverride(n, e, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkedOwned")));
}
function ye(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function To(n) {
  return n ? game.i18n.localize(`CYPHERV2.Skill.Ranks.${n}`) : "";
}
function Bc(n) {
  const e = n.toObject();
  return {
    name: n.name,
    ...e.img ? { img: e.img } : {},
    system: structuredClone(e.system ?? {})
  };
}
async function zo(n, e, t) {
  const i = e ? await fromUuid(e) : null;
  return !(i instanceof Item) || i.type !== n.type ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.InvalidReplacement")), null) : {
    action: "replace",
    selectionKind: t,
    replacement: {
      id: i.uuid,
      type: n.type,
      name: i.name,
      itemUuid: i.uuid,
      snapshot: Bc(i),
      reason: game.i18n.localize(t === "compendium" ? "CYPHERV2.GrantConflict.CompendiumItem" : "CYPHERV2.GrantConflict.WorldItem"),
      reasonSourceUuid: i.uuid
    }
  };
}
async function wt(n) {
  const e = [...game.items].filter((u) => u.type === n.type).filter((u) => u.uuid !== n.existing.contentUuid && u.uuid !== n.proposed.contentUuid).sort((u, c) => u.name.localeCompare(c.name)), t = n.suggestions.length ? n.suggestions.map((u) => `
      <label class="grant-conflict-option">
        <input type="radio" name="resolution" value="suggestion:${ye(u.id)}">
        <span><strong>${ye(u.name)}</strong><small>${ye(u.reason)}</small></span>
      </label>`).join("") : `<p class="empty-list">${game.i18n.localize("CYPHERV2.GrantConflict.NoSuggestions")}</p>`, i = game.i18n.localize(n.type === "skill" ? "CYPHERV2.GrantConflict.Skill" : "CYPHERV2.GrantConflict.Ability"), o = n.existing.rank ? ` — ${ye(To(n.existing.rank))}` : "", a = n.proposed.rank ? ` — ${ye(To(n.proposed.rank))}` : "", r = game.user.isGM ? `
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="world"><span>${game.i18n.localize("CYPHERV2.GrantConflict.WorldItem")}</span></label>
      <select name="worldUuid">${e.map((u) => `<option value="${ye(u.uuid)}">${ye(u.name)}</option>`).join("")}</select>
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="uuid"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CompendiumUuid")}</span></label>
      <input name="documentUuid" type="text" placeholder="Compendium.world.pack.Item.id">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.GmExternalOnly")}</p>`, s = n.context === "package" ? `<fieldset><legend>${game.i18n.format("CYPHERV2.GrantConflict.ChooseAnother", { type: i })}</legend>
      ${r}
      ${n.allowCustom ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="custom"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill")}</span></label><input name="customName" type="text" placeholder="${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkillName")}">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.NoCustomAbility")}</p>`}
    </fieldset>` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.FocusRestriction")}</p>`, l = `<div class="cypherv2 cypherv2-dialog grant-conflict-dialog">
    <div class="grant-conflict-comparison">
      <p><span>${game.i18n.localize("CYPHERV2.GrantConflict.AlreadyHave")}</span><strong>${ye(n.existing.name)}${o}</strong></p>
      <p><span>${game.i18n.format("CYPHERV2.GrantConflict.WouldGrant", { source: ye(n.packageName) })}</span><strong>${ye(n.proposed.name)}${a}</strong></p>
    </div>
    <fieldset><legend>${game.i18n.localize("CYPHERV2.GrantConflict.Suggested")}</legend>${t}</fieldset>
    ${s}
    ${n.allowSuppress ? `<label class="grant-conflict-option suppress"><input type="radio" name="resolution" value="suppress" checked><span>${game.i18n.localize("CYPHERV2.GrantConflict.Suppress")}</span></label>` : ""}
    ${n.allowGmOverride && game.user.isGM ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="gmOverride"><span>${game.i18n.localize("CYPHERV2.GrantConflict.GmOverride")}</span></label>` : ""}
  </div>`;
  for (; ; ) {
    const u = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.GrantConflict.Title") },
      content: l,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Confirm") }
    });
    if (!u) return { action: "cancel" };
    const c = String(u.resolution ?? "");
    if (c === "suppress" && n.allowSuppress) return { action: "suppress" };
    if (c === "gmOverride" && n.allowGmOverride && game.user.isGM) return { action: "gmOverride" };
    if (c.startsWith("suggestion:")) {
      const p = n.suggestions.find((f) => f.id === c.slice(11));
      if (p) return { action: "replace", replacement: p, selectionKind: "suggested" };
    }
    if (c === "world") {
      const p = await zo(n, String(u.worldUuid ?? ""), "world");
      if (p) return p;
    }
    if (c === "uuid") {
      const p = String(u.documentUuid ?? "").trim(), f = await zo(n, p, p.startsWith("Compendium.") ? "compendium" : "world");
      if (f) return f;
    }
    if (c === "custom" && n.type === "skill" && n.allowCustom) {
      const p = String(u.customName ?? "").trim();
      if (p) return {
        action: "replace",
        selectionKind: "custom",
        replacement: {
          id: `custom:${p.toLocaleLowerCase()}`,
          type: "skill",
          name: p,
          itemUuid: "",
          snapshot: { name: p, system: {} },
          reason: game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill"),
          reasonSourceUuid: "",
          custom: !0
        }
      };
    }
    ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.SelectResolution"));
  }
}
function nt(n) {
  return n.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}
function Lc(n, e) {
  const t = n.genre === "custom" ? String(n.customGenreId ?? "") : String(n.genre ?? "");
  if (!t || t === "none") return null;
  const i = [...e].sort((o, a) => o.uuid.localeCompare(a.uuid));
  return i.find((o) => o.uuid === t) ?? i.find((o) => nt(o.system.legacyKey) === nt(t)) ?? i.find((o) => nt(String(o.system.slug ?? "")) === nt(t)) ?? i.find((o) => nt(o.name) === nt(t)) ?? null;
}
async function yr(n, e, t) {
  if (n.genre === "custom" && n.customGenreId) {
    const i = await t(n.customGenreId);
    if (i?.type === "genre") return i;
  }
  return Lc(n, e);
}
class At extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreAssociationError";
  }
  code;
}
class M extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreChoiceError";
  }
  code;
}
function jc() {
  return {
    active: !1,
    originalName: "",
    originalContentUuid: "",
    originalContentKey: "",
    replacementName: "",
    replacementContentUuid: "",
    replacementContentKey: "",
    selectionKind: "none"
  };
}
function No(n) {
  return structuredClone(n);
}
class Wc {
  #e;
  #t;
  #i;
  #n;
  #o = /* @__PURE__ */ new Map();
  constructor(e = async (a) => await fromUuid(a), t = async (a) => await fromUuid(a), i = () => globalThis.crypto?.randomUUID?.() ?? `genre-${Date.now()}-${Math.random()}`, o = Date.now) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  async attach(e, t, i = "manual") {
    return this.#s(e, async () => {
      if (this.#l(e), t.type !== "genre" || !t.uuid)
        throw new At("not-genre", "Only a Genre Item can be attached.");
      if (e.system.genre.sourceUuid === t.uuid)
        throw new At("duplicate", "This Genre is already attached.");
      const o = {
        sourceUuid: t.uuid,
        instanceId: this.#i(),
        provenance: i,
        attachedAt: this.#n()
      };
      return await e.update({ "system.genre": o }), o;
    });
  }
  async remove(e) {
    return this.#s(e, async () => {
      this.#l(e);
      const t = No(e.system.genre);
      if (!t.sourceUuid) throw new At("missing", "No Genre is attached.");
      return await e.update({
        "system.genre.sourceUuid": "",
        "system.genre.instanceId": "",
        "system.genre.provenance": "manual",
        "system.genre.attachedAt": 0
      }), t;
    });
  }
  async active(e) {
    return e.system.genre.sourceUuid ? this.#e(e.system.genre.sourceUuid) : null;
  }
  eligibleEntries(e, t, i) {
    return t.system.abilityCatalog.filter((o) => o.minimumTier <= O(e.system) && o.minimumTier <= i.grantTier);
  }
  manualCatalog(e, t) {
    return t.system.abilityCatalog.map((i) => ({
      id: i.id,
      name: i.snapshot.name || i.id,
      minimumTier: i.minimumTier,
      normallyAvailable: i.minimumTier <= O(e.system),
      owned: !!this.#a(e, t, e.system.genre, i, "active")
    })).sort((i, o) => i.minimumTier - o.minimumTier || i.name.localeCompare(o.name));
  }
  async acquireManual(e, t, i) {
    return this.#s(e, async () => {
      this.#l(e);
      const o = e.system.genre;
      if (!o.sourceUuid) throw new M("genre-required", "Attach a Genre before acquiring an Ability.");
      const a = await this.#e(o.sourceUuid);
      if (!a || a.type !== "genre") throw new M("genre-unavailable", "The active Genre source is unavailable.");
      const r = a.system.abilityCatalog.find((m) => m.id === t);
      if (!r) throw new M("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (this.#a(e, a, o, r, "active")) return { entry: r, abilityCreated: !1, conflictOverridden: !1 };
      const l = this.#a(e, a, o, r, "retained");
      if (l?.update)
        return await l.update({ "system.grantedBy.status": "active" }), { entry: r, abilityCreated: !1, conflictOverridden: !1 };
      const u = await this.#r(a, o, r), c = this.#c(e, a, r, u);
      let p = !1;
      if (c) {
        if (!i) throw new M("duplicate-grant", "This Ability is already present on the Character.");
        const m = await i(c);
        if (m.action === "cancel") throw new Ne();
        if (m.action !== "gmOverride")
          throw new M("duplicate-grant", "A Genre acquisition must use an Ability from its Genre catalog.");
        p = !0;
      }
      const f = c ? void 0 : (await e.createEmbeddedDocuments("Item", [u]))[0];
      return { entry: r, abilityCreated: !!f, conflictOverridden: p };
    });
  }
  async undoManual(e, t, i) {
    return this.#s(e, async () => {
      this.#l(e);
      const o = e.system.genre;
      if (!o.sourceUuid) throw new M("genre-required", "No active Genre is attached.");
      const a = await this.#e(o.sourceUuid);
      if (!a || a.type !== "genre") throw new M("genre-unavailable", "The active Genre source is unavailable.");
      const r = a.system.abilityCatalog.find((l) => l.id === t);
      if (!r) throw new M("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      const s = this.#a(e, a, o, r, "active");
      if (!s) throw new M("entry-missing", "This Genre Ability is not currently owned.");
      if (i) {
        if (!s.delete) throw new M("ability-unavailable", "The embedded Genre Ability cannot be deleted.");
        return await s.delete(), { abilityDeleted: !0, abilityRetained: !1 };
      }
      if (!s.update) throw new M("ability-unavailable", "The embedded Genre Ability cannot be retained.");
      return await s.update({ "system.grantedBy.status": "retained" }), { abilityDeleted: !1, abilityRetained: !0 };
    });
  }
  async acquire(e, t, i, o) {
    return this.#s(e, async () => {
      this.#l(e);
      const a = e.system.genre;
      if (!a.sourceUuid) throw new M("genre-required", "Attach a Genre before spending this choice.");
      const r = await this.#e(a.sourceUuid);
      if (!r || r.type !== "genre") throw new M("genre-unavailable", "The active Genre source is unavailable.");
      const s = e.system.advancement.pendingGenreChoices.find((m) => m.id === t);
      if (!s) throw new M("choice-missing", "The pending Genre Choice no longer exists.");
      const l = r.system.abilityCatalog.find((m) => m.id === i);
      if (!l) throw new M("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (!this.eligibleEntries(e, r, s).some((m) => m.id === l.id))
        throw new M("entry-ineligible", "This Genre Ability is not eligible for the selected choice.");
      const u = await this.#r(r, a, l), c = this.#c(e, r, l, u);
      let p = !1;
      if (c) {
        if (!o) throw new M("duplicate-grant", "This Ability is already present on the Character.");
        const m = await o(c);
        if (m.action === "cancel") throw new Ne();
        if (m.action !== "gmOverride")
          throw new M("duplicate-grant", "A Genre choice must grant an Ability from its Genre catalog.");
        p = !0;
      }
      let f;
      c || (f = (await e.createEmbeddedDocuments("Item", [u]))[0]);
      try {
        await e.update({
          "system.advancement.pendingGenreChoices": e.system.advancement.pendingGenreChoices.filter((m) => m.id !== s.id)
        });
      } catch (m) {
        throw await f?.delete?.(), m;
      }
      return { entry: l, abilityCreated: !!f, conflictOverridden: p };
    });
  }
  async #r(e, t, i) {
    const o = i.abilityUuid ? await this.#t(i.abilityUuid) : null, a = o?.type === "ability" ? o : null, r = i.snapshot;
    if (!a && (!r.name || !r.system))
      throw new M("ability-unavailable", "The Genre Ability source and snapshot are unavailable.");
    const s = a?.name ?? r.name, l = a?.img ?? r.img ?? "", u = a?.system ?? r.system, c = be("ability", s, i.abilityUuid || a?.uuid || ""), p = {
      kind: "genre",
      sourceUuid: e.uuid,
      instanceId: t.instanceId,
      grantId: i.id,
      status: "active",
      contentUuid: c.contentUuid,
      contentKey: c.contentKey,
      replacement: jc()
    };
    return { name: s, img: l, type: "ability", system: { ...No(u), grantedBy: p } };
  }
  #a(e, t, i, o, a) {
    return [...e.items].find((r) => {
      if (r.type !== "ability") return !1;
      const s = r.system.grantedBy ?? {};
      return s.kind === "genre" && s.sourceUuid === t.uuid && s.instanceId === i.instanceId && s.grantId === o.id && s.status === a;
    }) ?? null;
  }
  #c(e, t, i, o) {
    const r = o.system.grantedBy, s = be("ability", String(o.name), r.contentUuid), l = ki(e.items, s);
    if (!l) return null;
    const u = l.system.grantedBy ?? {}, c = be("ability", l.name, String(u.contentUuid ?? "")), p = (f, m, b) => ({
      id: m,
      name: f.name,
      type: "ability",
      rank: "",
      contentUuid: b.contentUuid,
      contentKey: b.contentKey
    });
    return {
      id: `${t.uuid}:${i.id}`,
      type: "ability",
      packageName: t.name,
      packageSourceUuid: t.uuid,
      grantId: i.id,
      existing: p(l, String(l.id ?? c.contentKey), c),
      proposed: p({ name: String(o.name) }, i.id, s),
      suggestions: [],
      allowCustom: !1,
      allowSuppress: !1,
      allowGmOverride: !0,
      context: "genre"
    };
  }
  #l(e) {
    if (e.type !== "character") throw new At("not-character", "Genre association requires a Character.");
  }
  async #s(e, t) {
    const i = e.uuid ?? e.id, a = (this.#o.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#o.set(i, a);
    try {
      return await a;
    } finally {
      this.#o.get(i) === a && this.#o.delete(i);
    }
  }
}
function Ve(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Ai(n) {
  if (n instanceof Ne) return;
  console.error(n);
  const e = n instanceof At ? `CYPHERV2.Genre.Errors.${n.code}` : n instanceof M ? `CYPHERV2.Genre.Errors.${n.code}` : "CYPHERV2.Genre.Errors.unexpected";
  ui.notifications.error(game.i18n.localize(e));
}
async function yn(n, e, t = "manual") {
  let i = e;
  if (!i) {
    const o = [...game.items].filter((r) => r.type === "genre").sort((r, s) => r.name.localeCompare(s.name));
    if (!o.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldGenres"));
      return;
    }
    const a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Add") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Label")}<select name="uuid">${o.map((r) => `<option value="${Ve(r.uuid)}">${Ve(r.name)}</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!a) return;
    i = await fromUuid(String(a.uuid ?? "")) ?? void 0;
  }
  if (i && !(n.system.genre.sourceUuid && n.system.genre.sourceUuid !== i.uuid && !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Genre.Replace") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.ReplaceConfirm")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })))
    try {
      await game.cypherv2.services.genres.attach(n, i, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Attached"));
    } catch (o) {
      Ai(o);
    }
}
async function _c(n) {
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Genre.Remove") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.RemoveConfirm")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Remove") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }))
    try {
      await game.cypherv2.services.genres.remove(n), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Removed"));
    } catch (t) {
      Ai(t);
    }
}
async function Kc(n, e) {
  try {
    const t = await game.cypherv2.services.genres.active(n);
    if (!t) throw new M("genre-required", "Attach a Genre first.");
    const i = n.system.advancement.pendingGenreChoices.find((r) => r.id === e);
    if (!i) throw new M("choice-missing", "Choice not found.");
    const o = game.cypherv2.services.genres.eligibleEntries(n, t, i);
    if (!o.length) throw new M("entry-ineligible", "No eligible Genre Ability is available.");
    const a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.ChooseAbility") },
      content: `<div class="cypherv2-dialog-fields"><p><strong>${Ve(t.name)}</strong></p><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}<select name="entryId">${o.map((r) => `<option value="${Ve(r.id)}">${Ve(r.snapshot.name)} (${game.i18n.localize("CYPHERV2.Focus.Tier")} ${r.minimumTier})</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Genre.Acquire") }
    });
    if (!a) return;
    await game.cypherv2.services.genres.acquire(
      n,
      i.id,
      String(a.entryId ?? ""),
      wt
    ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
  } catch (t) {
    Ai(t);
  }
}
async function Xc(n) {
  try {
    const e = await game.cypherv2.services.genres.active(n);
    if (!e) throw new M("genre-required", "Attach a Genre first.");
    const t = game.cypherv2.services.genres.manualCatalog(n, e);
    if (!t.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoCatalogAbilities"));
      return;
    }
    const i = `<div class="cypherv2 genre-ability-browser">
      <p class="genre-browser-source"><strong>${Ve(e.name)}</strong></p>
      <div class="genre-browser-list">${t.map((u, c) => `
        <label class="genre-browser-entry${u.owned ? " is-owned" : ""}${u.normallyAvailable ? "" : " is-future"}">
          <input type="radio" name="entryId" value="${Ve(u.id)}"${c === 0 ? " checked" : ""}>
          <span><strong>${Ve(u.name)}</strong><small>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")} ${u.minimumTier}</small></span>
          <em>${game.i18n.localize(u.owned ? "CYPHERV2.Genre.Browser.Owned" : u.normallyAvailable ? "CYPHERV2.Genre.Browser.Available" : "CYPHERV2.Genre.Browser.HigherTier")}</em>
        </label>`).join("")}</div>
      <p class="hint">${game.i18n.localize("CYPHERV2.Genre.Browser.GuidanceOnly")}</p>
    </div>`, o = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.AddAbilities") },
      content: i,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Confirm") }
    });
    if (!o) return;
    const a = String(o.entryId ?? ""), r = t.find((u) => u.id === a);
    if (!r) return;
    if (!r.owned) {
      await game.cypherv2.services.genres.acquireManual(
        n,
        a,
        wt
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
      return;
    }
    if (!await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Browser.Undo") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.Browser.UndoConfirm", { name: Ve(r.name) })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Genre.Browser.Undo") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })) return;
    const l = !!await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.Browser.DeletePrompt")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteAbility") },
      no: { label: game.i18n.localize("CYPHERV2.Genre.Browser.KeepAbility") }
    });
    await game.cypherv2.services.genres.undoManual(n, a, l), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Browser.UndoCompleted"));
  } catch (e) {
    Ai(e);
  }
}
function Dt(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Jc(n, e, t) {
  return n.includes(e) ? n.filter((i) => i !== e) : n.length >= t ? [...n] : [...n, e];
}
function Qc() {
  let n = !1;
  return () => n ? !1 : (n = !0, !0);
}
function Zc(n, e) {
  return n.map((t, i) => `<button type="button" class="package-choice-option"${e ? ` data-action="package-choice-${i}"` : ""} data-package-choice-option data-option-id="${Dt(t.id)}" aria-pressed="false"><i class="fa-solid fa-check package-choice-check" aria-hidden="true"></i><span>${Dt(t.label)}</span></button>`).join("");
}
async function _n(n) {
  const e = n.options.filter((l, u, c) => l.id && c.findIndex((p) => p.id === l.id) === u);
  if (!Number.isInteger(n.choose) || n.choose < 1 || n.choose > e.length) return null;
  const t = n.choose === 1, i = Qc();
  let o = [];
  const a = `<div class="cypherv2 cypherv2-dialog package-choice-dialog ${t ? "package-choice-single" : "package-choice-multiple"}" data-package-choice-required="${n.choose}">
    <header class="cypherv2-dialog-heading package-choice-heading"><strong>${Dt(n.title)}</strong></header>
    <p class="cypherv2-dialog-help package-choice-prompt">${Dt(n.prompt)}</p>
    <div class="package-choice-options" role="group" aria-label="${Dt(n.ariaLabel)}">${Zc(e, t)}</div>
    ${t ? "" : `<div class="package-choice-selection-status" aria-live="polite"><span data-package-choice-count>0 / ${n.choose} ${game.i18n.localize("CYPHERV2.Packages.Selected")}</span></div>`}
  </div>`, r = t ? e.map((l, u) => ({
    action: `package-choice-${u}`,
    label: l.label,
    callback: () => i() ? [l.id] : []
  })) : [{
    action: "confirm-package-choice",
    label: game.i18n.localize("CYPHERV2.Actions.Confirm"),
    icon: "fa-solid fa-check",
    disabled: !0,
    callback: () => i() ? [...o] : []
  }], s = await foundry.applications.api.DialogV2.wait({
    window: { title: n.title },
    position: { width: 430 },
    content: a,
    buttons: r,
    close: () => null,
    render: t ? void 0 : (l, u) => {
      const c = [...u.element.querySelectorAll("button[data-package-choice-option]")], p = u.element.querySelector('button[data-action="confirm-package-choice"]'), f = u.element.querySelector("[data-package-choice-count]"), m = () => {
        for (const b of c) {
          const g = o.includes(b.dataset.optionId ?? "");
          b.classList.toggle("is-selected", g), b.setAttribute("aria-pressed", String(g));
        }
        p && (p.disabled = o.length !== n.choose), f && (f.textContent = game.i18n.format("CYPHERV2.Packages.SelectionCount", {
          selected: o.length,
          required: n.choose
        }));
      };
      for (const b of c)
        b.addEventListener("click", () => {
          o = Jc(o, b.dataset.optionId ?? "", n.choose), m();
        });
      m();
    }
  });
  return Array.isArray(s) && s.length === n.choose ? s : null;
}
function ht(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Hi(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
async function Kn(n) {
  const e = [...game.items].filter((i) => i.type === n).sort((i, o) => i.name.localeCompare(o.name));
  if (!e.length)
    return ui.notifications.warn(game.i18n.localize(`CYPHERV2.Packages.NoWorld${n === "characterType" ? "Types" : n === "descriptor" ? "Descriptors" : "Species"}`)), null;
  const t = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n === "characterType" ? "CYPHERV2.Packages.AddType" : n === "descriptor" ? "CYPHERV2.Packages.AddDescriptor" : "CYPHERV2.Packages.AddSpecies") },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}
      <select name="uuid">${e.map((i) => `<option value="${ht(i.uuid)}">${ht(i.name)}</option>`).join("")}</select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
  });
  return t ? await fromUuid(String(t.uuid ?? "")) : null;
}
async function Xn(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Packages.Remove") },
    content: `<div class="cypherv2-dialog-fields"><p>${game.i18n.format("CYPHERV2.Packages.RemoveConfirm", { name: ht(n) })}</p>
      <label>${game.i18n.localize("CYPHERV2.Packages.GrantedItems")}
        <select name="mode"><option value="delete">${game.i18n.localize("CYPHERV2.Packages.RemoveWithGrants")}</option><option value="keep">${game.i18n.localize("CYPHERV2.Packages.KeepGrants")}</option></select>
      </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Packages.Remove") }
  });
  return e && (e.mode === "delete" || e.mode === "keep") ? e.mode : null;
}
function $i(n) {
  console.error(n), ui.notifications.error(n instanceof Error ? n.message : String(n));
}
function br(n) {
  return n.map((e) => ({
    id: e,
    label: game.i18n.localize(`CYPHERV2.Pools.${e[0].toUpperCase()}${e.slice(1)}`)
  }));
}
async function vr(n) {
  const t = (await _n({
    title: n,
    prompt: game.i18n.format("CYPHERV2.Packages.ChooseOne", {
      label: game.i18n.localize("CYPHERV2.Packages.EdgeChoice")
    }),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.EdgeChoice"),
    choose: 1,
    options: br(I)
  }))?.[0];
  return I.includes(t) ? t : null;
}
async function Mo(n, e) {
  const t = e ?? await Kn("characterType");
  if (!t) return;
  const i = Hi(n).find((c) => c.type === "characterType");
  let o, a;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Packages.ReplaceType") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Packages.ReplaceTypeConfirm", { name: ht(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (o = i.id, a = await Xn(i.name) ?? void 0, !a)))
    return;
  const r = t.system;
  let s;
  if (r.edgeGrant.mode === "choice" && (s = await vr(t.name) ?? void 0, !s))
    return;
  const l = await dt(t.name, r.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (l === null) return;
  const u = await dt(t.name, r.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (u !== null)
    try {
      await game.cypherv2.services.characterPackages.attachType(n, t, {
        conflictResolver: wt,
        skillChoices: l,
        abilityChoices: u,
        ...s ? { edgePool: s } : {},
        ...o ? { replaceItemId: o } : {},
        ...a ? { replaceGrantedItemsMode: a } : {}
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.TypeAttached"));
      const c = n;
      if (!c.system.genre.sourceUuid) {
        const p = [...game.items].filter((m) => m.type === "genre"), f = await yr(
          r,
          p,
          async (m) => await fromUuid(m)
        );
        f && await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("CYPHERV2.Genre.TypeSuggestion") },
          content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.TypeSuggestionPrompt", { genre: ht(f.name) })}</p></div>`,
          yes: { label: game.i18n.localize("CYPHERV2.Genre.AttachSuggestion") },
          no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
        }) && await yn(c, f, "typeSuggestion");
      }
    } catch (c) {
      c instanceof Ne || $i(c);
    }
}
async function xo(n, e) {
  const t = e ?? await Kn("descriptor");
  if (!t) return;
  const i = Hi(n).some((l) => l.type === "descriptor" && l.system.instance.role === "primary"), o = await foundry.applications.api.DialogV2.input({
    window: { title: t.name },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.DescriptorRole")}
      <select name="role">${i ? "" : `<option value="primary">${game.i18n.localize("CYPHERV2.Packages.Role.primary")}</option>`}<option value="additional">${game.i18n.localize("CYPHERV2.Packages.Role.additional")}</option><option value="custom">${game.i18n.localize("CYPHERV2.Packages.Role.custom")}</option></select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Next") }
  });
  if (!o) return;
  const a = t.system, r = await wr(t.name, a.poolBonusChoiceGroups ?? []);
  if (r === null) return;
  const s = await dt(
    t.name,
    a.choiceGroups ?? [],
    game.i18n.localize("CYPHERV2.Packages.SkillChoice")
  );
  if (s !== null)
    try {
      await game.cypherv2.services.characterPackages.attachDescriptor(n, t, {
        role: String(o.role),
        poolChoices: r,
        skillChoices: s,
        conflictResolver: wt
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.DescriptorAttached"));
    } catch (l) {
      l instanceof Ne || $i(l);
    }
}
async function wr(n, e) {
  const t = {};
  for (const i of e) {
    const o = [...new Set(i.pools)].filter((r) => I.includes(r));
    if (i.choose < 1 || i.choose > o.length)
      return ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null;
    const a = await _n({
      title: n,
      prompt: i.choose === 1 ? game.i18n.localize("CYPHERV2.Packages.ChooseOnePool") : game.i18n.format("CYPHERV2.Packages.ChooseManyPools", { count: i.choose }),
      ariaLabel: game.i18n.localize("CYPHERV2.Packages.AllowedPools"),
      choose: i.choose,
      options: br(o)
    });
    if (!a) return null;
    t[i.id] = a.filter((r) => I.includes(r));
  }
  return t;
}
async function dt(n, e, t) {
  const i = {};
  for (const o of e) {
    const a = o.rank ? game.i18n.format("CYPHERV2.Packages.ChooseSkills", {
      count: o.choose,
      rank: game.i18n.localize(`CYPHERV2.Skill.Ranks.${o.rank}`)
    }) : game.i18n.format(
      o.choose === 1 ? "CYPHERV2.Packages.ChooseOne" : "CYPHERV2.Packages.ChooseMany",
      { count: o.choose, label: t }
    ), r = await _n({
      title: n,
      prompt: a,
      ariaLabel: t,
      choose: o.choose,
      options: o.options.map((s) => ({
        id: s.id,
        label: s.snapshot?.name || s.customName || s.id
      }))
    });
    if (!r) return null;
    i[o.id] = r;
  }
  return i;
}
async function Uo(n, e) {
  const t = e ?? await Kn("species");
  if (!t) return;
  const i = Hi(n).find((f) => f.type === "species");
  let o, a;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Species.Replace") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Species.ReplaceConfirm", { name: ht(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (o = i.id, a = await Xn(i.name) ?? void 0, !a)))
    return;
  const r = t.system;
  let s;
  if (r.edgeGrant.mode === "choice" && (s = await vr(t.name) ?? void 0, !s))
    return;
  const l = await dt(t.name, r.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (l === null) return;
  const u = await dt(t.name, r.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (u === null) return;
  const c = {}, p = {};
  for (const f of r.descriptorGrants ?? []) {
    const m = f.descriptorUuid ? await fromUuid(f.descriptorUuid) : null, b = m?.system ?? f.snapshot.system, g = await wr(
      f.snapshot.name || m?.name || t.name,
      b.poolBonusChoiceGroups ?? []
    );
    if (g === null) return;
    const y = await dt(f.snapshot.name || m?.name || t.name, b.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
    if (y === null) return;
    c[f.id] = y, p[f.id] = g;
  }
  try {
    await game.cypherv2.services.characterPackages.attachSpecies(n, t, {
      ...s ? { edgePool: s } : {},
      skillChoices: l,
      abilityChoices: u,
      descriptorSkillChoices: c,
      descriptorPoolChoices: p,
      conflictResolver: wt,
      ...o ? { replaceItemId: o } : {},
      ...a ? { replaceGrantedItemsMode: a } : {}
    }), ui.notifications.info(game.i18n.localize("CYPHERV2.Species.Attached"));
  } catch (f) {
    f instanceof Ne || $i(f);
  }
}
async function ed(n, e) {
  const t = Hi(n).find((o) => o.id === e);
  if (!t) return;
  const i = await Xn(t.name);
  if (i)
    try {
      await game.cypherv2.services.characterPackages.remove(n, e, i), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.Removed"));
    } catch (o) {
      $i(o);
    }
}
function Cr(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function td() {
  return [...game.user.targets ?? []].flatMap((n) => {
    const e = ir(n);
    if (e) return [e];
    const t = nr(n);
    return t ? [t] : [];
  });
}
function qo(n, e) {
  const t = Me(n);
  if (t.length === 1) {
    const o = t[0];
    return `<input type="hidden" name="pool" value="${o}"><div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${o[0].toUpperCase()}${o.slice(1)}`)}</span></div>`;
  }
  if (!e && t.length === 0) return "";
  const i = t.length > 1 ? t : Bs;
  return `<label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${i.map((o) => `<option value="${o}">${game.i18n.localize(`CYPHERV2.Pools.${o[0].toUpperCase()}${o.slice(1)}`)}</option>`).join("")}</select></label>`;
}
function id(n) {
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${jn(0, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...Cr(n).map((e) => `<option value="${e.id}">${e.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${e.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function nd(n, e) {
  const t = ne(e, "skillId");
  return Cr(n).find((i) => i.id === t);
}
function od(n) {
  const e = ne(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function Go(n) {
  const e = ne(n, "pool");
  return e === "might" || e === "speed" || e === "intellect" ? e : void 0;
}
async function ad(n, e) {
  if (!game.cypherv2.services.abilities.canUse(e)) return;
  const t = De(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = e.system.targetMode === "none" ? [] : td(), r = a.filter((g) => g.type === "npc"), s = e.system.roll !== "none", l = e.system.targetMode === "none" ? "" : `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${a.length ? a.map((g) => g.name).join(", ") : game.i18n.localize("CYPHERV2.Common.None")}</span></div>`;
  if (!s) {
    const g = await foundry.applications.api.DialogV2.input({
      window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}` },
      content: `<div class="cypherv2 cypherv2-dialog-fields"><p><strong>${e.name}</strong></p>${l}${qo(e, !1)}</div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Ability.Use") }
    });
    if (!g) return;
    try {
      const y = Go(g), w = await game.cypherv2.services.abilities.executeNoRoll(n, e, {
        ...y ? { pool: y } : {},
        targets: a,
        enabledRuleModuleIds: i
      });
      await game.cypherv2.services.abilityChat.publishNoRoll(n, w);
    } catch (y) {
      ui.notifications.error(y instanceof Error ? y.message : String(y));
    }
    return;
  }
  const u = r.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</strong><span>${game.i18n.localize("CYPHERV2.Roll.HiddenValue")}</span></div>` : jt(o.difficultyCeiling, !0), c = (g) => {
    const y = nd(n, g), w = Go(g);
    return {
      ...w ? { pool: w } : {},
      targets: a,
      difficulty: Ot(g),
      ...y ? { skill: y } : {},
      skillSteps: od(g),
      assets: G(g, "assets"),
      paidEffort: G(g, "paidEffort"),
      damageEffort: G(g, "damageEffort"),
      freeDamageEffort: G(g, "freeDamageEffort"),
      freeEffort: G(g, "freeEffort"),
      ...Bt(g),
      enabledRuleModuleIds: i
    };
  }, p = (g) => {
    const y = game.cypherv2.services.abilities.buildRollPlan(n, e, c(g)).requests[0];
    if (!y) throw new Error("Ability preview did not produce a roll request.");
    return y;
  }, f = `
    ${l}
    ${u}
    ${qo(e, !0)}
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${id(n)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${de(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${de(n.system.derived.effort.max)}</select></label>
    ${e.system.roll === "attack" ? `<label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${de(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>` : ""}
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Lt()}`, m = game.cypherv2.services.combat.policy(i), b = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Wt({
      identity: e.name,
      settings: f,
      ...e.system.roll === "attack" ? { attackSummary: " " } : {}
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (g, y) => {
      _t(y.element, {
        actor: n,
        policyRequest: t,
        buildRequest: p,
        ...e.system.roll === "attack" ? {
          attackSummary: (w, A) => [
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${e.system.damage}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${A.context.damageEffort ?? 0}</strong></div>`,
            ...(A.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${A.context.freeDamageEffort}</strong></div>`] : [],
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${A.damageEffortApplied}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${m.damageEffortBonus}</strong></div>`,
            ...e.system.woundSeverity !== "none" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Npc.WoundSeverity")}</span><strong>${game.i18n.localize(`CYPHERV2.Wounds.${e.system.woundSeverity[0].toUpperCase()}${e.system.woundSeverity.slice(1)}`)}</strong></div>`] : [],
            ...e.system.range ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${e.system.range}</strong></div>`] : []
          ].join("")
        } : {}
      });
    }
  });
  if (b)
    try {
      let g = await game.cypherv2.services.abilities.executeRoll(
        n,
        e,
        c(b),
        t
      );
      if (e.system.roll === "attack") {
        const w = await lr(g);
        w && (g = game.cypherv2.services.abilities.chooseAttackOutcomes(g, w));
      }
      for (const w of g)
        await game.cypherv2.services.abilityChat.publishRoll(
          n,
          w,
          Pi(),
          Si()
        );
      const y = g[0];
      y && await Gt().requestFreeFromNaturalResult(n, y.execution.result);
    } catch (g) {
      ui.notifications.error(g instanceof Error ? g.message : String(g));
    }
}
function rd(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function sd(n) {
  const e = String(n.pool ?? "");
  return e === "might" || e === "speed" || e === "intellect" ? e : null;
}
async function ld(n, e) {
  const t = Me(e);
  if (e.system.cost.amount <= 0 || t.length === 0)
    throw new Error(game.i18n.localize("CYPHERV2.Ability.Payment.NoCost"));
  let i = t.length === 1 ? t[0] : null;
  if (!i) {
    const r = t.map(
      (l) => game.cypherv2.services.abilities.previewPayment(n, e, l)
    ).map((l, u) => `
      <label class="ability-payment-choice">
        <input type="radio" name="pool" value="${l.pool}" ${u === 0 ? "checked" : ""}>
        <strong>${rd(l.pool)}</strong>
        <span>${game.i18n.localize("CYPHERV2.Ability.Payment.Current")}: ${l.currentBefore}</span>
        <span>${game.i18n.localize("CYPHERV2.Pools.Edge")}: ${l.edge}</span>
        <span>${game.i18n.localize("CYPHERV2.Ability.Payment.Pay")}: ${l.costPaid}</span>
      </label>`).join(""), s = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.format("CYPHERV2.Ability.Payment.Title", { name: e.name }) },
      content: `<div class="cypherv2 cypherv2-dialog ability-payment-dialog"><p>${game.i18n.localize("CYPHERV2.Ability.Cost")}: <strong>${e.system.cost.amount}</strong></p><div class="ability-payment-choices">${r}</div><p class="ability-payment-whole-cost">${game.i18n.localize("CYPHERV2.Ability.Payment.WholeCost")}</p></div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Ability.Payment.Pay") }
    });
    if (!s) return;
    if (i = sd(s), !i || !t.includes(i)) throw new Error("Invalid Ability payment Pool.");
  }
  const o = await game.cypherv2.services.abilities.payCost(n, e, i);
  await game.cypherv2.services.abilityChat.publishPayment(n, o);
}
const cd = {
  descriptor: { accepts: "descriptor", placeholder: "[DESCRIPTOR]" },
  species: { accepts: "species", placeholder: "[SPECIES]" },
  type: { accepts: "characterType", placeholder: "[TYPE]" },
  focus: { accepts: "focus", placeholder: "[FOCUS]" }
}, dd = {
  "one-action": "CYPHERV2.Hud.Recovery.Action",
  "10-minutes": "CYPHERV2.Hud.Recovery.TenMinutes",
  "1-hour": "CYPHERV2.Hud.Recovery.OneHour",
  "10-hours": "CYPHERV2.Hud.Recovery.TenHours"
};
function St(n, e) {
  const t = cd[n];
  return {
    kind: n,
    accepts: t.accepts,
    missing: !e,
    displayName: e?.name.toLocaleUpperCase("en-US") ?? t.placeholder,
    name: e?.name ?? t.placeholder,
    ...e?.id ? { id: e.id } : {},
    ...e?.uuid ? { uuid: e.uuid } : {},
    ...e?.role ? { role: e.role } : {},
    ...e?.instanceId ? { instanceId: e.instanceId } : {},
    ...e?.attachedAt !== void 0 ? { attachedAt: e.attachedAt } : {}
  };
}
const Oo = {
  primary: 0,
  additional: 1,
  custom: 1,
  speciesGranted: 2
};
function Wi(n) {
  return n.instanceId || n.id || n.uuid || `${n.role ?? "custom"}:${n.name.trim().toLocaleLowerCase("en-US")}`;
}
function ud(n = []) {
  const e = /* @__PURE__ */ new Map();
  for (const t of n) {
    const i = Wi(t);
    e.has(i) || e.set(i, t);
  }
  return [...e.values()].sort((t, i) => Oo[t.role ?? "custom"] - Oo[i.role ?? "custom"] || (t.attachedAt ?? 0) - (i.attachedAt ?? 0) || t.name.localeCompare(i.name, "en-US") || Wi(t).localeCompare(Wi(i), "en-US"));
}
function md(n) {
  const e = n.trim().replace(/^[^a-z]+/i, "").toLocaleLowerCase("en-US");
  return /^(honest|honor|hour|heir)/.test(e) ? "AN" : /^(one|once|euro|user|use|uni(?:t|v|q))/.test(e) ? "A" : /^[aeiou]/.test(e) ? "AN" : "A";
}
function pd(n = {}) {
  const e = ud(n.descriptors), t = e.map((c) => St("descriptor", c));
  e.some((c) => c.role === "primary") || t.unshift(St("descriptor"));
  const i = n.species ? St("species", n.species) : null, o = St("type", n.type), a = St("focus", n.focus), r = n.hideFocus !== !0, s = md(t[0].displayName), u = [t.map((c) => c.displayName).join(" AND "), i?.displayName, o.displayName].filter(Boolean).join(" ");
  return {
    article: s,
    descriptors: t,
    species: i,
    type: o,
    focus: a,
    showFocus: r,
    sentence: r ? `I AM ${s} ${u} WHO ${a.displayName}` : `I AM ${s} ${u}`
  };
}
function fd(n, e) {
  const t = Math.max(0, Math.trunc(e)), i = Math.max(0, Math.min(t, Math.trunc(n)));
  return Array.from({ length: t }, (o, a) => ({
    index: a,
    filled: a < i,
    targetCount: a + 1 === i ? i - 1 : a + 1
  }));
}
function di(n, e) {
  return ["minor", "moderate", "major"].map((t) => ({
    severity: t,
    count: n[t],
    capacity: e[t],
    overCapacity: Math.max(0, n[t] - e[t]),
    pips: fd(n[t], e[t])
  }));
}
function hd(n) {
  return (Array.isArray(n) ? n : Qe(n)).map((t) => {
    const i = t.used;
    return { id: t.id, type: t.type, used: i, available: !i, shortLabel: dd[t.type] };
  });
}
function Er(n, e) {
  const t = Number.isFinite(e) ? Math.max(0, e) : 0, i = Number.isFinite(n) ? Math.max(0, Math.min(t, n)) : 0, o = t > 0 ? i / t : 0;
  return { current: i, max: t, ratio: o, percent: o * 100 };
}
const gd = ["name", "rank"], Bo = {
  expert: 0,
  specialized: 1,
  trained: 2,
  untrained: 3,
  inability: 4
};
function yd(n) {
  return gd.includes(n);
}
function bd(n, e) {
  return [...n].sort((t, i) => (e === "rank" ? Bo[t.rank] - Bo[i.rank] : 0) || t.name.localeCompare(i.name, "en-US"));
}
function vd(n) {
  const e = n.system.grantedBy;
  return !e || e.status === "retained" ? !0 : !e.sourceUuid && !e.instanceId && !e.grantId;
}
function Lo(n) {
  const e = Me(n), t = Number.isInteger(n.system.cost.amount) && n.system.cost.amount > 0 ? n.system.cost.amount : 0;
  return {
    archived: n.system.archived === !0,
    cost: { amount: t, pools: e, payable: t > 0 && e.length > 0 },
    description: n.system.description.trim(),
    canDelete: vd(n)
  };
}
function wd(n) {
  const e = new Intl.Collator("en-US", { sensitivity: "base", numeric: !0 });
  return n.map((t, i) => ({ ability: t, index: i })).sort((t, i) => +(t.ability.system.archived === !0) - +(i.ability.system.archived === !0) || e.compare(t.ability.name, i.ability.name) || t.index - i.index).map(({ ability: t }) => t);
}
class Cd {
  #e = /* @__PURE__ */ new Set();
  isExpanded(e) {
    return this.#e.has(e);
  }
  toggle(e) {
    return this.#e.delete(e) ? !1 : (this.#e.add(e), !0);
  }
  remove(e) {
    this.#e.delete(e);
  }
  retain(e) {
    const t = new Set(e);
    for (const i of this.#e)
      t.has(i) || this.#e.delete(i);
  }
}
function Ii(n) {
  return String(n.level ?? "1").trim() || "1";
}
function bi(n) {
  return !/^\d+$/.test(Ii(n));
}
function bn(n) {
  return n.depleted !== !0;
}
function Rr(n) {
  return Sn.includes(n) ? n : "subtle";
}
function Pr(n) {
  return kn.includes(n) ? n : "low";
}
function Jn(n) {
  const e = Number(n.level);
  return n.levelOverride === !0 && Number.isInteger(e) && e >= 1 ? e : Rr(n.manifestation) === "manifest" ? 6 : 4;
}
const vn = ["equipment", "cypher", "artifact"];
function jo(n, e) {
  const t = Number(n);
  return Number.isInteger(t) && t >= 0 ? t : e;
}
function mi(n) {
  return vn.includes(n);
}
function Ed(n) {
  if (!mi(n.type)) return null;
  const e = n.system.depletion && typeof n.system.depletion == "object" ? n.system.depletion : null;
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    level: n.type === "cypher" ? Jn(n.system) : n.type === "artifact" ? Ii(n.system) : null,
    levelRollable: n.type === "artifact" && bi(n.system),
    power: n.type === "cypher" ? Pr(n.system.power) : null,
    quantity: n.type === "equipment" ? jo(n.system.quantity, 1) : null,
    equipped: n.type === "equipment" && typeof n.system.equipped == "boolean" ? n.system.equipped : null,
    description: typeof n.system.description == "string" ? n.system.description.trim() : "",
    depleted: n.type === "artifact" && n.system.depleted === !0,
    usable: n.type !== "artifact" || bn(n.system),
    depletion: n.type === "artifact" && e ? {
      enabled: !!e.enabled,
      formula: String(e.formula || `1${String(e.die ?? "d6")}`),
      threshold: jo(e.threshold, 1)
    } : null
  };
}
class Wo {
  #e = /* @__PURE__ */ new Set();
  isExpanded(e) {
    return this.#e.has(e);
  }
  toggle(e) {
    return this.#e.delete(e) ? !1 : (this.#e.add(e), !0);
  }
  remove(e) {
    this.#e.delete(e);
  }
  retain(e) {
    const t = new Set(e);
    for (const i of this.#e)
      t.has(i) || this.#e.delete(i);
  }
}
function wn(n) {
  const e = n.track, t = n.severity, i = n.count, o = i === void 0 || i.trim() === "" ? Number.NaN : Number(i);
  if (e !== "character" && e !== "shield" || !ie.includes(t) || !Number.isInteger(o) || o < 0) throw new Error("Invalid Wound count action data.");
  if (e === "shield") {
    const a = n.shieldId?.trim();
    if (!a) throw new Error("Invalid Wound count action data.");
    return { track: e, shieldId: a, severity: t, count: o };
  }
  return { track: e, severity: t, count: o };
}
function Rd(n) {
  const e = n.family, t = n.category;
  if (e !== "weapon" && e !== "armor") throw new Error("Invalid familiarity action data.");
  if (!t || !(e === "weapon" ? Te : ze).includes(t)) throw new Error("Invalid familiarity action data.");
  return { family: e, category: t };
}
function Pd(n, e) {
  const t = /* @__PURE__ */ new Set([...Te, ...ze]), i = new Set(n.filter((o) => t.has(o)));
  return i.has(e) ? i.delete(e) : i.add(e), [...i];
}
async function Sd(n, e, t) {
  const i = e === "weapon" ? "weaponCategories" : "armorCategories", o = Pd(n.system.proficiencies[i], t);
  return await n.update({ [`system.proficiencies.${i}`]: o }), o;
}
const ai = "system." + H;
function Sr() {
  return [...game.users];
}
function _o() {
  return Sr().filter((n) => n.active && n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function Ko(n, e) {
  return e.isGM || n.testUserPermission(e, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function kd(n) {
  return [...game.messages].some((e) => {
    const t = e.getFlag(H, "playerIntrusion");
    return !!(t && typeof t == "object" && t.requestId === n);
  });
}
class Ad {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(ai, (e) => {
      this.#r(e);
    });
  }
  async activate(e) {
    if (!Ko(e, game.user))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.NotAuthorized"));
    if (!this.#e.canUse(e))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.RequiresXP"));
    if (this.#i.has(e.uuid)) return !1;
    this.#i.add(e.uuid);
    try {
      if (!await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Intrusion.Player.Title") },
        content: '<div class="cypherv2 cypherv2-dialog player-intrusion-dialog"><p>' + game.i18n.localize("CYPHERV2.Intrusion.Player.ConfirmPrompt") + "</p></div>",
        yes: { label: game.i18n.localize("CYPHERV2.Intrusion.Player.Confirm") },
        no: { label: game.i18n.localize("CYPHERV2.Intrusion.Player.Cancel") }
      })) return !1;
      const i = Ue(), o = _o();
      return o && o.id !== game.user.id ? game.socket.emit(ai, {
        type: "player-intrusion-request",
        requestId: i,
        actorUuid: e.uuid,
        requesterUserId: game.user.id
      }) : await this.#o(i, e.uuid, game.user.id), !0;
    } finally {
      this.#i.delete(e.uuid);
    }
  }
  async #o(e, t, i) {
    if (!(this.#n.has(e) || kd(e))) {
      this.#n.add(e);
      try {
        const a = await fromUuid(t);
        if (!a || a.type !== "character" || a.uuid !== t)
          throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.CharacterMissing"));
        const r = Sr().find((l) => l.id === i && l.active);
        if (!r || !Ko(a, r))
          throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.NotAuthorized"));
        const s = await this.#e.spend(a, e);
        await this.#t.publish(s, a), Hooks.callAll("cypherv2PlayerIntrusionCreated", s, a);
      } finally {
        this.#n.delete(e);
      }
    }
  }
  async #r(e) {
    if (!e || typeof e != "object") return;
    const t = e.type;
    if (t !== "player-intrusion-request" && t !== "player-intrusion-result") return;
    const i = e;
    if (i.type === "player-intrusion-result") {
      i.recipientUserId === game.user.id && !i.success && i.error && ui.notifications.error(i.error);
      return;
    }
    const o = _o();
    if (!(!game.user.isGM || o?.id !== game.user.id))
      try {
        await this.#o(i.requestId, i.actorUuid, i.requesterUserId), game.socket.emit(ai, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !0
        });
      } catch (a) {
        game.socket.emit(ai, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !1,
          error: a instanceof Error ? a.message : String(a)
        });
      }
  }
}
let Ft = null;
function Hd(n, e) {
  return Ft = new Ad(n, e), Ft.initialize(), Ft;
}
function $d() {
  if (!Ft) throw new Error("Player Intrusion controller is not ready.");
  return Ft;
}
const _i = "is-quick-roll-pulse";
function Id(n) {
  n.classList.remove(_i), n.offsetWidth, n.classList.add(_i), n.addEventListener("animationend", () => {
    n.classList.remove(_i);
  }, { once: !0 });
}
const Vd = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);
function Xo(n) {
  const e = n.dataset.severity, t = n.dataset.woundId;
  if (!ie.includes(e) || !t)
    throw new Error("Invalid Wound action data.");
  return { severity: e, woundId: t };
}
function z(n) {
  const e = n.dataset.itemId;
  if (!e) throw new Error("Missing Item ID.");
  return e;
}
function Yd(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function Ki(n) {
  return n > 0 ? `+${n}` : String(n);
}
function Oe(n) {
  const e = n.dataset.focusUuid, t = n.dataset.nodeId;
  if (!e || !t) throw new Error("Missing Focus node action data.");
  return { focusUuid: e, nodeId: t };
}
const Dd = {
  "not-character": "CYPHERV2.Focus.Errors.NotCharacter",
  "node-not-found": "CYPHERV2.Focus.Errors.NodeNotFound",
  "progress-missing": "CYPHERV2.Focus.Errors.ProgressMissing",
  "progress-duplicated": "CYPHERV2.Focus.Errors.ProgressDuplicated",
  "not-eligible": "CYPHERV2.Focus.Errors.NotEligible",
  "choice-required": "CYPHERV2.Focus.Errors.ChoiceRequired",
  "restore-not-owned": "CYPHERV2.Focus.Errors.RestoreNotOwned",
  "undo-not-owned": "CYPHERV2.Focus.Errors.UndoNotOwned",
  "undo-dependent-nodes": "CYPHERV2.Focus.Errors.UndoDependencies",
  "duplicate-grant": "CYPHERV2.Focus.Errors.DuplicateGrant",
  "ability-data-unavailable": "CYPHERV2.Focus.Errors.AbilityDataUnavailable"
};
async function ke(n, e) {
  try {
    const i = await fromUuid(e);
    if (i?.type === "focus") return i;
  } catch {
  }
  const t = n.items.get(e);
  return t?.type === "focus" ? t : null;
}
const Jo = /* @__PURE__ */ new Set([
  "applyWound",
  "setCharacterWoundCount",
  "setShieldWoundCount",
  "toggleFamiliarity",
  "editWound",
  "deleteWound",
  "poolDamage",
  "recovery",
  "recoveryType",
  "resetRecoveries",
  "rally",
  "editCharacterOverride",
  "clearCharacterOverride",
  "rollPool",
  "editWoundCapacityOverride",
  "resetWoundCapacityOverride",
  "editRecoveryOverride",
  "resetRecoveryOverride",
  "createSkill",
  "rollSkill",
  "configureSkillRoll",
  "deleteSkill",
  "resetHeaderAppearance",
  "createWeapon",
  "createArmor",
  "createShield",
  "attackWeapon",
  "rollCombatDepletion",
  "reloadWeapon",
  "toggleShieldEquipped",
  "toggleArmorEquipped",
  "deleteCombatItem",
  "block",
  "dodge",
  "acquireFocusNode",
  "gmAcquireFocusNode",
  "purchaseAdvancement",
  "advanceTier",
  "completeProgressionGuidance",
  "resetProgressionGuidance",
  "addFocus",
  "removeFocus",
  "toggleGmProgressionEdit",
  "undoFocusAcquisition",
  "gmMarkFocusOwned",
  "gmRemoveFocusOwned",
  "beginCoreSetup",
  "skipCoreSetup",
  "markCoreInitialized",
  "restoreFocusAbility",
  "addType",
  "addDescriptor",
  "addSpecies",
  "addGenre",
  "removeGenre",
  "acquireGenreAbility",
  "browseGenreAbilities",
  "removePackage",
  "createAbility",
  "useAbility",
  "payAbilityCost",
  "toggleAbilityArchived",
  "deleteAbility",
  "sendItemToChat",
  "createInventoryItem",
  "deleteInventoryItem",
  "rollInventoryDepletion",
  "rollArtifactLevel",
  "playerIntrusion"
]);
class R extends Vd {
  #e = new ur();
  #t = new mr();
  #i = null;
  #n = !1;
  #o = "name";
  #r = new Cd();
  #a = new Wo();
  #c = new Wo();
  #l = null;
  #s = null;
  #d = "skills";
  static DEFAULT_OPTIONS = {
    ...Mn,
    classes: ["cypherv2", "sheet", "actor", "character-sheet"],
    actions: Un({
      applyWound: R.#K,
      setCharacterWoundCount: R.#X,
      setShieldWoundCount: R.#J,
      toggleFamiliarity: R.#Q,
      editWound: R.#Z,
      deleteWound: R.#ee,
      poolDamage: R.#te,
      recovery: R.#ie,
      recoveryType: R.#ne,
      resetRecoveries: R.#oe,
      rally: R.#ae,
      editCharacterOverride: R.#se,
      clearCharacterOverride: R.#le,
      editWoundCapacityOverride: R.#ce,
      resetWoundCapacityOverride: R.#de,
      editRecoveryOverride: R.#ue,
      resetRecoveryOverride: R.#me,
      rollPool: R.#pe,
      inspectHeaderFocus: R.#g,
      createSkill: R.#A,
      setSkillSort: R.#fe,
      rollSkill: R.#H,
      configureSkillRoll: R.#C,
      editSkill: R.#I,
      deleteSkill: R.#R,
      resetHeaderAppearance: R.#$,
      createWeapon: R.#he,
      createArmor: R.#P,
      createShield: R.#V,
      attackWeapon: R.#ge,
      toggleCombatDetails: R.#E,
      rollCombatDepletion: R.#h,
      reloadWeapon: R.#be,
      toggleShieldEquipped: R.#ve,
      toggleArmorEquipped: R.#we,
      editCombatItem: R.#Ce,
      deleteCombatItem: R.#Ee,
      block: R.#Re,
      dodge: R.#Pe,
      openFocusNode: R.#Se,
      acquireFocusNode: R.#ke,
      gmAcquireFocusNode: R.#Ae,
      purchaseAdvancement: R.#He,
      advanceTier: R.#$e,
      completeProgressionGuidance: R.#Ie,
      resetProgressionGuidance: R.#Ve,
      addFocus: R.#Ye,
      removeFocus: R.#De,
      toggleGmProgressionEdit: R.#Fe,
      undoFocusAcquisition: R.#Te,
      gmMarkFocusOwned: R.#ze,
      gmRemoveFocusOwned: R.#Ne,
      beginCoreSetup: R.#Me,
      skipCoreSetup: R.#xe,
      markCoreInitialized: R.#Ue,
      restoreFocusAbility: R.#qe,
      addType: R.#b,
      addDescriptor: R.#p,
      addSpecies: R.#f,
      addGenre: R.#y,
      inspectGenre: R.#m,
      removeGenre: R.#v,
      acquireGenreAbility: R.#w,
      browseGenreAbilities: R.#Y,
      inspectPackage: R.#D,
      removePackage: R.#F,
      inspectGrantedItem: R.#T,
      createAbility: R.#N,
      useAbility: R.#z,
      payAbilityCost: R.#U,
      toggleAbilityArchived: R.#q,
      toggleAbilityDetails: R.#M,
      inspectAbility: R.#x,
      deleteAbility: R.#G,
      sendItemToChat: R.#_,
      createInventoryItem: R.#O,
      openInventoryItem: R.#B,
      deleteInventoryItem: R.#L,
      toggleInventoryDetails: R.#S,
      rollInventoryDepletion: R.#j,
      rollArtifactLevel: R.#W,
      playerIntrusion: R.#re
    }, Jo),
    position: { width: 760, height: 760 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/actor/character-sheet.hbs" }
  };
  static TABS = {
    primary: {
      tabs: [
        { id: "skills", icon: "fa-solid fa-graduation-cap", label: "CYPHERV2.Tabs.Skills" },
        { id: "abilities", icon: "fa-solid fa-bolt", label: "CYPHERV2.Tabs.Abilities" },
        { id: "combat", icon: "fa-solid fa-swords", label: "CYPHERV2.Tabs.Combat" },
        { id: "inventory", icon: "fa-solid fa-backpack", label: "CYPHERV2.Tabs.Inventory" },
        { id: "advancement", icon: "fa-solid fa-arrow-up-right-dots", label: "CYPHERV2.Tabs.Advancement" },
        { id: "notes", icon: "fa-solid fa-book-open", label: "CYPHERV2.Tabs.Notes" },
        { id: "settings", icon: "fa-solid fa-sliders", label: "CYPHERV2.Tabs.Settings" }
      ],
      initial: "skills"
    }
  };
  async _onRender(e, t) {
    if (await super._onRender(e, t), qn(this.element, this.isEditable, Jo), this.#s) {
      this.#d = this.#s.activeTab;
      const i = this.changeTab;
      typeof i == "function" && i.call(this, this.#d, "primary"), pc(this.element, this.#s), this.#s = null;
    }
    this.#e.bind(this.element), this.#t.bind(this.element), this.#k(), this.#u();
  }
  _onClose(e) {
    this.#i?.abort(), this.#i = null, this.#e.disconnect(), this.#t.disconnect(), this.#l?.abort(), this.#l = null, super._onClose(e);
  }
  #u() {
    this.#l?.abort(), this.#l = null;
    const e = [...this.element.querySelectorAll("input[data-inventory-quantity]")], t = [...this.element.querySelectorAll(
      ".combat-weapon-row[data-action], .combat-shield-row[data-action], .combat-armor-row[data-action]"
    )];
    if (!e.length && !t.length) return;
    const i = new AbortController();
    this.#l = i;
    for (const o of t)
      o.addEventListener("keydown", (a) => {
        a.target !== o || a.key !== "Enter" && a.key !== " " || (a.preventDefault(), o.click());
      }, { signal: i.signal });
    if (this.isEditable)
      for (const o of e)
        o.addEventListener("change", async (a) => {
          a.stopPropagation();
          const r = o.dataset.itemId, s = r ? this.actor.items.get(r) : null, l = Number(o.value);
          if (!s || s.type !== "equipment" || !Number.isInteger(l) || l < 0) {
            await this.render({ force: !0 });
            return;
          }
          await s.update({ "system.quantity": l });
        }, { signal: i.signal });
  }
  _canDragDrop(e) {
    return this.isEditable;
  }
  async _onDropDocument(e, t) {
    if (!this.isEditable) return null;
    const i = t, a = (e.target instanceof Element ? e.target.closest("[data-hud-drop]") : null)?.dataset.hudDrop;
    return a && i?.type !== a ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.Hud.InvalidIdentityDrop")), null) : i?.type === "focus" ? (await Io(this.actor, i), i) : i?.type === "characterType" ? (await Mo(this.actor, i), i) : i?.type === "descriptor" ? (await xo(this.actor, i), i) : i?.type === "species" ? (await Uo(this.actor, i), i) : i?.type === "genre" ? (await yn(this.actor, i), i) : super._onDropDocument(e, t);
  }
  static async #b() {
    await Mo(this.actor);
  }
  static async #p() {
    await xo(this.actor);
  }
  static async #f() {
    await Uo(this.actor);
  }
  static async #y() {
    await yn(this.actor);
  }
  static async #m() {
    await (await game.cypherv2.services.genres.active(this.actor))?.sheet?.render(!0);
  }
  static async #v() {
    await _c(this.actor);
  }
  static async #w(e, t) {
    const i = t.dataset.choiceId;
    i && await Kc(this.actor, i);
  }
  static async #Y() {
    await Xc(this.actor), await this.render({ force: !0 });
  }
  static async #D(e, t) {
    const i = this.actor.items.get(z(t));
    i?.type !== "characterType" && i?.type !== "descriptor" && i?.type !== "species" || await i.sheet?.render(!0);
  }
  static async #F(e, t) {
    await ed(this.actor, z(t));
  }
  static async #T(e, t) {
    await this.actor.items.get(z(t))?.sheet?.render(!0);
  }
  static async #z(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await ad(
      this.actor,
      i
    );
  }
  static async #N() {
    await (await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Ability.New"),
      type: "ability"
    }]))[0]?.sheet?.render(!0);
  }
  static #M(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = z(t), o = this.#r.toggle(i), a = t.closest(".compact-ability");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-ability-details");
    r && (r.hidden = !o);
    for (const s of a.querySelectorAll("[data-action='toggleAbilityDetails']"))
      s.setAttribute("aria-expanded", String(o));
  }
  static async #x(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await i.sheet?.render(!0);
  }
  static async #U(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    try {
      await ld(
        this.actor,
        i
      );
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #q(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    const o = i.system.archived === !0;
    await i.update({ "system.archived": !o });
  }
  static async #G(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    if (!Lo(i).canDelete) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Ability.DeleteGranted"));
      return;
    }
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Ability.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Ability.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#r.remove(i.id), await i.delete());
  }
  static async #O(e, t) {
    const i = t.dataset.itemType;
    if (!mi(i)) throw new Error("Invalid Inventory Item type.");
    await (await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize(`CYPHERV2.Inventory.New.${i}`),
      type: i
    }]))[0]?.sheet?.render(!0);
  }
  static async #B(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || !mi(i.type)) throw new Error("Inventory Item not found.");
    await i.sheet?.render(!0);
  }
  static #S(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = z(t), o = this.#a.toggle(i), a = t.closest(".compact-inventory-item");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-inventory-details");
    r && (r.hidden = !o), t.setAttribute("aria-expanded", String(o));
  }
  static async #L(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || !mi(i.type)) throw new Error("Inventory Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Inventory.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Inventory.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#a.remove(i.id), await i.delete());
  }
  static async #j(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    await yi(i);
  }
  static async #W(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    try {
      const o = await game.cypherv2.services.artifacts.rollLevel(i);
      await game.cypherv2.services.itemChat.publishArtifactLevelRoll(i, o);
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #_(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || !["ability", "weapon", "shield", "armor", ...vn].includes(i.type))
      throw new Error("Chat Item not found.");
    await game.cypherv2.services.itemChat.publish(i);
  }
  static async #K() {
    await $l(this.actor);
  }
  static async #X(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = wn(t.dataset);
    if (i.track !== "character") throw new Error("Invalid Character Wound count action data.");
    await game.cypherv2.services.wounds.setCount(
      this.actor,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #J(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = wn(t.dataset);
    if (i.track !== "shield") throw new Error("Invalid Shield Wound count action data.");
    const o = this.actor.items.get(i.shieldId);
    if (!o || o.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setCount(
      o,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #Q(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const { family: i, category: o } = Rd(t.dataset);
    await Sd(this.actor, i, o), await this.render({ force: !0 });
  }
  static async #Z(e, t) {
    const { severity: i, woundId: o } = Xo(t);
    await Al(this.actor, i, o);
  }
  static async #ee(e, t) {
    const { severity: i, woundId: o } = Xo(t);
    await Hl(this.actor, i, o);
  }
  static async #te() {
    await Il(this.actor);
  }
  static async #ie() {
    await ho(this.actor);
  }
  static async #ne(e, t) {
    const i = t.dataset.recoveryType, o = t.dataset.recoverySlotId;
    !i || !Ce.includes(i) || await ho(this.actor, i, o);
  }
  static async #oe() {
    if (!game.user.isGM || !await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Hud.ResetRecoveriesConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })) return;
    const t = this.actor.system.recovery.slots.map((i) => ({ ...i, used: !1 }));
    await this.actor.update({
      "system.recovery.slots": t,
      "system.recovery.used": mt(t)
    }), ui.notifications.info(game.i18n.localize("CYPHERV2.Hud.RecoveriesReset"));
  }
  static async #ae(e) {
    e?.stopPropagation(), await Vl(this.actor);
  }
  static async #re(e, t) {
    e.preventDefault(), e.stopPropagation(), t instanceof HTMLButtonElement && (t.disabled = !0);
    try {
      await $d().activate(
        this.actor
      );
    } catch (i) {
      ui.notifications.error(i instanceof Error ? i.message : String(i));
    } finally {
      t instanceof HTMLButtonElement && this.actor.system.xp >= 1 && (t.disabled = !1);
    }
  }
  static async #se(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    !i || !Vi.includes(i) || await Fl(this.actor, i);
  }
  static async #le(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    if (!i || !Vi.includes(i)) return;
    const o = ln(
      this.actor.system,
      i
    );
    await this.actor.update({ [o.path]: null });
  }
  static async #ce(e) {
    e.preventDefault(), e.stopPropagation(), await zl(this.actor);
  }
  static async #de(e) {
    e.preventDefault(), e.stopPropagation(), await Gl(this.actor);
  }
  static async #ue(e) {
    e.preventDefault(), e.stopPropagation(), await ql(this.actor);
  }
  static async #me(e) {
    e.preventDefault(), e.stopPropagation(), await Ol(this.actor);
  }
  static async #pe(e, t) {
    if (e.target instanceof Element && e.target.closest("input, button, select, textarea, a")) return;
    const i = t.dataset.pool;
    !i || !I.includes(i) || await oc(this.actor, i);
  }
  #k() {
    this.#i?.abort(), this.#i = new AbortController();
    const { signal: e } = this.#i;
    for (const i of this.element.querySelectorAll(".character-hud-pool[data-action='rollPool']"))
      i.addEventListener("keydown", (o) => {
        o.target !== i || o.key !== "Enter" && o.key !== " " || (o.preventDefault(), i.click());
      }, { signal: e });
    const t = this.element.querySelector("input[data-header-color]");
    t && this.isEditable && t.addEventListener("change", async (i) => {
      i.stopPropagation(), await this.actor.update({ "system.appearance.color": t.value });
    }, { signal: e });
  }
  static async #g(e, t) {
    const i = t.dataset.focusUuid;
    if (!i) return;
    await (await ke(this.actor, i))?.sheet?.render(!0);
  }
  static async #A() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Skill.New"),
      type: "skill"
    }]);
  }
  static #fe(e, t) {
    const i = t.dataset.sortMode;
    !yd(i) || i === this.#o || (this.#o = i, this.render({ force: !0 }));
  }
  static async #H(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    Id(t);
    try {
      const o = Je(), a = game.cypherv2.services.skills.buildQuickRollRequest(
        i,
        { enabledRuleModuleIds: o }
      ), r = await game.cypherv2.services.rolls.execute(
        this.actor,
        a,
        De()
      );
      await On(this.actor, r);
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #C(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await rc(
      this.actor,
      i
    );
  }
  static async #$(e) {
    e.preventDefault(), e.stopPropagation(), await this.actor.update({
      "system.appearance.backgroundMode": "theme",
      "system.appearance.customImage": "",
      "system.appearance.color": ""
    });
  }
  static async #I(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await i.sheet?.render(!0);
  }
  static async #R(e, t) {
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Skill.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Skill.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && await i.delete();
  }
  static async #he() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Weapon.New"), type: "weapon" }]);
  }
  static async #P() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Armor.New"), type: "armor" }]);
  }
  static async #V() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Shield.New"),
      type: "shield"
    }]);
  }
  static async #ge(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    if (!game.cypherv2.services.weapons.ammunition(i).canAttack) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.Weapon.InsufficientAmmo"));
      return;
    }
    await cc(
      this.actor,
      i
    );
  }
  static #E(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = z(t), o = this.#c.toggle(i), a = t.closest(".compact-combat-item");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-combat-details");
    r && (r.hidden = !o), t.setAttribute("aria-expanded", String(o));
  }
  static async #h(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || !["weapon", "shield", "armor"].includes(i.type))
      throw new Error("Combat Item not found.");
    await yi(i);
  }
  static async #be(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    await game.cypherv2.services.weapons.reload(i);
  }
  static async #ve(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setEquipped(
      this.actor,
      i,
      !i.system.equipped
    );
  }
  static async #we(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "armor") throw new Error("Armor Item not found.");
    await i.update({ "system.equipped": !i.system.equipped });
  }
  static async #Ce(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await i.sheet?.render(!0);
  }
  static async #Ee(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(z(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Combat.DeleteItem") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.DeleteItemConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#c.remove(i.id), await i.delete());
  }
  static async #Re() {
    await pn(this.actor, "block");
  }
  static async #Pe() {
    await pn(this.actor, "dodge");
  }
  static async #Se(e, t) {
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    if (!a) throw new Error("Focus Item not found.");
    await dr(a, o);
  }
  static async #ke(e, t) {
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    if (!a) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const r = await game.cypherv2.services.focusAcquisition.acquireManual(
        this.actor,
        a,
        o,
        wt
      );
      ui.notifications.info(game.i18n.localize(
        r.status === "acquired" ? "CYPHERV2.Focus.Acquired" : "CYPHERV2.Focus.AlreadyOwned"
      )), r.status === "acquired" && await this.actor.sheet?.render(!0);
    } catch (r) {
      R.#ye(r);
    }
  }
  static async #Ae(e, t) {
    if (!game.user.isGM) return;
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    if (!(!a || !await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.GmOverrideConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })))
      try {
        await game.cypherv2.services.focusAcquisition.acquireWithGmOverride(
          this.actor,
          a,
          o
        ), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Acquired")), await this.actor.sheet?.render(!0);
      } catch (s) {
        R.#ye(s);
      }
  }
  static async #He(e, t) {
    const i = t.dataset.kind;
    i !== "other" && !$n.includes(i) || await Yc(
      this.actor,
      i
    );
  }
  static async #$e() {
    await Dc(this.actor);
  }
  static async #Ie() {
    await game.cypherv2.services.advancement.completeProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #Ve() {
    await game.cypherv2.services.advancement.resetProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #Ye() {
    await Io(this.actor);
  }
  static async #De(e, t) {
    const i = t.dataset.focusUuid;
    i && await zc(this.actor, i);
  }
  static async #Fe() {
    game.user.isGM && (this.#n = !this.#n, await this.render({ force: !0 }));
  }
  static async #Te(e, t) {
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    a && (await Fo(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #ze(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    a && (await Oc(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #Ne(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    a && (await Fo(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #Me() {
    await qc(this.actor);
  }
  static async #xe() {
    game.user.isGM && await Do(this.actor, "skipped");
  }
  static async #Ue() {
    game.user.isGM && await Do(this.actor, "manual");
  }
  static async #qe(e, t) {
    const { focusUuid: i, nodeId: o } = Oe(t), a = await ke(this.actor, i);
    if (!a) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const r = await game.cypherv2.services.focusAcquisition.restoreAbility(
        this.actor,
        a,
        o
      );
      ui.notifications.info(game.i18n.localize(
        r.status === "restored" ? "CYPHERV2.Focus.AbilityRestored" : "CYPHERV2.Focus.AbilityAlreadyPresent"
      )), r.status === "restored" && await this.actor.sheet?.render(!0);
    } catch (r) {
      R.#ye(r);
    }
  }
  static #ye(e) {
    if (!(e instanceof Ne)) {
      if (e instanceof oe) {
        ui.notifications.error(game.i18n.localize(Dd[e.code]));
        return;
      }
      console.error(e), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
    }
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#s = mc(this.element), this.#d = this.#s.activeTab);
    const t = await super._prepareContext(e), i = bd([...this.actor.items].filter((h) => h.type === "skill").map((h) => {
      const C = h, F = game.cypherv2.services.skills.configuredPool(C);
      return {
        id: C.id,
        name: C.name,
        rank: C.system.rank,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${C.system.rank}`),
        poolLabel: F ? game.i18n.localize(`CYPHERV2.Pools.${F[0].toUpperCase()}${F.slice(1)}`) : game.i18n.localize("CYPHERV2.Skill.ChoosePool")
      };
    }), this.#o), o = wd([...this.actor.items].filter((h) => h.type === "ability").map((h) => h));
    this.#r.retain(o.map((h) => h.id));
    const a = await Promise.all(o.map(async (h, C) => {
      const F = h, q = Lo(h), fe = this.#r.isExpanded(h.id), Pe = La(
        q.cost.amount,
        q.cost.pools,
        Yd,
        {
          pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
          middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
          final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
        }
      ), tt = q.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        q.description,
        { async: !0, relativeTo: F }
      ) : "";
      return {
        id: h.id,
        name: h.name,
        archived: q.archived,
        startsArchivedGroup: q.archived && (C === 0 || o[C - 1].system.archived !== !0),
        canPay: this.isEditable && q.cost.payable,
        canDelete: this.isEditable && q.canDelete,
        expanded: fe,
        costLabel: Pe,
        enrichedDescription: tt,
        hasDescription: !!q.description
      };
    })), r = this.actor, s = [...this.actor.items].filter((h) => h.type === "weapon" || h.type === "shield" || h.type === "armor");
    s.filter((h) => h.type === "shield" && !!h.system.equipped).length > 1 && this.isEditable && await game.cypherv2.services.shields.normalizeEquipped(
      r
    ), this.#c.retain(s.map((h) => h.id));
    const u = async (h, C) => C ? foundry.applications.ux.TextEditor.implementation.enrichHTML(C, { async: !0, relativeTo: h }) : "", c = (await Promise.all(s.filter((h) => h.type === "weapon").map(async (h) => {
      const C = h, F = C.system.description.trim();
      return {
        id: C.id,
        name: C.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${C.system.category}`),
        attackType: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${C.system.attackType}`),
        range: game.i18n.localize(`CYPHERV2.Combat.Range.${C.system.rangeCategory}`),
        damage: game.cypherv2.services.combat.weaponBaseDamage(C),
        depletionEnabled: C.system.depletion.enabled,
        depletionLabel: C.system.depletion.enabled ? qi(C.system.depletion) : "",
        ammoEnabled: C.system.ammo.enabled,
        ammoLabel: C.system.ammo.enabled ? `${C.system.ammo.value} / ${C.system.ammo.max}` : "",
        canAttack: game.cypherv2.services.weapons.ammunition(C).canAttack,
        depleted: !!C.system.depleted,
        freelyUsed: game.cypherv2.services.combat.weaponFreelyUsed(r, C),
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), p = (await Promise.all(s.filter((h) => h.type === "armor").map(async (h) => {
      const C = h, F = C.system.description.trim(), q = C.system.depletion;
      return {
        id: C.id,
        name: C.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${C.system.category}`),
        equipped: C.system.equipped,
        freelyUsed: game.cypherv2.services.combat.armorFreelyUsed(r, C),
        depletionEnabled: !!q?.enabled,
        depletionLabel: q?.enabled ? qi(q) : "",
        depleted: !!C.system.depleted,
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), f = (await Promise.all(s.filter((h) => h.type === "shield").map(async (h) => {
      const C = h, F = C.system.description.trim(), q = C.system.depletion, fe = di({
        minor: C.system.wounds.minor.length,
        moderate: C.system.wounds.moderate.length,
        major: C.system.wounds.major.length
      }, C.system.derived.capacities).map((Pe) => ({
        ...Pe,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${Pe.severity}`),
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${Pe.severity}`)
      }));
      return {
        id: C.id,
        name: C.name,
        equipped: C.system.equipped,
        broken: game.cypherv2.services.shields.isBroken(C),
        minor: C.system.wounds.minor.length,
        moderate: C.system.wounds.moderate.length,
        major: C.system.wounds.major.length,
        capacities: C.system.derived.capacities,
        woundTracks: fe,
        depletionEnabled: !!q?.enabled,
        depletionLabel: q?.enabled ? qi(q) : "",
        depleted: !!C.system.depleted,
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), m = f.filter((h) => h.equipped).length > 1, b = this.actor.system, g = [], y = [], w = [];
    for (const h of b.focusProgress ?? []) {
      const C = await ke(this.actor, h.focusUuid);
      if (!C || C.type !== "focus") {
        y.push(h.focusUuid);
        continue;
      }
      w.push({
        uuid: h.focusUuid,
        name: C.name,
        provenance: h.provenance ?? "additional"
      });
      const F = await game.cypherv2.services.focusTrees.prepare(C, {
        characterTier: O(this.actor.system),
        progress: h,
        editable: this.isEditable,
        missingOwnedNodeIds: game.cypherv2.services.focusAcquisition.missingOwnedNodeIds(
          this.actor,
          C,
          h
        ),
        gmOverrideAllowed: game.user.isGM,
        gmProgressionEdit: this.#n
      });
      g.push({
        ...F,
        provenance: h.provenance ?? "additional",
        provenanceLabel: `CYPHERV2.Focus.Association.${h.provenance === "creation" ? "Creation" : "Additional"}`,
        ownedCount: h.ownedNodeIds.length
      });
    }
    const A = game.cypherv2.services.advancement.view(
      this.actor,
      Je()
    ), P = game.cypherv2.services.advancement.progressionGuidance(
      this.actor,
      Je()
    ), Y = [...this.actor.items].filter((h) => h.type === "characterType").map((h) => ({ id: h.id, name: h.name })), $ = [...this.actor.items].filter((h) => h.type === "species").map((h) => ({ id: h.id, name: h.name })), D = [...this.actor.items].filter((h) => h.type === "descriptor").map((h) => {
      const C = h.system.instance, F = C?.role ?? "custom";
      return {
        id: h.id,
        name: h.name,
        role: F,
        instanceId: C?.instanceId ?? h.id,
        attachedAt: C?.attachedAt ?? 0,
        roleLabel: game.i18n.localize(`CYPHERV2.Packages.Role.${F}`)
      };
    }), U = new Map([...this.actor.items].filter((h) => h.type === "characterType" || h.type === "descriptor" || h.type === "species").map((h) => [h.system.instance?.instanceId ?? "", h.name])), Ee = [...this.actor.items].filter((h) => {
      const C = h.system.grantedBy;
      return C?.instanceId && (C.kind === "type" || C.kind === "descriptor" || C.kind === "species");
    }).map((h) => {
      const C = h.system.grantedBy;
      return {
        id: h.id,
        name: h.name,
        type: h.type,
        sourceName: U.get(C.instanceId) ?? game.i18n.localize("CYPHERV2.Packages.Retained"),
        grantId: C.grantId,
        status: C.status,
        replacementLabel: C.replacement?.active ? `${C.replacement.originalName} → ${C.replacement.replacementName}` : ""
      };
    }), S = this.actor.system, _ = await game.cypherv2.services.genres.active(
      this.actor
    ), me = _ ? {
      attached: !0,
      available: !0,
      name: _.name,
      uuid: _.uuid,
      img: _.img,
      provenance: S.genre.provenance,
      totalEffortCapMode: _.system.options.totalEffortCapMode,
      totalEffortCapLabel: game.i18n.localize(
        `CYPHERV2.Genre.EffortCap.${_.system.options.totalEffortCapMode}`
      )
    } : {
      attached: !!S.genre.sourceUuid,
      available: !1,
      name: S.genre.sourceUuid,
      uuid: S.genre.sourceUuid,
      img: "",
      provenance: S.genre.provenance,
      totalEffortCapMode: "core",
      totalEffortCapLabel: game.i18n.localize("CYPHERV2.Genre.EffortCap.core")
    }, Re = [...this.actor.items].filter((h) => vn.includes(h.type)).sort((h, C) => h.name.localeCompare(C.name, "en-US"));
    this.#a.retain(Re.map((h) => h.id));
    const se = (await Promise.all(Re.map(async (h) => {
      const C = Ed(h);
      if (!C) return null;
      const F = this.#a.isExpanded(h.id), q = C.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        C.description,
        { async: !0, relativeTo: h }
      ) : "";
      return {
        ...C,
        expanded: F,
        hasDescription: !!C.description,
        enrichedDescription: q,
        depletionLabel: C.depletion?.enabled ? C.depletion.formula : "",
        powerLabel: C.power ? game.i18n.localize(`CYPHERV2.Cypher.Power.${C.power}`) : "",
        canRollLevel: C.levelRollable && C.usable,
        canRollDepletion: !!(C.depletion?.enabled && C.usable)
      };
    }))).filter((h) => h !== null), pe = {
      cypherLimit: S.derived.cypherLimit.max,
      equipment: se.filter((h) => h.type === "equipment"),
      cyphers: se.filter((h) => h.type === "cypher"),
      artifacts: se.filter((h) => h.type === "artifact")
    }, k = w.find((h) => h.provenance === "creation") ?? w[0], T = pd({
      descriptors: D,
      ...$[0] ? { species: { id: $[0].id, name: $[0].name } } : {},
      ...Y[0] ? { type: { id: Y[0].id, name: Y[0].name } } : {},
      ...k ? { focus: { uuid: k.uuid, name: k.name } } : {},
      hideFocus: S.presentation.hideFocusInSentence
    }), L = {
      ...T,
      descriptors: T.descriptors.map((h) => ({
        ...h,
        displayName: h.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Descriptor") : h.displayName
      })),
      type: {
        ...T.type,
        displayName: T.type.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Type") : T.type.displayName
      },
      focus: {
        ...T.focus,
        displayName: T.focus.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Focus") : T.focus.displayName
      }
    }, j = di({
      minor: S.wounds.minor.length,
      moderate: S.wounds.moderate.length,
      major: S.wounds.major.length
    }, S.derived.wounds.capacities).map((h) => ({
      ...h,
      shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${h.severity}`),
      pips: h.pips.map((C) => ({
        ...C,
        tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
          count: C.targetCount
        })
      })),
      tooltip: game.i18n.format("CYPHERV2.Hud.CharacterWoundTooltip", {
        severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
        count: h.count,
        capacity: h.capacity
      })
    })), v = f.filter((h) => h.equipped), J = v.find((h) => !h.broken) ?? v[0], eo = J ? {
      ...J,
      tracks: di({
        minor: J.minor,
        moderate: J.moderate,
        major: J.major
      }, J.capacities).map((h) => ({
        ...h,
        itemId: J.id,
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${h.severity}`),
        pips: h.pips.map((C) => ({
          ...C,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetShieldWoundCount", {
            shield: J.name,
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
            count: C.targetCount
          })
        })),
        tooltip: game.i18n.format("CYPHERV2.Hud.ShieldWoundTooltip", {
          shield: J.name,
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
          count: h.count,
          capacity: h.capacity
        })
      }))
    } : null, qr = j.map((h, C) => ({
      character: h,
      shield: eo?.tracks[C] ?? null
    })), Gr = {
      appearance: As(S.appearance, this.actor.img),
      identity: L,
      stats: {
        tier: S.derived.tier.value,
        effort: S.derived.effort.max,
        xp: S.xp,
        resourcePoints: S.resourcePoints
      },
      playerIntrusion: {
        visible: this.isEditable,
        canUse: this.isEditable && game.cypherv2.services.playerIntrusions.canUse(
          this.actor
        ),
        tooltip: game.i18n.localize(S.xp >= 1 ? "CYPHERV2.Intrusion.Player.Tooltip" : "CYPHERV2.Intrusion.Player.RequiresTooltip")
      },
      pools: I.map((h) => ({
        key: h,
        isMight: h === "might",
        canRally: h === "might" && game.cypherv2.services.rally.canApply(this.actor),
        label: game.i18n.localize(`CYPHERV2.Pools.${h[0].toUpperCase()}${h.slice(1)}`),
        value: S.stats[h].value,
        max: S.derived.pools[h].max,
        edge: S.derived.pools[h].edge,
        gauge: Er(S.stats[h].value, S.derived.pools[h].max)
      })),
      wounds: {
        tracks: j,
        rows: qr,
        hindrance: S.derived.wounds.hindrance,
        hindranceModifier: we("hinder", S.derived.wounds.hindrance),
        dead: S.derived.wounds.dead
      },
      recoveries: hd(S.recovery.slots).map((h) => ({
        ...h,
        label: game.i18n.localize(`CYPHERV2.Recovery.${h.type}`)
      })),
      recoveryFormulaLabel: S.derived.recovery.formula,
      canResetRecoveries: game.user.isGM,
      shield: eo
    }, Or = (h, C) => [
      ...this.actor.items
    ].filter((F) => F.type !== "characterType" && F.type !== "species" ? !1 : F.system[h === "weapon" ? "weaponUse" : "armorUse"]?.[C] === !0).map((F) => F.name), to = (h, C, F, q) => C.map((fe) => {
      const Pe = Or(h, fe), tt = F.includes(fe), Kt = Pe.length > 0, Xr = q.includes(fe), Jr = tt && Kt ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityManualAndGranted", { sources: Pe.join(", ") }) : tt ? game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityManual") : Kt ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityGranted", { sources: Pe.join(", ") }) : game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityAbsent");
      return {
        family: h,
        category: fe,
        label: game.i18n.localize(`CYPHERV2.Combat.${h === "weapon" ? "Weapon" : "Armor"}.Category.${fe}`),
        manual: tt,
        packageGranted: Kt,
        effective: Xr,
        canToggle: this.isEditable && (tt || !Kt),
        sourceHint: Jr
      };
    }), Br = {
      weapons: to(
        "weapon",
        Te,
        S.proficiencies.weaponCategories,
        S.derived.packages.weaponCategories
      ),
      armor: to(
        "armor",
        ze,
        S.proficiencies.armorCategories,
        S.derived.packages.armorCategories
      )
    }, Lr = {
      tier: "CYPHERV2.Character.Tier",
      effort: "CYPHERV2.Character.Effort",
      mightMax: "CYPHERV2.Overrides.MightMax",
      mightEdge: "CYPHERV2.Overrides.MightEdge",
      speedMax: "CYPHERV2.Overrides.SpeedMax",
      speedEdge: "CYPHERV2.Overrides.SpeedEdge",
      intellectMax: "CYPHERV2.Overrides.IntellectMax",
      intellectEdge: "CYPHERV2.Overrides.IntellectEdge"
    }, jr = Vi.map((h) => {
      const C = ln(S, h);
      return { ...C, label: game.i18n.localize(Lr[h]), hasOverride: C.override !== null };
    }), Ct = S.overrides.wounds ?? { minor: 0, moderate: 0, major: 0 }, Wr = {
      hasOverride: Object.values(Ct).some((h) => h !== 0),
      calculated: S.derived.wounds.calculatedCapacities,
      modifiers: Ct,
      modifierLabels: {
        minor: Ki(Ct.minor),
        moderate: Ki(Ct.moderate),
        major: Ki(Ct.major)
      },
      effective: S.derived.wounds.capacities
    }, _r = {
      hasOverride: S.recovery.customized || S.recovery.rollModifier !== 0,
      calculatedSlots: 4,
      calculatedFormula: S.derived.recovery.calculatedFormula,
      effectiveSlots: S.recovery.slots.length,
      effectiveFormula: S.derived.recovery.formula,
      modifier: S.recovery.rollModifier
    }, io = [game.i18n.localize(P.focusAbilityCount === 2 ? "CYPHERV2.Advancement.Guidance.TwoFocusAbilities" : "CYPHERV2.Advancement.Guidance.FocusAbility")];
    P.includesGenreAbility && io.push(game.i18n.localize("CYPHERV2.Advancement.Guidance.GenreAbility"));
    const no = typeof this.actor._source?.system?.notes == "string" ? this.actor._source.system.notes : "", Kr = no ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(no, {
      async: !0,
      relativeTo: this.actor
    }) : "";
    return {
      ...t,
      actor: this.actor,
      system: this.actor.system,
      systemFields: xn(this.actor),
      editable: this.isEditable,
      enriched: { notes: Kr },
      familiarities: Br,
      characterOverrides: jr,
      woundOverride: Wr,
      recoveryOverride: _r,
      genre: me,
      woundHindranceModifier: we("hinder", S.derived.wounds.hindrance),
      header: Gr,
      skillItems: i,
      skillSort: {
        mode: this.#o,
        nameActive: this.#o === "name",
        rankActive: this.#o === "rank"
      },
      abilityItems: a,
      inventory: pe,
      weaponItems: c,
      armorItems: p,
      shieldItems: f,
      multipleShieldsEquipped: m,
      focusTrees: g,
      missingFoci: y,
      advancement: {
        ...A,
        options: A.options.map((h) => ({
          ...h,
          label: `CYPHERV2.Advancement.Option.${h.kind}`,
          shortLabel: `CYPHERV2.Advancement.Short.${h.kind}`,
          xpCost: A.policy.xpCost
        })),
        other: {
          ...A.other,
          label: "CYPHERV2.Advancement.OtherAdvancement",
          shortLabel: "CYPHERV2.Advancement.Short.other",
          xpCost: A.policy.xpCost
        },
        purchases: b.advancement.purchases.map((h) => ({
          ...h,
          label: h.kind === "other" ? `CYPHERV2.Advancement.Other.${h.otherKind}` : `CYPHERV2.Advancement.Option.${h.kind}`
        })),
        guidance: {
          ...P,
          title: game.i18n.format("CYPHERV2.Advancement.Guidance.Title", { tier: P.tier }),
          reminder: io.join(" · ")
        }
      },
      isGM: game.user.isGM,
      gmProgressionEdit: game.user.isGM && this.#n,
      typeItems: Y,
      speciesItems: $,
      descriptorItems: D,
      primaryDescriptorItems: D.filter((h) => h.role === "primary"),
      additionalDescriptorItems: D.filter((h) => h.role === "additional" || h.role === "custom"),
      speciesDescriptorItems: D.filter((h) => h.role === "speciesGranted"),
      packageGrantedItems: Ee,
      coreCreation: this.actor.system.creation,
      activeArmorCategoryLabel: game.i18n.localize(
        `CYPHERV2.Combat.Armor.Category.${r.system.derived.combat.armor.category}`
      ),
      recoveryAvailableLabels: this.actor.system.derived.recovery.availableTypes.map((h) => game.i18n.localize(`CYPHERV2.Recovery.${h}`)).join(", "),
      phase: "0.1.0"
    };
  }
}
class ue extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusTreeEditorError";
  }
  code;
}
class Fd {
  #e = null;
  #t = null;
  get selectedNodeId() {
    return this.#e;
  }
  get connectionSourceNodeId() {
    return this.#t;
  }
  select(e) {
    this.#e = e;
  }
  clearSelection(e) {
    (e === void 0 || this.#e === e) && (this.#e = null), (e === void 0 || this.#t === e) && (this.#t = null);
  }
  startConnection() {
    if (!this.#e)
      throw new ue("node-not-selected", "Select a Focus node before connecting.");
    return this.#t = this.#e, this.#t;
  }
  connectionTo(e) {
    if (!this.#t)
      throw new ue("node-not-selected", "No source node is selected for the connection.");
    return { from: this.#t, to: e };
  }
  finishConnection(e) {
    this.#e = e, this.#t = null;
  }
  cancelConnection() {
    this.#t = null;
  }
  reset() {
    this.#e = null, this.#t = null;
  }
}
function Td() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "") ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function Ae(n) {
  return {
    version: n.version,
    nodes: n.nodes.map((e) => ({
      id: e.id,
      abilityUuid: e.abilityUuid,
      abilitySnapshot: {
        name: e.abilitySnapshot.name,
        ...e.abilitySnapshot.description !== void 0 ? { description: e.abilitySnapshot.description } : {}
      },
      tier: e.tier,
      position: { x: e.position.x, y: e.position.y }
    })),
    connections: n.connections.map((e) => ({ ...e }))
  };
}
function Qo(n) {
  const e = n._source?.system?.description ?? n.system?.description;
  return {
    name: n.name,
    description: typeof e == "string" ? e : ""
  };
}
function Zo(n) {
  if (n.type !== "ability")
    throw new ue("not-ability", "Only Ability Items can be added to a Focus Tree.");
  if (!n.uuid.trim())
    throw new ue("ability-uuid-missing", "The Ability must have a resolvable UUID.");
}
function ea(n) {
  if (!Number.isInteger(n) || n < 1 || n > 6)
    throw new ue("invalid-tier", "Focus node Tier must be an integer from 1 to 6.");
}
function ta(n, e) {
  return n.nodes.filter((t) => t.tier === e).sort((t, i) => {
    const o = t.position.x ?? Number.MAX_SAFE_INTEGER, a = i.position.x ?? Number.MAX_SAFE_INTEGER;
    return o - a || t.id.localeCompare(i.id);
  });
}
class zd {
  #e;
  #t;
  #i;
  #n = !1;
  constructor(e, t = Td) {
    this.#e = t, this.#t = Ae(e), this.#i = Ae(e);
  }
  get graph() {
    return Ae(this.#i);
  }
  get dirty() {
    return this.#n;
  }
  diagnostics() {
    return fn(this.#i);
  }
  addAbility(e, t = 1) {
    Zo(e), ea(t);
    const o = ta(this.#i, t).reduce((r, s) => Math.max(r, s.position.x ?? -1), -1), a = {
      id: this.#a("node", new Set(this.#i.nodes.map((r) => r.id))),
      abilityUuid: e.uuid,
      abilitySnapshot: Qo(e),
      tier: t,
      position: { x: o + 1, y: null }
    };
    return this.#i = { ...this.#i, nodes: [...this.#i.nodes, a] }, this.#n = !0, Ae({ ...this.#i, nodes: [a] }).nodes[0];
  }
  setTier(e, t) {
    return ea(t), this.#r(e, (i) => ({ ...i, tier: t }));
  }
  moveNode(e, t) {
    const i = this.#o(e), o = ta(this.#i, i.tier), a = o.findIndex((f) => f.id === e), r = t === "left" ? a - 1 : a + 1;
    if (r < 0 || r >= o.length) return Ae({
      version: this.#i.version,
      nodes: [i],
      connections: []
    }).nodes[0];
    const s = o[r], l = o[t === "left" ? r - 1 : r + 1], u = s.position.x ?? r, c = l?.position.x, p = t === "left" ? c == null ? u - 1 : (c + u) / 2 : c == null ? u + 1 : (u + c) / 2;
    return this.#r(e, (f) => ({
      ...f,
      position: { ...f.position, x: p }
    }));
  }
  deleteNode(e) {
    const t = this.#o(e), i = this.#i.connections.filter((a) => a.from !== e && a.to !== e), o = this.#i.connections.length - i.length;
    return this.#i = {
      ...this.#i,
      nodes: this.#i.nodes.filter((a) => a.id !== e),
      connections: i
    }, this.#n = !0, { node: t, removedConnections: o };
  }
  connect(e, t) {
    if (this.#o(e), this.#o(t), e === t)
      throw new ue("self-connection", "A Focus node cannot connect to itself.");
    if (this.#i.connections.some((o) => o.from === e && o.to === t))
      throw new ue(
        "duplicate-connection",
        `Focus connection '${e}' -> '${t}' already exists.`
      );
    const i = {
      id: this.#a(
        "connection",
        new Set(this.#i.connections.map((o) => o.id))
      ),
      from: e,
      to: t
    };
    return this.#i = {
      ...this.#i,
      connections: [...this.#i.connections, i]
    }, this.#n = !0, { ...i };
  }
  deleteConnection(e) {
    const t = this.#i.connections.find((i) => i.id === e);
    if (!t)
      throw new ue(
        "connection-not-found",
        `Focus connection '${e}' was not found.`
      );
    return this.#i = {
      ...this.#i,
      connections: this.#i.connections.filter((i) => i.id !== e)
    }, this.#n = !0, { ...t };
  }
  clearConnections() {
    const e = this.#i.connections.length;
    return e === 0 ? 0 : (this.#i = { ...this.#i, connections: [] }, this.#n = !0, e);
  }
  refreshSnapshot(e, t) {
    Zo(t);
    const i = this.#o(e);
    if (t.uuid !== i.abilityUuid)
      throw new ue(
        "ability-source-mismatch",
        "The refreshed Ability does not match the node source UUID."
      );
    return this.#r(e, (o) => ({
      ...o,
      abilitySnapshot: Qo(t)
    }));
  }
  cancel() {
    return this.#i = Ae(this.#t), this.#n = !1, this.graph;
  }
  async save(e) {
    const t = fn(this.#i), i = t.filter((a) => a.severity === "error");
    if (i.length > 0) throw new ft(i);
    const o = this.graph;
    return await e(o), this.#t = Ae(o), this.#i = Ae(o), this.#n = !1, { graph: o, diagnostics: t };
  }
  #o(e) {
    const t = this.#i.nodes.find((i) => i.id === e);
    if (!t)
      throw new ue("node-not-found", `Focus node '${e}' was not found.`);
    return t;
  }
  #r(e, t) {
    const i = this.#o(e), o = t(i);
    return this.#i = {
      ...this.#i,
      nodes: this.#i.nodes.map((a) => a.id === e ? o : a)
    }, this.#n = !0, Ae({ version: this.#i.version, nodes: [o], connections: [] }).nodes[0];
  }
  #a(e, t) {
    for (let i = 0; i < 100; i += 1) {
      const o = this.#e().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24), a = `${e}-${o}`;
      if (o && !t.has(a)) return a;
    }
    throw new ue(
      "unique-id-unavailable",
      `Unable to generate a unique ${e} ID.`
    );
  }
}
function Nd(n) {
  const e = n.querySelector(".cypherv2-sheet.cypherv2-item"), t = n.querySelector(".window-content"), i = [...n.querySelectorAll(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )].map((o) => {
    const a = o.querySelector(".focus-tree-scroll");
    return {
      focusUuid: o.dataset.focusUuid ?? "",
      left: a?.scrollLeft ?? 0,
      top: a?.scrollTop ?? 0
    };
  });
  return {
    vertical: e?.scrollTop ?? 0,
    windowVertical: t?.scrollTop ?? 0,
    trees: i
  };
}
function Md(n, e) {
  const t = n.querySelector(".cypherv2-sheet.cypherv2-item");
  t && (t.scrollTop = e.vertical);
  const i = n.querySelector(".window-content");
  i && (i.scrollTop = e.windowVertical);
  const o = [...n.querySelectorAll(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )];
  for (const a of e.trees) {
    const s = o.find((l) => l.dataset.focusUuid === a.focusUuid)?.querySelector(".focus-tree-scroll");
    s && (s.scrollLeft = a.left, s.scrollTop = a.top);
  }
}
class xd extends Error {
  constructor(e) {
    super("Only one Shield may be equipped at a time."), this.shieldIds = e, this.name = "MultipleEquippedShieldsError";
  }
  shieldIds;
}
class kr extends Error {
  constructor(e, t, i) {
    super(`Shield ${e} capacity cannot be lower than its current Wound count (${i}).`), this.severity = e, this.requested = t, this.current = i, this.name = "ShieldCapacityBelowWoundsError";
  }
  severity;
  requested;
  current;
}
class Ar {
  #e;
  constructor(e) {
    this.#e = e;
  }
  shields(e) {
    return [...e.items].filter((t) => {
      const i = t;
      return i?.type === "shield" && !!i.system;
    });
  }
  equipped(e) {
    const t = this.shields(e).filter((i) => i.system.equipped);
    if (t.length > 1) throw new xd(t.map((i) => i.id));
    return t[0] ?? null;
  }
  async normalizeEquipped(e) {
    const t = this.shields(e).filter((a) => a.system.equipped);
    if (t.length <= 1) return t[0] ?? null;
    const [i, ...o] = [...t].sort((a, r) => Number(this.isBroken(a)) - Number(this.isBroken(r)) || a.name.localeCompare(r.name) || a.id.localeCompare(r.id));
    return await Promise.all(o.map((a) => a.update(
      { "system.equipped": !1 },
      { cypherv2ShieldEquipmentSync: !0 }
    ))), i ?? null;
  }
  async setEquipped(e, t, i) {
    if (!this.shields(e).some((o) => o.id === t.id))
      throw new Error("Shield does not belong to this Character.");
    return i ? (await t.update({ "system.equipped": !0 }, { cypherv2ShieldEquipmentSync: !0 }), await Promise.all(this.shields(e).filter((o) => o.id !== t.id && o.system.equipped).map((o) => o.update(
      { "system.equipped": !1 },
      { cypherv2ShieldEquipmentSync: !0 }
    ))), t) : (await t.update({ "system.equipped": !1 }, { cypherv2ShieldEquipmentSync: !0 }), null);
  }
  isBroken(e) {
    return e.system.wounds.major.length >= this.capacities(e).major;
  }
  capacities(e) {
    return e.system.derived?.capacities ?? e.system.woundCapacities ?? We;
  }
  async setCapacity(e, t, i) {
    if (!Number.isInteger(i) || i < 0)
      throw new RangeError("Shield Wound capacity must be a non-negative whole number.");
    const o = e.system.wounds[t].length;
    if (i < o) throw new kr(t, i, o);
    await e.update({ [`system.woundCapacities.${t}`]: i });
  }
  canAbsorb(e) {
    const t = this.equipped(e);
    return !!(t && !this.isBroken(t));
  }
  async apply(e, t, i, o = {}) {
    const a = this.equipped(e);
    if (!a || a.id !== t.id) throw new Error("The Shield is not the equipped Shield.");
    return this.applyResolved(e, t, i, o);
  }
  /** Apply a deferred consequence to the exact Shield captured when the defense resolved. */
  async applyResolved(e, t, i, o = {}) {
    if (!this.shields(e).some((u) => u.id === t.id))
      throw new Error("Shield does not belong to this Character.");
    if (this.isBroken(t)) throw new Error("A Broken Shield cannot absorb another Wound.");
    const a = this.capacities(t), r = await this.#e.applyTrack(t, i, a, {
      ...o,
      label: o.label ?? `${i[0].toUpperCase()}${i.slice(1)} Shield Wound`,
      sourceUuid: o.sourceUuid ?? "cypherv2.shield"
    }), { dead: s, ...l } = r;
    return {
      ...l,
      shield: t,
      broken: r.wounds.major.length >= a.major
    };
  }
  async edit(e, t, i, o) {
    return this.#e.editTrack(e, t, i, o);
  }
  async setCount(e, t, i) {
    return this.#e.setTrackCount(
      e,
      t,
      i,
      this.capacities(e)[t],
      { sourceUuid: "cypherv2.manual.shield" }
    );
  }
  async delete(e, t, i) {
    const o = await this.#e.deleteTrack(e, t, i);
    return { ...o, broken: o.wounds.major.length >= this.capacities(e).major };
  }
}
function ia(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function Ud(n, e, t) {
  const i = n.system.wounds[e].find((a) => a.id === t);
  if (!i) throw new Error(`Shield Wound '${t}' was not found.`);
  const o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}<input name="label" type="text" value="${ia(i.label)}"></label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}<textarea name="description">${ia(i.description)}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  o && await game.cypherv2.services.shields.edit(n, e, t, {
    label: String(o.label ?? ""),
    description: String(o.description ?? "")
  });
}
async function qd(n, e, t) {
  await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.DeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Wounds.DeleteConfirm")}</p></div>`,
    rejectClose: !1,
    modal: !0,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) && await game.cypherv2.services.shields.delete(n, e, t);
}
function Gd(n) {
  const e = n.roll === "attack", t = n.roll === "task", i = n.roll === "defense", o = t || i || n.rollModifier !== 0, a = e || n.attackModifier !== 0, r = e || n.damage !== 0, s = e || n.woundSeverity !== "none", l = e || n.range.trim() !== "", u = e || n.targetMode !== "none";
  return {
    showIgnoresEdge: n.cost.amount > 0 && !!n.cost.allowedPools?.length || n.cost.ignoresEdge,
    showRollModifier: o,
    rollModifierLabel: t ? "task" : i ? "defense" : "general",
    showAttackModifier: a,
    showDamage: r,
    showWoundSeverity: s,
    showRange: l,
    showTargetMode: u,
    hasConditionalFields: o || a || r || s || l || u
  };
}
function Od(n) {
  return n.defaultPool !== "choose" || n.category !== "general" || n.contexts.length > 0 || n.initiative;
}
function Bd(n) {
  const e = n.querySelector("[data-item-sheet-scroll]"), t = n.querySelector("[data-item-focus-key]:focus"), i = t?.dataset.itemFocusKey;
  if (!t || !i) return { scrollTop: e?.scrollTop ?? 0 };
  let o = null, a = null, r = null;
  try {
    o = t.selectionStart, a = t.selectionEnd, r = t.selectionDirection;
  } catch {
  }
  return {
    scrollTop: e?.scrollTop ?? 0,
    focusedInput: {
      key: i,
      ...o === null ? {} : { selectionStart: o },
      ...a === null ? {} : { selectionEnd: a },
      ...r === null ? {} : { selectionDirection: r }
    }
  };
}
function Ld(n, e) {
  const t = n.querySelector("[data-item-sheet-scroll]");
  if (t && (t.scrollTop = e.scrollTop), !e.focusedInput) return;
  const i = [...n.querySelectorAll("[data-item-focus-key]")].find((s) => s.dataset.itemFocusKey === e.focusedInput?.key);
  if (!i) return;
  i.focus({ preventScroll: !0 });
  const { selectionStart: o, selectionEnd: a, selectionDirection: r } = e.focusedInput;
  if (!(o === void 0 || a === void 0))
    try {
      i.setSelectionRange(o, a, r);
    } catch {
    }
}
function He(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Q(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
const jd = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
), na = /* @__PURE__ */ new Set([
  "rollDepletion",
  "reloadWeapon",
  "editFocusTree",
  "addFocusAbility",
  "saveFocusTree",
  "cancelFocusTree",
  "selectFocusEditorNode",
  "moveFocusNode",
  "setFocusNodeTier",
  "startFocusConnection",
  "completeFocusConnection",
  "cancelFocusConnection",
  "deleteFocusConnection",
  "clearFocusConnections",
  "refreshFocusSnapshot",
  "deleteFocusNode",
  "addPackageGrant",
  "addChoiceGroup",
  "addChoiceOption",
  "refreshPackageGrant",
  "removePackageGrant",
  "addPoolBonusChoiceGroup",
  "editPoolBonusChoiceGroup",
  "removePoolBonusChoiceGroup",
  "setShieldWoundCount",
  "editShieldWound",
  "deleteShieldWound",
  "addGenreAbility",
  "refreshGenreAbility",
  "removeGenreAbility"
]);
class V extends jd {
  #e = new ur();
  #t = new Fd();
  #i = new mr();
  #n = null;
  #o = null;
  #r = null;
  #a = null;
  #c = null;
  #l = null;
  #s = /* @__PURE__ */ new Set();
  #d = /* @__PURE__ */ new Set();
  #u = null;
  #b = null;
  #p = null;
  #f = null;
  static #y(e) {
    const t = e.dataset.severity, i = e.dataset.woundId;
    if (!ie.includes(t) || !i)
      throw new Error("Invalid Shield Wound action data.");
    return { severity: t, woundId: i };
  }
  static async #m(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || this.item.actor && !game.user.isGM && !this.item.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = wn(t.dataset);
    if (i.track !== "shield" || i.shieldId !== this.item.id)
      throw new Error("Invalid Shield Wound count action data.");
    await game.cypherv2.services.shields.setCount(
      this.item,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #v(e, t) {
    const i = V.#y(t);
    await Ud(this.item, i.severity, i.woundId);
  }
  static async #w(e, t) {
    const i = V.#y(t);
    await qd(this.item, i.severity, i.woundId);
  }
  static async #Y() {
    !this.isEditable || this.item.type !== "weapon" || (await game.cypherv2.services.weapons.reload(this.item), await this.render({ force: !0 }));
  }
  static DEFAULT_OPTIONS = {
    ...Mn,
    classes: ["cypherv2", "sheet", "item", "item-sheet"],
    actions: Un({
      rollDepletion: V.#Q,
      reloadWeapon: V.#Y,
      openFocusNode: V.#Z,
      editFocusTree: V.#ee,
      addFocusAbility: V.#te,
      saveFocusTree: V.#ie,
      cancelFocusTree: V.#ne,
      selectFocusEditorNode: V.#oe,
      moveFocusNode: V.#ae,
      setFocusNodeTier: V.#re,
      startFocusConnection: V.#se,
      completeFocusConnection: V.#le,
      cancelFocusConnection: V.#ce,
      deleteFocusConnection: V.#de,
      clearFocusConnections: V.#ue,
      refreshFocusSnapshot: V.#me,
      deleteFocusNode: V.#pe,
      addPackageGrant: V.#x,
      addChoiceGroup: V.#B,
      addChoiceOption: V.#_,
      inspectPackageGrant: V.#K,
      refreshPackageGrant: V.#X,
      removePackageGrant: V.#J,
      addPoolBonusChoiceGroup: V.#L,
      editPoolBonusChoiceGroup: V.#j,
      removePoolBonusChoiceGroup: V.#W,
      setShieldWoundCount: V.#m,
      editShieldWound: V.#v,
      deleteShieldWound: V.#w,
      addGenreAbility: V.#U,
      inspectGenreAbility: V.#q,
      refreshGenreAbility: V.#G,
      removeGenreAbility: V.#O
    }, na),
    position: { width: 620, height: 680 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/item/item-sheet.hbs" }
  };
  async _onRender(e, t) {
    if (await super._onRender(e, t), qn(this.element, this.isEditable, na), this.#l?.abort(), this.#l = null, this.#c && (Md(this.element, this.#c), this.#c = null), this.#u && (Ld(this.element, this.#u), this.#u = null), this.#t.connectionSourceNodeId) {
      const i = new AbortController();
      this.#l = i, this.element.addEventListener("keydown", (o) => {
        o.key === "Escape" && (o.preventDefault(), o.stopPropagation(), this.#t.cancelConnection(), this.#h());
      }, { signal: i.signal }), this.element.querySelector(".focus-tree-node-editor")?.focus({ preventScroll: !0 });
    }
    this.#e.bind(this.element), this.#i.bind(this.element), this.#z(), this.#N(), this.#M(), this.#D(), this.#F(), this.#T();
  }
  _onClose(e) {
    this.#e.disconnect(), this.#i.disconnect(), this.#n?.abort(), this.#n = null, this.#o?.abort(), this.#o = null, this.#r?.abort(), this.#r = null, this.#b?.abort(), this.#b = null, this.#p?.abort(), this.#p = null, this.#f?.abort(), this.#f = null, this.#a?.cancel(), this.#a = null, this.#t.reset(), this.#c = null, this.#l?.abort(), this.#l = null, super._onClose(e);
  }
  #D() {
    this.#b?.abort();
    const e = new AbortController();
    this.#b = e;
    const t = [...this.element.querySelectorAll("details")];
    for (const [i, o] of t.entries()) {
      const a = o.dataset.persistentDisclosure ?? `item-details-${i}`;
      this.#s.has(a) ? o.open = !0 : this.#d.has(a) && (o.open = !1), o.addEventListener("toggle", () => {
        o.open ? (this.#s.add(a), this.#d.delete(a)) : (this.#s.delete(a), this.#d.add(a));
      }, { signal: e.signal });
    }
  }
  #F() {
    if (this.#p?.abort(), this.#p = null, !this.isEditable) return;
    const e = this.element.querySelector("[data-depletion-sides]"), t = this.element.querySelector("[data-depletion-threshold]");
    if (!e && !t || !["weapon", "shield", "armor"].includes(this.item.type)) return;
    const i = new AbortController();
    this.#p = i, e?.addEventListener("change", async () => {
      const o = Number(e.value), a = Number(this.item.system.depletion.threshold);
      if (!Number.isInteger(o) || o < 2 || o > 1e3 || a > o) {
        ui.notifications.error(game.i18n.localize("CYPHERV2.Depletion.InvalidDie")), await this.render({ force: !0 });
        return;
      }
      await this.item.update({ "system.depletion.die": `d${o}` });
    }, { signal: i.signal }), t?.addEventListener("change", async () => {
      const o = t.value.trim().match(/^1(?:-(\d+))?$/), a = Number(o?.[1] ?? (o ? 1 : Number.NaN)), r = xt(this.item.system.depletion);
      if (!Number.isInteger(a) || a < 1 || a > r) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Depletion.InvalidThreshold", { sides: r })), await this.render({ force: !0 });
        return;
      }
      await this.item.update({ "system.depletion.threshold": a });
    }, { signal: i.signal });
  }
  #T() {
    if (this.#f?.abort(), this.#f = null, this.item.type !== "shield" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll("input[data-shield-capacity]")];
    if (!e.length) return;
    const t = new AbortController();
    this.#f = t;
    for (const i of e)
      i.addEventListener("change", async (o) => {
        o.preventDefault(), o.stopPropagation();
        const a = i.dataset.severity;
        if (ie.includes(a))
          try {
            await game.cypherv2.services.shields.setCapacity(
              this.item,
              a,
              Number(i.value)
            );
          } catch (r) {
            r instanceof kr ? ui.notifications.warn(game.i18n.format("CYPHERV2.Shield.CapacityTooLow", {
              severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${r.severity}`),
              count: r.current
            })) : Q(r), await this.render({ force: !0 });
          }
      }, { signal: t.signal });
  }
  #z() {
    if (this.#n?.abort(), this.#n = null, this.item.type !== "ability" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll(
      "input[data-ability-allowed-pool]"
    )];
    if (!e.length) return;
    const t = new AbortController();
    this.#n = t;
    for (const i of e)
      i.addEventListener("change", async (o) => {
        o.stopPropagation();
        const a = e.filter((r) => r.checked).map((r) => r.value).filter((r) => I.includes(r));
        try {
          await this.item.update({ "system.cost.allowedPools": a });
        } catch (r) {
          Q(r), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #N() {
    if (this.#o?.abort(), this.#o = null, this.item.type !== "genre" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll(
      "input[data-genre-minimum-tier]"
    )];
    if (!e.length) return;
    const t = new AbortController();
    this.#o = t;
    for (const i of e)
      i.addEventListener("change", async (o) => {
        o.preventDefault(), o.stopPropagation();
        const a = i.dataset.entryId ?? "", r = this.item.system.abilityCatalog;
        try {
          const s = nl(r, a, Number(i.value));
          await this.item.update({ "system.abilityCatalog": s });
        } catch (s) {
          Q(s), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #M() {
    if (this.#r?.abort(), this.#r = null, this.item.type !== "characterType") return;
    const e = this.element.querySelector("select[data-type-genre-select]"), t = this.element.querySelector("[data-type-custom-genre]");
    if (!e || !t) return;
    const i = new AbortController();
    this.#r = i;
    const o = () => {
      t.hidden = e.value !== "custom";
    };
    e.addEventListener("change", o, { signal: i.signal }), o();
  }
  _canDragDrop(e) {
    return this.item.type !== "focus" ? this.isEditable : !!(this.isEditable && game.user.isGM && this.#a);
  }
  async _onDropDocument(e, t) {
    if (!this.isEditable) return null;
    if (this.item.type === "genre" && t?.type === "ability")
      return await this.#I(t), t;
    if (this.item.type === "characterType" && ["ability", "skill"].includes(t?.type))
      return await this.#P(t, "fixed"), t;
    if (this.item.type === "descriptor" && t?.type === "skill")
      return await this.#P(t, "fixed"), t;
    if (this.item.type === "species" && ["ability", "skill", "descriptor"].includes(t?.type))
      return await this.#P(t, "fixed"), t;
    if (this.item.type !== "focus" || !this.#a)
      return super._onDropDocument(e, t);
    const i = e.target;
    if (i instanceof Element && !i.closest(".focus-item-tree"))
      return super._onDropDocument(e, t);
    try {
      return await this.#fe(t), t;
    } catch (o) {
      return Q(o), null;
    }
  }
  static async #x(e, t) {
    const i = this.item.type === "characterType" ? t.dataset.grantTarget ?? "ability" : this.item.type === "descriptor" ? "skill" : t.dataset.grantTarget;
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species" || i !== "ability" && i !== "skill" && i !== "descriptor") return;
    const o = [...game.items].filter((s) => s.type === i).sort((s, l) => s.name.localeCompare(l.name)), a = i === "skill" ? `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>` : "";
    if (!o.length && i === "ability") {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.NoWorldAbilities"));
      return;
    }
    const r = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(i === "ability" ? "CYPHERV2.Packages.AddAbility" : i === "skill" ? "CYPHERV2.Packages.AddFixedSkill" : "CYPHERV2.Species.AddDescriptorGrant") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${a}${o.map((s) => `<option value="${He(s.uuid)}">${He(s.name)}</option>`).join("")}</select></label>${i === "skill" ? `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${X.map((s) => `<option value="${s}" ${s === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s}`)}</option>`).join("")}</select></label>` : ""}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (r)
      if (r.uuid === "custom") {
        const s = String(r.customName ?? "").trim();
        if (!s) return;
        await this.#he(s, String(r.rank ?? "trained"));
      } else {
        const s = await fromUuid(String(r.uuid ?? ""));
        s && await this.#P(s, "fixed", String(r.rank ?? "trained"));
      }
  }
  static async #U() {
    if (this.item.type !== "genre") return;
    const e = [...game.items].filter((o) => o.type === "ability").sort((o, a) => o.name.localeCompare(a.name));
    if (!e.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldAbilities"));
      return;
    }
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.AddAbility") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}
        <select name="uuid">${e.map((o) => `<option value="${He(o.uuid)}">${He(o.name)}</option>`).join("")}</select></label>
        <label>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")}<input name="minimumTier" type="number" min="${Xe}" max="${zt}" value="${Xe}"></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!t) return;
    const i = await fromUuid(String(t.uuid ?? ""));
    i && await this.#I(i, Number(t.minimumTier ?? 1));
  }
  static async #q(e, t) {
    const i = this.#$(t.dataset.entryId);
    if (!i) return;
    const o = i.abilityUuid ? await fromUuid(i.abilityUuid) : null;
    if (o) {
      await o.sheet?.render(!0);
      return;
    }
    await foundry.applications.api.DialogV2.confirm({
      window: { title: i.snapshot.name },
      content: `<div class="cypherv2 cypherv2-dialog package-snapshot">${String(i.snapshot.system.description ?? "")}</div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Close") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Close") }
    });
  }
  static async #G(e, t) {
    const i = this.#$(t.dataset.entryId);
    if (!i) return;
    const o = i.abilityUuid ? await fromUuid(i.abilityUuid) : null;
    if (!o) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    const a = this.item.system.abilityCatalog;
    await this.item.update({
      "system.abilityCatalog": ol(a, i.id, this.#C(o))
    });
  }
  static async #O(e, t) {
    const i = t.dataset.entryId;
    if (!i || this.item.type !== "genre") return;
    const o = this.item.system.abilityCatalog;
    await this.item.update({ "system.abilityCatalog": al(o, i) });
  }
  static async #B(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = this.item.type !== "descriptor" && t.dataset.choiceKind === "ability", o = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.AddChoiceGroup") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="1"></label>${i ? "" : `<label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${X.map((r) => `<option value="${r}" ${r === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${r}`)}</option>`).join("")}</select></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!o) return;
    const a = this.item.system;
    if (i) {
      const r = { id: crypto.randomUUID(), choose: Math.max(1, Number(o.choose) || 1), options: [] };
      await this.item.update({ "system.abilityChoiceGroups": [...a.abilityChoiceGroups, r] });
    } else {
      const r = { id: crypto.randomUUID(), choose: Math.max(1, Number(o.choose) || 1), rank: String(o.rank), options: [] };
      await this.item.update({ "system.choiceGroups": [...a.choiceGroups, r] });
    }
  }
  async #S(e) {
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(e ? "CYPHERV2.Packages.EditPoolBonusChoiceGroup" : "CYPHERV2.Packages.AddPoolBonusChoiceGroup") },
      content: `<div class="cypherv2 cypherv2-dialog package-pool-choice-authoring">
        <div class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.Amount")}<input name="amount" type="number" min="1" value="${e?.amount ?? 1}"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="${e?.choose ?? 1}"></label>
        </div>
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Packages.AllowedPools")}</span>
        <div class="package-pool-choice-options">
          ${I.map((r) => `<label class="cypherv2-dialog-toggle"><input name="pool_${r}" type="checkbox" ${e?.pools.includes(r) ? "checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Pools.${r[0].toUpperCase()}${r.slice(1)}`)}</span></label>`).join("")}
        </div>
      </div>`,
      ok: { label: game.i18n.localize(e ? "CYPHERV2.Actions.Save" : "CYPHERV2.Actions.Add") }
    });
    if (!t) return null;
    const i = Math.trunc(Number(t.amount)), o = Math.trunc(Number(t.choose)), a = I.filter((r) => !!t[`pool_${r}`]);
    return !Number.isInteger(i) || i < 1 || !Number.isInteger(o) || o < 1 || o > a.length ? (ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null) : { amount: i, choose: o, pools: a };
  }
  static async #L() {
    if (this.item.type !== "descriptor") return;
    const e = await this.#S();
    if (!e) return;
    const t = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({ "system.poolBonusChoiceGroups": [...t, { id: crypto.randomUUID(), ...e }] });
  }
  static async #j(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [], o = i.find((r) => r.id === t.dataset.groupId);
    if (!o) return;
    const a = await this.#S(o);
    a && await this.item.update({
      "system.poolBonusChoiceGroups": i.map((r) => r.id === o.id ? { ...r, ...a } : r)
    });
  }
  static async #W(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({
      "system.poolBonusChoiceGroups": i.filter((o) => o.id !== t.dataset.groupId)
    });
  }
  static async #_(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = t.dataset.groupId, o = this.item.system, a = this.item.type !== "descriptor" && t.dataset.choiceKind === "ability";
    if (!(a ? o.abilityChoiceGroups.find((c) => c.id === i) : o.choiceGroups.find((c) => c.id === i))) return;
    const s = [...game.items].filter((c) => c.type === (a ? "ability" : "skill")).sort((c, p) => c.name.localeCompare(p.name)), l = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.AddSkillOption") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${a ? "" : `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>`}${s.map((c) => `<option value="${He(c.uuid)}">${He(c.name)}</option>`).join("")}</select></label>${a ? "" : `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!l) return;
    const u = l.uuid === "custom" ? null : await fromUuid(String(l.uuid ?? ""));
    if (a) {
      if (!u) return;
      const c = { id: crypto.randomUUID(), abilityUuid: u.uuid, snapshot: this.#C(u) }, p = o.abilityChoiceGroups;
      await this.item.update({ "system.abilityChoiceGroups": p.map((f) => f.id === i ? { ...f, options: [...f.options, c] } : f) });
    } else {
      const c = this.#R(u, String(l.customName ?? ""));
      if (!c) return;
      await this.item.update({ "system.choiceGroups": o.choiceGroups.map((p) => p.id === i ? { ...p, options: [...p.options, c] } : p) });
    }
  }
  static async #K(e, t) {
    const i = this.#V(t);
    if (!i) return;
    const o = "abilityUuid" in i ? i.abilityUuid : "skillUuid" in i ? i.skillUuid : i.descriptorUuid, a = o ? await fromUuid(o) : null;
    if (a) {
      await a.sheet?.render(!0);
      return;
    }
    await foundry.applications.api.DialogV2.confirm({
      window: { title: i.snapshot?.name || ("customName" in i ? i.customName : "") },
      content: `<div class="cypherv2 cypherv2-dialog package-snapshot"><p>${String(i.snapshot?.system?.description ?? "")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Close") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Close") }
    });
  }
  static async #X(e, t) {
    const i = this.#V(t);
    if (!i) return;
    const o = "abilityUuid" in i ? i.abilityUuid : "skillUuid" in i ? i.skillUuid : i.descriptorUuid, a = o ? await fromUuid(o) : null;
    if (!a) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    await this.#ge(t, { ...i, snapshot: this.#C(a) });
  }
  static async #J(e, t) {
    const i = t.dataset.grantKind, o = t.dataset.grantId;
    if (o) {
      if (i === "ability") {
        const a = this.item.system.abilityGrants;
        await this.item.update({ "system.abilityGrants": a.filter((r) => r.id !== o) });
      } else if (i === "skill") {
        const a = this.item.system.skillGrants;
        await this.item.update({ "system.skillGrants": a.filter((r) => r.id !== o) });
      } else if (i === "option") {
        const a = t.dataset.groupId, r = this.item.system.choiceGroups;
        await this.item.update({ "system.choiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.filter((l) => l.id !== o) } : s) });
      } else if (i === "group") {
        const a = this.item.system.choiceGroups;
        await this.item.update({ "system.choiceGroups": a.filter((r) => r.id !== o) });
      } else if (i === "abilityOption") {
        const a = t.dataset.groupId, r = this.item.system.abilityChoiceGroups;
        await this.item.update({ "system.abilityChoiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.filter((l) => l.id !== o) } : s) });
      } else if (i === "abilityGroup") {
        const a = this.item.system.abilityChoiceGroups;
        await this.item.update({ "system.abilityChoiceGroups": a.filter((r) => r.id !== o) });
      } else if (i === "descriptor") {
        const a = this.item.system.descriptorGrants;
        await this.item.update({ "system.descriptorGrants": a.filter((r) => r.id !== o) });
      }
    }
  }
  static async #Q() {
    await yi(this.item);
  }
  static async #Z(e, t) {
    const i = t.dataset.nodeId;
    if (!i) throw new Error("Missing Focus node ID.");
    await dr(this.#A(), i);
  }
  static async #ee() {
    try {
      this.#k(), this.#a = new zd(
        this.item.system.graph
      ), this.#t.reset(), await this.#h();
    } catch (e) {
      Q(e);
    }
  }
  static async #te() {
    try {
      const e = this.#g(), t = [...game.items].filter((r) => r.type === "ability").sort((r, s) => r.name.localeCompare(s.name));
      if (t.length === 0) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Editor.NoWorldAbilities"));
        return;
      }
      const i = await foundry.applications.api.DialogV2.input({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") },
        content: `<div class="cypherv2-dialog-fields">
          <label>${game.i18n.localize("CYPHERV2.Focus.Editor.Ability")}
            <select name="abilityUuid">${t.map((r) => `<option value="${He(r.uuid)}">${He(r.name)}</option>`).join("")}</select>
          </label>
          ${this.#H()}
        </div>`,
        rejectClose: !1,
        ok: { label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") }
      });
      if (!i) return;
      const o = await fromUuid(String(i.abilityUuid ?? ""));
      if (!o) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      const a = e.addAbility(
        o,
        Number(i.tier ?? 1)
      );
      this.#t.select(a.id), await this.#h();
    } catch (e) {
      Q(e);
    }
  }
  static async #ie() {
    try {
      const e = this.#g(), t = e.diagnostics().filter((i) => i.severity === "warning");
      t.length > 0 && ui.notifications.warn(t.map((i) => i.message).join(`
`)), await e.save((i) => this.item.update({ "system.graph": i })), this.#a = null, this.#t.reset(), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Editor.Saved")), await this.#h();
    } catch (e) {
      if (e instanceof ft) {
        ui.notifications.error(e.diagnostics.map((t) => t.message).join(`
`));
        return;
      }
      Q(e);
    }
  }
  static async #ne() {
    this.#a?.cancel(), this.#a = null, this.#t.reset(), await this.#h();
  }
  static async #oe(e, t) {
    e.preventDefault(), e.stopPropagation(), this.#g(), this.#t.select(this.#E(t)), await this.#h();
  }
  static async #ae(e, t) {
    try {
      const i = t.dataset.direction;
      if (i !== "left" && i !== "right") throw new Error("Missing movement direction.");
      this.#g().moveNode(this.#E(t), i), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  static async #re(e, t) {
    try {
      this.#g().setTier(this.#E(t), Number(t.dataset.tier)), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  static async #se(e, t) {
    this.#g(), this.#t.startConnection(), await this.#h();
  }
  static async #le(e, t) {
    try {
      const i = this.#E(t), o = this.#t.connectionTo(i);
      this.#g().connect(o.from, o.to), this.#t.finishConnection(i), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  static async #ce() {
    this.#t.cancelConnection(), await this.#h();
  }
  static async #de(e, t) {
    try {
      const i = t.dataset.connectionId;
      if (!i) throw new Error("Missing Focus connection ID.");
      this.#g().deleteConnection(i), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  static async #ue() {
    try {
      const e = this.#g();
      if (!await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnections") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnectionsConfirm")}</p></div>`,
        rejectClose: !1,
        modal: !0,
        yes: { label: game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnections") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) return;
      e.clearConnections(), this.#t.cancelConnection(), await this.#h();
    } catch (e) {
      Q(e);
    }
  }
  static async #me(e, t) {
    try {
      const i = this.#E(t), o = this.#g().graph.nodes.find((r) => r.id === i);
      if (!o) throw new Error(`Focus node '${i}' was not found.`);
      const a = await fromUuid(o.abilityUuid);
      if (!a) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      this.#g().refreshSnapshot(i, a), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  static async #pe(e, t) {
    try {
      const i = this.#E(t), o = this.#g().graph.nodes.find((r) => r.id === i);
      if (!o) throw new Error(`Focus node '${i}' was not found.`);
      if (!await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.DeleteNode") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.Editor.DeleteNodeConfirm", {
          name: He(o.abilitySnapshot.name || o.id)
        })}</p></div>`,
        rejectClose: !1,
        modal: !0,
        yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) return;
      this.#g().deleteNode(i), this.#t.clearSelection(i), await this.#h();
    } catch (i) {
      Q(i);
    }
  }
  #k() {
    if (this.item.type !== "focus" || !game.user.isGM || !this.isEditable)
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.GmOnly"));
  }
  #g() {
    if (this.#k(), !this.#a) throw new Error("Focus Tree editing is not active.");
    return this.#a;
  }
  #A() {
    const e = this.#a?.graph ?? this.item.system.graph;
    return {
      id: this.item.id,
      uuid: this.item.uuid,
      name: this.item.name,
      type: this.item.type,
      system: { graph: e }
    };
  }
  async #fe(e) {
    const t = this.#g();
    if (e.type !== "ability")
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.DropAbilityOnly"));
    const i = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.ChooseTier") },
      content: `<div class="cypherv2-dialog-fields">${this.#H()}</div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") }
    });
    if (!i) return;
    const o = t.addAbility(e, Number(i.tier ?? 1));
    this.#t.select(o.id), await this.#h();
  }
  #H() {
    return `<label>${game.i18n.localize("CYPHERV2.Focus.Tier")}
      <select name="tier">${[1, 2, 3, 4, 5, 6].map((e) => `<option value="${e}">${e}</option>`).join("")}</select>
    </label>`;
  }
  #C(e) {
    const t = e.img;
    return { name: e.name, ...t ? { img: t } : {}, system: structuredClone(e.system) };
  }
  #$(e) {
    return !e || this.item.type !== "genre" ? null : this.item.system.abilityCatalog.find((t) => t.id === e) ?? null;
  }
  async #I(e, t = 1) {
    if (this.item.type !== "genre" || e.type !== "ability")
      throw new Error(game.i18n.localize("CYPHERV2.Genre.DropAbilityOnly"));
    const i = this.item.system;
    if (i.abilityCatalog.some((a) => a.abilityUuid === e.uuid)) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.DuplicateAbility"));
      return;
    }
    const o = {
      id: crypto.randomUUID(),
      abilityUuid: e.uuid,
      minimumTier: ja(t),
      snapshot: this.#C(e)
    };
    await this.item.update({ "system.abilityCatalog": [...i.abilityCatalog, o] });
  }
  #R(e, t = "") {
    const i = t.trim();
    return !e && !i ? null : {
      id: crypto.randomUUID(),
      skillUuid: e?.uuid ?? "",
      customName: e ? "" : i,
      snapshot: e ? this.#C(e) : { name: i, system: {} }
    };
  }
  async #he(e, t) {
    const i = this.item.system, o = this.#R(null, e);
    if (!o) return;
    const a = { ...o, rank: t };
    await this.item.update({ "system.skillGrants": [...i.skillGrants, a] });
  }
  async #P(e, t, i = "trained") {
    if (this.item.type === "characterType" && e.type === "ability") {
      const o = this.item.system, a = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#C(e) };
      await this.item.update({ "system.abilityGrants": [...o.abilityGrants, a] });
      return;
    }
    if (this.item.type === "characterType" && e.type === "skill") {
      const o = this.item.system, a = this.#R(e);
      if (!a) return;
      await this.item.update({ "system.skillGrants": [...o.skillGrants, { ...a, rank: i }] });
      return;
    }
    if (this.item.type === "descriptor" && e.type === "skill") {
      const o = this.item.system, a = this.#R(e);
      if (!a) return;
      await this.item.update({ "system.skillGrants": [...o.skillGrants, { ...a, rank: i }] });
      return;
    }
    if (this.item.type === "species") {
      const o = this.item.system;
      if (e.type === "ability") {
        const a = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#C(e) };
        await this.item.update({ "system.abilityGrants": [...o.abilityGrants, a] });
        return;
      }
      if (e.type === "skill") {
        const a = this.#R(e);
        if (!a) return;
        await this.item.update({ "system.skillGrants": [...o.skillGrants, { ...a, rank: i }] });
        return;
      }
      if (e.type === "descriptor") {
        const a = { id: crypto.randomUUID(), descriptorUuid: e.uuid, snapshot: this.#C(e) };
        await this.item.update({ "system.descriptorGrants": [...o.descriptorGrants, a] });
        return;
      }
    }
    throw new Error(game.i18n.localize("CYPHERV2.Packages.InvalidDrop"));
  }
  #V(e) {
    const t = e.dataset.grantKind, i = e.dataset.grantId;
    if (!i) return null;
    if (t === "ability") return this.item.system.abilityGrants.find((a) => a.id === i) ?? null;
    const o = this.item.system;
    return t === "skill" ? o.skillGrants.find((a) => a.id === i) ?? null : t === "option" ? o.choiceGroups.find((a) => a.id === e.dataset.groupId)?.options.find((a) => a.id === i) ?? null : t === "abilityOption" ? this.item.system.abilityChoiceGroups.find((a) => a.id === e.dataset.groupId)?.options.find((a) => a.id === i) ?? null : t === "descriptor" ? this.item.system.descriptorGrants.find((a) => a.id === i) ?? null : null;
  }
  async #ge(e, t) {
    const i = e.dataset.grantKind, o = e.dataset.grantId;
    if (i === "ability") {
      const a = this.item.system.abilityGrants;
      await this.item.update({ "system.abilityGrants": a.map((r) => r.id === o ? t : r) });
    } else if (i === "skill") {
      const a = this.item.system.skillGrants;
      await this.item.update({ "system.skillGrants": a.map((r) => r.id === o ? t : r) });
    } else if (i === "option") {
      const a = e.dataset.groupId, r = this.item.system.choiceGroups;
      await this.item.update({ "system.choiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.map((l) => l.id === o ? t : l) } : s) });
    } else if (i === "abilityOption") {
      const a = e.dataset.groupId, r = this.item.system.abilityChoiceGroups;
      await this.item.update({ "system.abilityChoiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.map((l) => l.id === o ? t : l) } : s) });
    } else if (i === "descriptor") {
      const a = this.item.system.descriptorGrants;
      await this.item.update({ "system.descriptorGrants": a.map((r) => r.id === o ? t : r) });
    }
  }
  #E(e) {
    const t = e.dataset.nodeId;
    if (!t) throw new Error("Missing Focus node ID.");
    return t;
  }
  async #h() {
    this.#c = Nd(this.element), await this.render({ force: !0 });
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#u = Bd(this.element));
    const t = await super._prepareContext(e), i = this.item.system, o = this.item.type === "skill", a = this.item.type === "ability", r = this.item.type === "weapon", s = this.item.type === "armor", l = this.item.type === "shield", u = this.item.type === "equipment", c = this.item.type === "cypher", p = this.item.type === "artifact", f = this.item.type === "focus", m = this.item.type === "genre", b = this.item.type === "characterType", g = this.item.type === "descriptor", y = this.item.type === "species", w = ["ability", "focus", "genre", "skill", "weapon", "armor", "shield", "equipment", "cypher", "artifact", "characterType", "descriptor", "species"].includes(this.item.type), A = typeof this.item._source?.system?.description == "string" ? this.item._source.system.description : "", P = w ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(A, {
      async: !0,
      relativeTo: this.item
    }) : "", Y = b ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.backgroundOptions ?? ""), { async: !0, relativeTo: this.item }) : "", $ = b ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.equipmentNotes ?? ""), { async: !0, relativeTo: this.item }) : "", D = String(i.rank ?? "untrained"), U = String(i.defaultPool ?? "choose"), Ee = Array.isArray(i.contexts) ? i.contexts : [], S = a ? Me(this.item) : [], _ = a ? Gd(i) : null, me = _ ? {
      ..._,
      rollModifierLabel: game.i18n.localize(
        _.rollModifierLabel === "task" ? "CYPHERV2.Ability.TaskModifier" : _.rollModifierLabel === "defense" ? "CYPHERV2.Ability.DefenseModifier" : "CYPHERV2.Ability.RollModifier"
      )
    } : null, Re = o && Od({
      defaultPool: U,
      category: String(i.category ?? "general"),
      contexts: Ee,
      initiative: !!i.initiative
    }), se = i.grantedBy, pe = !!(se?.sourceUuid || se?.instanceId || se?.grantId), k = f ? this.#A() : null, T = k?.system.graph, L = T?.nodes.find((v) => v.id === this.#t.selectedNodeId), j = new Map(T?.nodes.map((v) => [
      v.id,
      v.abilitySnapshot.name || v.id
    ]) ?? []);
    return {
      ...t,
      item: this.item,
      system: this.item.system,
      systemFields: xn(this.item),
      enriched: { description: P, backgroundOptions: Y, equipmentNotes: $ },
      usesRichDescription: w,
      isSkill: o,
      isAbility: a,
      isWeapon: r,
      isArmor: s,
      isShield: l,
      isEquipment: u,
      isCypher: c,
      isArtifact: p,
      isFocus: f,
      isGenre: m,
      isCharacterType: b,
      typeCustomGenreSelected: b && String(i.genre ?? "none") === "custom",
      isDescriptor: g,
      isSpecies: y,
      isCompactRuleItem: a || o || r || s || l || u || c || p || m || b || y,
      usesCleanItemHeader: a || o || r || s || l || u || c || p || f || m || g || b || y,
      hideNormalItemFooter: a || o || r || s || l || u || c || p || f || m || g || b || y,
      genreEffortCapOptions: m ? ["core", "unlimited"].map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Genre.EffortCap.${v}`),
        selected: i.options?.totalEffortCapMode === v
      })) : [],
      genreMinimumTierMin: Xe,
      genreMinimumTierMax: zt,
      abilityMechanics: me,
      skillOptionalMechanics: Re,
      hasGrantProvenance: pe,
      packagePoolOptions: ["none", ...I].map((v) => ({
        value: v,
        label: v === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${v[0].toUpperCase()}${v.slice(1)}`),
        selected: i.edgeGrant?.pool === v
      })),
      packageGenreOptions: ["none", "fantasy", "scienceFiction", "superhero", "custom"].map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Packages.Genre.${v}`),
        selected: i.genre === v
      })),
      edgeModeOptions: ["none", "fixed", "choice"].map((v) => ({
        value: v,
        label: game.i18n.localize(v === "none" ? "CYPHERV2.Common.None" : v === "fixed" ? "CYPHERV2.Packages.FixedPool" : "CYPHERV2.Packages.ChoicePool"),
        selected: i.edgeGrant?.mode === v
      })),
      descriptorSkillGrants: g ? i.skillGrants.map((v) => ({
        ...v,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`)
      })) : [],
      descriptorPoolBonusChoiceGroups: g ? (i.poolBonusChoiceGroups ?? []).map((v) => ({
        ...v,
        poolsLabel: v.pools.map((J) => game.i18n.localize(
          `CYPHERV2.Pools.${J[0].toUpperCase()}${J.slice(1)}`
        )).join(" · ")
      })) : [],
      descriptorChoiceGroups: g ? i.choiceGroups.map((v) => ({
        ...v,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`)
      })) : [],
      typeSkillGrants: b ? i.skillGrants.map((v) => ({
        ...v,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`)
      })) : [],
      typeSkillChoiceGroups: b ? i.choiceGroups.map((v) => ({
        ...v,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`)
      })) : [],
      typeAbilityChoiceGroups: b ? i.abilityChoiceGroups : [],
      speciesSkillGrants: y ? i.skillGrants.map((v) => ({ ...v, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`) })) : [],
      speciesSkillChoiceGroups: y ? i.choiceGroups.map((v) => ({ ...v, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.rank}`) })) : [],
      speciesAbilityChoiceGroups: y ? i.abilityChoiceGroups : [],
      canEditFocusTree: !!(f && game.user.isGM && this.isEditable && !this.#a),
      focusTreeEditing: !!this.#a,
      focusEditor: this.#a ? {
        dirty: this.#a.dirty,
        tierOptions: [1, 2, 3, 4, 5, 6],
        connecting: !!this.#t.connectionSourceNodeId,
        connectionSourceName: this.#t.connectionSourceNodeId ? j.get(this.#t.connectionSourceNodeId) : "",
        selectedNode: L ? {
          ...L,
          canMoveLeft: !0,
          canMoveRight: !0
        } : null,
        connections: T?.connections.map((v) => ({
          ...v,
          fromName: j.get(v.from) ?? v.from,
          toName: j.get(v.to) ?? v.to
        })) ?? []
      } : null,
      focusTrees: f ? [await game.cypherv2.services.focusTrees.prepare(k, this.#a ? {
        editor: {
          selectedNodeId: this.#t.selectedNodeId,
          connectionSourceNodeId: this.#t.connectionSourceNodeId
        }
      } : {})] : [],
      isHeavyWeapon: r && i.category === "heavy",
      abilityActivationOptions: a ? Ra.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Ability.Activation.${v}`),
        selected: i.activation === v
      })) : [],
      abilityAllowedPoolOptions: a ? I.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Pools.${v[0].toUpperCase()}${v.slice(1)}`),
        selected: S.includes(v)
      })) : [],
      abilityRollOptions: a ? Pa.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Ability.Roll.${v}`),
        selected: i.roll === v
      })) : [],
      abilityWoundOptions: a ? ["none", ...ie].map((v) => ({
        value: v,
        label: game.i18n.localize(v === "none" ? "CYPHERV2.Common.None" : `CYPHERV2.Wounds.Severity.${v}`),
        selected: i.woundSeverity === v
      })) : [],
      abilityTargetOptions: a ? Sa.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Ability.TargetMode.${v}`),
        selected: i.targetMode === v
      })) : [],
      cypherManifestationOptions: c ? Sn.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${v}`),
        selected: i.manifestation === v
      })) : [],
      cypherPowerOptions: c ? kn.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Cypher.Power.${v}`),
        selected: i.power === v
      })) : [],
      cypherEffectiveLevel: c ? Jn(i) : 0,
      artifactLevelRollable: p ? bi(i) : !1,
      skillRankOptions: o ? X.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v}`),
        selected: v === D
      })) : [],
      skillPoolOptions: o ? [
        { value: "choose", label: game.i18n.localize("CYPHERV2.Skill.ChoosePool"), selected: U === "choose" },
        ...I.map((v) => ({
          value: v,
          label: game.i18n.localize(`CYPHERV2.Pools.${v[0].toUpperCase()}${v.slice(1)}`),
          selected: v === U
        }))
      ] : [],
      skillContextOptions: o ? [
        "attack",
        "attack.weapon",
        "attack.melee",
        "attack.ranged",
        "weapon.light",
        "weapon.medium",
        "weapon.heavy",
        "defense",
        "defense.block",
        "defense.dodge",
        "perception"
      ].map((v) => ({
        value: v,
        label: game.i18n.localize(
          v === "attack" ? "CYPHERV2.Combat.Context.AnyAttack" : v === "defense" ? "CYPHERV2.Combat.Context.AnyDefense" : `CYPHERV2.Combat.Context.${v}`
        ),
        selected: Ee.includes(v)
      })) : [],
      weaponCategoryOptions: r ? Te.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${v}`),
        selected: i.category === v
      })) : [],
      weaponDefaultPoolOptions: r ? ["none", ...I].map((v) => ({
        value: v,
        label: v === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${v[0].toUpperCase()}${v.slice(1)}`),
        selected: i.defaultPool === v
      })) : [],
      weaponAttackTypeOptions: r ? Ca.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${v}`),
        selected: i.attackType === v
      })) : [],
      rangeOptions: r ? sn.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Combat.Range.${v}`),
        selected: i.rangeCategory === v
      })) : [],
      weaponAttackModifierOptions: r ? [-2, -1, 0, 1, 2].map((v) => ({
        value: v,
        label: v > 0 ? `+${v}` : String(v),
        selected: i.attackModifier === v
      })) : [],
      weaponSkillLevelOptions: r ? X.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v}`),
        selected: i.skillLevel === v
      })) : [],
      combatResourcesExpanded: (r || s || l) && this.#s.has("combat-resources"),
      advancedExpanded: this.#s.has("advanced"),
      shieldWoundsExpanded: l && this.#s.has("shield-wounds"),
      combatDepletionSides: r || s || l ? xt(i.depletion ?? { die: "d6" }) : 0,
      combatDepletionThreshold: r || s || l ? cr(Number(i.depletion?.threshold ?? 1)) : "",
      depletionDieOptions: r || p ? Zr.map((v) => ({
        value: v,
        label: `1 in 1${v}`,
        selected: i.depletion?.die === v
      })) : [],
      armorCategoryOptions: s ? ze.map((v) => ({
        value: v,
        label: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${v}`),
        selected: i.category === v
      })) : [],
      shieldWoundTracks: l ? di({
        minor: i.wounds.minor.length,
        moderate: i.wounds.moderate.length,
        major: i.wounds.major.length
      }, i.derived.capacities).map((v) => ({
        ...v,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${v.severity}`),
        pips: v.pips.map((J) => ({
          ...J,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${v.severity}`),
            count: J.targetCount
          })
        }))
      })) : []
    };
  }
}
function Be(n, e) {
  return String(n[e] ?? "");
}
function ri(n) {
  return n.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
async function Hr(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n ? "CYPHERV2.Combat.Modification.Edit" : "CYPHERV2.Combat.Modification.Create") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Common.Name")} <input name="label" type="text" value="${ri(n?.label ?? "")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Contexts")} <input name="contexts" type="text" value="${ri(n?.contexts.join(", ") ?? "defense.speed")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.ModeLabel")}
        <select name="mode">
          ${["levelOverride", "levelDelta", "ease", "hinder"].map((o) => `<option value="${o}"${n?.mode === o ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${o}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Value")} <input name="value" type="number" step="1" value="${n?.value ?? 0}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Predicate")} <textarea name="predicate">${ri(JSON.stringify(n?.predicate ?? {}))}</textarea></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Visibility")}
        <select name="visibility"><option value="gm">${game.i18n.localize("CYPHERV2.Combat.Modification.Gm")}</option><option value="public"${n?.visibility === "public" ? " selected" : ""}>${game.i18n.localize("CYPHERV2.Combat.Modification.Public")}</option></select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Common.Description")} <textarea name="description">${ri(n?.description ?? "")}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (!e) return null;
  const t = JSON.parse(Be(e, "predicate") || "{}");
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("NPC modification predicate must be a JSON object.");
  const i = Be(e, "mode");
  return {
    id: n?.id ?? Ue(),
    label: Be(e, "label"),
    contexts: Be(e, "contexts").split(",").map((o) => o.trim()).filter(Boolean),
    mode: i,
    value: Number(Be(e, "value")),
    visibility: Be(e, "visibility") === "public" ? "public" : "gm",
    predicate: t,
    description: Be(e, "description")
  };
}
async function Wd(n) {
  try {
    const e = await Hr();
    if (!e) return;
    await n.update({ "system.modifications": [...n.system.modifications, e] });
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
async function _d(n, e) {
  try {
    const t = n.system.modifications.find((o) => o.id === e);
    if (!t) throw new Error(`NPC modification '${e}' was not found.`);
    const i = await Hr(t);
    if (!i) return;
    await n.update({
      "system.modifications": n.system.modifications.map((o) => o.id === e ? i : o)
    });
  } catch (t) {
    ui.notifications.error(t instanceof Error ? t.message : String(t));
  }
}
async function Kd(n, e) {
  const t = n.system.modifications.find((o) => o.id === e);
  if (!t) throw new Error(`NPC modification '${e}' was not found.`);
  await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Combat.Modification.Delete") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.Modification.DeleteConfirm", { name: t.label })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) && await n.update({
    "system.modifications": n.system.modifications.filter((o) => o.id !== e)
  });
}
function Xd(n) {
  const e = typeof n == "number" ? n : typeof n == "string" && n.trim() !== "" ? Number(n) : Number.NaN;
  return Number.isInteger(e) && e >= 0 ? e * 3 : null;
}
function Jd(n, e) {
  const t = Er(n, e), i = t.ratio > 0.5 ? "healthy" : t.ratio > 0.25 ? "intermediate" : "low";
  return { ...t, state: i };
}
const Qd = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
), oa = /* @__PURE__ */ new Set([
  "requestDefense",
  "createModification",
  "editModification",
  "deleteModification"
]);
class st extends Qd {
  static DEFAULT_OPTIONS = {
    ...Mn,
    classes: ["cypherv2", "sheet", "actor", "npc-sheet"],
    actions: Un({
      requestDefense: st.#e,
      createModification: st.#t,
      editModification: st.#i,
      deleteModification: st.#n
    }, oa),
    position: { width: 680, height: 700 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/actor/npc-sheet.hbs" }
  };
  static async #e() {
    await dc(this.actor);
  }
  static async #t() {
    await Wd(this.actor);
  }
  static async #i(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await _d(this.actor, i);
  }
  static async #n(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await Kd(this.actor, i);
  }
  async _onRender(e, t) {
    await super._onRender(e, t), qn(this.element, this.isEditable, oa);
  }
  _onClose(e) {
    super._onClose(e);
  }
  async _prepareContext(e) {
    const t = await super._prepareContext(e), i = this.actor.system, o = this.actor._source?.system, a = typeof o?.notes == "string" ? o.notes : "", r = a ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(a, {
      async: !0,
      relativeTo: this.actor
    }) : "";
    return {
      ...t,
      actor: this.actor,
      system: this.actor.system,
      systemFields: xn(this.actor),
      editable: this.isEditable,
      isGM: game.user.isGM,
      enriched: { notes: r },
      targetNumber: Xd(i.level) ?? "—",
      healthGauge: Jd(
        i.health.value,
        i.health.max ?? i.health.baseMax
      ),
      woundSeverityOptions: ["minor", "moderate", "major"].map((s) => ({
        value: s,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${s}`),
        selected: i.damage.woundSeverity === s
      })),
      modifications: i.modifications.map((s) => ({
        ...s,
        contextsLabel: s.contexts.join(", "),
        modeLabel: game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${s.mode}`)
      }))
    };
  }
}
function Zd() {
  const { DocumentSheetConfig: n } = foundry.applications.apps;
  n.registerSheet(foundry.documents.Actor, H, R, {
    types: ["character"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Character"
  }), n.registerSheet(foundry.documents.Actor, H, st, {
    types: ["npc"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Npc"
  }), n.registerSheet(foundry.documents.Item, H, V, {
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Item"
  });
}
function K(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function $r(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function eu(n) {
  const e = K(n, "Paid Effort");
  return e === 0 ? 0 : 3 + (e - 1) * 2;
}
function Cn(n, e, t, i = !1) {
  const o = K(n, "Action cost"), a = K(e, "Effort cost"), r = o + a, s = a + (i ? 0 : o), l = Math.min(s, Math.max(0, Math.trunc(t)));
  return {
    actionCostBeforeEdge: o,
    effortCostBeforeEdge: a,
    totalCostBeforeEdge: r,
    edgeApplied: l,
    poolCost: Math.max(0, r - l)
  };
}
function Ir(n) {
  if (K(n, "Natural d20 result", 1), n > 20) throw new Error("Natural d20 result cannot exceed 20.");
  return [1, 17, 18, 19, 20].includes(n) ? [`natural-${n}`] : [];
}
function tu(n) {
  return Ir(n), Math.floor(n / 3);
}
function Xi(n, e, t, i, o) {
  return { id: n, label: e, direction: t, steps: i, source: o };
}
function iu(n) {
  const e = K(n.limits.difficultyCeiling, "Difficulty ceiling"), t = K(n.limits.assetLimit, "Asset limit"), i = K(n.limits.paidEffortMaximum, "Maximum Effort"), o = K(n.assets, "Assets"), a = K(n.paidEffort, "Paid Effort"), r = K(n.damageEffort ?? 0, "Damage Effort"), s = K(n.freeDamageEffort ?? 0, "Free Damage Effort"), l = K(n.freeEffort, "Free Effort"), u = n.limits.totalEffortMaximum === null ? null : K(n.limits.totalEffortMaximum, "Maximum total Effort");
  if (K(n.poolValue, "Pool value"), o > t) throw new Error(`Assets cannot exceed the current limit of ${t}.`);
  const c = r + s, p = a + c + l, f = a + r, m = l + s;
  if (u !== null && p > u)
    throw new Error(`Maximum total Effort: ${u}.`);
  if (f > i)
    throw new Error(`Paid Effort cannot exceed the Character maximum of ${i}.`);
  const b = [];
  o > 0 && b.push(Xi(
    "core.assets",
    "CYPHERV2.Roll.Breakdown.Assets",
    "ease",
    o,
    "asset"
  )), a > 0 && b.push(Xi(
    "core.effort.paid",
    "CYPHERV2.Roll.Breakdown.PaidEffort",
    "ease",
    a,
    "effort"
  )), l > 0 && b.push(Xi(
    "core.effort.free",
    "CYPHERV2.Roll.Breakdown.FreeEffort",
    "ease",
    l,
    "free-effort"
  ));
  for (const $ of n.contributions)
    K($.steps, `Steps for '${$.id}'`), $.steps > 0 && b.push({ ...$ });
  const g = b.filter(($) => $.direction === "ease").reduce(($, D) => $ + D.steps, 0), y = b.filter(($) => $.direction === "hinder").reduce(($, D) => $ + D.steps, 0), w = g - y, A = Cn(
    n.actionCost ?? 0,
    eu(f),
    n.edge,
    n.actionCostIgnoresEdge ?? !1
  );
  let P = null, Y = null;
  if (n.difficulty.mode !== "unknown") {
    const $ = K(n.difficulty.value, "Difficulty");
    if ($ > e)
      throw new Error(`Difficulty cannot exceed the current ceiling of ${e}.`);
    P = $r($ - w, 0, e), Y = P * 3;
  }
  return {
    context: n,
    breakdown: b,
    totalEase: g,
    totalHindrance: y,
    netSteps: w,
    damageEffortApplied: c,
    totalEffortApplied: p,
    paidEffortApplied: f,
    freeEffortApplied: m,
    totalEffortMaximum: u,
    ...A,
    finalDifficulty: P,
    targetNumber: Y
  };
}
function nu(n, e) {
  if (n.finalDifficulty === 0) return Vr(n);
  const t = Ir(e), i = n.targetNumber === null ? null : e >= n.targetNumber, o = tu(e), a = $r(
    o + n.netSteps,
    0,
    n.context.limits.difficultyCeiling
  );
  return {
    prepared: n,
    naturalRoll: e,
    naturalDifficulty: o,
    automaticSuccess: !1,
    naturalMarkers: t,
    naturalEffects: [],
    success: i,
    beatsDifficulty: a,
    poolCostPaid: n.poolCost,
    poolCostRefunded: 0
  };
}
function Vr(n) {
  if (n.finalDifficulty !== 0 || n.targetNumber !== 0)
    throw new Error("Automatic success requires a known final difficulty of 0.");
  return {
    prepared: n,
    naturalRoll: null,
    naturalDifficulty: null,
    automaticSuccess: !0,
    naturalMarkers: [],
    naturalEffects: [],
    success: !0,
    beatsDifficulty: null,
    poolCostPaid: n.poolCost,
    poolCostRefunded: 0
  };
}
function Ji(n) {
  return n === null ? "unresolved" : n ? "applied" : "inapplicable";
}
function ou(n, e = 1) {
  const t = n.naturalRoll;
  if (t === null) return [];
  const i = { sourceId: "cypherv2.core", naturalRoll: t }, o = vt(e);
  if (t === 1)
    return [{
      ...i,
      id: "core.natural-1.intrusion",
      kind: "gm-intrusion",
      status: "applied",
      label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion",
      triggersGMIntrusion: !0,
      intrusionProvenance: "natural-1"
    }];
  const a = t <= o ? [{
    id: `core.horror-mode.natural-${t}.intrusion`,
    sourceId: "cypherv2.horror-mode",
    naturalRoll: t,
    kind: "gm-intrusion",
    status: "applied",
    label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion",
    triggersGMIntrusion: !0,
    intrusionProvenance: "horror-mode",
    horrorIntrusionRange: o
  }] : [];
  if (t === 17 || t === 18) {
    const r = n.prepared.context.purpose === "damage";
    return [...a, {
      ...i,
      id: `core.natural-${t}.damage`,
      kind: "damage-bonus",
      status: r ? Ji(n.success) : "inapplicable",
      label: `CYPHERV2.Roll.NaturalEffects.Damage${t}`,
      damageBonus: t === 17 ? 1 : 2
    }];
  }
  if (t === 19) {
    const r = Ji(n.success);
    if (n.prepared.context.purpose === "damage") {
      const s = r === "applied" ? "available" : r;
      return [...a, {
        ...i,
        id: "core.natural-19.damage",
        kind: "damage-bonus",
        status: s,
        label: "CYPHERV2.Roll.NaturalEffects.Damage19",
        damageBonus: 3,
        choiceGroup: "core.natural-19.choice"
      }, {
        ...i,
        id: "core.natural-19.minor",
        kind: "minor-effect",
        status: s,
        label: "CYPHERV2.Roll.NaturalEffects.Minor",
        choiceGroup: "core.natural-19.choice"
      }];
    }
    return [...a, {
      ...i,
      id: "core.natural-19.minor",
      kind: "minor-effect",
      status: r,
      label: "CYPHERV2.Roll.NaturalEffects.Minor"
    }];
  }
  if (t === 20) {
    const r = Ji(n.success), s = n.prepared.context.purpose === "damage" ? [{
      ...i,
      id: "core.natural-20.damage",
      kind: "damage-bonus",
      status: r === "applied" ? "available" : r,
      label: "CYPHERV2.Roll.NaturalEffects.Damage20",
      damageBonus: 4,
      choiceGroup: "core.natural-20.choice"
    }, {
      ...i,
      id: "core.natural-20.major",
      kind: "major-effect",
      status: r === "applied" ? "available" : r,
      label: "CYPHERV2.Roll.NaturalEffects.Major",
      choiceGroup: "core.natural-20.choice"
    }] : [{
      ...i,
      id: "core.natural-20.major",
      kind: "major-effect",
      status: r,
      label: "CYPHERV2.Roll.NaturalEffects.Major"
    }];
    return n.prepared.poolCost > 0 && s.push({
      ...i,
      id: "core.natural-20.refund",
      kind: "pool-cost-refund",
      status: "applied",
      label: "CYPHERV2.Roll.NaturalEffects.Refund",
      refundsPoolCost: !0
    }), [...a, ...s];
  }
  return a;
}
const Le = {
  id: "cypherv2.core",
  title: "CYPHERV2.Rules.Core",
  version: "0.1.0",
  core: !0,
  priority: -1e3,
  extensionPoints: [
    "actorDerivedData",
    "rollModifiers",
    "recoveryRules",
    "restRules",
    "woundRules",
    "poolRules",
    "rallyRules",
    "durationTriggers",
    "difficultyPolicies",
    "skillRules",
    "naturalResultRules",
    "gmIntrusionRules",
    "combatRules",
    "targetRules",
    "damageRules",
    "advancementRules",
    "focusBehaviors"
  ]
};
function au(n) {
  n.register(Le), n.registerDifficultyPolicy(Le.id, (e) => ({
    ...e,
    assetLimit: 2
  })), n.registerSkillRankRule(Le.id, lu), n.registerNaturalResultRule(Le.id, (e, t) => [
    ...t,
    ...ou(e, e.prepared.context.horrorIntrusionRange)
  ]), n.registerGMIntrusionPolicy(Le.id, (e) => ({
    ...e,
    targetedXpToTarget: 1,
    targetedXpToShare: 1,
    groupXpPerTarget: 1,
    freeXp: 0
  })), n.registerCombatPolicy(Le.id, () => ru), n.registerAdvancementPolicy(Le.id, () => Va);
}
const ru = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
}), su = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function lu(n, e) {
  const t = su[n];
  return t === 0 ? null : {
    id: `core.skill.${e.id}.rank`,
    label: `CYPHERV2.Skill.Ranks.${n}`,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: "skill",
    sourceId: e.id
  };
}
class cu {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Map();
  #n = /* @__PURE__ */ new Map();
  #o = /* @__PURE__ */ new Map();
  #r = /* @__PURE__ */ new Map();
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #l = /* @__PURE__ */ new Map();
  register(e) {
    const t = e.id.trim();
    if (!t) throw new Error("Rule module IDs cannot be blank.");
    if (this.#e.has(t)) throw new Error(`Rule module '${t}' is already registered.`);
    const i = Object.freeze({
      ...e,
      id: t,
      priority: e.priority ?? 0,
      dependencies: Object.freeze([...e.dependencies ?? []]),
      conflicts: Object.freeze([...e.conflicts ?? []]),
      extensionPoints: Object.freeze([...e.extensionPoints ?? []])
    });
    return this.#e.set(t, i), i;
  }
  get(e) {
    return this.#e.get(e);
  }
  has(e) {
    return this.#e.has(e);
  }
  list() {
    return [...this.#e.values()].sort(
      (e, t) => (e.priority ?? 0) - (t.priority ?? 0) || e.id.localeCompare(t.id)
    );
  }
  active(e) {
    const t = new Set(e);
    return this.list().filter((i) => i.core === !0 || t.has(i.id));
  }
  diagnostics(e) {
    const t = this.active(e), i = new Set(t.map((a) => a.id)), o = [];
    for (const a of t) {
      for (const r of a.dependencies ?? [])
        i.has(r) || o.push({
          severity: "error",
          moduleId: a.id,
          message: `Missing active dependency '${r}'.`
        });
      for (const r of a.conflicts ?? [])
        i.has(r) && o.push({
          severity: "error",
          moduleId: a.id,
          message: `Conflicts with active module '${r}'.`
        });
    }
    return o;
  }
  registerDifficultyPolicy(e, t) {
    this.#s(e, "difficultyPolicies");
    const i = this.#t.get(e) ?? [];
    i.push(t), this.#t.set(e, i);
  }
  resolveDifficultyPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#t.get(o.id) ?? [])
        i = { ...a(Object.freeze({ ...i })) };
    if (!Number.isInteger(i.difficultyCeiling) || i.difficultyCeiling < 0)
      throw new Error("Difficulty policies must provide a non-negative integer ceiling.");
    if (!Number.isInteger(i.assetLimit) || i.assetLimit < 0)
      throw new Error("Difficulty policies must provide a non-negative integer Asset limit.");
    return Object.freeze(i);
  }
  registerRollContextEnricher(e, t) {
    this.#s(e, "rollModifiers");
    const i = this.#i.get(e) ?? [];
    i.push(t), this.#i.set(e, i);
  }
  enrichRollContext(e, t = []) {
    let i = e;
    for (const o of this.active(t))
      for (const a of this.#i.get(o.id) ?? [])
        i = a(Object.freeze(i));
    return i;
  }
  registerSkillRankRule(e, t) {
    this.#s(e, "skillRules");
    const i = this.#n.get(e) ?? [];
    i.push(t), this.#n.set(e, i);
  }
  resolveSkillRankContribution(e, t, i = []) {
    let o = null;
    for (const a of this.active(i))
      for (const r of this.#n.get(a.id) ?? [])
        o = r(e, t) ?? o;
    return o;
  }
  registerNaturalResultRule(e, t) {
    this.#s(e, "naturalResultRules");
    const i = this.#o.get(e) ?? [];
    i.push(t), this.#o.set(e, i);
  }
  resolveNaturalEffects(e, t = []) {
    let i = [];
    for (const o of this.active(t))
      for (const a of this.#o.get(o.id) ?? [])
        i = a(Object.freeze(e), Object.freeze([...i]));
    return Object.freeze([...i]);
  }
  registerGMIntrusionPolicy(e, t) {
    this.#s(e, "gmIntrusionRules");
    const i = this.#r.get(e) ?? [];
    i.push(t), this.#r.set(e, i);
  }
  resolveGMIntrusionPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#r.get(o.id) ?? [])
        i = { ...a(Object.freeze({ ...i })) };
    return Object.freeze(i);
  }
  registerCombatPolicy(e, t) {
    this.#s(e, "combatRules");
    const i = this.#a.get(e) ?? [];
    i.push(t), this.#a.set(e, i);
  }
  resolveCombatPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#a.get(o.id) ?? [])
        i = { ...a(Object.freeze({ ...i })) };
    return Object.freeze(i);
  }
  registerTargetResolutionRule(e, t) {
    this.#s(e, "targetRules");
    const i = this.#c.get(e) ?? [];
    i.push(t), this.#c.set(e, i);
  }
  enrichTargetResolution(e, t, i, o = []) {
    let a = e;
    for (const r of this.active(o))
      for (const s of this.#c.get(r.id) ?? [])
        a = s(Object.freeze(a), Object.freeze(t), Object.freeze(i));
    return Object.freeze(a);
  }
  registerAdvancementPolicy(e, t) {
    this.#s(e, "advancementRules");
    const i = this.#l.get(e) ?? [];
    i.push(t), this.#l.set(e, i);
  }
  resolveAdvancementPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#l.get(o.id) ?? [])
        i = { ...a(Object.freeze({ ...i })) };
    for (const [o, a] of Object.entries({
      xpCost: i.xpCost,
      purchasesPerTier: i.purchasesPerTier,
      capabilityPoints: i.capabilityPoints,
      effortMaximum: i.effortMaximum,
      recoveryBonus: i.recoveryBonus,
      attackDefenseTrainingTier: i.attackDefenseTrainingTier,
      attackDefenseSpecializationTier: i.attackDefenseSpecializationTier
    }))
      if (!Number.isInteger(a) || a < 0)
        throw new Error(`Advancement policy '${o}' must be a non-negative integer.`);
    return Object.freeze(i);
  }
  #s(e, t) {
    const i = this.#e.get(e);
    if (!i) throw new Error(`Rule module '${e}' must be registered before its behaviors.`);
    if (!i.extensionPoints?.includes(t))
      throw new Error(`Rule module '${e}' does not declare '${t}'.`);
  }
}
async function du() {
  const n = await new Roll("1d6").evaluate();
  return Number(n.total);
}
function si(n, e, t, i) {
  if (!Number.isInteger(n) || n < e || n > t)
    throw new Error(`${i} must be an integer from ${e} to ${t}.`);
  return n;
}
class uu {
  #e;
  #t;
  #i;
  constructor(e = du, t = Ue, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  calculateRoll(e, t, i, o = !1, a = 0, r = "") {
    si(i, 1, 6, "Recovery die"), si(t, 1, Number.MAX_SAFE_INTEGER, "Tier"), si(a, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, "Recovery bonus");
    const s = a + (e === "one-action" && o ? 2 : 0);
    return { slotId: r, type: e, dieResult: i, tier: t, bonus: s, total: Math.max(0, i + t + s), lastAction: o };
  }
  availableTypes(e) {
    return ka(e);
  }
  isAvailable(e, t) {
    return !e[Ut[t]];
  }
  slots(e) {
    return e.system.recovery.slots?.length ? e.system.recovery.slots.map((t) => ({ ...t })) : Qe(e.system.recovery.used);
  }
  availableSlots(e) {
    return It(this.slots(e));
  }
  async roll(e, t, i = !1, o) {
    Ye(e);
    const a = this.availableSlots(e).find((r) => r.type === t && (!o || r.id === o));
    if (!a)
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    return this.calculateRoll(
      t,
      O(e.system),
      await this.#e(),
      i,
      e.system.derived.recovery.bonus,
      a.id
    );
  }
  distribute(e, t, i) {
    const o = I.reduce((s, l) => s + si(i[l], 0, Number.MAX_SAFE_INTEGER, `${l} allocation`), 0);
    if (o > t.total) throw new Error("Recovery allocations exceed the Recovery result.");
    const a = {}, r = {};
    for (const s of I) {
      const l = e.system.stats[s].value, u = e.system.derived.pools[s].max, c = Math.max(0, u - l);
      if (i[s] > c)
        throw new Error(`${s} allocation exceeds the Pool's missing points.`);
      r[s] = i[s], a[s] = l + r[s];
    }
    return {
      roll: t,
      requested: { ...i },
      restored: r,
      values: a,
      unspent: t.total - o
    };
  }
  prepareNormal(e, t, i) {
    Ye(e);
    const o = this.slots(e), a = t.slotId || It(o).find((c) => c.type === t.type)?.id || "", r = ro(o, a, t.type), s = this.distribute(e, t, i), l = mt(r), u = {
      id: this.#t(),
      slotId: a,
      kind: "normal",
      type: t.type,
      rolled: !0,
      dieResult: t.dieResult,
      tier: t.tier,
      bonus: t.bonus,
      total: t.total,
      might: s.restored.might,
      speed: s.restored.speed,
      intellect: s.restored.intellect,
      timestamp: this.#i()
    };
    return { ...s, kind: "normal", used: l, slots: r, historyEntry: u };
  }
  prepareNonRest(e, t, i) {
    Ye(e);
    const o = this.slots(e), a = It(o).find((c) => c.type === t && (!i || c.id === i));
    if (!a)
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    const r = ro(o, a.id, t), s = mt(r), l = { might: 0, speed: 0, intellect: 0 }, u = {
      id: this.#t(),
      slotId: a.id,
      kind: "nonRest",
      type: t,
      rolled: !1,
      dieResult: 0,
      tier: O(e.system),
      bonus: 0,
      total: 0,
      ...l,
      timestamp: this.#i()
    };
    return {
      kind: "nonRest",
      roll: null,
      requested: { ...l },
      restored: { ...l },
      values: {
        might: e.system.stats.might.value,
        speed: e.system.stats.speed.value,
        intellect: e.system.stats.intellect.value
      },
      unspent: 0,
      used: s,
      slots: r,
      historyEntry: u
    };
  }
}
const mu = {
  beforeComplete(n) {
    Hooks.callAll("cypherv2.preRecoveryWorkflow", n);
  },
  processDurations(n) {
    Hooks.callAll("cypherv2.processRecoveryDurations", n);
  },
  afterComplete(n) {
    Hooks.callAll("cypherv2.recoveryCompleted", n), n.kind === "normal" && n.rest && Hooks.callAll("cypherv2.restCompleted", n), n.kind === "nonRest" && Hooks.callAll("cypherv2.nonRestRecoveryCompleted", n);
  },
  refresh(n) {
    Hooks.callAll("cypherv2.recoveryRefresh", n);
  }
};
function pu(n) {
  return n === "one-action" ? null : n;
}
function aa(n, e) {
  const t = [n === "normal" ? "recovery" : "non-rest-recovery"];
  return e !== "one-action" && t.push("10-minute-or-longer"), (e === "1-hour" || e === "10-hours") && t.push("1-hour-or-longer"), e === "10-hours" && t.push("10-hour"), t;
}
class fu {
  #e;
  #t;
  #i;
  constructor(e, t, i = mu) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async rollNormal(e, t, i = !1, o) {
    return this.#e.roll(e, t, i, o);
  }
  async completeNormal(e, t, i, o = {}) {
    Ye(e);
    const a = pu(t.type), r = a ? this.#t.prepare(e, a, o) : null, s = this.#e.prepareNormal(e, t, i), l = {
      kind: "normal",
      type: t.type,
      recovery: s,
      rest: r,
      durationTriggers: aa("normal", t.type)
    };
    await this.#i.beforeComplete(l);
    const u = {
      "system.stats.might.value": s.values.might,
      "system.stats.speed.value": s.values.speed,
      "system.stats.intellect.value": s.values.intellect
    };
    return r && (u["system.wounds"] = r.result.wounds, u["system.rest.lastType"] = r.result.type, u["system.rest.history"] = [...e.system.rest.history, r.historyEntry]), u["system.recovery.used"] = s.used, u["system.recovery.slots"] = s.slots, u["system.recovery.history"] = [...e.system.recovery.history, s.historyEntry], await e.update(u), await this.#i.processDurations(l), await this.#i.afterComplete(l), await this.#i.refresh(l), l;
  }
  async completeNonRest(e, t, i) {
    Ye(e);
    const o = this.#e.prepareNonRest(e, t, i), a = {
      kind: "nonRest",
      type: t,
      recovery: o,
      rest: null,
      durationTriggers: aa("nonRest", t)
    };
    return await this.#i.beforeComplete(a), await e.update({
      "system.recovery.used": o.used,
      "system.recovery.slots": o.slots,
      "system.recovery.history": [...e.system.recovery.history, o.historyEntry]
    }), await this.#i.processDurations(a), await this.#i.afterComplete(a), await this.#i.refresh(a), a;
  }
}
class hu {
  #e;
  #t;
  constructor(e = Ue, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  rest(e, t, i = {}) {
    const o = ot(e), a = [];
    let r = "";
    if (t === "10-minutes")
      a.push(...o.minor), o.minor = [], r = "remove-minors";
    else if (t === "1-hour")
      if (r = i.oneHourChoice ?? "remove-moderate", r === "remove-minors")
        a.push(...o.minor), o.minor = [];
      else {
        const s = o.moderate.pop();
        s && a.push(s);
      }
    else if (t === "10-hours") {
      const s = i.removeMinorsInsteadOfOneModerate === !0 && o.minor.length > 0 && o.moderate.length > 0;
      if (r = s ? "remove-minors-instead-of-one-moderate" : "remove-all-moderate", s ? (a.push(...o.minor), o.minor = [], a.push(...o.moderate.slice(1)), o.moderate = o.moderate.slice(0, 1)) : (a.push(...o.moderate), o.moderate = []), i.majorTaskSucceeded === !0) {
        const l = o.major.pop();
        l && a.push(l);
      }
    }
    return {
      type: t,
      wounds: o,
      removed: a,
      choice: r,
      majorTaskSucceeded: i.majorTaskSucceeded === !0
    };
  }
  prepare(e, t, i = {}) {
    Ye(e);
    const o = this.rest(e.system.wounds, t, i);
    return {
      result: o,
      historyEntry: {
        id: this.#e(),
        type: t,
        choice: o.choice,
        majorTaskSucceeded: o.majorTaskSucceeded,
        removedWoundIds: o.removed.map((a) => a.id),
        timestamp: this.#t()
      }
    };
  }
  async apply(e, t, i = {}) {
    const { result: o, historyEntry: a } = this.prepare(e, t, i);
    return await e.update({
      "system.wounds": o.wounds,
      "system.rest.lastType": t,
      "system.rest.history": [...e.system.rest.history, a]
    }), o;
  }
}
const ra = { minor: 3, moderate: 3, major: 3 };
function Ht(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function gu(n) {
  return Ht(n, "Pool damage overflow"), n === 0 ? null : n <= 4 ? "minor" : n <= 8 ? "moderate" : "major";
}
class yu {
  #e;
  constructor(e = Ue) {
    this.#e = e;
  }
  applyWound(e, t, i = ra, o = {}) {
    const a = ot(e), r = {
      id: o.id ?? this.#e(),
      label: o.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
      description: o.description ?? "",
      sourceUuid: o.sourceUuid ?? "cypherv2.core",
      treated: o.treated ?? !1
    }, s = ie.indexOf(t);
    if (s < 0) throw new Error(`Unsupported Wound severity '${t}'.`);
    for (let l = s; l < ie.length; l += 1) {
      const u = ie[l];
      if (!(a[u].length >= i[u]))
        return a[u].push(r), {
          wounds: a,
          requestedSeverity: t,
          appliedSeverity: u,
          overflowSteps: l - s,
          record: r,
          applied: !0,
          dead: a.major.length >= i.major
        };
    }
    return {
      wounds: a,
      requestedSeverity: t,
      appliedSeverity: null,
      overflowSteps: ie.length - s,
      record: null,
      applied: !1,
      dead: a.major.length >= i.major
    };
  }
  removeOne(e, t, i) {
    const o = ot(e), a = i ? o[t].findIndex((s) => s.id === i) : o[t].length - 1;
    if (a < 0) return { wounds: o, removed: null };
    const [r] = o[t].splice(a, 1);
    return { wounds: o, removed: r ?? null };
  }
  updateWound(e, t, i, o) {
    if (typeof o.label != "string" || typeof o.description != "string")
      throw new Error("Wound label and description must be strings.");
    const a = ot(e), r = a[t].findIndex((u) => u.id === i);
    if (r < 0) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    const l = { ...a[t][r], label: o.label, description: o.description };
    return a[t][r] = l, { wounds: a, updated: l };
  }
  removeAll(e, t) {
    const i = ot(e), o = i[t];
    return i[t] = [], { wounds: i, removed: o };
  }
  setWoundCount(e, t, i, o, a = {}) {
    const r = Ht(i, "Wound count"), s = Ht(o, "Wound capacity");
    if (r > s) throw new Error("Wound count cannot exceed its capacity.");
    const l = ot(e), u = l[t], c = u.length, p = r < c ? u.splice(r) : [], f = [];
    for (; u.length < r; ) {
      const m = {
        id: this.#e(),
        label: a.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
        description: a.description ?? "",
        sourceUuid: a.sourceUuid ?? "cypherv2.manual",
        treated: a.treated ?? !1
      };
      u.push(m), f.push(m);
    }
    return { wounds: l, severity: t, previousCount: c, count: r, added: f, removed: p };
  }
  applyPoolDamage(e, t, i, o, a = ra, r = {}) {
    const s = Ht(i, "Pool value"), l = Ht(o, "Pool damage"), u = Math.min(s, l), c = s - u, p = l - u, f = gu(p), m = f ? this.applyWound(e, f, a, {
      ...r,
      label: r.label ?? `${t} Pool overflow`
    }) : null;
    return {
      pool: t,
      damage: l,
      previousValue: s,
      value: c,
      absorbed: u,
      overflow: p,
      overflowSeverity: f,
      wound: m
    };
  }
  async apply(e, t, i = {}) {
    return te(e), this.applyTrack(e, t, e.system.derived.wounds.capacities, i);
  }
  async applyTrack(e, t, i, o = {}) {
    const a = this.applyWound(e.system.wounds, t, i, o);
    return a.applied && await e.update({ "system.wounds": a.wounds }), a;
  }
  async edit(e, t, i, o) {
    return te(e), this.editTrack(e, t, i, o);
  }
  async editTrack(e, t, i, o) {
    const a = this.updateWound(e.system.wounds, t, i, o);
    return await e.update({ "system.wounds": a.wounds }), a;
  }
  async setCount(e, t, i, o = {}) {
    return te(e), this.setTrackCount(
      e,
      t,
      i,
      e.system.derived.wounds.capacities[t],
      o
    );
  }
  async setTrackCount(e, t, i, o, a = {}) {
    const r = this.setWoundCount(e.system.wounds, t, i, o, a);
    return r.count !== r.previousCount && await e.update({ "system.wounds": r.wounds }), r;
  }
  async delete(e, t, i) {
    return te(e), this.deleteTrack(e, t, i);
  }
  async deleteTrack(e, t, i) {
    const o = this.removeOne(e.system.wounds, t, i);
    if (!o.removed) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    return await e.update({ "system.wounds": o.wounds }), { wounds: o.wounds, removed: o.removed };
  }
  async damagePool(e, t, i, o = {}) {
    te(e);
    const a = this.applyPoolDamage(
      e.system.wounds,
      t,
      e.system.stats[t].value,
      i,
      e.system.derived.wounds.capacities,
      o
    ), r = { [`system.stats.${t}.value`]: a.value };
    return a.wound?.applied && (r["system.wounds"] = a.wound.wounds), await e.update(r), a;
  }
}
function bu(n, e) {
  return n.naturalEffects.filter((t) => t.status !== "inapplicable").map((t) => ({
    kind: t.kind,
    label: e(t.label),
    status: e(`CYPHERV2.Roll.NaturalEffects.Status.${t.status}`),
    isIntrusion: t.kind === "gm-intrusion",
    ...t.damageBonus === void 0 ? {} : { damageBonus: t.damageBonus }
  }));
}
function vu(n, e) {
  const t = n.naturalEffects.filter((l) => l.status !== "inapplicable");
  if (t.some((l) => l.kind === "gm-intrusion"))
    return { label: e("CYPHERV2.Roll.NaturalEffects.GMIntrusion") };
  const i = t.find((l) => l.kind === "damage-bonus"), o = i?.damageBonus === void 0 ? void 0 : `+${i.damageBonus} ${e("CYPHERV2.Roll.NaturalEffects.Damage")}`, a = t.some((l) => l.kind === "minor-effect") || n.naturalRoll === 19 && i !== void 0, r = t.some((l) => l.kind === "major-effect") || n.naturalRoll === 20 && i !== void 0;
  if (a)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.MinorEffect"),
      ...o ? { damage: o } : {}
    };
  if (r)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.MajorEffect"),
      ...o ? { damage: o } : {}
    };
  if (i)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.DamageBonus"),
      ...o ? { damage: o } : {}
    };
  const s = t[0];
  return s ? { label: e(s.label) } : null;
}
function sa(n, e, t) {
  return `${we(e, n)} ${t(e === "ease" ? n === 1 ? "CYPHERV2.Roll.EaseStep" : "CYPHERV2.Roll.EaseSteps" : n === 1 ? "CYPHERV2.Roll.HindranceStep" : "CYPHERV2.Roll.HindranceSteps")}`;
}
function wu(n, e) {
  return n.breakdown.map((t) => ({
    label: e(t.label),
    value: we(t.direction, t.steps)
  }));
}
function Cu(n, e) {
  return n.breakdown.length === 0 && n.totalEase === 0 && n.totalHindrance === 0 ? [] : [{
    label: e("CYPHERV2.Roll.TotalEase"),
    value: n.totalEase === 0 ? 0 : we("ease", n.totalEase)
  }, {
    label: e("CYPHERV2.Roll.TotalHindrance"),
    value: n.totalHindrance === 0 ? 0 : we("hinder", n.totalHindrance)
  }];
}
function Eu(n, e) {
  const t = n.prepared, i = t.context;
  return [
    ...i.paidEffort > 0 ? [{
      label: e("CYPHERV2.Roll.PaidEffort"),
      value: i.paidEffort
    }] : [],
    ...(i.damageEffort ?? 0) > 0 ? [{
      label: e("CYPHERV2.Roll.PaidDamageEffort"),
      value: i.damageEffort ?? 0
    }] : [],
    ...i.freeEffort > 0 ? [{
      label: e("CYPHERV2.Roll.FreeEffort"),
      value: i.freeEffort
    }] : [],
    ...(i.freeDamageEffort ?? 0) > 0 ? [{
      label: e("CYPHERV2.Roll.FreeDamageEffort"),
      value: i.freeDamageEffort ?? 0
    }] : [],
    ...t.totalEffortApplied > 0 ? [{
      label: e("CYPHERV2.Roll.TotalAppliedEffort"),
      value: t.totalEffortMaximum === null ? String(t.totalEffortApplied) : `${t.totalEffortApplied} / ${t.totalEffortMaximum}`
    }] : []
  ];
}
function Ru(n, e) {
  const t = n.prepared, i = t.actionCostBeforeEdge > 0 || t.effortCostBeforeEdge > 0 || n.poolCostPaid > 0;
  return [
    ...t.actionCostBeforeEdge > 0 ? [{
      label: e("CYPHERV2.Ability.Cost"),
      value: t.actionCostBeforeEdge
    }] : [],
    ...t.edgeApplied > 0 ? [{
      label: e("CYPHERV2.Pools.Edge"),
      value: t.edgeApplied
    }] : [],
    ...i ? [{
      label: e("CYPHERV2.Roll.CostPaid"),
      value: n.poolCostPaid
    }] : [],
    ...n.poolCostRefunded > 0 ? [{
      label: e("CYPHERV2.Roll.NaturalEffects.Refunded"),
      value: n.poolCostRefunded
    }] : []
  ];
}
function Pu(n, e) {
  const t = n.naturalEffects.find((i) => i.kind === "gm-intrusion" && i.status === "applied" && i.intrusionProvenance === "horror-mode" && i.horrorIntrusionRange !== void 0);
  return t?.horrorIntrusionRange === void 0 ? [] : [{
    label: e("CYPHERV2.Horror.Title"),
    value: `1–${t.horrorIntrusionRange}`
  }];
}
function Yr(n, e) {
  const t = n.prepared, i = t.context.pool ? `${t.context.pool[0].toUpperCase()}${t.context.pool.slice(1)}` : null, o = bu(n, e), a = o.filter((s) => !s.isIntrusion), r = [
    ...t.totalEase > 0 ? [sa(t.totalEase, "ease", e)] : [],
    ...t.totalHindrance > 0 ? [sa(t.totalHindrance, "hinder", e)] : []
  ].join(" · ");
  return {
    actorName: t.context.actor.name,
    rollLabel: e(t.context.label),
    ...i ? { poolLabel: e(`CYPHERV2.Pools.${i}`) } : {},
    naturalRoll: n.naturalRoll,
    naturalDifficulty: n.naturalDifficulty,
    showNaturalRoll: n.naturalRoll !== null,
    showNaturalDifficulty: n.naturalDifficulty !== null,
    breakdown: t.breakdown.map((s) => ({
      label: e(s.label),
      direction: e(
        s.direction === "ease" ? "CYPHERV2.Roll.Ease" : "CYPHERV2.Roll.Hinder"
      ),
      steps: s.steps,
      isEase: s.direction === "ease",
      modifier: we(s.direction, s.steps)
    })),
    modifierDetails: wu(t, e),
    modifierTotalDetails: Cu(t, e),
    effortDetails: Eu(n, e),
    costDetails: Ru(n, e),
    stepSummary: r,
    showStepSummary: r.length > 0,
    paidEffort: t.context.paidEffort,
    damageEffort: t.damageEffortApplied,
    freeEffort: t.context.freeEffort,
    poolCost: n.poolCostPaid,
    poolCostRefunded: n.poolCostRefunded,
    actionCost: t.actionCostBeforeEdge,
    totalEase: t.totalEase,
    totalHindrance: t.totalHindrance,
    netSteps: t.netSteps,
    naturalEffects: o,
    specialRoll: vu(n, e),
    hasNaturalResult: n.naturalMarkers.length > 0,
    hasNaturalEffectDisclosure: a.length > 0,
    gmIntrusion: o.some((s) => s.isIntrusion),
    hasExceptionalResult: o.length > 0,
    ...t.context.origin?.kind === "skill" ? {
      skillName: t.context.origin.name,
      skillRank: e(`CYPHERV2.Skill.Ranks.${t.context.origin.rank}`),
      skillRankClass: t.context.origin.rank
    } : {},
    ...t.context.target ? { targetName: t.context.target.name } : {},
    ...t.context.origin?.kind === "weapon" ? {
      weaponName: t.context.origin.name,
      weaponCategory: e(`CYPHERV2.Combat.Weapon.Category.${t.context.origin.category}`)
    } : {},
    ...t.context.origin?.kind === "defense" ? {
      defenseType: e(`CYPHERV2.Combat.Defense.${t.context.origin.defenseType}`)
    } : {},
    ...t.context.origin?.kind === "ability" ? {
      abilityName: t.context.origin.name,
      abilityActivation: e(`CYPHERV2.Ability.Activation.${t.context.origin.activation}`)
    } : {}
  };
}
function Su(n, e) {
  return n ? { outcome: e("CYPHERV2.Roll.Success"), outcomeIcon: "✓", outcomeClass: "success" } : { outcome: e("CYPHERV2.Roll.Failure"), outcomeIcon: "✕", outcomeClass: "failure" };
}
function En(n, e, t = !0) {
  return n.automaticSuccess && t ? { outcome: e("CYPHERV2.Roll.AutomaticSuccess"), outcomeIcon: "✓", outcomeClass: "success" } : Su(n.success === !0, e);
}
function ku(n, e, t = (i) => i) {
  const i = Yr(n, t), o = n.beatsDifficulty === null ? {} : {
    beatsDifficulty: n.beatsDifficulty,
    showBeatsDifficulty: !0
  }, a = Pu(n, t), r = n.prepared.context.difficulty;
  if (r.mode === "unknown")
    return {
      ...i,
      ...o,
      presentation: "unknown",
      resolutionDetails: a,
      hasDetails: a.length > 0 || i.modifierDetails.length > 0 || i.modifierTotalDetails.length > 0 || i.effortDetails.length > 0 || i.costDetails.length > 0
    };
  if (r.mode === "known") {
    const s = [{
      label: t("CYPHERV2.Roll.Difficulty"),
      value: n.prepared.finalDifficulty ?? 0
    }, {
      label: t("CYPHERV2.Roll.TargetNumber"),
      value: n.prepared.targetNumber ?? 0
    }, ...a];
    return {
      ...i,
      ...o,
      presentation: "known",
      ...En(n, t),
      finalDifficulty: n.prepared.finalDifficulty ?? 0,
      targetNumber: n.prepared.targetNumber ?? 0,
      showKnownDifficulty: !0,
      resolutionDetails: s,
      hasDetails: !0
    };
  }
  return {
    ...i,
    ...o,
    presentation: "concealed",
    ...En(n, t, !1),
    resolutionDetails: a,
    hasDetails: a.length > 0 || i.modifierDetails.length > 0 || i.modifierTotalDetails.length > 0 || i.effortDetails.length > 0 || i.costDetails.length > 0
  };
}
function Au(n, e = (t) => t) {
  return n?.damage === void 0 ? { showFinalDamage: !1, damageDetails: [], damageTotalDetails: [] } : {
    showFinalDamage: !0,
    finalDamage: n.damage,
    damageDetails: [
      ...(n.damageBreakdown ?? []).map((t) => ({
        label: e(t.label),
        value: t.additive && t.value > 0 ? `+${t.value}` : t.value
      }))
    ],
    damageTotalDetails: [{ label: e("CYPHERV2.Combat.FinalDamage"), value: n.damage }]
  };
}
function Hu(n, e = (t) => t) {
  const t = n.prepared.context.difficulty;
  if (t.mode !== "hidden") throw new Error("Only hidden-difficulty rolls require an audit card.");
  return {
    ...Yr(n, e),
    originalDifficulty: t.value,
    finalDifficulty: n.prepared.finalDifficulty ?? 0,
    targetNumber: n.prepared.targetNumber ?? 0,
    ...En(n, e)
  };
}
class $u {
  async publish(e, t, i, o = {}) {
    const a = (b) => game.i18n.localize(b), r = ku(t.result, i, a), s = Au(o.combat, a), l = {
      ...r,
      ...s,
      hasDetails: r.hasDetails || s.damageDetails.length > 0 || s.damageTotalDetails.length > 0,
      ...ve(e),
      ...o.combat?.woundSeverity === void 0 ? {} : {
        combatWoundSeverity: a(`CYPHERV2.Wounds.Severity.${o.combat.woundSeverity}`)
      },
      ...o.combat?.shieldTransfer === void 0 ? {} : {
        shieldTransfer: !0,
        shieldName: o.combat.shieldTransfer.shieldName,
        shieldSeverity: a(`CYPHERV2.Wounds.Severity.${o.combat.shieldTransfer.severity}`)
      },
      ...o.combat?.action ? {
        combatAction: !0,
        combatActionLabel: a(
          o.combat.action.kind === "npcDamage" ? "CYPHERV2.Combat.ApplyDamage" : o.combat.action.kind === "shieldWound" ? "CYPHERV2.Combat.ApplyWoundToShield" : "CYPHERV2.Combat.ApplyWound"
        )
      } : {}
    }, u = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-card.hbs",
      l
    ), c = {
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: u
    };
    if (o.combat?.action && (c.flags = { cypherv2: { combatAction: o.combat.action } }), t.chatRoll !== void 0 && (c.rolls = [t.chatRoll]), await ChatMessage.create(c), t.result.prepared.context.difficulty.mode !== "hidden") return;
    const p = Hu(t.result, a);
    if (Hooks.callAll("cypherv2HiddenRollAudit", p, e, t), o.showGmAudit !== !0) return;
    const f = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-audit-card.hbs",
      {
        ...p,
        ...s,
        ...ve(e)
      }
    ), m = {
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: f,
      whisper: ChatMessage.getWhisperRecipients("GM").map((b) => b.id),
      blind: !0
    };
    await ChatMessage.create(m);
  }
}
const Iu = async () => {
  const n = await new Roll("1d20").evaluate();
  if (n.total === null) throw new Error("The d20 roll did not produce a total.");
  return { naturalRoll: n.total, chatRoll: n };
}, Vu = (n) => {
  const e = n.system.genre.sourceUuid;
  if (!e || typeof fromUuidSync != "function") return "core";
  const t = fromUuidSync(e);
  return t?.type === "genre" ? t.system.options.totalEffortCapMode : "core";
}, Yu = () => dn();
function la(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function Qi(n, e, t, i) {
  if (!Number.isInteger(t)) throw new Error(`${e} steps must be an integer.`);
  return t === 0 ? null : {
    id: n,
    label: e,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: i
  };
}
class Du {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t = Iu, i = Vu, o = Yu) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  preview(e, t, i) {
    te(e), la(t.otherEase, "Other Ease"), la(t.otherHindrance, "Other Hindrance");
    const o = [], a = Qi(
      "manual.skill",
      "CYPHERV2.Roll.Breakdown.Skill",
      t.skillSteps,
      "skill"
    );
    a && o.push(a);
    const r = Qi(
      "manual.other-ease",
      "CYPHERV2.Roll.Breakdown.OtherEase",
      t.otherEase,
      "other"
    );
    r && o.push(r);
    const s = Qi(
      "manual.other-hindrance",
      "CYPHERV2.Roll.Breakdown.OtherHindrance",
      -t.otherHindrance,
      "other"
    );
    s && o.push(s);
    const l = e.system.derived.wounds.hindrance;
    l > 0 && o.push({
      id: "core.wounds.hindrance",
      label: "CYPHERV2.Roll.Breakdown.Wounds",
      direction: "hinder",
      steps: l,
      source: "wound",
      sourceId: "system.derived.wounds.hindrance"
    });
    const u = t.tags ?? [], c = e.system.derived.combat?.armor, p = u.includes("defense.dodge") || t.origin?.kind === "defense" && t.origin.defenseType === "dodge";
    if (t.pool === "speed" && !p)
      for (const y of c?.speedTaskContributions ?? [])
        o.push({
          id: y.id,
          label: `CYPHERV2.Combat.Armor.Unfamiliar.${c?.category ?? "light"}`,
          direction: "hinder",
          steps: y.value,
          source: "other",
          sourceId: y.sourceId
        });
    if (o.push(...t.contributions ?? []), t.pool === null && (t.paidEffort > 0 || (t.damageEffort ?? 0) > 0 || (t.actionCost ?? 0) > 0))
      throw new Error("A Pool-less roll cannot pay Effort or an action cost.");
    const f = i.enabledRuleModuleIds ?? [], m = this.#e.resolveDifficultyPolicy(i.base, f), b = {
      actor: { id: e.id, name: e.name },
      label: t.label ?? "CYPHERV2.Roll.TestRoll",
      pool: t.pool,
      difficulty: t.difficulty,
      assets: t.assets,
      paidEffort: t.paidEffort,
      damageEffort: t.damageEffort ?? 0,
      freeDamageEffort: t.freeDamageEffort ?? 0,
      freeEffort: t.freeEffort,
      edge: t.pool === null ? 0 : e.system.derived.pools[t.pool].edge,
      poolValue: t.pool === null ? 0 : e.system.stats[t.pool].value,
      actionCost: t.actionCost ?? 0,
      actionCostIgnoresEdge: t.actionCostIgnoresEdge ?? !1,
      limits: {
        ...m,
        paidEffortMaximum: e.system.derived.effort.max,
        totalEffortMaximum: Es(this.#i(e))
      },
      contributions: o,
      horrorIntrusionRange: vt(this.#n()),
      tags: u,
      ...t.target ? { target: t.target } : {},
      ...t.purpose ? { purpose: t.purpose } : {},
      ...t.origin ? { origin: t.origin } : {}
    }, g = this.#e.enrichRollContext(b, f);
    return iu(g);
  }
  async execute(e, t, i) {
    const [o] = await this.executeBatch(e, [t], i);
    if (!o) throw new Error("Roll execution did not produce a result.");
    return o;
  }
  async executeBatch(e, t, i) {
    if (t.length === 0) return [];
    const o = t.map((m) => this.preview(e, m, i)), a = o[0];
    if (o.some((m) => m.context.pool !== a.context.pool || m.poolCost !== a.poolCost))
      throw new Error("Batch rolls must use one Pool and one shared action cost.");
    const r = a.context.pool, s = r === null ? 0 : e.system.stats[r].value;
    if (s < a.poolCost)
      throw new Error(
        `${r ?? "No Pool"} has ${s} points but this action costs ${a.poolCost}.`
      );
    a.poolCost > 0 && r !== null && await e.update({ [`system.stats.${r}.value`]: s - a.poolCost });
    const u = o.some((m) => m.finalDifficulty !== 0) ? await this.#t() : null, c = o.map((m) => {
      const b = m.finalDifficulty === 0 ? Vr(m) : nu(m, u.naturalRoll), g = this.#e.resolveNaturalEffects(
        b,
        i.enabledRuleModuleIds ?? []
      );
      return { ...b, naturalEffects: g };
    }), p = c.some((m) => m.naturalEffects.some(
      (b) => b.status === "applied" && b.refundsPoolCost === !0
    )) ? a.poolCost : 0;
    p > 0 && r !== null && await e.update({ [`system.stats.${r}.value`]: s });
    let f = !1;
    return c.map((m) => {
      const b = {
        ...m,
        poolCostPaid: a.poolCost - p,
        poolCostRefunded: p
      };
      return u?.chatRoll === void 0 || m.automaticSuccess || f ? { result: b } : (f = !0, { result: b, chatRoll: u.chatRoll });
    });
  }
}
function Fu(n) {
  return I.includes(n);
}
class Tu {
  #e;
  constructor(e) {
    this.#e = e;
  }
  configuredPool(e) {
    if (!wa.includes(e.system.defaultPool))
      throw new Error(`Unknown Skill default Pool '${e.system.defaultPool}'.`);
    return Fu(e.system.defaultPool) ? e.system.defaultPool : null;
  }
  rankContribution(e, t = []) {
    if (e.type !== "skill") throw new Error("Skill contributions require a Skill Item.");
    if (!X.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    return this.#e.resolveSkillRankContribution(
      e.system.rank,
      { id: e.id, name: e.name },
      t
    );
  }
  buildRollRequest(e, t) {
    if (e.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!X.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    const i = t.pool ?? this.configuredPool(e);
    if (!i) throw new Error("Choose a Pool for this Skill roll.");
    const o = t.rankOverride ? { ...e, system: { ...e.system, rank: t.rankOverride } } : e;
    if (!X.includes(o.system.rank))
      throw new Error(`Unknown Skill rank '${o.system.rank}'.`);
    const a = this.rankContribution(o, t.enabledRuleModuleIds ?? []);
    return {
      label: e.name,
      pool: i,
      difficulty: t.difficulty,
      skillSteps: 0,
      assets: t.assets ?? 0,
      paidEffort: t.paidEffort ?? 0,
      freeEffort: t.freeEffort ?? 0,
      otherEase: t.otherEase ?? 0,
      otherHindrance: t.otherHindrance ?? 0,
      contributions: [
        ...a ? [a] : [],
        ...t.contributions ?? []
      ],
      purpose: "task",
      origin: {
        kind: "skill",
        itemId: e.id,
        name: e.name,
        rank: o.system.rank
      }
    };
  }
  buildQuickRollRequest(e, t = {}) {
    if (e.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!X.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    const i = this.rankContribution(e, t.enabledRuleModuleIds ?? []);
    return {
      label: e.name,
      pool: this.configuredPool(e),
      difficulty: t.difficulty ?? { mode: "unknown" },
      skillSteps: 0,
      assets: 0,
      paidEffort: 0,
      freeEffort: 0,
      otherEase: 0,
      otherHindrance: 0,
      contributions: [
        ...i ? [i] : [],
        ...t.contributions ?? []
      ],
      purpose: "task",
      origin: {
        kind: "skill",
        itemId: e.id,
        name: e.name,
        rank: e.system.rank
      }
    };
  }
}
const zu = Object.freeze({
  targetedXpToTarget: 0,
  targetedXpToShare: 0,
  groupXpPerTarget: 0,
  freeXp: 0
});
function Nu(n) {
  return {
    actorId: n.id,
    actorName: n.name,
    ...n.img ? { actorImage: n.img } : {}
  };
}
class Mu {
  #e;
  #t;
  constructor(e, t = Ue) {
    this.#e = e, this.#t = t;
  }
  policy(e = []) {
    return this.#e.resolveGMIntrusionPolicy(zu, e);
  }
  async createTargeted(e, t = []) {
    te(e);
    const i = this.policy(t);
    return await this.#i(e, i.targetedXpToTarget), this.#n(
      "targeted",
      [e],
      i.targetedXpToTarget,
      i.targetedXpToShare
    );
  }
  async createGroup(e, t = []) {
    const i = [...new Map(e.map((a) => [a.id, a])).values()];
    if (i.length === 0) throw new Error("Choose at least one Character for a Group Intrusion.");
    i.forEach(te);
    const o = this.policy(t);
    return await Promise.all(i.map((a) => this.#i(a, o.groupXpPerTarget))), this.#n(
      "group",
      i,
      o.groupXpPerTarget,
      0
    );
  }
  async createFreeFromNaturalResult(e, t, i = []) {
    return !t.naturalEffects.some(
      (a) => a.status === "applied" && a.triggersGMIntrusion === !0
    ) || t.naturalRoll === null ? null : this.createFree(e, t.naturalRoll, i);
  }
  async createFree(e, t = 0, i = []) {
    te(e);
    const o = this.policy(i);
    return await this.#i(e, o.freeXp), this.#n(
      "free",
      [e],
      o.freeXp,
      0,
      t
    );
  }
  async distributeSecondXp(e, t, i) {
    if (te(e), te(t), t.id === e.id)
      throw new Error("The targeted Character cannot receive their own shared XP.");
    await this.#i(t, i);
  }
  async #i(e, t) {
    if (!Number.isInteger(t) || t < 0) throw new Error("GM Intrusion XP must be non-negative.");
    t > 0 && await e.update({ "system.xp": e.system.xp + t });
  }
  #n(e, t, i, o, a = 0) {
    return {
      id: this.#t(),
      mode: e,
      targets: t.map(Nu),
      targetXp: i,
      sharedXp: o,
      naturalRoll: a
    };
  }
}
function gt(n) {
  const e = n.tokenId ?? n.token?.id, t = n.tokenUuid ?? n.token?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...e ? { tokenId: e } : {},
    ...t ? { tokenUuid: t } : {}
  };
}
const ca = [
  "none",
  "minor",
  "moderate",
  "major"
];
function xu(n, e) {
  const t = ca.indexOf(n);
  return ca[Math.max(0, t - Math.max(0, Math.trunc(e)))] ?? "none";
}
function pi(n, e, t) {
  if (!Number.isInteger(n) || t !== void 0 && n < t)
    throw new Error(`${e} must be an integer${t === void 0 ? "" : ` of at least ${t}`}.`);
  return n;
}
function Uu(n, e) {
  return n.contexts.every((t) => e.tags.includes(t));
}
function qu(n, e) {
  for (const [t, i] of Object.entries(n)) {
    if (t === "tagsAll") {
      if (!Array.isArray(i) || !i.every((a) => typeof a == "string" && e.tags.includes(a))) return !1;
      continue;
    }
    if (t === "tagsAny") {
      if (!Array.isArray(i) || !i.some((a) => typeof a == "string" && e.tags.includes(a))) return !1;
      continue;
    }
    const o = t === "pool" ? e.pool : t === "attackType" ? e.attackType : t === "weaponCategory" ? e.weaponCategory : t === "defenseType" ? e.defenseType : void 0;
    if (o === void 0) return !1;
    if (Array.isArray(i)) {
      if (!i.includes(o)) return !1;
    } else if (i !== o) return !1;
  }
  return !0;
}
function da(n) {
  return n.contexts.length + Object.keys(n.predicate).length;
}
function Gu(n) {
  return pi(n.value, `NPC modification '${n.id}'`, 0), {
    id: `npc-modification.${n.id}`,
    label: "CYPHERV2.Combat.TargetModification",
    direction: n.mode === "ease" ? "ease" : "hinder",
    steps: n.value,
    source: "other",
    sourceId: n.id
  };
}
class Ou {
  #e;
  constructor(e) {
    this.#e = e;
  }
  resolve(e, t, i = []) {
    if (e.type !== "npc") throw new Error("Combat targets must be NPC Actors.");
    const o = pi(e.system.level, "NPC Level", 0), a = e.system.modifications.map((c, p) => ({ modification: c, index: p })).filter(({ modification: c }) => Uu(c, t) && qu(c.predicate, t)), r = a.filter(({ modification: c }) => c.mode === "levelOverride").sort((c, p) => da(p.modification) - da(c.modification) || p.index - c.index)[0]?.modification;
    let s = r ? pi(r.value, `NPC modification '${r.id}'`, 0) : o;
    const l = r ? [r.id] : [];
    for (const { modification: c } of a)
      c.mode === "levelDelta" && (s += pi(c.value, `NPC modification '${c.id}'`), l.push(c.id));
    s = Math.max(0, s);
    const u = a.map(({ modification: c }) => c).filter((c) => c.mode === "ease" || c.mode === "hinder").map((c) => (l.push(c.id), Gu(c)));
    return this.#e.enrichTargetResolution({
      targetId: e.id,
      targetIdentity: gt(e),
      targetName: e.name,
      baseLevel: o,
      difficulty: s,
      contributions: u,
      appliedModificationIds: l
    }, e, t, i);
  }
  nativeNpcTargets() {
    return [...game.user.targets ?? []].map((e) => ir(e)).filter((e) => e !== null);
  }
}
class Bu {
  async npcDamage() {
  }
  async characterWound() {
  }
}
async function Lu(n) {
  if (n.tokenId) {
    const e = canvas.tokens?.get(n.tokenId);
    if (e?.center) return { center: e.center };
  }
  if (n.tokenUuid)
    try {
      const e = await fromUuid(n.tokenUuid);
      if (e?.object?.center)
        return { center: e.object.center };
    } catch {
    }
  return null;
}
class ju {
  async #e(e, t, i) {
    const o = await Lu(e);
    o && await canvas.interface.createScrollingText(o.center, t, {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      duration: 1200,
      distance: 48,
      jitter: 0.15,
      textStyle: { fill: i, fontSize: 32, stroke: 0, strokeThickness: 4 }
    });
  }
  async npcDamage(e, t) {
    t.appliedDamage > 0 && await this.#e(e, `-${t.appliedDamage}`, "#ff5c5c"), t.previousHealth > 0 && t.health === 0 && await this.#e(e, game.i18n.localize("CYPHERV2.Combat.Feedback.Dead"), "#ff3030");
  }
  async characterWound(e, t) {
    await this.#e(e, game.i18n.format("CYPHERV2.Combat.Feedback.Wound", {
      severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${t}`)
    }), "#ffb347");
  }
  async shieldWound(e, t, i, o) {
    const a = o ? game.i18n.format("CYPHERV2.Shield.Feedback.Broken", { shield: t }) : game.i18n.format("CYPHERV2.Shield.Feedback.Wound", {
      shield: t,
      severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${i}`)
    });
    await this.#e(e, a, o ? "#ff5c5c" : "#7dcfff");
  }
}
class Wu {
  async syncNpcDead() {
  }
}
class _u {
  async syncNpcDead(e, t) {
    const i = gi(e);
    let o = null;
    if (i.tokenUuid)
      try {
        o = (await fromUuid(i.tokenUuid))?.actor ?? null;
      } catch {
        o = null;
      }
    !o && i.tokenId && (o = canvas.tokens?.get(i.tokenId)?.actor ?? null), !(!o && (i.tokenId || i.tokenUuid)) && (o || (o = e), typeof o.toggleStatusEffect == "function" && await o.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED ?? "dead", {
      active: t
    }));
  }
}
function Ku(n) {
  if ("system.health.value" in n) return !0;
  const e = n.system;
  if (!e || typeof e != "object") return !1;
  const t = e.health;
  return !!(t && typeof t == "object" && "value" in t);
}
function Xu(n) {
  Hooks.on("updateActor", (e, t, i = {}) => {
    if (i.cypherv2SkipDeadStatusSync === !0 || e.type !== "npc" || !Ku(t)) return;
    const o = Number(e.system.health?.value);
    Number.isFinite(o) && n.syncNpcDead(e, o <= 0);
  });
}
function Zi(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative whole number.`);
  return n;
}
class Dr {
  ammunition(e) {
    const t = e.system.ammo.enabled, i = Zi(e.system.ammo.value, "Current ammunition"), o = Zi(e.system.ammo.max, "Maximum ammunition"), a = Zi(e.system.ammo.perAttack, "Ammunition per attack");
    return { tracked: t, current: i, maximum: o, perAttack: a, canAttack: !t || i >= a };
  }
  assertCanAttack(e) {
    if (!this.ammunition(e).canAttack) throw new Error("Insufficient Ammunition — Reload Weapon");
  }
  async consumeAttack(e) {
    const t = this.ammunition(e);
    if (!t.tracked) return null;
    if (this.assertCanAttack(e), !e.update) throw new Error("Weapon ammunition requires an updateable Item document.");
    const i = Math.max(0, t.current - t.perAttack);
    return await e.update({ "system.ammo.value": i }, { cypherv2WeaponUse: !0 }), { previous: t.current, current: i, spent: t.current - i };
  }
  async reload(e) {
    const t = this.ammunition(e);
    if (!t.tracked) throw new Error("Ammunition tracking is not enabled for this Weapon.");
    if (!e.update) throw new Error("Weapon ammunition requires an updateable Item document.");
    await e.update({ "system.ammo.value": t.maximum }, { cypherv2WeaponReload: !0 });
  }
}
const Ju = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
});
function en(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function ua(n, e, t) {
  return {
    id: n.id,
    label: t,
    direction: e,
    steps: n.value,
    source: "other",
    sourceId: n.sourceId
  };
}
function Tt(n) {
  return n.naturalEffects.filter((e) => e.kind === "damage-bonus" && e.status === "applied").reduce((e, t) => e + (t.damageBonus ?? 0), 0);
}
function Fr(n, e) {
  return n.naturalEffects.filter((i) => i.status === "available").length === 0 ? n : {
    ...n,
    naturalEffects: n.naturalEffects.map((i) => {
      if (i.status !== "available") return i;
      const o = e === "damage" && i.kind === "damage-bonus", a = e === "effect" && (i.kind === "minor-effect" || i.kind === "major-effect");
      return { ...i, status: o || a ? "applied" : "inapplicable" };
    })
  };
}
class Qu {
  #e;
  #t;
  #i;
  #n;
  #o;
  #r;
  #a;
  #c;
  #l;
  constructor(e, t, i, o, a, r = new Bu(), s = new Wu(), l = new Ar(a), u = new Dr()) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o, this.#o = a, this.#r = r, this.#a = s, this.#c = l, this.#l = u;
  }
  policy(e = []) {
    return this.#e.resolveCombatPolicy(Ju, e);
  }
  weaponBaseDamage(e, t = this.policy()) {
    if (e.type !== "weapon") throw new Error("Weapon attacks require a Weapon Item.");
    if (!Number.isInteger(e.system.bonusDamage) || e.system.bonusDamage < 0)
      throw new Error("Weapon bonus damage must be a non-negative integer.");
    return Math.max(0, t.weaponDamage[e.system.category] + e.system.bonusDamage);
  }
  weaponAttackPool(e, t) {
    if (t) return t;
    const i = e.system.defaultPool;
    return i && i !== "none" && I.includes(i) ? i : e.system.attackType === "melee" ? "might" : "speed";
  }
  weaponFreelyUsed(e, t) {
    return (e.system.derived.packages?.weaponCategories ?? e.system.proficiencies.weaponCategories).includes(t.system.category);
  }
  armorFreelyUsed(e, t) {
    return (e.system.derived.packages?.armorCategories ?? e.system.proficiencies.armorCategories).includes(t.system.category);
  }
  weaponFamiliarityContribution(e, t, i = []) {
    const o = this.policy(i);
    return this.weaponFreelyUsed(e, t) || o.unfamiliarWeaponHindrance <= 0 ? null : {
      id: `weapon.${t.id}.unfamiliar`,
      label: `CYPHERV2.Combat.Weapon.Unfamiliar.${t.system.category}`,
      direction: "hinder",
      steps: o.unfamiliarWeaponHindrance,
      source: "other",
      sourceId: t.id
    };
  }
  applicableWeaponSkills(e, t, i = []) {
    return this.#d(e, [
      "attack",
      "attack.weapon",
      `attack.${t.system.attackType}`,
      `weapon.${t.system.category}`
    ], i);
  }
  applicableDefenseSkills(e, t, i = []) {
    return this.#d(e, [
      "defense",
      ...t === "blockWithShield" ? ["defense.block"] : [],
      `defense.${t}`
    ], i);
  }
  buildWeaponAttackPlan(e, t, i = {}) {
    if (t.type !== "weapon") throw new Error("Weapon attacks require a Weapon Item.");
    const o = i.enabledRuleModuleIds ?? [], a = this.policy(o), r = this.weaponFreelyUsed(e, t), s = this.weaponAttackPool(t, i.pool), l = {
      tags: [
        "attack",
        "attack.weapon",
        `attack.${t.system.attackType}`,
        `weapon.${t.system.category}`,
        "defense.speed"
      ],
      pool: s,
      attackType: t.system.attackType,
      weaponCategory: t.system.category
    }, u = i.targets ?? [], c = u.map((Y) => this.#n.resolve(Y, l, o)), p = u.length > 0 ? u : [null], f = c.length > 0 ? c : [null], m = [];
    t.system.category === "light" && a.lightWeaponEase > 0 && m.push({
      id: `weapon.${t.id}.light`,
      label: "CYPHERV2.Combat.Weapon.LightEase",
      direction: "ease",
      steps: a.lightWeaponEase,
      source: "other",
      sourceId: t.id
    });
    const b = this.weaponFamiliarityContribution(e, t, o);
    if (b && m.push(b), i.extremeRange && m.push({
      id: `weapon.${t.id}.extreme-range`,
      label: "CYPHERV2.Combat.Weapon.ExtremeRange",
      direction: "hinder",
      steps: 1,
      source: "other",
      sourceId: t.id
    }), !Number.isInteger(t.system.attackModifier) || t.system.attackModifier < -2 || t.system.attackModifier > 2)
      throw new Error("Weapon attack modifier must be an integer from -2 to +2.");
    t.system.attackModifier !== 0 && m.push({
      id: `weapon.${t.id}.attack-modifier`,
      label: "CYPHERV2.Combat.Weapon.AttackModifierContribution",
      direction: t.system.attackModifier > 0 ? "ease" : "hinder",
      steps: Math.abs(t.system.attackModifier),
      source: "other",
      sourceId: t.id
    });
    const g = i.skill ? this.#i.rankContribution(i.skill, o) : null;
    g && m.push(g);
    const y = a.weaponDamage[t.system.category], w = t.system.bonusDamage, A = this.weaponBaseDamage(t, a), P = f.map((Y, $) => ({
      label: t.name,
      pool: s,
      difficulty: Y ? { mode: "hidden", value: Y.difficulty } : i.difficulty ?? { mode: "unknown" },
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: i.damageEffort ?? 0,
      freeDamageEffort: i.freeDamageEffort ?? 0,
      freeEffort: i.freeEffort ?? 0,
      otherEase: i.otherEase ?? 0,
      otherHindrance: i.otherHindrance ?? 0,
      contributions: [...new Map([
        ...m,
        ...Y?.contributions ?? [],
        ...i.contributions ?? []
      ].map((D) => [D.id, D])).values()],
      purpose: "damage",
      tags: [
        ...l.tags,
        ...s === "speed" ? ["speed-task"] : [],
        ...i.extremeRange ? ["range.extreme"] : []
      ],
      origin: {
        kind: "weapon",
        itemId: t.id,
        name: t.name,
        category: t.system.category,
        attackType: t.system.attackType,
        baseDamage: A
      },
      ...p[$] ? {
        target: {
          ...gt(p[$]),
          name: p[$].name,
          type: "npc"
        }
      } : {}
    }));
    return {
      weapon: t,
      categoryDamage: y,
      weaponBonusDamage: w,
      baseDamage: A,
      freelyUsed: r,
      requests: P,
      targets: p,
      targetResolutions: f,
      policy: a
    };
  }
  async executeWeaponAttack(e, t, i, o) {
    this.#l.assertCanAttack(t);
    const a = this.buildWeaponAttackPlan(e, t, i), r = await this.#t.executeBatch(e, a.requests, o), s = r.length > 0 ? await this.#s(t) : void 0;
    return r.map((l, u) => {
      const c = l.result.prepared.damageEffortApplied * a.policy.damageEffortBonus, p = Tt(l.result), f = a.baseDamage + c + p, m = a.targets[u] ?? null, b = m?.system.armorBase ?? 0;
      return {
        target: m,
        targetResolution: a.targetResolutions[u] ?? null,
        execution: l,
        grossDamage: f,
        categoryDamage: a.categoryDamage,
        weaponBonusDamage: a.weaponBonusDamage,
        effortDamage: c,
        naturalDamage: p,
        armor: b,
        netDamage: Math.max(0, f - b),
        ...u === 0 && s ? { weaponUse: s } : {}
      };
    });
  }
  async #s(e) {
    const t = await this.#l.consumeAttack(e);
    return t ? { ammo: t } : {};
  }
  chooseAttackOutcomes(e, t, i = []) {
    const o = this.policy(i);
    return e.map((a) => {
      const r = Fr(a.execution.result, t), s = r.prepared.context.origin;
      if (s?.kind !== "weapon") return a;
      const l = s.baseDamage + r.prepared.damageEffortApplied * o.damageEffortBonus + Tt(r), u = r.prepared.damageEffortApplied * o.damageEffortBonus, c = Tt(r);
      return {
        ...a,
        execution: { ...a.execution, result: r },
        grossDamage: l,
        effortDamage: u,
        naturalDamage: c,
        netDamage: Math.max(0, l - a.armor)
      };
    });
  }
  buildDefenseRequest(e, t, i) {
    if (!Ea.includes(t)) throw new Error(`Unknown defense '${t}'.`);
    const o = i.enabledRuleModuleIds ?? [], a = t === "dodge" ? "speed" : "might", r = e.system.derived.combat.armor, s = t === "dodge" ? r.dodgeContributions.map((u) => ua(u, "hinder", "CYPHERV2.Combat.Armor.DodgeHindrance")) : r.blockContributions.map((u) => ua(u, "ease", "CYPHERV2.Combat.Armor.BlockEase")), l = i.skill ? this.#i.rankContribution(i.skill, o) : null;
    return {
      label: t === "dodge" ? "CYPHERV2.Combat.Defense.DodgeRoll" : t === "blockWithShield" ? "CYPHERV2.Combat.Defense.BlockWithShieldRoll" : "CYPHERV2.Combat.Defense.BlockRoll",
      pool: a,
      difficulty: i.difficulty,
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: 0,
      freeEffort: i.freeEffort ?? 0,
      otherEase: i.otherEase ?? 0,
      otherHindrance: i.otherHindrance ?? 0,
      contributions: [
        ...s,
        ...l ? [l] : [],
        ...i.contributions ?? []
      ],
      purpose: "task",
      tags: [
        "defense",
        ...t === "blockWithShield" ? ["defense.block"] : [],
        `defense.${t}`,
        ...a === "speed" ? ["speed-task"] : []
      ],
      origin: {
        kind: "defense",
        defenseType: t,
        ...i.source ? { sourceActorId: i.source.id, sourceName: i.source.name } : {}
      }
    };
  }
  buildDefenseAgainstNpcRequest(e, t, i, o = {}) {
    const a = {
      tags: ["attack", "npc-attack", `requested-defense.${i}`],
      defenseType: i
    }, r = this.#n.resolve(t, a, o.enabledRuleModuleIds ?? []);
    return this.buildDefenseRequest(e, i, {
      ...o,
      difficulty: { mode: "hidden", value: r.difficulty },
      source: { id: t.id, name: t.name },
      contributions: [...r.contributions, ...o.contributions ?? []]
    });
  }
  woundAfterDefense(e, t, i, o = []) {
    return e.success !== !0 ? i : t === "dodge" || t === "blockWithShield" ? "none" : xu(i, this.policy(o).blockSeverityReduction);
  }
  async resolveDefenseWound(e, t, i, o, a, r = []) {
    if (i !== "blockWithShield" || t.success !== !0) {
      const l = this.woundAfterDefense(t, i, o, r);
      return {
        recipient: l === "none" ? "none" : "character",
        severity: l
      };
    }
    const s = await this.#c.normalizeEquipped(e);
    if (!s || this.#c.isBroken(s))
      throw new Error("Block With Shield requires one equipped, functional Shield.");
    return {
      recipient: "shield",
      severity: o,
      shieldId: s.id,
      shieldName: s.name
    };
  }
  async transferWoundToShield(e, t, i, o) {
    const a = await this.#c.applyResolved(e, t, i, {
      ...o ? { label: `${o.name} attack` } : {},
      sourceUuid: o ? `Actor.${o.id}` : "cypherv2.combat"
    });
    return a.appliedSeverity && await this.#r.shieldWound?.(
      e,
      t.name,
      a.appliedSeverity,
      a.broken
    ), a;
  }
  /** Commit a previously resolved Shield consequence from an authorized Chat action. */
  async applyShieldWound(e, t, i, o) {
    return this.transferWoundToShield(e, t, i, o);
  }
  async applyNpcDamage(e, t) {
    if (e.type !== "npc") throw new Error("NPC damage requires an NPC target.");
    const i = en(t, "Damage"), o = en(e.system.armorBase, "NPC Armor"), a = en(e.system.health.value, "NPC Health"), r = Math.max(0, i - o), s = Math.max(0, a - r);
    await e.update(
      { "system.health.value": s },
      { cypherv2SkipDeadStatusSync: !0 }
    );
    const l = {
      requestedDamage: i,
      armor: o,
      appliedDamage: r,
      previousHealth: a,
      health: s,
      dead: s === 0
    };
    return await this.#a.syncNpcDead(e, l.dead), await this.#r.npcDamage(e, l), l;
  }
  async applyCharacterWound(e, t, i) {
    const o = await this.#o.apply(e, t, {
      ...i ? { label: `${i.name} attack` } : {},
      sourceUuid: i ? `Actor.${i.id}` : "cypherv2.combat"
    });
    return o.appliedSeverity && await this.#r.characterWound(e, o.appliedSeverity), o;
  }
  #d(e, t, i) {
    return [...e.items].filter((o) => {
      if (!o || typeof o != "object") return !1;
      const a = o;
      if (a.type !== "skill" || !a.system) return !1;
      const r = a.system.contexts ?? [], s = a.system.category ?? "";
      return r.some((l) => t.includes(l)) || t.includes(s);
    }).sort((o, a) => {
      const r = this.#i.rankContribution(o, i), s = this.#i.rankContribution(a, i), l = (u) => u ? u.steps * (u.direction === "ease" ? 1 : -1) : 0;
      return l(s) - l(r) || o.name.localeCompare(a.name);
    });
  }
}
function vi(n) {
  return {
    targetActorId: n.actorId,
    ...n.actorUuid ? { targetActorUuid: n.actorUuid } : {},
    ...n.tokenId ? { targetTokenId: n.tokenId } : {},
    ...n.tokenUuid ? { targetTokenUuid: n.tokenUuid } : {}
  };
}
class Zu {
  #e;
  #t;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  async publishWeaponAttack(e, t, i, o = !1) {
    const a = t.execution.result.success === !0, s = {
      ...t.execution.result.success !== !1 ? {
        damage: t.grossDamage,
        damageBreakdown: [
          { label: "CYPHERV2.Combat.DamageBreakdown.Category", value: t.categoryDamage },
          ...t.weaponBonusDamage === 0 ? [] : [{
            label: "CYPHERV2.Combat.DamageBreakdown.WeaponBonus",
            value: t.weaponBonusDamage,
            additive: !0
          }],
          ...t.effortDamage === 0 ? [] : [{
            label: "CYPHERV2.Combat.DamageBreakdown.Effort",
            value: t.effortDamage,
            additive: !0
          }],
          ...t.naturalDamage === 0 ? [] : [{
            label: "CYPHERV2.Combat.DamageBreakdown.Natural",
            value: t.naturalDamage,
            additive: !0
          }]
        ]
      } : {},
      ...a && t.target ? {
        action: {
          kind: "npcDamage",
          ...vi(gt(t.target)),
          requestedDamage: t.grossDamage,
          applied: !1
        }
      } : {}
    };
    await this.#e.publish(e, t.execution, i, { combat: s, showGmAudit: o });
  }
  async publishDefense(e, t, i, o, a, r = !1) {
    const s = i.recipient === "character" ? i.severity : "none", l = vi(gi(e)), u = o ? { sourceActorId: o.id, sourceName: o.name } : {}, c = {
      ...s === "none" ? {} : {
        woundSeverity: s,
        action: {
          kind: "characterWound",
          ...l,
          severity: s,
          ...u,
          applied: !1
        }
      },
      ...i.recipient === "shield" && i.shieldId && i.shieldName ? {
        shieldTransfer: {
          shieldName: i.shieldName,
          severity: i.severity
        },
        action: {
          kind: "shieldWound",
          ...l,
          shieldId: i.shieldId,
          shieldName: i.shieldName,
          severity: i.severity,
          ...u,
          applied: !1
        }
      } : {}
    };
    await this.#e.publish(e, t, a, { combat: c, showGmAudit: r });
  }
  async createDefenseRequest(e, t, i, o) {
    const a = gt(e), r = gi(t), s = [...o];
    if (this.#t && s.includes("block") && !s.includes("blockWithShield")) {
      const c = await this.#t.normalizeEquipped(t);
      c && !this.#t.isBroken(c) && s.push("blockWithShield");
    }
    const l = {
      kind: "defenseRequest",
      sourceActorId: e.id,
      ...a.actorUuid ? { sourceActorUuid: a.actorUuid } : {},
      ...a.tokenId ? { sourceTokenId: a.tokenId } : {},
      ...a.tokenUuid ? { sourceTokenUuid: a.tokenUuid } : {},
      sourceName: e.name,
      targetActorId: t.id,
      ...r.actorUuid ? { targetActorUuid: r.actorUuid } : {},
      ...r.tokenId ? { targetTokenId: r.tokenId } : {},
      ...r.tokenUuid ? { targetTokenUuid: r.tokenUuid } : {},
      targetName: t.name,
      woundSeverity: i,
      allowedDefenses: s,
      resolved: !1
    }, u = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/defense-request-card.hbs",
      {
        sourceName: e.name,
        ...ve(e),
        targetName: t.name,
        woundSeverity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${i}`),
        allowBlock: s.includes("block"),
        allowBlockWithShield: s.includes("blockWithShield"),
        allowDodge: s.includes("dodge")
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: u,
      flags: { cypherv2: { defenseRequest: l } }
    });
  }
}
const em = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The depletion roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class tm {
  #e;
  constructor(e = em) {
    this.#e = e;
  }
  async roll(e) {
    const t = e.system.depletion;
    if (!t.enabled) throw new Error("Depletion is not enabled for this Item.");
    const i = ["artifact", "weapon", "shield", "armor"].includes(e.type);
    if (i && e.system.depleted)
      throw new Error(`This ${e.name} is already depleted.`);
    const a = ["weapon", "shield", "armor"].includes(e.type) ? "" : t.formula?.trim() ?? "";
    if (xt(t), !Number.isInteger(t.threshold) || t.threshold < 1)
      throw new Error("Depletion threshold must be a positive whole number.");
    const r = a || uc(t), s = Number(r.match(/^1d(\d+)$/i)?.[1]);
    if (s > 0 && t.threshold > s)
      throw new Error(`Depletion threshold must be between 1 and ${s}.`);
    const l = await this.#e(r), u = {
      itemId: e.id,
      itemName: e.name,
      formula: r,
      total: l.total,
      threshold: t.threshold,
      depleted: l.total <= t.threshold,
      ...l.chatRoll === void 0 ? {} : { chatRoll: l.chatRoll }
    };
    return u.depleted && i && e.update && await e.update({ "system.depleted": !0 }), u;
  }
}
class im {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/depletion-card.hbs",
      {
        itemName: t.itemName,
        ...ve(e.actor),
        formula: t.formula,
        total: t.total,
        depleted: t.depleted,
        outcome: game.i18n.localize(
          t.depleted ? "CYPHERV2.Depletion.Depleted" : "CYPHERV2.Depletion.NotDepleted"
        )
      }
    ), o = {
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: i
    };
    t.chatRoll !== void 0 && (o.rolls = [t.chatRoll]), await ChatMessage.create(o);
  }
}
const ma = 124, nm = 58, pa = 108, om = 10, am = async (n) => {
  if (!n) return null;
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("name" in e)) return null;
    const t = e, i = t._source?.system?.description;
    return {
      name: t.name,
      ...typeof i == "string" ? { description: i } : {},
      relativeTo: e,
      ...t.sheet ? { sheet: t.sheet } : {}
    };
  } catch {
    return null;
  }
}, rm = async (n, e) => typeof foundry > "u" || !foundry.applications?.ux?.TextEditor?.implementation ? n : foundry.applications.ux.TextEditor.implementation.enrichHTML(n, e ? { async: !0, relativeTo: e } : { async: !0 });
function sm(n) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map();
  for (const i of n) {
    const o = t.get(i.tier) ?? [];
    o.push(i), t.set(i.tier, o);
  }
  for (const i of t.values()) {
    const o = [...i].sort((a, r) => {
      const s = a.position?.x, l = r.position?.x;
      return s != null && l !== null && l !== void 0 ? s - l || a.id.localeCompare(r.id) : s != null ? -1 : l != null ? 1 : a.id.localeCompare(r.id);
    });
    o.forEach((a, r) => e.set(a.id, (r + 1) / (o.length + 1) * 100));
  }
  return e;
}
function lm(n, e = 120) {
  const t = n.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
  return t.length <= e ? t : `${t.slice(0, Math.max(0, e - 1)).trimEnd()}…`;
}
class cm {
  #e;
  #t;
  #i;
  constructor(e = new Wn(), t = am, i = rm) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async prepare(e, t = {}) {
    const i = t.characterTier ?? Number.MAX_SAFE_INTEGER, o = t.progress ?? { focusUuid: e.uuid, ownedNodeIds: [] }, a = t.missingOwnedNodeIds ?? /* @__PURE__ */ new Set();
    let r;
    try {
      r = this.#e.evaluateProgress(e.system.graph, i, o);
    } catch (m) {
      if (!(m instanceof ft)) throw m;
      if (t.progress) {
        const b = new Set(o.ownedNodeIds);
        r = {
          characterTier: i,
          ownedNodeIds: [...b],
          diagnostics: m.diagnostics,
          nodes: e.system.graph.nodes.map((g) => ({
            node: g,
            state: b.has(g.id) ? "owned" : g.tier > i ? "future" : "available",
            reason: b.has(g.id) ? "owned" : g.tier > i ? "tier-too-low" : "tier-one-choice",
            requiredTier: g.tier,
            reachableFrom: []
          })).sort((g, y) => g.node.tier - y.node.tier || g.node.id.localeCompare(y.node.id))
        };
      } else
        return {
          focusUuid: e.uuid,
          focusName: e.name,
          markerId: `focus-arrow-${e.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
          mode: t.editor ? "editor" : t.progress ? "progression" : "focus",
          editor: !!t.editor,
          width: 0,
          height: 0,
          nodes: [],
          connections: [],
          tiers: [],
          diagnostics: m.diagnostics,
          invalid: !0
        };
    }
    const s = sm(r.nodes.map((m) => m.node)), l = t.editor ? 6 : Math.max(1, ...r.nodes.map((m) => m.node.tier)), u = /* @__PURE__ */ new Map();
    for (const m of r.nodes)
      u.set(m.node.tier, (u.get(m.node.tier) ?? 0) + 1);
    const c = Math.max(440, ...[...u.values()].map((m) => m * ma + (m + 1) * om)), p = await Promise.all(r.nodes.map(async (m) => {
      const b = await this.#t(m.node.abilityUuid), g = m.state === "owned" && a.has(m.node.id), y = b?.description ?? m.node.abilitySnapshot.description ?? "", w = r.diagnostics.some((D) => D.code === "invalid-owned-progression" && D.nodeId === m.node.id || D.severity === "error" && (!D.nodeId || D.nodeId === m.node.id)), A = m.state !== "owned" && m.node.tier > i, P = m.state !== "owned" && m.reason === "no-owned-prerequisite", Y = m.state !== "owned" && (m.state !== "available" || w), $ = t.editable && t.progress && !t.gmProgressionEdit ? m.state === "owned" ? "undoFocusAcquisition" : "acquireFocusNode" : "openFocusNode";
      return {
        id: m.node.id,
        abilityUuid: m.node.abilityUuid,
        abilityName: b?.name || m.node.abilitySnapshot.name || m.node.id,
        descriptionExcerpt: lm(y),
        descriptionHtml: await this.#i(y, b?.relativeTo ?? e),
        tier: m.node.tier,
        state: m.state,
        stateLabel: `CYPHERV2.Focus.State.${m.state}`,
        reason: m.reason,
        requiredTier: m.requiredTier,
        reachableFrom: m.reachableFrom,
        missingAbility: !b,
        missingOwnedAbility: g,
        isOwned: m.state === "owned",
        advisoryUnavailable: Y,
        tierLocked: A,
        prerequisiteLocked: P,
        invalidProgression: w,
        canAcquire: !!(t.editable && t.progress && !t.gmProgressionEdit && m.state !== "owned"),
        canRestoreAbility: !!(t.editable && t.progress && g),
        canUndoAcquisition: !!(t.editable && t.progress && m.state === "owned" && !t.gmProgressionEdit),
        canGmMarkOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state !== "owned"),
        canGmRemoveOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state === "owned"),
        primaryAction: t.editor?.connectionSourceNodeId ? "completeFocusConnection" : t.editor ? "selectFocusEditorNode" : $,
        selected: t.editor?.selectedNodeId === m.node.id,
        connectionSource: t.editor?.connectionSourceNodeId === m.node.id,
        xPercent: s.get(m.node.id) ?? 50,
        width: ma,
        height: nm
      };
    })), f = e.system.graph.connections.map(({ id: m, from: b, to: g }) => ({ id: m, from: b, to: g }));
    return {
      focusUuid: e.uuid,
      focusName: e.name,
      markerId: `focus-arrow-${e.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      mode: t.editor ? "editor" : t.progress ? "progression" : "focus",
      editor: !!t.editor,
      width: c,
      height: l * pa,
      nodes: p,
      connections: f,
      tiers: Array.from({ length: l }, (m, b) => {
        const g = b + 1;
        return {
          tier: g,
          top: b * pa,
          nodes: p.filter((y) => y.tier === g).sort((y, w) => y.xPercent - w.xPercent || y.id.localeCompare(w.id))
        };
      }),
      diagnostics: r.diagnostics,
      invalid: !1
    };
  }
}
function Ke(n) {
  return structuredClone(n);
}
function je(n) {
  return new Set(n).size === n.length;
}
function tn(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, img: n.img, type: e, system: Ke(n.system) };
}
function dm(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, ...n.img ? { img: n.img } : {}, type: e, system: Ke(n.system) };
}
function fa(n, e, t, i, o) {
  return {
    kind: n,
    sourceUuid: e,
    instanceId: t,
    grantId: i,
    status: "active",
    contentUuid: o.contentUuid,
    contentKey: o.contentKey,
    replacement: Qn()
  };
}
function Qn() {
  return {
    active: !1,
    originalName: "",
    originalContentUuid: "",
    originalContentKey: "",
    replacementName: "",
    replacementContentUuid: "",
    replacementContentKey: "",
    selectionKind: "none"
  };
}
function nn() {
  return {
    kind: "other",
    sourceUuid: "",
    instanceId: "",
    grantId: "",
    status: "active",
    contentUuid: "",
    contentKey: "",
    replacement: Qn()
  };
}
function $t(n) {
  return { name: n.name, img: n.img, type: n.type, system: Ke(n.system) };
}
function on(n, e) {
  const t = $t(n);
  return t.type = e, t;
}
function $e(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
function um(n, e) {
  return [...n.items].filter((t) => t.system.grantedBy?.instanceId === e);
}
function Rn(n, e) {
  return um(n, e).flatMap((i) => {
    if (i.type !== "descriptor" && i.type !== "characterType" && i.type !== "species") return [i];
    const o = i.system.instance?.instanceId;
    return [i, ...o ? Rn(n, o) : []];
  });
}
class mm {
  #e;
  #t;
  #i;
  constructor(e = async (o) => await fromUuid(o), t = () => globalThis.crypto?.randomUUID?.() ?? `package-${Date.now()}-${Math.random()}`, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async attachType(e, t, i = {}) {
    this.#m(e, t, "characterType");
    const o = i.replaceItemId ? $e(e).find((y) => y.id === i.replaceItemId && y.type === "characterType") : void 0;
    if ($e(e).some((y) => y.type === "characterType" && y.id !== o?.id))
      throw new Error("This Character already has an active Type.");
    const a = Ke(t.system), r = a.edgeGrant.mode === "choice" ? i.edgePool : a.edgeGrant.pool;
    if (a.edgeGrant.mode === "choice" && !r) throw new Error("This Type requires an Edge Pool choice.");
    const s = this.#p(a.choiceGroups ?? [], i.skillChoices ?? {}), l = this.#f(a.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), u = this.#t(), c = a.instance?.sourceUuid || t.uuid, p = (a.abilityChoiceGroups ?? []).flatMap((y) => y.options.filter((w) => l[y.id]?.includes(w.id)).map((w) => ({ ...w, id: `${y.id}:${w.id}` }))), f = [
      ...await this.#r([...a.abilityGrants ?? [], ...p], "type", c, u),
      ...await this.#a(a.skillGrants ?? [], "type", c, u),
      ...await this.#c(a.choiceGroups ?? [], s, "type", c, u)
    ], { grants: m, skippedGrantIds: b } = await this.#s(
      e,
      f,
      t,
      i.conflictResolver
    ), g = $t(t);
    return g.system = {
      ...a,
      instance: {
        sourceUuid: c,
        instanceId: u,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: r ?? "none",
          poolChoices: [],
          skillChoices: Object.entries(s).map(([y, w]) => ({ groupId: y, optionIds: w })),
          abilityChoices: Object.entries(l).map(([y, w]) => ({ groupId: y, optionIds: w })),
          suppressedGrantIds: b
        },
        parent: nn()
      }
    }, this.#n(e, g, m, o, i.replaceGrantedItemsMode ?? "delete", b);
  }
  async attachDescriptor(e, t, i) {
    this.#m(e, t, "descriptor");
    const o = Ke(t.system), a = o.instance?.sourceUuid || t.uuid;
    if ($e(e).some((m) => m.type === "descriptor" && m.system.instance.sourceUuid === a)) throw new Error("This Descriptor is already attached.");
    if (i.role === "primary" && $e(e).some((m) => m.type === "descriptor" && m.system.instance.role === "primary")) throw new Error("This Character already has a primary Descriptor.");
    const r = this.#t(), s = this.#y(o.poolBonusChoiceGroups ?? [], i.poolChoices ?? {}), l = this.#p(o.choiceGroups ?? [], i.skillChoices ?? {}), u = [
      ...await this.#a(o.skillGrants ?? [], "descriptor", a, r),
      ...await this.#c(o.choiceGroups ?? [], l, "descriptor", a, r)
    ], { grants: c, skippedGrantIds: p } = await this.#s(
      e,
      u,
      t,
      i.conflictResolver
    ), f = $t(t);
    return f.system = {
      ...o,
      instance: {
        sourceUuid: a,
        instanceId: r,
        role: i.role,
        attachedAt: this.#i(),
        selections: {
          edgePool: "none",
          poolChoices: Object.entries(s).map(([m, b]) => ({ groupId: m, pools: b })),
          skillChoices: Object.entries(l).map(([m, b]) => ({ groupId: m, optionIds: b })),
          abilityChoices: [],
          suppressedGrantIds: p
        },
        parent: i.parent ?? nn()
      }
    }, i.parent && (f.system.grantedBy = i.parent), this.#n(e, f, c, void 0, "delete", p);
  }
  async attachSpecies(e, t, i = {}) {
    this.#m(e, t, "species");
    const o = i.replaceItemId ? $e(e).find((P) => P.id === i.replaceItemId && P.type === "species") : void 0;
    if ($e(e).some((P) => P.type === "species" && P.id !== o?.id))
      throw new Error("This Character already has an active Species.");
    const a = Ke(t.system), r = a.edgeGrant.mode === "choice" ? i.edgePool : a.edgeGrant.pool;
    if (a.edgeGrant.mode === "choice" && !r) throw new Error("This Species requires an Edge Pool choice.");
    const s = this.#p(a.choiceGroups ?? [], i.skillChoices ?? {}), l = this.#f(a.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), u = this.#t(), c = a.instance?.sourceUuid || t.uuid, p = (a.abilityChoiceGroups ?? []).flatMap((P) => P.options.filter((Y) => l[P.id]?.includes(Y.id)).map((Y) => ({ ...Y, id: `${P.id}:${Y.id}` }))), f = [
      ...await this.#r([...a.abilityGrants ?? [], ...p], "species", c, u),
      ...await this.#a(a.skillGrants ?? [], "species", c, u),
      ...await this.#c(a.choiceGroups ?? [], s, "species", c, u)
    ], m = await this.#s(
      e,
      f,
      t,
      i.conflictResolver
    ), b = [...m.grants], g = [...m.skippedGrantIds], y = [...m.skippedGrantIds], w = new Set($e(e).filter((P) => P.type === "descriptor").map((P) => P.system.instance.sourceUuid || `snapshot:${P.name.trim().toLocaleLowerCase()}`));
    if (!je((a.descriptorGrants ?? []).map((P) => P.id)))
      throw new Error("Species Descriptor grant IDs must be unique.");
    for (const P of a.descriptorGrants ?? []) {
      const Y = P.descriptorUuid ? await this.#e(P.descriptorUuid) : null;
      if (Y && Y.type !== "descriptor") throw new Error("A Species Descriptor grant references a non-Descriptor Item.");
      const $ = Y ? $t(Y) : dm(P.snapshot, "descriptor");
      if (!$) throw new Error(`Descriptor grant '${P.id}' has neither a source nor a usable snapshot.`);
      const D = Ke($.system), U = D.instance?.sourceUuid || P.descriptorUuid, Ee = U || `snapshot:${String($.name).trim().toLocaleLowerCase()}`;
      if (w.has(Ee)) {
        g.push(P.id), y.push(P.id);
        continue;
      }
      w.add(Ee);
      const S = this.#t(), _ = this.#y(
        D.poolBonusChoiceGroups ?? [],
        i.descriptorPoolChoices?.[P.id] ?? {}
      ), me = this.#p(
        D.choiceGroups ?? [],
        i.descriptorSkillChoices?.[P.id] ?? {}
      ), Re = [
        ...await this.#a(D.skillGrants ?? [], "descriptor", U, S),
        ...await this.#c(D.choiceGroups ?? [], me, "descriptor", U, S)
      ], se = {
        id: String(Y?.id ?? P.id),
        uuid: U,
        name: String($.name),
        type: "descriptor",
        ...$.img ? { img: String($.img) } : {},
        system: D
      }, pe = await this.#s(
        e,
        Re,
        se,
        i.conflictResolver,
        b
      );
      y.push(...pe.skippedGrantIds);
      const k = {
        contentUuid: U,
        contentKey: `descriptor:${String($.name).trim().toLocaleLowerCase()}`
      }, T = {
        kind: "species",
        sourceUuid: c,
        instanceId: u,
        grantId: P.id,
        status: "active",
        ...k,
        replacement: Qn()
      };
      $.system = {
        ...D,
        grantedBy: T,
        instance: {
          sourceUuid: U,
          instanceId: S,
          role: "speciesGranted",
          attachedAt: this.#i(),
          selections: {
            edgePool: "none",
            poolChoices: Object.entries(_).map(([L, j]) => ({ groupId: L, pools: j })),
            skillChoices: Object.entries(me).map(([L, j]) => ({ groupId: L, optionIds: j })),
            abilityChoices: [],
            suppressedGrantIds: pe.skippedGrantIds
          },
          parent: T
        }
      }, b.push($, ...pe.grants);
    }
    const A = $t(t);
    return A.system = {
      ...a,
      instance: {
        sourceUuid: c,
        instanceId: u,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: r ?? "none",
          poolChoices: [],
          skillChoices: Object.entries(s).map(([P, Y]) => ({ groupId: P, optionIds: Y })),
          abilityChoices: Object.entries(l).map(([P, Y]) => ({ groupId: P, optionIds: Y })),
          suppressedGrantIds: g
        },
        parent: nn()
      }
    }, this.#n(
      e,
      A,
      b,
      o,
      i.replaceGrantedItemsMode ?? "delete",
      y
    );
  }
  async remove(e, t, i) {
    const o = $e(e).find((c) => c.id === t);
    if (!o) throw new Error("Character Package not found.");
    const a = o.system.instance.instanceId, r = Rn(e, a), s = Object.fromEntries(I.map((c) => [c, e.system.derived.pools[c].max])), l = Fi(o), u = i === "delete" ? r.map((c) => c.id) : [];
    return i === "keep" && await Promise.all(r.map((c) => c.update({
      "system.grantedBy.status": "retained",
      ...c.type === "descriptor" || c.type === "characterType" || c.type === "species" ? { "system.instance.parent.status": "retained" } : {}
    }))), await e.deleteEmbeddedDocuments("Item", [o.id, ...u]), await this.#o(e, s, Object.fromEntries(I.map((c) => [c, s[c] - l[c]]))), {
      removedPackageId: o.id,
      deletedGrantedItemIds: u,
      retainedGrantedItemIds: i === "keep" ? r.map((c) => c.id) : []
    };
  }
  async #n(e, t, i, o, a = "delete", r = []) {
    const s = Object.fromEntries(I.map((f) => [f, e.system.derived.pools[f].max])), l = Fi(t), u = o ? Fi(o) : { might: 0, speed: 0, intellect: 0 }, c = await e.createEmbeddedDocuments("Item", [t, ...i]);
    try {
      if (o) {
        const m = Rn(e, o.system.instance.instanceId);
        a === "keep" && await Promise.all(m.map((b) => b.update({
          "system.grantedBy.status": "retained",
          ...b.type === "descriptor" || b.type === "characterType" || b.type === "species" ? { "system.instance.parent.status": "retained" } : {}
        }))), await e.deleteEmbeddedDocuments("Item", [
          o.id,
          ...a === "delete" ? m.map((b) => b.id) : []
        ]);
      }
      const f = Object.fromEntries(I.map((m) => [m, s[m] + l[m] - u[m]]));
      await this.#o(e, s, f);
    } catch (f) {
      const m = c.map((b) => b.id).filter((b) => !!b);
      throw m.length && await e.deleteEmbeddedDocuments("Item", m), f;
    }
    const p = t.system.instance.instanceId;
    return { packageItem: c[0], grantedItems: c.slice(1), instanceId: p, skippedGrantIds: r };
  }
  async #o(e, t, i) {
    const o = {};
    for (const a of I)
      o[`system.stats.${a}.value`] = Da(e.system.stats[a].value, t[a], Math.max(0, i[a]));
    await e.update(o);
  }
  async #r(e, t, i, o) {
    if (!je(e.map((a) => a.id))) throw new Error("Type Ability grant IDs must be unique.");
    return Promise.all(e.map(async (a) => {
      const r = a.abilityUuid ? await this.#e(a.abilityUuid) : null;
      if (r && r.type !== "ability") throw new Error("An Ability grant references a non-Ability Item.");
      const s = r ? on(r, "ability") : tn(a.snapshot, "ability");
      if (!s) throw new Error(`Ability grant '${a.id}' has neither a source nor a usable snapshot.`);
      const l = be("ability", String(s.name ?? a.snapshot.name), a.abilityUuid);
      return s.system = { ...s.system, grantedBy: fa(t, i, o, a.id, l) }, s;
    }));
  }
  async #a(e, t, i, o) {
    if (!je(e.map((a) => a.id))) throw new Error("Descriptor Skill grant IDs must be unique.");
    return Promise.all(e.map((a) => this.#l(a, a.rank, t, i, o, a.id)));
  }
  async #c(e, t, i, o, a) {
    const r = [];
    for (const s of e)
      for (const l of t[s.id] ?? []) {
        const u = s.options.find((c) => c.id === l);
        r.push(await this.#l(u, s.rank, i, o, a, `${s.id}:${u.id}`));
      }
    return r;
  }
  async #l(e, t, i, o, a, r) {
    const s = e.skillUuid ? await this.#e(e.skillUuid) : null;
    if (s && s.type !== "skill") throw new Error("A Skill grant references a non-Skill Item.");
    const l = s ? on(s, "skill") : tn(e.snapshot, "skill") ?? (e.customName ? { name: e.customName, type: "skill", system: {} } : null);
    if (!l) throw new Error(`Skill grant '${r}' has neither a source, custom name, nor usable snapshot.`);
    const u = be("skill", String(l.name ?? e.customName), e.skillUuid);
    return l.system = { ...l.system, rank: t, grantedBy: fa(i, o, a, r, u) }, l;
  }
  async #s(e, t, i, o, a = []) {
    const r = [], s = [], l = [...e.items], u = a.filter((c) => c.type === "ability" || c.type === "skill");
    for (const c of t) {
      let p = c;
      const f = p.type;
      if (f !== "ability" && f !== "skill") {
        r.push(p);
        continue;
      }
      for (; ; ) {
        const m = p.system.grantedBy ?? {}, b = { type: f, contentUuid: m.contentUuid, contentKey: m.contentKey }, g = [...l, ...u, ...r], y = ki(g, b);
        if (!y) {
          r.push(p);
          break;
        }
        if (!o) {
          s.push(m.grantId);
          break;
        }
        const w = {
          id: `${m.instanceId}:${m.grantId}`,
          type: f,
          packageName: i.name,
          packageSourceUuid: i.uuid,
          grantId: m.grantId,
          existing: this.#d(y, f),
          proposed: this.#d(p, f),
          suggestions: this.#b(e, i, f, m.grantId),
          allowCustom: f === "skill",
          allowSuppress: !0,
          allowGmOverride: !1,
          context: "package"
        }, A = await o(w);
        if (A.action === "cancel") throw new Ne();
        if (A.action === "suppress") {
          s.push(m.grantId);
          break;
        }
        if (A.action !== "replace")
          throw new Error("GM Override is not a valid Character Package grant resolution.");
        p = await this.#u(p, A.replacement, A.selectionKind);
      }
    }
    return { grants: r, skippedGrantIds: s };
  }
  #d(e, t) {
    const i = e, o = i.system ?? {}, a = o.grantedBy ?? {}, r = be(t, String(i.name ?? ""), String(a.contentUuid ?? ""));
    return {
      id: String(i.id ?? i.uuid ?? r.contentKey),
      name: String(i.name ?? ""),
      type: t,
      rank: t === "skill" ? String(o.rank ?? "untrained") : "",
      contentUuid: String(a.contentUuid ?? r.contentUuid),
      contentKey: String(a.contentKey ?? r.contentKey)
    };
  }
  async #u(e, t, i) {
    const o = e.type;
    if (o !== "ability" && o !== "skill") throw new Error("Only Skill and Ability grants can be replaced.");
    if (t.type !== o) throw new Error("A grant replacement must use the same Item type.");
    const a = t.itemUuid ? await this.#e(t.itemUuid) : null;
    if (a && a.type !== o) throw new Error(`The selected replacement is not a ${o} Item.`);
    const r = a ? on(a, o) : tn(t.snapshot, o) ?? (o === "skill" && t.custom ? { name: t.name, type: o, system: {} } : null);
    if (!r) throw new Error(`The selected ${o} replacement is unavailable and has no usable snapshot.`);
    const s = e.system, l = s.grantedBy ?? {}, u = l.replacement?.active ? l.replacement : {
      originalName: String(e.name ?? ""),
      originalContentUuid: l.contentUuid,
      originalContentKey: l.contentKey
    }, c = be(o, String(r.name ?? t.name), t.itemUuid);
    return r.system = {
      ...r.system,
      ...o === "skill" ? { rank: s.rank } : {},
      grantedBy: {
        ...l,
        contentUuid: c.contentUuid,
        contentKey: c.contentKey,
        replacement: {
          active: !0,
          originalName: u.originalName,
          originalContentUuid: u.originalContentUuid,
          originalContentKey: u.originalContentKey,
          replacementName: String(r.name ?? t.name),
          replacementContentUuid: c.contentUuid,
          replacementContentKey: c.contentKey,
          selectionKind: i
        }
      }
    }, r;
  }
  #b(e, t, i, o) {
    const a = [], r = (c, p, f) => {
      const m = c.snapshot?.name || c.customName;
      m && a.push({
        id: `${f}:${c.id}`,
        type: i,
        name: m,
        itemUuid: c.itemUuid,
        snapshot: c.snapshot,
        reason: p,
        reasonSourceUuid: f,
        ...i === "skill" && !c.itemUuid ? { custom: !0 } : {}
      });
    }, s = (c, p, f) => {
      for (const m of c ?? []) r(m, p, f);
    }, l = (c, p = !1) => {
      const f = c.system, m = "instance" in f ? f.instance?.selections : void 0;
      if (i === "skill") {
        for (const b of f.skillGrants ?? [])
          c.uuid === t.uuid && b.id === o && s(b.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const b of f.choiceGroups ?? []) {
          const g = m?.skillChoices.find((w) => w.groupId === b.id)?.optionIds ?? [], y = o.startsWith(`${b.id}:`) ? o.slice(b.id.length + 1) : "";
          if (c.uuid === t.uuid && y)
            for (const w of b.options) w.id !== y && r({ id: w.id, itemUuid: w.skillUuid, customName: w.customName, snapshot: w.snapshot }, `${c.name} — Skill choice`, c.uuid);
          else if (!p)
            for (const w of b.options) g.includes(w.id) || r({ id: w.id, itemUuid: w.skillUuid, customName: w.customName, snapshot: w.snapshot }, `${c.name} — unused Skill choice`, c.uuid);
        }
      } else {
        for (const b of f.abilityGrants ?? [])
          c.uuid === t.uuid && b.id === o && s(b.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const b of f.abilityChoiceGroups ?? []) {
          const g = m?.abilityChoices.find((w) => w.groupId === b.id)?.optionIds ?? [], y = o.startsWith(`${b.id}:`) ? o.slice(b.id.length + 1) : "";
          if (c.uuid === t.uuid && y)
            for (const w of b.options) w.id !== y && r({ id: w.id, itemUuid: w.abilityUuid, customName: "", snapshot: w.snapshot }, `${c.name} — Ability choice`, c.uuid);
          else if (!p)
            for (const w of b.options) g.includes(w.id) || r({ id: w.id, itemUuid: w.abilityUuid, customName: "", snapshot: w.snapshot }, `${c.name} — unused Ability choice`, c.uuid);
        }
      }
    };
    l(t, !0);
    for (const c of $e(e)) l(c);
    const u = /* @__PURE__ */ new Set();
    return a.filter((c) => {
      const p = be(i, c.name, c.itemUuid), f = p.contentUuid || p.contentKey;
      return u.has(f) || fr(e.items, p) ? !1 : (u.add(f), !0);
    });
  }
  #p(e, t) {
    const i = {};
    for (const o of e) {
      const a = t[o.id] ?? [];
      if (a.length !== o.choose || !je(a) || a.some((r) => !o.options.some((s) => s.id === r)))
        throw new Error(`Descriptor choice '${o.id}' requires exactly ${o.choose} valid option(s).`);
      i[o.id] = [...a];
    }
    return i;
  }
  #f(e, t) {
    const i = {};
    for (const o of e) {
      const a = t[o.id] ?? [];
      if (a.length !== o.choose || !je(a) || a.some((r) => !o.options.some((s) => s.id === r)))
        throw new Error(`Ability choice '${o.id}' requires exactly ${o.choose} valid option(s).`);
      i[o.id] = [...a];
    }
    return i;
  }
  #y(e, t) {
    if (!je(e.map((o) => o.id)))
      throw new Error("Descriptor Pool bonus choice group IDs must be unique.");
    const i = {};
    for (const o of e) {
      const a = [...new Set(o.pools)].filter((s) => I.includes(s));
      if (a.length !== o.pools.length || !Number.isInteger(o.choose) || o.choose < 1 || o.choose > a.length || !Number.isInteger(o.amount) || o.amount < 1)
        throw new Error(`Descriptor Pool choice '${o.id}' is invalid.`);
      const r = t[o.id] ?? [];
      if (r.length !== o.choose || !je(r) || r.some((s) => !a.includes(s)))
        throw new Error(`Descriptor Pool choice '${o.id}' requires exactly ${o.choose} valid Pool(s).`);
      i[o.id] = [...r];
    }
    return i;
  }
  #m(e, t, i) {
    if (e.type !== "character") throw new Error("Character Packages require a Character Actor.");
    if (t.type !== i) throw new Error(`Expected a ${i} Item.`);
  }
}
function li(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function ha(n, e, t) {
  if (!Number.isInteger(e) || e < -10 || e > 10)
    throw new Error(`${t} modifier must be an integer from -10 to +10.`);
  return e === 0 ? null : {
    id: `ability.${n.id}.${t}-modifier`,
    label: t === "attack" ? "CYPHERV2.Ability.AttackModifierContribution" : "CYPHERV2.Ability.RollModifierContribution",
    direction: e > 0 ? "ease" : "hinder",
    steps: Math.abs(e),
    source: "other",
    sourceId: n.id
  };
}
function pm(n) {
  return n.type === "npc" ? gt(n) : {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...n.tokenId ? { tokenId: n.tokenId } : {},
    ...n.tokenUuid ? { tokenUuid: n.tokenUuid } : {}
  };
}
class fm {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t, i, o) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  canUse(e) {
    return e.type === "ability" && e.system.activation !== "passive";
  }
  pool(e, t) {
    const i = Me(e);
    if (t && i.length > 0 && !i.includes(t))
      throw new Error(`${t} is not an allowed Pool for this Ability.`);
    return i.length === 1 ? i[0] : t ?? null;
  }
  previewPayment(e, t, i) {
    te(e), this.#r(t);
    const o = Me(t), a = li(t.system.cost.amount, "Ability cost");
    if (a <= 0 || o.length === 0)
      throw new Error("This Ability has no payable Pool cost.");
    if (!o.includes(i)) throw new Error(`${i} is not an allowed Pool for this Ability.`);
    const r = li(e.system.stats[i].value, `${i} Pool value`), s = Math.max(0, Math.trunc(e.system.derived.pools[i].edge)), l = Cn(a, 0, s, t.system.cost.ignoresEdge), u = r - l.poolCost;
    return {
      ability: t,
      pool: i,
      listedCost: a,
      ignoresEdge: t.system.cost.ignoresEdge,
      edge: s,
      edgeApplied: l.edgeApplied,
      costPaid: l.poolCost,
      currentBefore: r,
      currentAfter: u,
      canPay: u >= 0
    };
  }
  async payCost(e, t, i) {
    const o = this.previewPayment(e, t, i);
    if (!o.canPay)
      throw new Error(`${i} has ${o.currentBefore} points but this Ability costs ${o.costPaid}.`);
    return o.costPaid > 0 && await e.update({ [`system.stats.${i}.value`]: o.currentAfter }), o;
  }
  async executeNoRoll(e, t, i = {}) {
    if (this.#r(t), !this.canUse(t)) throw new Error("Passive Abilities cannot be used.");
    if (t.system.roll !== "none") throw new Error("This Ability requires a roll.");
    const o = this.#o(t, i.targets ?? []), a = this.pool(t, i.pool), r = this.#a(t);
    if (r > 0 && !a) throw new Error("A Pool is required to pay this Ability cost.");
    if (!a) return { ability: t, actor: { id: e.id, name: e.name }, pool: null, costPaid: 0, edgeApplied: 0, targets: o };
    const s = e.system.stats[a].value, l = Cn(
      r,
      0,
      e.system.derived.pools[a].edge,
      t.system.cost.ignoresEdge
    );
    if (s < l.poolCost)
      throw new Error(`${a} has ${s} points but this action costs ${l.poolCost}.`);
    return l.poolCost > 0 && await e.update({ [`system.stats.${a}.value`]: s - l.poolCost }), {
      ability: t,
      actor: { id: e.id, name: e.name },
      pool: a,
      costPaid: l.poolCost,
      edgeApplied: l.edgeApplied,
      targets: o
    };
  }
  buildRollPlan(e, t, i = {}) {
    if (this.#r(t), !this.canUse(t)) throw new Error("Passive Abilities cannot be used.");
    if (t.system.roll === "none") throw new Error("This Ability does not require a roll.");
    const o = this.pool(t, i.pool);
    if (!o) throw new Error("Choose a Pool for this Ability roll.");
    const a = i.enabledRuleModuleIds ?? [], r = this.#o(t, i.targets ?? []), s = r.length ? r : [null], l = [
      "ability",
      `ability.${t.system.roll}`,
      ...t.system.roll === "attack" ? ["attack", "attack.ability", "defense.speed"] : [],
      ...t.system.roll === "defense" ? ["defense"] : [],
      ...o === "speed" ? ["speed-task"] : []
    ], u = { tags: l, pool: o }, c = s.map((g) => g?.type === "npc" ? this.#i.resolve(g, u, a) : null), p = [], f = ha(t, t.system.rollModifier, "roll");
    if (f && p.push(f), t.system.roll === "attack") {
      const g = ha(t, t.system.attackModifier, "attack");
      g && p.push(g);
    }
    const m = i.skill ? this.#t.rankContribution(i.skill, a) : null;
    m && p.push(m);
    const b = s.map((g, y) => ({
      label: t.name,
      pool: o,
      difficulty: c[y] ? { mode: "hidden", value: c[y].difficulty } : i.difficulty ?? { mode: "unknown" },
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: t.system.roll === "attack" ? i.damageEffort ?? 0 : 0,
      freeDamageEffort: t.system.roll === "attack" ? i.freeDamageEffort ?? 0 : 0,
      freeEffort: i.freeEffort ?? 0,
      actionCost: this.#a(t),
      actionCostIgnoresEdge: t.system.cost.ignoresEdge,
      otherEase: i.otherEase ?? 0,
      otherHindrance: i.otherHindrance ?? 0,
      contributions: [
        ...p,
        ...c[y]?.contributions ?? [],
        ...i.contributions ?? []
      ],
      purpose: t.system.roll === "attack" ? "damage" : "task",
      tags: l,
      origin: {
        kind: "ability",
        itemId: t.id,
        name: t.name,
        activation: t.system.activation,
        rollType: t.system.roll,
        damage: li(t.system.damage, "Ability damage"),
        woundSeverity: t.system.woundSeverity
      },
      ...g ? {
        target: {
          ...pm(g),
          name: g.name,
          type: g.type === "npc" ? "npc" : "character"
        }
      } : {}
    }));
    return { ability: t, pool: o, requests: b, targets: s, targetResolutions: c, damage: t.system.damage };
  }
  async executeRoll(e, t, i, o) {
    const a = this.buildRollPlan(e, t, i), r = await this.#e.executeBatch(e, a.requests, o), s = this.#n.policy(i.enabledRuleModuleIds ?? []).damageEffortBonus;
    return r.map((l, u) => {
      const c = t.system.roll === "attack" ? l.result.prepared.damageEffortApplied * s : 0, p = t.system.roll === "attack" ? Tt(l.result) : 0;
      return {
        ability: t,
        target: a.targets[u] ?? null,
        targetResolution: a.targetResolutions[u] ?? null,
        execution: l,
        baseDamage: a.damage,
        effortDamage: c,
        naturalDamage: p,
        grossDamage: a.damage + c + p,
        woundSeverity: t.system.woundSeverity
      };
    });
  }
  chooseAttackOutcomes(e, t) {
    return e.map((i) => {
      if (i.ability.system.roll !== "attack") return i;
      const o = Fr(i.execution.result, t), a = Tt(o);
      return {
        ...i,
        execution: { ...i.execution, result: o },
        naturalDamage: a,
        grossDamage: i.baseDamage + i.effortDamage + a
      };
    });
  }
  #o(e, t) {
    if (e.system.targetMode === "none") return [];
    if (e.system.targetMode === "single" && t.length > 1)
      throw new Error("This Ability can target only one Character or NPC.");
    return t;
  }
  #r(e) {
    if (e.type !== "ability") throw new Error("Ability use requires an Ability Item.");
  }
  #a(e) {
    const t = li(e.system.cost.amount, "Ability cost");
    return Me(e).length > 0 ? t : 0;
  }
}
function ga(n) {
  return n.type === "npc" ? gt(n) : gi(n);
}
function ya(n, e) {
  const t = n.target;
  return t ? t.type === "npc" && n.grossDamage > 0 ? {
    damage: n.grossDamage,
    action: {
      kind: "npcDamage",
      ...vi(ga(t)),
      requestedDamage: n.grossDamage,
      applied: !1
    }
  } : t.type === "character" && n.woundSeverity !== "none" ? {
    woundSeverity: n.woundSeverity,
    action: {
      kind: "characterWound",
      ...vi(ga(t)),
      severity: n.woundSeverity,
      sourceActorId: e,
      sourceName: n.ability.name,
      applied: !1
    }
  } : {} : {};
}
class hm {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async publishRoll(e, t, i, o = !1) {
    const a = t.execution.result.success === !0, r = t.execution.result.success !== !1, l = {
      ...a ? ya(t, e.id) : {},
      ...r && t.ability.system.roll === "attack" ? {
        damage: t.grossDamage,
        damageBreakdown: [
          { label: "CYPHERV2.Ability.DamageBreakdown.Base", value: t.baseDamage },
          ...t.effortDamage ? [{ label: "CYPHERV2.Combat.DamageBreakdown.Effort", value: t.effortDamage, additive: !0 }] : [],
          ...t.naturalDamage ? [{ label: "CYPHERV2.Combat.DamageBreakdown.Natural", value: t.naturalDamage, additive: !0 }] : []
        ]
      } : {}
    };
    await this.#e.publish(e, t.execution, i, { combat: l, showGmAudit: o });
  }
  async publishNoRoll(e, t) {
    const i = t.targets.length ? t.targets : [null];
    for (const o of i) {
      const a = o ? ya({
        ability: t.ability,
        target: o,
        grossDamage: t.ability.system.damage,
        woundSeverity: t.ability.system.woundSeverity
      }, e.id) : {}, r = a.action, s = await foundry.applications.handlebars.renderTemplate(
        "systems/cypherv2/templates/chat/ability-card.hbs",
        {
          abilityName: t.ability.name,
          actorName: e.name,
          ...ve(e),
          activation: game.i18n.localize(`CYPHERV2.Ability.Activation.${t.ability.system.activation}`),
          poolLabel: t.pool ? game.i18n.localize(`CYPHERV2.Pools.${t.pool[0].toUpperCase()}${t.pool.slice(1)}`) : "",
          costPaid: t.costPaid,
          targetName: o?.name ?? "",
          damage: a.damage,
          woundSeverity: a.woundSeverity ? game.i18n.localize(`CYPHERV2.Wounds.Severity.${a.woundSeverity}`) : "",
          combatAction: !!r,
          combatActionLabel: r ? game.i18n.localize(r.kind === "npcDamage" ? "CYPHERV2.Combat.ApplyDamage" : "CYPHERV2.Combat.ApplyWound") : ""
        }
      ), l = {
        speaker: ChatMessage.getSpeaker({ actor: e }),
        content: s
      };
      r && (l.flags = { cypherv2: { combatAction: r } }), await ChatMessage.create(l);
    }
  }
  async publishPayment(e, t) {
    const i = game.i18n.localize(
      `CYPHERV2.Pools.${t.pool[0].toUpperCase()}${t.pool.slice(1)}`
    ), o = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/ability-payment-card.hbs",
      {
        abilityName: t.ability.name,
        actorName: e.name,
        ...ve(e),
        poolLabel: i,
        listedCost: t.listedCost,
        ignoresEdge: t.ignoresEdge,
        edgeApplied: t.edgeApplied,
        costPaid: t.costPaid,
        currentBefore: t.currentBefore,
        currentAfter: t.currentAfter
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: o
    });
  }
}
const gm = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The Artifact level roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class ym {
  #e;
  constructor(e = gm) {
    this.#e = e;
  }
  canRollLevel(e) {
    return bn(e.system) && bi(e.system);
  }
  async rollLevel(e) {
    if (!bn(e.system)) throw new Error("This Artifact is depleted.");
    if (!bi(e.system)) throw new Error("This Artifact has a fixed Level.");
    const t = Ii(e.system), i = await this.#e(t);
    return await e.update({ "system.level": String(i.total) }), {
      itemId: e.id,
      itemName: e.name,
      formula: t,
      total: i.total,
      ...i.chatRoll === void 0 ? {} : { chatRoll: i.chatRoll }
    };
  }
}
function bm(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function vm(n) {
  const e = n._source?.system?.description;
  return typeof e == "string" ? e : "";
}
function wm(n) {
  const e = n.system;
  if (n.type === "equipment")
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Quantity"), value: Number(e.quantity ?? 1) },
      ...Number(e.level) > 0 ? [{ label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Number(e.level) }] : [],
      ...e.equipped === !0 ? [{ label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize("CYPHERV2.Common.Yes") }] : []
    ];
  if (n.type === "cypher") {
    const t = Rr(e.manifestation), i = Pr(e.power);
    return [
      { label: game.i18n.localize("CYPHERV2.Cypher.Manifestation.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${t}`) },
      ...String(e.form ?? "").trim() ? [{ label: game.i18n.localize("CYPHERV2.Cypher.Form"), value: String(e.form) }] : [],
      { label: game.i18n.localize("CYPHERV2.Cypher.Power.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Power.${i}`) },
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Jn(e) }
    ];
  }
  if (n.type === "artifact") {
    const t = e.depletion;
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Ii(e) },
      ...t?.enabled === !0 ? [{
        label: game.i18n.localize("CYPHERV2.Inventory.Depletion"),
        value: String(t.formula || `1${String(t.die ?? "d6")}`)
      }] : [],
      ...e.depleted === !0 ? [{ label: game.i18n.localize("CYPHERV2.Artifact.Depleted"), value: game.i18n.localize("CYPHERV2.Common.Yes") }] : []
    ];
  }
  if (n.type === "weapon") {
    const t = String(e.category ?? "medium"), i = String(e.attackType ?? "melee"), o = String(e.rangeCategory ?? "immediate");
    return [
      { label: game.i18n.localize("CYPHERV2.Combat.Category"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${t}`) },
      { label: game.i18n.localize("CYPHERV2.Combat.Damage"), value: Number(e.baseDamage ?? 0) },
      { label: game.i18n.localize("CYPHERV2.Combat.Weapon.AttackType.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${i}`) },
      { label: game.i18n.localize("CYPHERV2.Combat.Range.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Range.${o}`) }
    ];
  }
  if (n.type === "shield") {
    const t = e.wounds, i = e.derived, o = i?.capacities, a = i?.broken === !0;
    return [
      { label: game.i18n.localize("CYPHERV2.Shield.Status"), value: game.i18n.localize(a ? "CYPHERV2.Shield.Broken" : "CYPHERV2.Shield.Functional") },
      { label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize(e.equipped === !0 ? "CYPHERV2.Common.Yes" : "CYPHERV2.Common.No") },
      { label: game.i18n.localize("CYPHERV2.Shield.WoundTrack"), value: ["minor", "moderate", "major"].map((r) => `${t?.[r]?.length ?? 0}/${o?.[r] ?? 0}`).join(" · ") }
    ];
  }
  if (n.type === "armor") {
    const t = String(e.category ?? "light");
    return [
      { label: game.i18n.localize("CYPHERV2.Combat.Category"), value: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${t}`) },
      { label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize(e.equipped === !0 ? "CYPHERV2.Common.Yes" : "CYPHERV2.Common.No") }
    ];
  }
  if (n.type === "ability") {
    const t = n, i = Me(t), o = La(t.system.cost.amount, i, bm, {
      pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
      middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
      final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
    });
    return o ? [{ label: game.i18n.localize("CYPHERV2.Ability.Cost"), value: o }] : [];
  }
  return [];
}
function Cm(n) {
  return wm(n).filter(
    ({ label: e, value: t }) => e.trim().length > 0 && (typeof t == "number" || t.trim().length > 0)
  );
}
class Em {
  async publish(e) {
    const t = e.system, i = vm(e), o = i ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(i, {
      async: !0,
      relativeTo: e
    }) : "", a = t.depletion, r = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-card.hbs",
      {
        itemName: e.name,
        ...ve(e.actor),
        itemType: game.i18n.localize(`TYPES.Item.${e.type}`),
        properties: Cm(e),
        enrichedDescription: o,
        hasDescription: !!i.trim(),
        canRollDepletion: e.type === "artifact" && a?.enabled === !0 && t.depleted !== !0,
        itemUuid: e.uuid,
        depleted: t.depleted === !0
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: r
    });
  }
  async publishArtifactLevelRoll(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-formula-roll-card.hbs",
      {
        itemName: t.itemName,
        ...ve(e.actor),
        label: game.i18n.localize("CYPHERV2.Artifact.LevelRoll"),
        formula: t.formula,
        total: t.total
      }
    ), o = {
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: i
    };
    t.chatRoll !== void 0 && (o.rolls = [t.chatRoll]), await ChatMessage.create(o);
  }
}
class Rm {
  canUse(e) {
    return e.type === "character" && e.system.xp >= 1;
  }
  async spend(e, t) {
    if (te(e), !t) throw new Error("A Player Intrusion request ID is required.");
    if (e.system.xp < 1) throw new Error("Player Intrusion requires 1 XP.");
    return await e.update({ "system.xp": e.system.xp - 1 }), {
      requestId: t,
      actorId: e.id,
      actorUuid: e.uuid,
      actorName: e.name,
      xpSpent: 1
    };
  }
}
function Pm(n) {
  return { actorName: n.actorName, xpSpent: n.xpSpent };
}
class Sm {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/player-intrusion-card.hbs",
      {
        ...Pm(e),
        ...ve(t)
      }
    );
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: t }),
      content: i,
      flags: { cypherv2: { playerIntrusion: e } }
    });
  }
}
function km(n) {
  const e = new yu(), t = new uu(), i = new hu(), o = new Du(n), a = new Tu(n), r = new Ou(n), s = new $u(), l = new ju(), u = new _u(), c = new Ar(e), p = new tm(), f = new Dr(), m = new Wn(), b = new Qu(
    n,
    o,
    a,
    r,
    e,
    l,
    u,
    c,
    f
  );
  return Object.freeze({
    wounds: e,
    recovery: new fu(t, i),
    rally: new Sl(e),
    rolls: o,
    rollChat: s,
    skills: a,
    intrusions: new Mu(n),
    intrusionChat: new Wl(),
    playerIntrusions: new Rm(),
    playerIntrusionChat: new Sm(),
    targets: r,
    combat: b,
    combatChat: new Zu(s, c),
    abilities: new fm(o, a, r, b),
    abilityChat: new hm(s),
    shields: c,
    artifacts: new ym(),
    itemChat: new Em(),
    genres: new Wc(),
    weapons: f,
    depletion: p,
    depletionChat: new im(),
    combatStatuses: u,
    focusEvaluator: m,
    focusTrees: new cm(m),
    focusAcquisition: new Rc(m),
    advancement: new Hc(n),
    focusAssociations: new Tc(),
    characterInitialization: new Mc(),
    characterPackages: new mm()
  });
}
const Am = {
  id: "core",
  label: "CYPHERV2.Themes.Core",
  sourceId: "cypherv2.core",
  properties: {
    "--cypherv2-surface-primary": "#1b1c1f",
    "--cypherv2-surface-secondary": "#25262a",
    "--cypherv2-surface-raised": "#303136",
    "--cypherv2-text-primary": "#f3f4f6",
    "--cypherv2-text-muted": "#a9acb2",
    "--cypherv2-accent": "#96082a",
    "--cypherv2-accent-hover": "#bd123f",
    "--cypherv2-border": "#484a50",
    "--cypherv2-danger": "#d85b66",
    "--cypherv2-success": "#5fa878",
    "--cypherv2-wound-pip-character": "var(--cypherv2-danger)",
    "--cypherv2-wound-pip-shield": "#8fc7ea",
    "--cypherv2-rank-expert": "#c4a7e7",
    "--cypherv2-rank-specialized": "#8fc7ea",
    "--cypherv2-rank-trained": "#85c99a",
    "--cypherv2-rank-untrained": "#a9acb2",
    "--cypherv2-rank-inability": "var(--cypherv2-danger)",
    "--cypherv2-cypher-power-low": "#a9acb2",
    "--cypherv2-cypher-power-medium": "#85c99a",
    "--cypherv2-cypher-power-advanced": "#8fc7ea",
    "--cypherv2-cypher-power-high": "#c4a7e7",
    "--cypherv2-cypher-power-ultra": "#e4a46d",
    "--cypherv2-pool-gauge-low": "#8f4d55",
    "--cypherv2-pool-gauge-high": "#567961",
    "--cypherv2-color-bg": "var(--cypherv2-surface-primary)",
    "--cypherv2-color-surface": "var(--cypherv2-surface-secondary)",
    "--cypherv2-color-surface-raised": "var(--cypherv2-surface-raised)",
    "--cypherv2-color-border": "var(--cypherv2-border)",
    "--cypherv2-color-text": "var(--cypherv2-text-primary)",
    "--cypherv2-color-muted": "var(--cypherv2-text-muted)",
    "--cypherv2-color-accent": "var(--cypherv2-accent)",
    "--cypherv2-color-warning": "#c78a51",
    "--cypherv2-color-danger": "var(--cypherv2-danger)",
    "--cypherv2-font-heading": "var(--font-primary, sans-serif)",
    "--cypherv2-radius": "0.5rem",
    "--cypherv2-shadow": "0 0.35rem 1rem rgb(0 0 0 / 30%)",
    "--cypherv2-space": "0.65rem",
    "--cypherv2-space-page": "0.85rem",
    "--cypherv2-space-compact": "0.35rem",
    "--cypherv2-space-tight": "0.2rem",
    "--cypherv2-scrollbar-size": "0.45rem",
    "--cypherv2-scrollbar-thumb": "var(--cypherv2-color-border)",
    "--cypherv2-scrollbar-track": "color-mix(in srgb, var(--cypherv2-color-bg) 70%, transparent)"
  }
};
class Hm {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Set();
  register(e) {
    const t = e.id.trim();
    if (!t) throw new Error("Theme IDs cannot be blank.");
    if (this.#e.has(t)) throw new Error(`Theme '${t}' is already registered.`);
    const i = Object.freeze({ ...e.properties });
    for (const a of Object.keys(i))
      if (!a.startsWith("--cypherv2-"))
        throw new Error(`Theme property '${a}' must use the --cypherv2- prefix.`);
    const o = Object.freeze({ ...e, id: t, properties: i });
    return this.#e.set(t, o), o;
  }
  get(e) {
    return this.#e.get(e);
  }
  has(e) {
    return this.#e.has(e);
  }
  list() {
    return [...this.#e.values()].sort((e, t) => e.id.localeCompare(t.id));
  }
  choices() {
    return Object.fromEntries(this.list().map((e) => [e.id, e.label]));
  }
  apply(e, t = document.documentElement) {
    const i = this.#e.get(e);
    if (!i) throw new Error(`Theme '${e}' is not registered.`);
    for (const o of this.#t) t.style.removeProperty(o);
    this.#t.clear();
    for (const [o, a] of Object.entries(i.properties))
      t.style.setProperty(o, a), this.#t.add(o);
    return t.dataset.cypherv2Theme = i.id, i;
  }
}
function ba(n) {
  return n.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function $m(n) {
  return n === !0 || n === "true" || n === "on";
}
async function Im() {
  if (!game.user.isGM) throw new Error("Only a GM can initiate a GM Intrusion.");
  const n = [...game.actors].filter((s) => s.type === "character").sort((s, l) => s.name.localeCompare(l.name));
  if (n.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoCharacters"));
    return;
  }
  const e = n.map((s) => '<option value="' + s.id + '">' + ba(s.name) + "</option>").join(""), t = n.map((s) => '<label class="intrusion-character-choice"><input name="group-' + s.id + '" type="checkbox"> ' + ba(s.name) + "</label>").join(""), i = [
    '<div class="cypherv2-dialog-fields cypherv2-intrusion-dialog">',
    "<label>" + game.i18n.localize("CYPHERV2.Intrusion.ModeLabel"),
    '<select name="mode">',
    '<option value="targeted">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.targeted") + "</option>",
    '<option value="group">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.group") + "</option>",
    '<option value="free">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.free") + "</option>",
    "</select></label>",
    '<label data-intrusion-selection="single">' + game.i18n.localize("CYPHERV2.Intrusion.Character"),
    '<select name="targetActorId">' + e + "</select></label>",
    '<fieldset data-intrusion-selection="group" hidden>',
    "<legend>" + game.i18n.localize("CYPHERV2.Intrusion.GroupCharacters") + "</legend>",
    t,
    "</fieldset></div>"
  ].join(""), o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Intrusion.ManualTitle") },
    content: i,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Intrusion.Create") },
    render: (s, l) => {
      const u = l.element.querySelector('[name="mode"]'), c = l.element.querySelector('[data-intrusion-selection="single"]'), p = l.element.querySelector('[data-intrusion-selection="group"]'), f = () => {
        const m = u?.value === "group";
        c && (c.hidden = m), p && (p.hidden = !m);
      };
      u?.addEventListener("change", f), f();
    }
  });
  if (!o) return;
  const a = o.mode === "group" || o.mode === "free" ? o.mode : "targeted", r = a === "group" ? n.filter((s) => $m(o["group-" + s.id])).map((s) => s.id) : [String(o.targetActorId ?? "")];
  try {
    await Gt().createManual({ mode: a, actorIds: r });
  } catch (s) {
    ui.notifications.error(s instanceof Error ? s.message : String(s));
  }
}
function an(n, e, t) {
  const i = t > Ze, o = n.querySelector("[data-horror-summary]"), a = n.querySelector("[data-horror-explanation]"), r = n.querySelector("[data-horror-value]");
  n.dataset.horrorBand = Wa(t), n.style.setProperty("--cypherv2-horror-fill", `${_a(t)}%`), e.value = String(t), e.setAttribute("aria-valuetext", i ? `1–${t}` : "Natural 1"), r && (r.value = String(t)), o && (o.textContent = i ? game.i18n.format("CYPHERV2.Horror.RangeSummary", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalSummary")), a && (a.textContent = i ? game.i18n.format("CYPHERV2.Horror.Explanation", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalExplanation"));
}
async function Vm() {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  const n = dn(), e = `<div class="cypherv2 cypherv2-dialog cypherv2-horror-dialog" data-horror-dialog data-horror-band="${Wa(n)}" style="--cypherv2-horror-fill: ${_a(n)}%">
    <header class="cypherv2-dialog-heading">
      <span>${game.i18n.localize("CYPHERV2.Horror.Title")}</span>
      <strong data-horror-summary></strong>
    </header>
    <section class="cypherv2-dialog-section">
      <div class="horror-range-control">
        <input class="horror-range-input" id="cypherv2-horror-intrusion-range" name="horrorIntrusionRange" type="range" min="${Ze}" max="${qt}" step="1" value="${n}" aria-label="${game.i18n.localize("CYPHERV2.Horror.RangeLabel")}">
        <output class="horror-range-value" data-horror-value for="cypherv2-horror-intrusion-range">${n}</output>
      </div>
      <p class="cypherv2-dialog-help" data-horror-explanation></p>
    </section>
  </div>`;
  await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Horror.Title") },
    content: e,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Horror.Close") },
    render: (t, i) => {
      const o = i.element.querySelector("[data-horror-dialog]"), a = o?.querySelector("[name='horrorIntrusionRange']");
      !o || !a || (an(o, a, n), a.addEventListener("input", () => {
        an(o, a, Number(a.value));
      }), a.addEventListener("change", () => {
        Rl(Number(a.value)).catch((r) => {
          ui.notifications.error(r instanceof Error ? r.message : String(r)), an(o, a, dn());
        });
      }));
    }
  });
}
function Ym() {
  Hooks.on("getSceneControlButtons", (n) => {
    const e = n.tokens;
    if (!e) return;
    const t = e.tools ?? (e.tools = {}), i = Object.keys(t).length;
    t.cypherv2GMIntrusion = {
      name: "cypherv2GMIntrusion",
      title: "CYPHERV2.Intrusion.SceneControl",
      icon: "fa-solid fa-bolt",
      order: i,
      button: !0,
      visible: game.user.isGM,
      onChange: () => {
        Im();
      }
    }, t.cypherv2HorrorMode = {
      name: "cypherv2HorrorMode",
      title: "CYPHERV2.Horror.SceneControl",
      icon: "fa-solid fa-skull",
      order: i + 1,
      button: !0,
      visible: game.user.isGM,
      onChange: () => {
        Vm();
      }
    };
  });
}
const Tr = `system.${H}`;
function wi(n) {
  return game.user.isGM || n.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function Pn(n) {
  (n.tokenId || n.tokenUuid) && ui.notifications.error(game.i18n.localize("CYPHERV2.Combat.Errors.OriginalTokenMissing"));
}
function zr(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function Nr(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function Dm(n) {
  return {
    actorId: n.sourceActorId,
    ...n.sourceActorUuid ? { actorUuid: n.sourceActorUuid } : {},
    ...n.sourceTokenId ? { tokenId: n.sourceTokenId } : {},
    ...n.sourceTokenUuid ? { tokenUuid: n.sourceTokenUuid } : {}
  };
}
function Mr(n) {
  const e = n.getFlag(H, "combatAction");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "npcDamage" && t.kind !== "characterWound" && t.kind !== "shieldWound" || typeof t.targetActorId != "string" || typeof t.applied != "boolean" ? null : e;
}
function xr(n) {
  const e = n.getFlag(H, "defenseRequest");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "defenseRequest" || typeof t.sourceActorId != "string" || typeof t.targetActorId != "string" ? null : e;
}
async function Fm(n, e) {
  const t = Mr(n);
  if (!t || t.applied) return;
  const i = zr(t), o = await mn(i);
  if (!o) {
    Pn(i);
    return;
  }
  if (!wi(o)) return;
  const a = Mt(o, i);
  e.disabled = !0;
  try {
    if (t.kind === "npcDamage")
      await game.cypherv2.services.combat.applyNpcDamage(
        a,
        t.requestedDamage
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.DamageApplied"));
    else if (t.kind === "characterWound") {
      const r = t.sourceActorId ? { id: t.sourceActorId, name: t.sourceName ?? "NPC" } : void 0;
      await game.cypherv2.services.combat.applyCharacterWound(
        a,
        t.severity,
        r
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    } else {
      const r = o.items.get(t.shieldId);
      if (!r || r.type !== "shield") throw new Error("Resolved Shield Item not found.");
      const s = t.sourceActorId ? { id: t.sourceActorId, name: t.sourceName ?? "NPC" } : void 0;
      await game.cypherv2.services.combat.applyShieldWound(
        a,
        r,
        t.severity,
        s
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    }
    await n.setFlag(H, "combatAction", { ...t, applied: !0 }), e.textContent = game.i18n.localize("CYPHERV2.Combat.Applied");
  } catch (r) {
    e.disabled = !1, ui.notifications.error(r instanceof Error ? r.message : String(r));
  }
}
async function Tm(n, e, t, i) {
  if (e.resolved || !e.allowedDefenses.includes(t)) return;
  const o = Nr(e), a = Dm(e), r = await mn(o), s = await mn(a);
  if (!r || !s) {
    r || Pn(o), s || Pn(a);
    return;
  }
  if (!wi(r)) return;
  if (i.disabled = !0, !await pn(
    Mt(r, o),
    t,
    {
      source: Mt(s, a),
      woundSeverity: e.woundSeverity
    }
  )) {
    i.disabled = !1;
    return;
  }
  game.socket.emit(Tr, { type: "resolveDefenseRequest", messageId: n.id }), game.user.isGM && await n.setFlag(H, "defenseRequest", { ...e, resolved: !0 });
}
function zm(n, e) {
  const t = Mr(n), i = e.querySelector("[data-action='applyCombatOutcome']");
  if (i) {
    const s = t ? un(zr(t)) : null;
    !t || !s || !wi(s) ? i.remove() : t.applied ? (i.disabled = !0, i.textContent = game.i18n.localize("CYPHERV2.Combat.Applied")) : i.addEventListener("click", () => {
      Fm(n, i);
    }, { once: !0 });
  }
  const o = xr(n), a = [...e.querySelectorAll("[data-action='rollRequestedDefense']")];
  if (a.length === 0) return;
  const r = o ? un(Nr(o)) : null;
  if (!o || !r || !wi(r) || o.resolved) {
    for (const s of a) s.remove();
    return;
  }
  for (const s of a) {
    const l = s.dataset.defense;
    if (!Ea.includes(l)) {
      s.remove();
      continue;
    }
    s.addEventListener(
      "click",
      () => {
        Tm(n, o, l, s);
      },
      { once: !0 }
    );
  }
}
function Nm() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    zm(n, e);
  }), game.socket.on(Tr, (n) => {
    if (!game.user.isGM || n.type !== "resolveDefenseRequest") return;
    const e = game.messages.get(n.messageId);
    if (!e) return;
    const t = xr(e);
    !t || t.resolved || e.setFlag(H, "defenseRequest", { ...t, resolved: !0 });
  });
}
function Mm(n) {
  return n.actor ? n.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) : game.user.isGM;
}
function xm() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    for (const t of e.querySelectorAll("[data-action='rollItemCardDepletion']"))
      t.addEventListener("click", async (i) => {
        i.preventDefault(), i.stopPropagation();
        const o = t.dataset.itemUuid, a = o ? await fromUuid(o) : null;
        if (!a || a.type !== "artifact" || !Mm(a)) {
          ui.notifications.warn(game.i18n.localize("CYPHERV2.Inventory.NotAuthorized"));
          return;
        }
        t.disabled = !0, await yi(a), t.disabled = a.system.depleted === !0;
      });
  });
}
async function Um() {
  if (!game.user.isGM) return;
  const n = [...game.items].filter((e) => e.type === "genre");
  if (n.length)
    for (const e of game.actors)
      try {
        if (e.type !== "character") continue;
        const t = e, i = [...e.items].find((a) => a.type === "characterType");
        if (!i || t.system.genre.sourceUuid) continue;
        const o = await yr(
          i.system,
          n,
          async (a) => await fromUuid(a)
        );
        if (!o) continue;
        await game.cypherv2.services.genres.attach(t, o, "migration");
      } catch (t) {
        console.warn("cypherv2 | Could not migrate a legacy Type Genre suggestion", e.uuid, t);
      }
}
class qm {
  #e = /* @__PURE__ */ new Set();
  constructor(e = []) {
    for (const t of e) this.#e.add(t.id);
  }
  mark(e, t) {
    const i = t.querySelector(".cypherv2-roll-card[data-cypherv2-entrance]");
    return !i || this.#e.has(e.id) ? !1 : (this.#e.add(e.id), i.classList.add("cypherv2-chat-card-enter"), !0);
  }
}
function Gm() {
  const n = new qm(game.messages);
  return Hooks.on("renderChatMessageHTML", (e, t) => {
    n.mark(e, t);
  }), n;
}
const Ci = "doneThisRound";
function Ur(n, e) {
  return !!(e && (n.isGM || e.testUserPermission(n, "OWNER")));
}
function Om(n, e) {
  return e > 0 && n?.getFlag(H, Ci) === e;
}
async function Bm(n, e, t) {
  if (!n.started) return { ok: !1, reason: "not-started" };
  if (!n.turns.length) return { ok: !1, reason: "empty" };
  const i = n.combatant;
  return n.turn === null || !i ? { ok: !1, reason: "no-current" } : i.id !== t ? { ok: !1, reason: "stale" } : Ur(e, i) ? (await i.setFlag(H, Ci, n.round), await n.nextTurn(), { ok: !0 }) : { ok: !1, reason: "not-authorized" };
}
async function Lm(n) {
  const e = Array.from(n.combatants).filter((t) => t.getFlag(H, Ci) !== void 0).map((t) => ({
    _id: t.id,
    [`flags.${H}.-=${Ci}`]: null
  }));
  e.length && await n.updateEmbeddedDocuments("Combatant", e, { turnEvents: !1 });
}
function jm(n, e, t, i) {
  if (!n.includes(e)) return [...n];
  const o = n.filter((r) => r !== e);
  if (!t) return [...o, e];
  const a = o.indexOf(t);
  return a < 0 ? [...n] : (o.splice(a + (i ? 1 : 0), 0, e), o);
}
function Wm(n) {
  return n.map((e, t) => ({
    _id: e,
    initiative: (n.length - t) * 10
  }));
}
const _m = foundry.applications.sidebar.tabs.CombatTracker, va = "application/x-cypherv2-combatant";
function rn(n) {
  return n?.dataset.combatantId ?? null;
}
class Zn extends _m {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-combat-tracker"],
    actions: {
      endCypherTurn: Zn.#e
    }
  };
  static PARTS = {
    header: {
      template: "systems/cypherv2/templates/sidebar/combat-tracker-header.hbs"
    },
    tracker: {
      template: "systems/cypherv2/templates/sidebar/combat-tracker.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/sidebar/tabs/combat/footer.hbs"
    }
  };
  static async #e(e, t) {
    const i = this.viewed, o = rn(t.closest("[data-combatant-id]"));
    if (!i || !o) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.CombatTracker.Errors.NoCombat"));
      return;
    }
    t.setAttribute("disabled", "");
    try {
      const a = await Bm(i, game.user, o);
      a.ok || ui.notifications.warn(game.i18n.localize(`CYPHERV2.CombatTracker.Errors.${a.reason}`));
    } finally {
      t.removeAttribute("disabled");
    }
  }
  async _prepareTrackerContext(e, t) {
    await super._prepareTrackerContext(e, t), e.manualOrderEditable = game.user.isGM;
    const i = this.viewed;
    for (const o of e.turns ?? []) {
      const a = i?.combatants.get(o.id);
      o.doneThisRound = Om(a, i?.round ?? 0), o.canEndTurn = !!(i?.started && o.active && !o.doneThisRound && Ur(game.user, a));
    }
  }
  async _onRender(e, t) {
    if (await super._onRender(e, t), !game.user.isGM) return;
    const i = this.element.querySelector(".combat-tracker");
    if (!(!i || i.dataset.cypherv2OrderBound === "true")) {
      i.dataset.cypherv2OrderBound = "true", i.addEventListener("dragover", this.#i), i.addEventListener("drop", this.#n.bind(this)), i.addEventListener("dragend", this.#o.bind(this));
      for (const o of i.querySelectorAll(".combatant[data-combatant-id]"))
        o.addEventListener("dragstart", this.#t.bind(this));
    }
  }
  _getEntryContextOptions() {
    return super._getEntryContextOptions().filter((e) => e.label !== "COMBATANT.ACTIONS.Clear" && e.label !== "COMBATANT.ACTIONS.Reroll");
  }
  _getCombatContextOptions() {
    return super._getCombatContextOptions().filter((e) => e.label !== "COMBAT.InitiativeReset");
  }
  #t(e) {
    if (!game.user.isGM || !e.dataTransfer) return;
    const t = e.currentTarget?.closest("[data-combatant-id]") ?? null, i = rn(t);
    i && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData(va, i), e.dataTransfer.setData("text/plain", i), t?.classList.add("cypherv2-combatant-dragging"));
  }
  #i(e) {
    !game.user.isGM || !e.dataTransfer || (e.preventDefault(), e.dataTransfer.dropEffect = "move");
  }
  async #n(e) {
    if (e.preventDefault(), !game.user.isGM || !e.dataTransfer) return;
    const t = this.viewed, i = e.dataTransfer.getData(va) || e.dataTransfer.getData("text/plain");
    if (!t || !i || !t.combatants.get(i)) return;
    const o = e.target?.closest(".combatant[data-combatant-id]") ?? null, a = rn(o), r = o?.getBoundingClientRect(), s = !!(r && e.clientY > r.top + r.height / 2), l = t.turns.map((f) => f.id), u = jm(l, i, a, s);
    if (u.every((f, m) => f === l[m])) {
      this.#o();
      return;
    }
    const c = t.combatant?.id, p = c ? u.indexOf(c) : void 0;
    await t.updateEmbeddedDocuments(
      "Combatant",
      Wm(u),
      {
        ...p === void 0 || p < 0 ? {} : { combatTurn: p },
        turnEvents: !1
      }
    ), this.#o();
  }
  #o() {
    this.element.querySelectorAll(".cypherv2-combatant-dragging").forEach((e) => {
      e.classList.remove("cypherv2-combatant-dragging");
    });
  }
}
function Km() {
  CONFIG.ui.combat = Zn;
}
function Xm() {
  Hooks.on("updateCombat", (n, e) => {
    !("round" in e) || !game.user.isActiveGM || Lm(n).catch((t) => {
      console.error("cypherv2 | Failed to reset Combat Tracker DONE states", t);
    });
  });
}
const Jm = CONFIG.ui.pause;
class Qm extends Jm {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-game-pause"]
  };
  async _prepareContext(e) {
    return {
      ...await super._prepareContext(e),
      icon: zn.gamePaused,
      spin: !1
    };
  }
}
function Zm() {
  CONFIG.ui.pause = Qm;
}
function ep() {
  CONFIG.Combat.fallbackTurnMarker = zn.turnMarker;
}
const tp = "--cypherv2-blank-canvas-background-image";
function ip(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function np(n = document.body, e = (t) => foundry.utils.getRoute(t)) {
  const t = Ua(zn.lobby, e);
  n.style.setProperty(tp, ip(t));
}
Hooks.once("init", async () => {
  console.info(`${H} | Initializing`);
  const n = new cu();
  au(n);
  const e = new Hm();
  e.register(Am), game.cypherv2 = is(n, km(n), e), wl(), ul(), Zd(), Km(), Zm(), ep(), Ym(), Hooks.callAll("cypherv2.registerRules", n), Hooks.callAll("cypherv2.registerThemes", e), El(e), await foundry.applications.handlebars.loadTemplates([
    "systems/cypherv2/templates/focus/focus-tree.hbs"
  ]);
});
Hooks.once("ready", async () => {
  np();
  const n = String(game.settings.get(H, x.theme));
  game.cypherv2.themes.apply(game.cypherv2.themes.has(n) ? n : "core"), Jl(
    game.cypherv2.services.intrusions,
    game.cypherv2.services.intrusionChat
  ), Hd(
    game.cypherv2.services.playerIntrusions,
    game.cypherv2.services.playerIntrusionChat
  ), Nm(), xm(), Gm(), Xu(game.cypherv2.services.combatStatuses), Xm(), await Um(), console.info(`${H} | Ready`);
});
//# sourceMappingURL=cypherv2.mjs.map
