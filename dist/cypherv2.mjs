const I = "cypherv2", fs = "0.1.0";
const ee = [
  "inability",
  "untrained",
  "trained",
  "specialized",
  "expert"
], Ya = ["choose", "might", "speed", "intellect"], xe = ["light", "medium", "heavy"], Fa = ["melee", "ranged"], wn = ["immediate", "short", "long", "very-long", "specified"], Ue = ["light", "medium", "heavy"], Da = ["block", "blockWithShield", "dodge"], hs = ["d6", "d10", "d20"], Nn = ["subtle", "manifest"], Mn = ["low", "medium", "advanced", "high", "ultra"], ae = ["minor", "moderate", "major"], Ta = [
  "action",
  "firstAction",
  "lastAction",
  "enabler",
  "reaction",
  "timed",
  "perpetual",
  "passive",
  "special"
], go = ["none", "might", "speed", "intellect", "choose"], za = ["none", "task", "attack", "defense"], Na = ["none", "single", "multiple"], Ae = ["one-action", "10-minutes", "1-hour", "10-hours"], gs = ["normal", "nonRest"], ys = ["10-minutes", "1-hour", "10-hours"];
function bs(n, e, t) {
  return Object.freeze({
    version: fs,
    rules: n,
    services: e,
    themes: t
  });
}
const V = ["might", "speed", "intellect"], _t = {
  "one-action": "oneAction",
  "10-minutes": "tenMinutes",
  "1-hour": "oneHour",
  "10-hours": "tenHours"
};
function vt(n = !1) {
  return { oneAction: n, tenMinutes: n, oneHour: n, tenHours: n };
}
function Ma(n) {
  return Ae.filter((e) => !n[_t[e]]);
}
let yo = 0;
const Oe = () => {
  const n = globalThis.crypto?.randomUUID;
  return n ? n.call(globalThis.crypto) : (yo += 1, `cypherv2-${Date.now()}-${yo}`);
};
function oe(n) {
  if (n.type !== "character") throw new Error("Core Character services require a Character Actor.");
}
function Ne(n) {
  if (oe(n), n.system.derived.wounds.dead) throw new Error("A dead Character cannot use this service.");
}
function pt(n) {
  return {
    minor: n.minor.map((e) => ({ ...e })),
    moderate: n.moderate.map((e) => ({ ...e })),
    major: n.major.map((e) => ({ ...e }))
  };
}
const Gi = [
  "tier",
  "effort",
  "mightMax",
  "mightEdge",
  "speedMax",
  "speedEdge",
  "intellectMax",
  "intellectEdge"
];
function ws() {
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
function ft(n, e) {
  return Number.isInteger(e) ? Number(e) : n;
}
function qn(n) {
  return n.startsWith("might") ? "might" : n.startsWith("speed") ? "speed" : n.startsWith("intellect") ? "intellect" : null;
}
function bt(n) {
  return n === "tier" || n === "effort" ? `system.overrides.${n}` : `system.overrides.stats.${qn(n)}.${n.endsWith("Max") ? "max" : "edge"}`;
}
function oi(n, e, t) {
  if (!Number.isFinite(t)) throw new Error("Character progression delta must be finite.");
  if (e === "tier") {
    const l = Number.isInteger(n.overrides?.tier);
    return {
      path: l ? bt(e) : "system.tier",
      value: (l ? Number(n.overrides.tier) : n.tier) + t,
      overrideActive: l
    };
  }
  if (e === "effort") {
    const l = Number.isInteger(n.overrides?.effort);
    return {
      path: l ? bt(e) : "system.stats.effortBase",
      value: (l ? Number(n.overrides.effort) : n.stats.effortBase) + t,
      overrideActive: l
    };
  }
  const i = qn(e), o = e.endsWith("Max") ? "max" : "edge", a = n.overrides?.stats?.[i]?.[o], r = Number.isInteger(a), s = o === "max" ? n.stats[i].baseMax : n.stats[i].baseEdge;
  return {
    path: r ? bt(e) : `system.stats.${i}.${o === "max" ? "baseMax" : "baseEdge"}`,
    value: (r ? Number(a) : s) + t,
    overrideActive: r
  };
}
function L(n) {
  return n.derived?.tier?.value ?? ft(n.tier, n.overrides?.tier);
}
function vn(n, e) {
  if (e === "tier") return {
    key: e,
    path: bt(e),
    calculated: n.derived.tier.calculated,
    override: n.overrides?.tier ?? null,
    effective: n.derived.tier.value,
    minimum: 1
  };
  if (e === "effort") return {
    key: e,
    path: bt(e),
    calculated: n.derived.effort.calculatedMax,
    override: n.overrides?.effort ?? null,
    effective: n.derived.effort.max,
    minimum: 0
  };
  const t = qn(e), i = e.endsWith("Max") ? "max" : "edge", o = n.derived.pools[t];
  return {
    key: e,
    path: bt(e),
    calculated: i === "max" ? o.calculatedMax : o.calculatedEdge,
    override: n.overrides?.stats?.[t]?.[i] ?? null,
    effective: o[i],
    minimum: i === "max" ? 1 : -20
  };
}
const vs = [
  { id: "core-recovery-action", type: "one-action" },
  { id: "core-recovery-ten-minutes", type: "10-minutes" },
  { id: "core-recovery-one-hour", type: "1-hour" },
  { id: "core-recovery-ten-hours", type: "10-hours" }
];
function at(n = vt(!1)) {
  return vs.map((e) => ({
    ...e,
    used: n[_t[e.type]]
  }));
}
function Cs(n, e = vt(!1)) {
  if (!Array.isArray(n) || n.length === 0) return at(e);
  const t = /* @__PURE__ */ new Set(), i = [];
  for (const o of n) {
    if (!o || typeof o != "object") continue;
    const a = o, r = typeof a.id == "string" ? a.id.trim() : "", s = String(a.type ?? "");
    !r || t.has(r) || !Ae.includes(s) || (t.add(r), i.push({ id: r, type: s, used: a.used === !0 }));
  }
  return i.length > 0 ? i : at(e);
}
function Ct(n) {
  const e = vt(!1);
  for (const t of Ae) {
    const i = n.filter((o) => o.type === t);
    e[_t[t]] = i.length > 0 && i.every((o) => o.used);
  }
  return e;
}
function Mt(n) {
  return n.filter((e) => !e.used).map((e) => ({ ...e }));
}
function bo(n, e, t) {
  const i = n.find((o) => o.id === e && o.type === t);
  if (!i) throw new Error(`Recovery slot '${e}' is not available for '${t}'.`);
  if (i.used) throw new Error(`Recovery slot '${e}' has already been used today.`);
  return t === "10-hours" ? n.map((o) => ({ ...o, used: !1 })) : n.map((o) => o.id === e ? { ...o, used: !0 } : { ...o });
}
function Es(n) {
  const e = vt(!1);
  for (const t of Ae)
    e[_t[t]] = n.some((i) => i.type === t && i.used);
  return at(e);
}
const Oi = Object.freeze({
  light: 1,
  medium: 2,
  heavy: 3
});
function we(n) {
  return n.reduce((e, t) => e + t.value, 0);
}
function ve(n, e, t, i, o) {
  return { id: n, sourceId: e, sourceType: t, label: i, value: o };
}
function Rs(n, e, t, i = {}, o = [], a = { armorCategories: [], freelyUse: [] }, r = 0, s = {
  weaponCategories: [],
  weaponFamilies: [],
  armorCategories: [],
  genre: "none",
  genreUuid: "",
  totalEffortCapMode: "core",
  typeNames: [],
  descriptorNames: [],
  speciesNames: [],
  characterSentence: ""
}, l = 2, u = 1, c = ws(), p = 0, h = []) {
  const m = {};
  for (const $ of V) {
    const W = [
      ve(
        `pool.${$}.max.base`,
        `system.stats.${$}.baseMax`,
        "base",
        `${$} base maximum`,
        n[$].baseMax
      ),
      ...i.poolMax?.[$] ?? []
    ], J = [
      ve(
        `pool.${$}.edge.base`,
        `system.stats.${$}.baseEdge`,
        "base",
        `${$} base Edge`,
        n[$].baseEdge
      ),
      ...i.poolEdge?.[$] ?? []
    ], ie = we(W), pe = we(J);
    m[$] = {
      calculatedMax: ie,
      calculatedEdge: pe,
      max: ft(ie, c.stats?.[$]?.max),
      edge: ft(pe, c.stats?.[$]?.edge),
      maxContributions: W,
      edgeContributions: J
    };
  }
  const y = [
    ve(
      "effort.max.base",
      "system.stats.effortBase",
      "base",
      "Base Effort",
      n.effortBase ?? 0
    ),
    ...i.effortMax ?? []
  ], f = Math.max(0, we(y)), w = [
    ve(
      "recovery.bonus.base",
      "system.recovery.bonus",
      "base",
      "Permanent Recovery bonus",
      r
    ),
    ...i.recoveryBonus ?? []
  ], C = we(w), P = [
    ve("cypher-limit.base", "system.cypherLimitBase", "base", "Base Cypher Limit", l),
    ...i.cypherLimit ?? []
  ], Y = {}, k = {}, H = {};
  for (const $ of ae) {
    const W = [
      ve(
        `wound.${$}.capacity.core`,
        "cypherv2.core",
        "core",
        `${$} Wound capacity`,
        3
      ),
      ...i.woundCapacity?.[$] ?? []
    ], J = Math.max(1, we(W)), ie = c.wounds?.[$] ?? 0;
    k[$] = J, Y[$] = ie === 0 ? W : [...W, ve(
      `wound.${$}.capacity.manual`,
      `system.overrides.wounds.${$}`,
      "base",
      `Manual ${$} Wound capacity modifier`,
      ie
    )], H[$] = Math.max(1, J + ie);
  }
  const M = [];
  e.moderate.length >= H.moderate && M.push(
    ve(
      "wound.moderate.full.hindrance",
      "cypherv2.core",
      "core",
      "Moderate Wounds full",
      1
    )
  );
  for (const $ of e.major)
    M.push(
      ve(
        `wound.major.${$.id}.hindrance`,
        $.id,
        "wound",
        $.label || "Major Wound",
        1
      )
    );
  M.push(...i.hindrance ?? []);
  const O = [...o].filter(($) => $.type === "armor" && $.system.equipped).filter(($) => Ue.includes($.system.category)).sort(($, W) => Oi[W.system.category] - Oi[$.system.category] || $.id.localeCompare(W.id))[0], A = O?.system.category ?? "none", D = O ? Oi[O.system.category] : 0, S = O ? a.armorCategories.includes(O.system.category) : !0, K = ($, W, J) => O && J > 0 ? [ve(
    `armor.${O.id}.${$}`,
    O.id,
    "item",
    W,
    J
  )] : [], j = K("block", "Armor: Block", D), He = K("dodge", "Armor: Dodge", D), B = K(
    "speed-task",
    "Unfamiliar armor: Speed task",
    S ? 0 : D
  );
  return {
    tier: {
      calculated: u,
      value: ft(u, c.tier)
    },
    pools: m,
    effort: {
      calculatedMax: f,
      max: Math.max(0, ft(f, c.effort)),
      contributions: y
    },
    wounds: {
      calculatedCapacities: k,
      capacities: H,
      capacityContributions: Y,
      hindrance: we(M),
      hindranceContributions: M,
      dead: e.major.length >= H.major
    },
    recovery: {
      formula: wo(C + p),
      calculatedFormula: wo(C),
      calculatedBonus: C,
      manualModifier: p,
      bonus: C + p,
      bonusContributions: w,
      availableTypes: h.length > 0 ? [...new Set(Mt(h).map(($) => $.type))] : Ma(t)
    },
    cypherLimit: { max: Math.max(0, we(P)), contributions: P },
    combat: {
      armor: {
        itemId: O?.id ?? "",
        category: A,
        freelyUsed: S,
        blockEase: we(j),
        dodgeHindrance: we(He),
        speedTaskHindrance: we(B),
        blockContributions: j,
        dodgeContributions: He,
        speedTaskContributions: B
      }
    },
    packages: s
  };
}
function wo(n) {
  return n === 0 ? "1d6 + Tier" : `1d6 + Tier ${n > 0 ? "+" : "-"} ${Math.abs(n)}`;
}
const {
  ArrayField: xn,
  BooleanField: Vi,
  HTMLField: qa,
  NumberField: Et,
  ObjectField: Ps,
  SchemaField: kt,
  StringField: he
} = foundry.data.fields, d = {
  ArrayField: xn,
  BooleanField: Vi,
  HTMLField: qa,
  NumberField: Et,
  ObjectField: Ps,
  SchemaField: kt,
  StringField: he
};
function E(n = 0, e = 0) {
  return new Et({ required: !0, nullable: !1, integer: !0, min: e, initial: n });
}
function Q(n = []) {
  return new xn(
    new he({ required: !0, nullable: !1, blank: !1 }),
    { required: !0, nullable: !1, initial: [...n] }
  );
}
function Bi(n = 10) {
  return new kt({
    value: E(n),
    baseMax: E(n, 1),
    baseEdge: E(0, -20),
    max: new Et({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: n,
      persisted: !1
    }),
    edge: new Et({
      required: !0,
      nullable: !1,
      integer: !0,
      min: -20,
      initial: 0,
      persisted: !1
    })
  });
}
function wt() {
  return new kt({
    id: new he({ required: !0, nullable: !1, blank: !1 }),
    label: new he({ required: !0, nullable: !1, initial: "" }),
    description: new qa({ required: !0, nullable: !1, initial: "" }),
    sourceUuid: new he({ required: !0, nullable: !1, initial: "" }),
    treated: new Vi({ required: !0, nullable: !1, initial: !1 })
  });
}
function Ss() {
  return new kt({
    id: new he({ required: !0, nullable: !1, blank: !1 }),
    sourceId: new he({ required: !0, nullable: !1, blank: !1 }),
    sourceType: new he({
      required: !0,
      nullable: !1,
      choices: ["base", "core", "rule-module", "wound", "item"]
    }),
    label: new he({ required: !0, nullable: !1, initial: "" }),
    value: new Et({ required: !0, nullable: !1, integer: !0, initial: 0 })
  });
}
function fe() {
  return new xn(Ss(), {
    required: !0,
    nullable: !1,
    initial: [],
    persisted: !1
  });
}
function ks() {
  return new kt({
    enabled: new Vi({ required: !0, nullable: !1, initial: !1 }),
    trigger: new he({
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
function Yi(n = "") {
  return new kt({
    enabled: new Vi({ required: !0, nullable: !1, initial: !1 }),
    die: new he({
      required: !0,
      nullable: !1,
      initial: "d6",
      validate: (e) => /^d(?:[2-9]|[1-9]\d{1,2}|1000)$/i.test(e)
    }),
    formula: new he({ required: !0, nullable: !1, initial: n }),
    threshold: new Et({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: 1
    })
  });
}
class xa extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: E(1, 1),
      description: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      gmNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
const Un = [
  "increaseCapabilities",
  "moveTowardPerfection",
  "extraEffort",
  "skillTraining"
], Ua = [
  "recovery",
  "focus",
  "armor",
  "weapons",
  "genre"
], As = [...Un, "other"], Ga = [
  "characterCreation",
  "additionalFocus",
  "otherAdvancement",
  "newTier"
], Hs = ["otherAdvancement", "newTier"], Oa = Object.freeze({
  xpCost: 4,
  purchasesPerTier: 4,
  capabilityPoints: 4,
  effortMaximum: 6,
  recoveryBonus: 2,
  resourcePointsForTier: (n) => n >= 5 ? 3 : n >= 3 ? 2 : 1,
  genreChoiceForTier: (n) => n >= 3 && n % 3 === 0,
  attackDefenseTrainingTier: 2,
  attackDefenseSpecializationTier: 4
}), Ba = ["axes", "knives", "swords"];
function rt(n) {
  const e = String(n ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("en-US").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "");
  return e === "none" ? "" : e;
}
function se(n) {
  const e = Array.isArray(n) ? n : typeof n == "string" ? n.split(/[,;\n]/) : [];
  return [...new Set(e.map(rt).filter(Boolean))];
}
function ht(n) {
  return rt(n).split("-").filter(Boolean).map((e) => `${e[0]?.toLocaleUpperCase("en-US") ?? ""}${e.slice(1)}`).join(" ");
}
function Fi(n) {
  return !n || typeof n != "object" || Array.isArray(n) ? [] : se(Object.entries(n).filter(([, e]) => e === !0).map(([e]) => e));
}
const $s = [
  "Accuracy",
  "Strength",
  "Dexterity",
  "Resilience",
  "Intelligence",
  "Single Attack",
  "Power",
  "Flight",
  "Healing",
  "Increased Range",
  "Prodigy",
  "Savant",
  "Custom"
];
function La(n) {
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const e = n, t = String(e.id ?? "").trim(), i = String(e.category ?? "").trim(), o = Number(e.shifts);
  return !t || !i || !Number.isInteger(o) || o < 1 ? null : {
    id: t,
    category: i,
    shifts: o,
    specification: String(e.specification ?? e.label ?? "").trim(),
    description: String(e.description ?? "").trim()
  };
}
function ja(n) {
  if (!Array.isArray(n)) return [];
  const e = /* @__PURE__ */ new Set(), t = [];
  for (const i of n) {
    const o = La(i);
    !o || e.has(o.id) || (e.add(o.id), t.push(o));
  }
  return t;
}
function Is(n) {
  return n.filter((e) => e.type === "characterType").flatMap((e) => {
    const t = e.system.instance?.instanceId || e.id;
    return (e.system.instance?.selections?.powerShifts ?? []).flatMap((i, o) => {
      const a = String(i ?? "").trim();
      return a ? [{
        id: `legacy-${t}-${o}`,
        category: "Custom",
        shifts: 1,
        specification: a,
        description: ""
      }] : [];
    });
  });
}
function vo(n, e) {
  const t = ja(n);
  return t.length > 0 ? t : Is(e);
}
function Vs(n) {
  return n.filter((e) => e.type === "characterType").reduce((e, t) => {
    const i = Number(t.system.superhero?.powerShiftCount ?? 0);
    return e + (Number.isInteger(i) && i > 0 ? i : 0);
  }, 0);
}
function Ys(n, e) {
  const t = n.reduce((o, a) => o + a.shifts, 0), i = /* @__PURE__ */ new Map();
  for (const o of n) {
    const a = o.category.trim().toLocaleLowerCase("en-US");
    i.set(a, (i.get(a) ?? 0) + o.shifts);
  }
  return {
    allocated: t,
    available: Math.max(0, Math.trunc(e)),
    overBudget: t > e,
    categoryWarnings: new Set([...i].filter(([, o]) => o > 3).map(([o]) => o))
  };
}
function Fs(n, e, t = Oe) {
  const i = e.id?.trim() || t(), o = La({ ...e, id: i });
  if (!o) throw new Error("A Power Shift requires a category and a positive whole-number value.");
  const a = n.findIndex((r) => r.id === i);
  return a < 0 ? [...n, o] : n.map((r, s) => s === a ? o : r);
}
function Ds(n, e) {
  return n.filter((t) => t.id !== e);
}
function ai(n, e) {
  return Number.isInteger(n) && Number(n) >= e ? Number(n) : null;
}
function Co(n, e = !1) {
  const t = {}, i = n.stats && typeof n.stats == "object" ? n.stats : {}, o = (a) => {
    const r = i[a] && typeof i[a] == "object" ? i[a] : {}, s = {};
    return (!e || z(r, "max")) && (s.max = ai(r.max, 1)), (!e || z(r, "edge")) && (s.edge = ai(r.edge, -20)), s;
  };
  if ((!e || z(n, "tier")) && (t.tier = ai(n.tier, 1)), (!e || z(n, "effort")) && (t.effort = ai(n.effort, 0)), !e || z(n, "stats")) {
    const a = {};
    for (const r of ["might", "speed", "intellect"])
      (!e || z(i, r)) && (a[r] = o(r));
    t.stats = a;
  }
  if (!e || z(n, "wounds")) {
    const a = n.wounds && typeof n.wounds == "object" ? n.wounds : {}, r = {};
    for (const s of ["minor", "moderate", "major"])
      (!e || z(a, s)) && (r[s] = Number.isInteger(a[s]) ? Number(a[s]) : 0);
    t.wounds = r;
  }
  return t;
}
function z(n, e) {
  return Object.prototype.hasOwnProperty.call(n, e);
}
function Ts(n, e) {
  const t = { ...n };
  return (!e || z(n, "cycle")) && (t.cycle = Number.isInteger(n.cycle) ? n.cycle : 1), (!e || z(n, "purchases")) && (t.purchases = Array.isArray(n.purchases) ? n.purchases : []), (!e || z(n, "initializedFocusUuids")) && (t.initializedFocusUuids = Array.isArray(n.initializedFocusUuids) ? n.initializedFocusUuids : []), (!e || z(n, "pendingFocusChoices")) && (t.pendingFocusChoices = Array.isArray(n.pendingFocusChoices) ? n.pendingFocusChoices : []), (!e || z(n, "pendingGenreChoices")) && (t.pendingGenreChoices = Array.isArray(n.pendingGenreChoices) ? n.pendingGenreChoices : []), (!e || z(n, "guidanceCompletedTiers")) && (t.guidanceCompletedTiers = Array.isArray(n.guidanceCompletedTiers) ? [...new Set(n.guidanceCompletedTiers.filter((i) => Number.isInteger(i) && Number(i) >= 1).map(Number))].sort((i, o) => i - o) : []), (!e || z(n, "notes")) && (t.notes = typeof n.notes == "string" ? n.notes : ""), t;
}
function zs(n, e) {
  const t = { ...n };
  if ((!e || z(n, "coreInitialized")) && (t.coreInitialized = n.coreInitialized === !0), !e || z(n, "mode")) {
    const i = n.mode === "setup" ? "completed" : String(n.mode);
    t.mode = ["completed", "skipped", "manual"].includes(i) ? i : "uninitialized";
  }
  return (!e || z(n, "initializedAt")) && (t.initializedAt = Number.isInteger(n.initializedAt) ? n.initializedAt : 0), t;
}
function Eo(n, e) {
  const t = {};
  if (!e || z(n, "backgroundMode")) {
    const i = String(n.backgroundMode ?? "theme");
    t.backgroundMode = ["theme", "portrait", "custom"].includes(i) ? i : "theme";
  }
  if ((!e || z(n, "customImage")) && (t.customImage = typeof n.customImage == "string" ? n.customImage : ""), !e || z(n, "color")) {
    const i = typeof n.color == "string" ? n.color.trim() : "";
    t.color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(i) ? i.toLocaleLowerCase("en-US") : "";
  }
  return t;
}
function Ns(n, e = {}) {
  const t = e.partial === !0;
  if (t ? n.overrides && typeof n.overrides == "object" && (n.overrides = Co(n.overrides, !0)) : n.overrides = Co(
    n.overrides && typeof n.overrides == "object" ? n.overrides : {}
  ), !t && (!n.genre || typeof n.genre != "object") && (n.genre = { sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0 }), t ? n.appearance && typeof n.appearance == "object" && (n.appearance = Eo(n.appearance, !0)) : n.appearance = Eo(
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
  })), n.advancement && typeof n.advancement == "object" && (n.advancement = Ts(n.advancement, t)), !t || n.recovery && typeof n.recovery == "object") {
    const i = n.recovery && typeof n.recovery == "object" ? n.recovery : {}, o = i.used && typeof i.used == "object" ? { ...vt(!1), ...i.used } : vt(!1), a = { ...i };
    (!t || z(i, "bonus")) && (a.bonus = Number.isInteger(i.bonus) ? i.bonus : 0), (!t || z(i, "slots")) && (a.slots = Cs(i.slots, o), a.used = Ct(a.slots)), (!t || z(i, "customized")) && (a.customized = i.customized === !0), (!t || z(i, "rollModifier")) && (a.rollModifier = Number.isInteger(i.rollModifier) ? Number(i.rollModifier) : 0), (!t || z(i, "history")) && (a.history = Array.isArray(i.history) ? i.history.map((r) => r && typeof r == "object" ? { slotId: "", ...r } : r) : []), n.recovery = a;
  }
  if (t) {
    if (n.presentation && typeof n.presentation == "object") {
      const i = n.presentation, o = { ...i };
      z(i, "hideFocusInSentence") && (o.hideFocusInSentence = i.hideFocusInSentence === !0), z(i, "powerShiftsEnabled") && (o.powerShiftsEnabled = i.powerShiftsEnabled === !0), n.presentation = o;
    }
  } else {
    const i = n.presentation && typeof n.presentation == "object" ? n.presentation : {};
    n.presentation = {
      hideFocusInSentence: i.hideFocusInSentence === !0,
      powerShiftsEnabled: i.powerShiftsEnabled === !0
    };
  }
  if (!t || n.proficiencies && typeof n.proficiencies == "object") {
    const i = n.proficiencies && typeof n.proficiencies == "object" ? n.proficiencies : {}, o = { ...i };
    (!t || z(i, "weaponFamilies")) && (o.weaponFamilies = se(i.weaponFamilies)), n.proficiencies = o;
  }
  return (!t || z(n, "powerShifts")) && (n.powerShifts = ja(n.powerShifts)), n.creation && typeof n.creation == "object" && (n.creation = zs(n.creation, t)), n;
}
function dt(n, e, t) {
  return {
    id: `package.${n.system.instance.instanceId || n.id}.${e}`,
    sourceId: n.id,
    sourceType: "item",
    label: n.name,
    value: t
  };
}
function je(n) {
  return Number.isInteger(n) && Number(n) > 0 ? Number(n) : 0;
}
function Wa(n) {
  if (n.type !== "descriptor") return [];
  const e = n.system, t = e.instance?.selections?.poolChoices ?? [];
  return (e.poolBonusChoiceGroups ?? []).flatMap((i) => {
    const o = je(i.amount), a = new Set(i.pools.filter((l) => V.includes(l))), r = t.find((l) => l.groupId === i.id)?.pools ?? [], s = [...new Set(r)].filter((l) => a.has(l)).slice(0, je(i.choose));
    return o ? s.map((l) => ({ groupId: i.id, pool: l, amount: o })) : [];
  });
}
function _a(n) {
  if (n.type !== "characterType") return null;
  const e = n.system;
  if (!e.superhero?.superheroics?.enabled) return null;
  const t = e.instance?.selections?.superheroicsPool, i = je(e.superhero.superheroics.poolBonus);
  return t && t !== "none" && V.includes(t) && i > 0 ? { pool: t, amount: i } : null;
}
function Ms(n, e, t = []) {
  const i = [...n, ...e].join(" ").trim(), o = t.length > 0 ? `who ${t.join(" and ")}` : "";
  return [i, o].filter(Boolean).join(" ");
}
function qs(n, e = [], t = [], i = [], o = []) {
  const a = {}, r = {}, s = {}, l = new Set(e.filter((f) => xe.includes(f))), u = new Set(se(o)), c = new Set(t.filter((f) => Ue.includes(f))), p = [], h = [], m = [], y = [];
  for (const f of n) {
    if (f.type === "characterType" || f.type === "species") {
      const P = f.system;
      if (f.type === "characterType")
        p.push(f.name);
      else {
        m.push(f.name);
        const k = je(P.cypherLimitBonus);
        k && y.push(dt(f, "cypher-limit", k));
      }
      for (const k of se([
        ...P.weaponFamilies ?? [],
        ...Fi(P.weaponFamilyUse)
      ])) u.add(k);
      for (const k of ["minor", "moderate", "major"]) {
        const H = je(P.woundBonuses[k]);
        H && (s[k] ??= []).push(dt(f, `wound.${k}`, H));
      }
      const Y = P.edgeGrant.mode === "choice" ? P.instance.selections.edgePool : P.edgeGrant.pool;
      if (Y !== "none" && V.includes(Y)) {
        const k = je(P.edgeGrant.amount);
        k && (r[Y] ??= []).push(dt(f, `edge.${Y}`, k));
      }
      for (const k of xe) P.weaponUse[k] && l.add(k);
      for (const k of Ue) P.armorUse[k] && c.add(k);
    } else
      h.push(f.name);
    const w = f.system.poolBonuses;
    for (const P of V) {
      const Y = je(w[P]);
      Y && (a[P] ??= []).push(dt(f, `pool.${P}`, Y));
    }
    for (const P of Wa(f))
      (a[P.pool] ??= []).push(dt(
        f,
        `pool-choice.${P.groupId}.${P.pool}`,
        P.amount
      ));
    const C = _a(f);
    C && (a[C.pool] ??= []).push(dt(
      f,
      `superheroics.${C.pool}`,
      C.amount
    ));
  }
  return {
    extensions: { poolMax: a, poolEdge: r, woundCapacity: s, cypherLimit: y },
    weaponCategories: [...l],
    weaponFamilies: [...u],
    armorCategories: [...c],
    typeNames: p,
    descriptorNames: h,
    speciesNames: m,
    characterSentence: Ms(h, p, i)
  };
}
function Li(n) {
  const e = n.system, t = Object.fromEntries(V.map((o) => [o, je(e.poolBonuses[o])]));
  for (const o of Wa(n)) t[o.pool] += o.amount;
  const i = _a(n);
  return i && (t[i.pool] += i.amount), t;
}
function Ka(n, e, t) {
  const i = Math.max(0, e - n);
  return Math.max(0, Math.min(t, t - i));
}
const xs = ["core", "unlimited"], Us = ["manual", "typeSuggestion", "migration"], Gs = ["progression", "origin"], Os = 6;
function Bs(n, e) {
  if (!n.sourceUuid) return null;
  const t = e(n.sourceUuid);
  return !t || t.type !== "genre" ? null : {
    sourceUuid: t.uuid,
    name: t.name,
    totalEffortCapMode: t.system.options.totalEffortCapMode
  };
}
function Ls(n) {
  return n === "unlimited" ? null : Os;
}
const Xa = ["theme", "portrait", "custom"], js = "#96082a", Ws = { r: 23, g: 24, b: 27 };
function Gn(n) {
  const e = n.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  return e ? `#${(e[1].length === 3 ? [...e[1]].map((i) => `${i}${i}`).join("") : e[1]).toLocaleLowerCase("en-US")}` : null;
}
function Ja(n) {
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16)
  };
}
function Qa({ r: n, g: e, b: t }) {
  return `#${[n, e, t].map((i) => Math.max(0, Math.min(255, Math.round(i))).toString(16).padStart(2, "0")).join("")}`;
}
function Za(n, e, t) {
  const i = 1 - t;
  return {
    r: n.r * t + e.r * i,
    g: n.g * t + e.g * i,
    b: n.b * t + e.b * i
  };
}
function _s(n) {
  const e = Ja(n);
  return Math.max(e.r, e.g, e.b) < 96 ? Qa(Za(e, { r: 255, g: 255, b: 255 }, 0.72)) : n;
}
function er(n) {
  const e = Gn(n);
  return e ? Qa(Za(Ja(e), Ws, 0.2)) : null;
}
function tr(n) {
  const e = Gn(n);
  return e ? _s(e) : null;
}
function Ks(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function ir(n, e = (t) => foundry.utils.getRoute(t)) {
  const t = n.trim();
  return t ? /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(t) ? t : e(t) : "";
}
function Xs(n, e, t) {
  const i = Xa.includes(n.backgroundMode) ? n.backgroundMode : "theme", o = n.customImage.trim(), a = Gn(n.color), r = a ? tr(a) : null, s = a ? er(a) : null, l = i === "portrait" ? e.trim() : i === "custom" ? o : "", u = ir(l, t), c = [
    ...r ? [`--cypherv2-character-accent: ${r}`] : [],
    ...s ? [`--cypherv2-character-tint: ${s}`] : [],
    ...u ? [`--cypherv2-character-background-image: ${Ks(u)}`] : []
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
    colorInput: a ?? js,
    isTheme: i === "theme",
    isPortrait: i === "portrait",
    isCustom: i === "custom",
    style: c.join("; ")
  };
}
function Js() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    kind: new d.StringField({ required: !0, nullable: !1, choices: [...As] }),
    otherKind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "none",
      choices: ["none", ...Ua]
    }),
    tier: E(1, 1),
    xpCost: E(),
    resourcePointsGranted: E(),
    timestamp: E()
  });
}
function Qs() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...Ga] }),
    grantTier: E(1, 1),
    focusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" })
  });
}
function Zs() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...Hs] }),
    grantTier: E(1, 1)
  });
}
function el() {
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
      choices: ["none", ...Ga]
    }),
    choiceGrantTier: E(1, 1),
    choiceFocusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    acquiredAt: E()
  });
}
function tl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    slotId: new d.StringField({ required: !0, nullable: !1, blank: !0, initial: "" }),
    kind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "normal",
      choices: [...gs]
    }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...Ae] }),
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
function il() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...Ae] }),
    used: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
  });
}
function nl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...ys] }),
    choice: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    majorTaskSucceeded: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    removedWoundIds: Q(),
    timestamp: E()
  });
}
function ji() {
  return new d.SchemaField({
    calculatedMax: E(),
    calculatedEdge: E(0, -20),
    max: E(),
    edge: E(0, -20),
    maxContributions: fe(),
    edgeContributions: fe()
  });
}
class ol extends xa {
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
        might: Bi(8),
        speed: Bi(8),
        intellect: Bi(8)
      }),
      recovery: new d.SchemaField({
        bonus: E(),
        used: new d.SchemaField({
          oneAction: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenMinutes: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          oneHour: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenHours: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
        }),
        slots: new d.ArrayField(il(), {
          required: !0,
          nullable: !1,
          initial: at()
        }),
        customized: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        rollModifier: E(0, -20),
        history: new d.ArrayField(tl(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      rest: new d.SchemaField({
        lastType: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        history: new d.ArrayField(nl(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] })
      }),
      cypherLimitBase: E(2),
      build: new d.SchemaField({
        descriptorIds: Q(),
        typeIds: Q(),
        speciesIds: Q()
      }),
      focusProgress: new d.ArrayField(
        new d.SchemaField({
          focusUuid: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
          ownedNodeIds: Q(),
          acquisitions: new d.ArrayField(el(), {
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
          choices: [...Us]
        }),
        attachedAt: E()
      }),
      appearance: new d.SchemaField({
        backgroundMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "theme",
          choices: [...Xa]
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
        hideFocusInSentence: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        powerShiftsEnabled: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
      }),
      powerShifts: new d.ArrayField(new d.SchemaField({
        id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        category: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        shifts: E(1, 1),
        specification: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        description: new d.StringField({ required: !0, nullable: !1, initial: "" })
      }), { required: !0, nullable: !1, initial: [] }),
      advancement: new d.SchemaField({
        cycle: E(1, 1),
        purchases: new d.ArrayField(Js(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        initializedFocusUuids: Q(),
        pendingFocusChoices: new d.ArrayField(Qs(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        pendingGenreChoices: new d.ArrayField(Zs(), {
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
        weaponCategories: Q(["light"]),
        weaponFamilies: Q(),
        armorCategories: Q(),
        freelyUse: Q()
      }),
      derived: new d.SchemaField(
        {
          tier: new d.SchemaField({
            calculated: E(1, 1),
            value: E(1, 1)
          }),
          pools: new d.SchemaField({
            might: ji(),
            speed: ji(),
            intellect: ji()
          }),
          effort: new d.SchemaField({
            calculatedMax: E(),
            max: E(),
            contributions: fe()
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
              minor: fe(),
              moderate: fe(),
              major: fe()
            }),
            hindrance: E(),
            hindranceContributions: fe(),
            dead: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
          }),
          recovery: new d.SchemaField({
            formula: new d.StringField({ required: !0, nullable: !1, initial: "1d6 + Tier" }),
            calculatedFormula: new d.StringField({ required: !0, nullable: !1, initial: "1d6 + Tier" }),
            calculatedBonus: E(0, -20),
            manualModifier: E(0, -20),
            bonus: E(),
            bonusContributions: fe(),
            availableTypes: new d.ArrayField(
              new d.StringField({ required: !0, nullable: !1, choices: [...Ae] }),
              { required: !0, nullable: !1, initial: [] }
            )
          }),
          cypherLimit: new d.SchemaField({ max: E(), contributions: fe() }),
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
              blockContributions: fe(),
              dodgeContributions: fe(),
              speedTaskContributions: fe()
            })
          }),
          packages: new d.SchemaField({
            weaponCategories: Q(),
            weaponFamilies: Q(),
            armorCategories: Q(),
            genre: new d.StringField({ required: !0, nullable: !1, initial: "none" }),
            genreUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
            totalEffortCapMode: new d.StringField({
              required: !0,
              nullable: !1,
              initial: "core",
              choices: ["core", "unlimited"]
            }),
            typeNames: Q(),
            descriptorNames: Q(),
            speciesNames: Q(),
            characterSentence: new d.StringField({ required: !0, nullable: !1, initial: "" })
          })
        },
        { required: !0, nullable: !1, persisted: !1 }
      )
    };
  }
  static migrateData(e, t = {}) {
    return Ns(super.migrateData(e), t);
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = [...this.parent.items ?? []], t = e.filter((l) => l.type === "armor").map((l) => ({
      id: l.id,
      type: l.type,
      system: l.system
    })), i = this.proficiencies, o = qs(
      e.filter((l) => l.type === "characterType" || l.type === "descriptor" || l.type === "species"),
      i.weaponCategories,
      i.armorCategories,
      [],
      se(i.weaponFamilies)
    ), a = Bs(this.genre, (l) => typeof fromUuidSync != "function" ? null : fromUuidSync(l)), r = {
      armorCategories: o.armorCategories,
      freelyUse: i.freelyUse
    }, s = Rs(
      this.stats,
      this.wounds,
      this.recovery.used,
      o.extensions,
      t,
      r,
      this.recovery.bonus,
      {
        weaponCategories: [...o.weaponCategories],
        weaponFamilies: [...o.weaponFamilies],
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
class al extends xa {
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
const rl = ["none", "fantasy", "scienceFiction", "superhero", "custom"], sl = ["primary", "additional", "speciesGranted", "custom"], nr = ["none", "fixed", "choice"], ll = ["type", "descriptor", "focus", "genre", "species", "other"], cl = ["active", "retained"], dl = ["fixed", "catalog"], ul = ["none", "descriptor"];
function At() {
  return new d.SchemaField({
    name: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    img: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    system: new d.ObjectField({ required: !0, nullable: !1, initial: {} })
  });
}
function or() {
  return new d.SchemaField({
    kind: new d.StringField({ required: !0, nullable: !1, initial: "other", choices: [...ll] }),
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    grantId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    status: new d.StringField({ required: !0, nullable: !1, initial: "active", choices: [...cl] }),
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
function ar() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    itemUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: At()
  });
}
function Wi() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    optionIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
  });
}
function ml() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    pools: new d.ArrayField(
      new d.StringField({ required: !0, nullable: !1, blank: !1, choices: [...V] }),
      { required: !0, nullable: !1, initial: [] }
    )
  });
}
function On() {
  return new d.SchemaField({
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    role: new d.StringField({ required: !0, nullable: !1, initial: "primary", choices: [...sl] }),
    attachedAt: E(),
    selections: new d.SchemaField({
      edgePool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
      superheroicsPool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", ...V] }),
      powerShifts: new d.ArrayField(
        new d.StringField({ required: !0, nullable: !1, initial: "" }),
        { required: !0, nullable: !1, initial: [] }
      ),
      poolChoices: new d.ArrayField(ml(), { required: !0, nullable: !1, initial: [] }),
      skillChoices: new d.ArrayField(Wi(), { required: !0, nullable: !1, initial: [] }),
      abilityChoices: new d.ArrayField(Wi(), { required: !0, nullable: !1, initial: [] }),
      descriptorChoices: new d.ArrayField(Wi(), { required: !0, nullable: !1, initial: [] }),
      suppressedGrantIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
    }),
    parent: or()
  });
}
function pl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    amount: E(1, 1),
    choose: E(1, 1),
    pools: new d.ArrayField(
      new d.StringField({ required: !0, nullable: !1, blank: !1, choices: [...V] }),
      { required: !0, nullable: !1, initial: [] }
    )
  });
}
function Bn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    notes: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: At(),
    alternatives: new d.ArrayField(ar(), { required: !0, nullable: !1, initial: [] })
  });
}
function fl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
    snapshot: At()
  });
}
function Ln() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [...ee] }),
    snapshot: At(),
    alternatives: new d.ArrayField(ar(), { required: !0, nullable: !1, initial: [] })
  });
}
function jn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [...ee] }),
    options: new d.ArrayField(fl(), { required: !0, nullable: !1, initial: [] })
  });
}
function rr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    options: new d.ArrayField(Bn(), { required: !0, nullable: !1, initial: [] })
  });
}
function sr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    descriptorUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: At()
  });
}
function hl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    sourceMode: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "fixed",
      choices: [...dl]
    }),
    catalogItemType: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "none",
      choices: [...ul]
    }),
    options: new d.ArrayField(sr(), { required: !0, nullable: !1, initial: [] })
  });
}
function Ri() {
  return new d.SchemaField({
    light: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    medium: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    heavy: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
  });
}
class me extends foundry.abstract.TypeDataModel {
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
        duration: ks(),
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
      grantedBy: or()
    };
  }
}
const gl = [...V];
function Cn(n, e = "none") {
  return Array.isArray(n) ? V.filter((t) => n.includes(t)) : e === "choose" || e === "any" ? [...V] : V.includes(e) ? [e] : [];
}
function We(n) {
  return Cn(n.system.cost.allowedPools, n.system.pool);
}
function yl(n, e, t) {
  const i = V.filter((o) => n.includes(o));
  return i.length === 0 ? "" : i.length === 1 ? e(i[0]) : i.length === 2 ? `${e(i[0])}${t.pair}${e(i[1])}` : `${e(i[0])}${t.middle}${e(i[1])}${t.final}${e(i[2])}`;
}
function lr(n, e, t, i, o = !1) {
  return !Number.isInteger(n) || n <= 0 || e.length === 0 ? "" : `${n}${o ? "+" : ""} ${yl(e, t, i)}`;
}
class bl extends me {
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
        choices: [...Ta]
      }),
      // Legacy V1 single-Pool source retained for safe document migration.
      // Runtime and UI use cost.allowedPools as the normalized authority.
      pool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...go]
      }),
      cost: new d.SchemaField({
        amount: E(),
        scalable: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        ignoresEdge: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
        allowedPools: new d.ArrayField(
          new d.StringField({ required: !0, nullable: !1, choices: [...V] }),
          { required: !0, nullable: !1, initial: [] }
        )
      }),
      roll: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...za]
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
        choices: ["none", ...ae]
      }),
      range: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      targetMode: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...Na]
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
        allowedPools: Cn(
          a ? o.allowedPools : void 0,
          i.pool ?? o.pool
        )
      }), i;
    }
    if (i.pool === void 0) {
      const a = String(o.pool ?? "none");
      i.pool = go.includes(a) ? a : "none";
    }
    return i.archived = !!(i.archived ?? !1), i.cost = {
      amount: Number(o.amount ?? 0),
      scalable: !!(o.scalable ?? !1),
      ignoresEdge: !!(o.ignoresEdge ?? !1),
      allowedPools: Cn(
        o.allowedPools,
        i.pool ?? o.pool
      )
    }, i.roll === void 0 && (i.roll = "none"), i.targetMode === void 0 && (i.targetMode = "none"), i;
  }
}
const et = Object.freeze({
  minor: 3,
  moderate: 2,
  major: 1
});
class wl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: Yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      woundCapacities: new d.SchemaField({
        minor: E(et.minor),
        moderate: E(et.moderate),
        major: E(et.major)
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(wt(), { required: !0, nullable: !1, initial: [] })
      }),
      derived: new d.SchemaField({
        capacities: new d.SchemaField({
          minor: E(et.minor),
          moderate: E(et.moderate),
          major: E(et.major)
        }),
        broken: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
      }, { required: !0, nullable: !1, persisted: !1 })
    };
  }
  prepareDerivedData() {
    super.prepareDerivedData(), Object.assign(this.derived.capacities, this.woundCapacities), this.derived.broken = this.wounds.major.length >= this.derived.capacities.major;
  }
}
class vl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "light",
        choices: [...Ue]
      }),
      // Legacy compatibility only. Effective Armor familiarity is derived from the Character.
      freelyUsed: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: Yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
}
class Cl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: new d.StringField({ required: !0, nullable: !1, initial: "1", blank: !1 }),
      identified: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
      depletion: Yi("1d6"),
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
class El extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...nr] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: Ri(),
      weaponFamilies: new d.ArrayField(
        new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        { required: !0, nullable: !1, initial: [] }
      ),
      armorUse: Ri(),
      superhero: new d.SchemaField({
        rank: new d.NumberField({ required: !0, nullable: !1, integer: !0, min: 0, max: 5, initial: 0 }),
        powerShiftCount: new d.NumberField({ required: !0, nullable: !1, integer: !0, min: 0, max: 10, initial: 0 }),
        superheroics: new d.SchemaField({
          enabled: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          poolBonus: E()
        })
      }),
      abilityGrants: new d.ArrayField(Bn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(rr(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Ln(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(jn(), { required: !0, nullable: !1, initial: [] }),
      genre: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...rl] }),
      customGenreId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      backgroundOptions: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentBundleUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      instance: On()
    };
  }
  static migrateData(e, t = {}) {
    const i = Fi(e.weaponFamilyUse), o = super.migrateData(e, t);
    return (!t.partial || Object.hasOwn(e, "weaponFamilies") || i.length > 0) && (o.weaponFamilies = se([
      ...Array.isArray(e.weaponFamilies) ? e.weaponFamilies : [],
      ...i
    ])), delete o.weaponFamilyUse, o;
  }
}
class Rl extends me {
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
        choices: [...Nn]
      }),
      form: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      power: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "low",
        choices: [...Mn]
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
class Pl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      poolBonusChoiceGroups: new d.ArrayField(pl(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Ln(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(jn(), { required: !0, nullable: !1, initial: [] }),
      instance: On()
    };
  }
}
class Sl extends me {
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
function kl() {
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
function Al() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    from: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    to: new d.StringField({ required: !0, nullable: !1, blank: !1 })
  });
}
class Hl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      graph: new d.SchemaField({
        version: E(1, 1),
        nodes: new d.ArrayField(kl(), { required: !0, nullable: !1, initial: [] }),
        connections: new d.ArrayField(Al(), {
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
const nt = 1, Bt = 6;
class Wn extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreCatalogError";
  }
  code;
}
function cr(n) {
  const e = Number(n);
  if (!Number.isInteger(e) || e < nt || e > Bt)
    throw new Wn(
      "invalid-minimum-tier",
      `Genre Ability Minimum Tier must be an integer from ${nt} to ${Bt}.`
    );
  return e;
}
function $l(n, e, t) {
  const i = cr(t);
  let o = !1;
  const a = n.map((r) => r.id !== e ? r : (o = !0, { ...r, minimumTier: i }));
  if (!o) throw new Wn("entry-missing", "Genre Ability catalog entry not found.");
  return a;
}
function Il(n, e, t) {
  let i = !1;
  const o = n.map((a) => a.id !== e ? a : (i = !0, { ...a, snapshot: t }));
  if (!i) throw new Wn("entry-missing", "Genre Ability catalog entry not found.");
  return o;
}
function Vl(n, e) {
  return n.filter((t) => t.id !== e);
}
function Yl() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    minimumTier: new d.NumberField({
      required: !0,
      nullable: !1,
      integer: !0,
      min: nt,
      max: Bt,
      initial: nt
    }),
    catalog: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "progression",
      choices: [...Gs]
    }),
    minimumSuperheroRank: new d.NumberField({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 0,
      max: 5,
      initial: 0
    }),
    snapshot: At()
  });
}
class Fl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      abilityCatalog: new d.ArrayField(Yl(), {
        required: !0,
        nullable: !1,
        initial: []
      }),
      options: new d.SchemaField({
        totalEffortCapMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "core",
          choices: [...xs]
        })
      }),
      legacyKey: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
class Dl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [...ee]
      }),
      defaultPool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "choose",
        choices: [...Ya]
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
class Tl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...nr] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: Ri(),
      weaponFamilies: new d.ArrayField(
        new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        { required: !0, nullable: !1, initial: [] }
      ),
      armorUse: Ri(),
      cypherLimitBonus: E(),
      skillGrants: new d.ArrayField(Ln(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(jn(), { required: !0, nullable: !1, initial: [] }),
      abilityGrants: new d.ArrayField(Bn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(rr(), { required: !0, nullable: !1, initial: [] }),
      descriptorGrants: new d.ArrayField(sr(), { required: !0, nullable: !1, initial: [] }),
      descriptorChoiceGroups: new d.ArrayField(hl(), { required: !0, nullable: !1, initial: [] }),
      instance: On()
    };
  }
  static migrateData(e, t = {}) {
    const i = Fi(e.weaponFamilyUse), o = super.migrateData(e, t);
    return (!t.partial || Object.hasOwn(e, "weaponFamilies") || i.length > 0) && (o.weaponFamilies = se([
      ...Array.isArray(e.weaponFamilies) ? e.weaponFamilies : [],
      ...i
    ])), delete o.weaponFamilyUse, o;
  }
}
class zl extends me {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "medium",
        choices: [...xe]
      }),
      family: new d.StringField({ required: !0, nullable: !1, blank: !0, initial: "" }),
      attackType: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "melee",
        choices: [...Fa]
      }),
      rangeCategory: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "immediate",
        choices: [...wn]
      }),
      rangeNotes: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      skillLevel: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [...ee]
      }),
      defaultPool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: ["none", ...V]
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
      depletion: Yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t);
    (!t.partial || Object.hasOwn(i, "family")) && (i.family = rt(i.family));
    const o = Object.hasOwn(i, "defaultPool");
    (!t.partial || o) && i.defaultPool !== "none" && !V.includes(i.defaultPool) && (i.defaultPool = "none");
    const a = xe.includes(i.category) ? i.category : "medium", r = { light: 2, medium: 4, heavy: 6 }, s = typeof i.damageOverride == "number" ? i.damageOverride : typeof i.damage == "number" ? i.damage : null;
    if (i.bonusDamage === void 0 && s !== null && (i.bonusDamage = Math.max(0, s - r[a])), i.damageOverride = null, i.rangeCategory === void 0 && typeof i.range == "string") {
      const l = i.range;
      i.rangeCategory = wn.includes(l) ? l : "specified", i.rangeCategory === "specified" && i.rangeNotes === void 0 && (i.rangeNotes = i.range);
    }
    return i;
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = { light: 2, medium: 4, heavy: 6 };
    this.baseDamage = Math.max(0, e[this.category] + this.bonusDamage);
  }
}
function Nl() {
  Object.assign(CONFIG.Actor.dataModels, {
    character: ol,
    npc: al
  }), Object.assign(CONFIG.Item.dataModels, {
    ability: bl,
    skill: Dl,
    weapon: zl,
    armor: vl,
    shield: wl,
    equipment: Sl,
    cypher: Rl,
    artifact: Cl,
    descriptor: Pl,
    characterType: El,
    focus: Hl,
    genre: Fl,
    species: Tl
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
const _ = "systems/cypherv2/assets", Ro = {
  character: `${_}/icons/cypherpc.png`,
  npc: `${_}/icons/cyphernpc.png`
}, Po = {
  ability: `${_}/icons/cypherability.png`,
  armor: `${_}/icons/cypherarmor.png`,
  artifact: `${_}/icons/cypherartefact.png`,
  cypher: `${_}/icons/cyphercypher.png`,
  descriptor: `${_}/icons/cypherdescriptor.png`,
  equipment: `${_}/icons/cypherequipment.png`,
  focus: `${_}/icons/cypherfocus.png`,
  genre: `${_}/icons/cyphergenre.png`,
  shield: `${_}/icons/cyphershield.png`,
  skill: `${_}/icons/cypherskill.png`,
  species: `${_}/icons/cypherspecies.png`,
  characterType: `${_}/icons/cyphertype.png`,
  weapon: `${_}/icons/cypherweapons.png`
}, _n = {
  gamePaused: `${_}/ui/cyphergamepaused.png`,
  lobby: `${_}/cypherlobby.png`,
  turnMarker: `${_}/ui/cypherturnmarker.png`
};
function Ml(n) {
  return n in Ro ? Ro[n] : null;
}
function ql(n) {
  return n in Po ? Po[n] : null;
}
function xl(n) {
  if ("prototypeToken.actorLink" in n) return !0;
  const e = n.prototypeToken;
  return !!(e && typeof e == "object" && "actorLink" in e);
}
function Ul(n, e) {
  return n === "character" && !xl(e);
}
class Gl extends Actor {
  static getDefaultArtwork(e) {
    const t = Ml(String(e.type ?? ""));
    return t ? { img: t, texture: { src: t } } : super.getDefaultArtwork(e);
  }
  async _preCreate(e, t, i) {
    const o = await super._preCreate(e, t, i);
    return o === !1 ? !1 : (Ul(this.type, e) && this.prototypeToken.updateSource({ actorLink: !0 }), o);
  }
  /**
   * Rule actions will be delegated to services in later phases.
   * The document shell intentionally contains no roll or wound logic.
   */
}
function Ol(n) {
  return Object.keys(n).some((e) => e === "system.poolBonuses" || e.startsWith("system.poolBonuses.") || e === "system.poolBonusChoiceGroups" || e.startsWith("system.poolBonusChoiceGroups.") || e === "system.instance.selections.poolChoices" || e.startsWith("system.instance.selections.poolChoices.") || e === "system.instance.selections.superheroicsPool" || e === "system.superhero.superheroics.poolBonus" || e === "system" && typeof n.system == "object" && n.system !== null && ("poolBonuses" in n.system || "poolBonusChoiceGroups" in n.system || "superhero" in n.system || "instance" in n.system && typeof n.system.instance == "object" && n.system.instance !== null && "selections" in n.system.instance && typeof n.system.instance.selections == "object" && n.system.instance.selections !== null && ("poolChoices" in n.system.instance.selections || "superheroicsPool" in n.system.instance.selections)));
}
function Bl(n) {
  if (n["system.equipped"] === !0) return !0;
  const e = n.system;
  return !!(e && typeof e == "object" && e.equipped === !0);
}
class Ll extends Item {
  static getDefaultArtwork(e) {
    const t = ql(String(e.type ?? ""));
    return t ? { img: t } : super.getDefaultArtwork(e);
  }
  async update(e, t = {}) {
    const i = this.actor?.type === "character" ? this.actor : null, o = i && (this.type === "characterType" || this.type === "descriptor" || this.type === "species") && Ol(e), a = o ? Object.fromEntries(V.map((l) => [
      l,
      Number(i.system.derived.pools[l].max)
    ])) : null, r = o ? Object.fromEntries(V.map((l) => [
      l,
      Number(i.system.stats[l].value)
    ])) : null, s = await super.update(e, t);
    if (i && (this.type === "shield" || this.type === "armor") && Bl(e) && t.cypherv2CombatEquipmentSync !== !0 && t.cypherv2ShieldEquipmentSync !== !0)
      for (const l of i.items)
        l.id === this.id || l.type !== this.type || l.system.equipped && await l.update(
          { "system.equipped": !1 },
          { cypherv2CombatEquipmentSync: !0 }
        );
    if (i && a && r) {
      const l = {};
      for (const u of V) {
        const c = Number(i.system.derived.pools[u].max);
        l[`system.stats.${u}.value`] = Ka(r[u], a[u], c);
      }
      await i.update(l, { cypherv2PackagePoolSync: !0 });
    }
    return s;
  }
}
function jl() {
  CONFIG.Actor.documentClass = Gl, CONFIG.Item.documentClass = Ll;
}
const st = 1, Kt = 20, Kn = 1;
function Ht(n) {
  const e = Number(n);
  return Number.isFinite(e) ? Math.min(
    Kt,
    Math.max(st, Math.trunc(e))
  ) : Kn;
}
function Wl(n) {
  return Number.isInteger(n) && Number(n) >= st && Number(n) <= Kt;
}
function dr(n) {
  const e = Ht(n);
  return e === 1 ? "neutral" : e <= 3 ? "low" : e <= 5 ? "elevated" : e <= 8 ? "severe" : e <= 12 ? "extreme" : e <= 16 ? "catastrophic" : "maximum";
}
function ur(n) {
  return (Ht(n) - st) / (Kt - st) * 100;
}
const U = {
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
function _l(n) {
  game.settings.register(I, U.difficultyVisibility, {
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
  }), game.settings.register(I, U.showGmRollAudit, {
    name: "CYPHERV2.Settings.ShowGmRollAudit.Name",
    hint: "CYPHERV2.Settings.ShowGmRollAudit.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(I, U.defaultDifficultyCeiling, {
    name: "CYPHERV2.Settings.DifficultyCeiling.Name",
    hint: "CYPHERV2.Settings.DifficultyCeiling.Hint",
    scope: "world",
    config: !0,
    type: Number,
    default: 10,
    range: { min: 0, max: 15, step: 1 }
  }), game.settings.register(I, U.interfaceHiddenDifficulty, {
    name: "CYPHERV2.Settings.HiddenDifficulty.Name",
    hint: "CYPHERV2.Settings.HiddenDifficulty.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !0
  }), game.settings.register(I, U.enabledRuleModules, {
    scope: "world",
    config: !1,
    type: Array,
    default: []
  }), game.settings.register(I, U.debugRules, {
    name: "CYPHERV2.Settings.DebugRules.Name",
    hint: "CYPHERV2.Settings.DebugRules.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(I, U.worldSchemaVersion, {
    scope: "world",
    config: !1,
    type: Number,
    default: 1
  }), game.settings.register(I, U.theme, {
    name: "CYPHERV2.Settings.Theme.Name",
    hint: "CYPHERV2.Settings.Theme.Hint",
    scope: "world",
    config: !0,
    type: String,
    choices: n.choices(),
    default: "core",
    onChange: (e) => n.apply(e)
  }), game.settings.register(I, U.horrorIntrusionRange, {
    name: "CYPHERV2.Horror.SettingName",
    hint: "CYPHERV2.Horror.SettingHint",
    scope: "world",
    config: !1,
    type: Number,
    default: Kn,
    range: {
      min: st,
      max: Kt,
      step: 1
    },
    onChange: (e) => Hooks.callAll(
      "cypherv2HorrorIntrusionRangeChanged",
      Ht(e)
    )
  }), game.settings.register(I, U.pendingIntrusionXP, {
    scope: "world",
    config: !1,
    type: Array,
    default: [],
    onChange: (e) => Hooks.callAll("cypherv2IntrusionPendingChanged", e)
  });
}
function Me() {
  const n = ot();
  return {
    base: {
      difficultyCeiling: Number(
        game.settings.get(I, U.defaultDifficultyCeiling)
      ),
      assetLimit: 0
    },
    enabledRuleModuleIds: n
  };
}
function ot() {
  const n = game.settings.get(I, U.enabledRuleModules);
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
function Di() {
  const n = game.settings.get(I, U.difficultyVisibility);
  return n === "resultOnly" || n === "rollOnly" ? n : "full";
}
function mr() {
  return game.settings.get(I, U.interfaceHiddenDifficulty) === !0;
}
function Ti() {
  return game.settings.get(I, U.showGmRollAudit) === !0;
}
function En() {
  return typeof game > "u" ? Kn : Ht(
    game.settings.get(I, U.horrorIntrusionRange)
  );
}
async function Kl(n) {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  if (!Wl(n))
    throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.InvalidRange"));
  return await game.settings.set(I, U.horrorIntrusionRange, n), n;
}
const Xn = {
  tag: "form",
  form: {
    closeOnSubmit: !1,
    submitOnChange: !0
  }
};
function Jn(n) {
  return n.system.schema.fields;
}
function Qn(n, e) {
  return Object.fromEntries(Object.entries(n).map(([t, i]) => [
    t,
    e.has(t) ? function(...a) {
      if (this.isEditable)
        return i.apply(this, a);
    } : i
  ]));
}
function Zn(n, e, t) {
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
const Xl = Object.freeze({ minor: 2, moderate: 5 }), pr = 10;
class Jl {
  #e;
  constructor(e) {
    this.#e = e;
  }
  costFor(e) {
    return Xl[e];
  }
  canApply(e) {
    try {
      Ne(e);
    } catch {
      return !1;
    }
    const { wounds: t, stats: i } = e.system;
    return this.rally(t, i.might.value, "minor").success || this.rally(t, i.might.value, "moderate").success;
  }
  preview(e, t, i = this.costFor(t)) {
    try {
      Ne(e);
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
    if (!Number.isInteger(r) || r < 0 || r > pr)
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
    Ne(e);
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
function fr(n) {
  return n === "one-action" ? ["normal", "lastAction", "nonRest"] : ["normal", "nonRest"];
}
function Ql(n, e) {
  if (!fr(n).includes(e))
    throw new Error(`Recovery mode '${e}' is not available for '${n}'.`);
  return e === "nonRest" ? { kind: "nonRest", lastAction: !1 } : { kind: "normal", lastAction: e === "lastAction" };
}
function qt(n, e) {
  return Number(n[e] ?? 0);
}
function qe(n, e) {
  return String(n[e] ?? "");
}
function So(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function _e(n) {
  const e = n instanceof Error ? n.message : String(n);
  ui.notifications.error(e);
}
async function eo(n, e, t = game.i18n.localize("CYPHERV2.Actions.Apply")) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: e,
    rejectClose: !1,
    ok: { label: t }
  });
}
function Pi(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function Zl(n, e, t) {
  const i = n.system.wounds[e].find((a) => a.id === t);
  if (!i) {
    _e(new Error(`Wound '${t}' was not found in ${e} Wounds.`));
    return;
  }
  const o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text" value="${Pi(i.label)}">
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}
        <textarea name="description">${Pi(i.description)}</textarea>
      </label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (o)
    try {
      await game.cypherv2.services.wounds.edit(n, e, t, {
        label: qe(o, "label"),
        description: qe(o, "description")
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Updated"));
    } catch (a) {
      _e(a);
    }
}
async function ec(n, e, t) {
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
      _e(o);
    }
}
async function tc(n) {
  const e = await eo(
    game.i18n.localize("CYPHERV2.Actions.ApplyWound"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}
        <select name="severity">
          ${ae.map((t) => `<option value="${t}">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${t}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text">
      </label>
    </div>`
  );
  if (e)
    try {
      const t = qe(e, "label"), i = await game.cypherv2.services.wounds.apply(
        n,
        qe(e, "severity"),
        t ? { label: t } : {}
      ), o = i.applied ? `${i.appliedSeverity}${i.dead ? ` — ${game.i18n.localize("CYPHERV2.Wounds.Dead")}` : ""}` : game.i18n.localize("CYPHERV2.Wounds.NoFourthMajor");
      ui.notifications.info(o);
    } catch (t) {
      _e(t);
    }
}
async function ic(n) {
  const e = await eo(
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
        qe(e, "pool"),
        qt(e, "damage")
      );
      ui.notifications.info(
        t.overflowSeverity ? `${t.pool}: ${t.value}; ${t.overflowSeverity} Wound` : `${t.pool}: ${t.value}`
      );
    } catch (t) {
      _e(t);
    }
}
async function ko(n, e, t) {
  const i = n.system.recovery.slots?.length ? n.system.recovery.slots : at(n.system.recovery.used), o = Mt(i);
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
    if (r = qe(u, "slotId"), a = o.find((c) => c.id === r)?.type, !a || !r) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
      return;
    }
  }
  const s = fr(a), l = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${game.i18n.localize(`CYPHERV2.Recovery.${a}`)}` },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
      <header class="cypherv2-dialog-heading">
        <span>${game.i18n.localize("CYPHERV2.Actions.Recovery")}</span>
        <strong>${game.i18n.localize(`CYPHERV2.Recovery.${a}`)}</strong>
      </header>
      <section class="cypherv2-dialog-section cypherv2-recovery-formula">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Roll")}</span>
        <strong class="cypherv2-dialog-value">${Pi(n.system.derived.recovery.formula)}</strong>
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
      const u = Ql(a, qe(l, "mode"));
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
          <label><input name="majorSuccess" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.MajorTaskSuccess")}</label>` : a === "10-minutes" ? `<p>${game.i18n.localize("CYPHERV2.Recovery.TenMinuteBenefit")}</p>` : "", h = await eo(
        `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${c.total}`,
        `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog cypherv2-recovery-allocation-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Result")}</span>
          <div class="cypherv2-dialog-summary-row"><span>${Pi(n.system.derived.recovery.formula)}</span><strong>${c.total}</strong></div>
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
      if (!h) return;
      const m = await game.cypherv2.services.recovery.completeNormal(
        n,
        c,
        {
          might: qt(h, "might"),
          speed: qt(h, "speed"),
          intellect: qt(h, "intellect")
        },
        {
          oneHourChoice: qe(h, "oneHourChoice"),
          removeMinorsInsteadOfOneModerate: So(h, "exchange"),
          majorTaskSucceeded: So(h, "majorSuccess")
        }
      ), y = c.total - m.recovery.unspent, f = m.rest?.result.removed.length ?? 0;
      ui.notifications.info(
        `${game.i18n.localize("CYPHERV2.Recovery.Restored")}: ${y}; ${game.i18n.localize("CYPHERV2.Rest.Removed")}: ${f}`
      );
    } catch (u) {
      _e(u);
    }
}
async function nc(n) {
  const e = game.cypherv2.services.rally, t = n.system.stats.might.value, i = n.system.derived.pools.might.max, o = e.costFor("minor"), a = e.costFor("moderate"), r = e.preview(n, "minor", o), s = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Actions.Rally") },
    content: oc(
      t,
      i,
      o,
      a,
      r.success ? r.mightValue : null
    ),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Rally") },
    render: (l, u) => ac(u.element, n)
  });
  if (s)
    try {
      const l = await game.cypherv2.services.rally.apply(
        n,
        qe(s, "severity"),
        void 0,
        qt(s, "cost")
      );
      if (!l.success) throw new Error(l.failure ?? "Rally failed.");
      ui.notifications.info(`${game.i18n.localize("CYPHERV2.Actions.Rally")}: -${l.cost} Might`);
    } catch (l) {
      _e(l);
    }
}
function oc(n, e, t = 2, i = 5, o = null) {
  const a = game.i18n.localize("CYPHERV2.Wounds.Severity.minor"), r = game.i18n.localize("CYPHERV2.Wounds.Severity.moderate");
  return `<div class="cypherv2 cypherv2-dialog cypherv2-rally-dialog" data-current-might="${n}" data-max-might="${e}">
    <header class="cypherv2-dialog-heading"><span>${game.i18n.localize("CYPHERV2.Actions.Rally")}</span><strong data-rally-heading>${a}</strong></header>
    <section class="cypherv2-dialog-section">
      <div class="cypherv2-dialog-button-group" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}">
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="minor" data-default-cost="${t}" checked><span>${a}</span></label>
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="moderate" data-default-cost="${i}"><span>${r}</span></label>
      </div>
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Rally.Cost")}
        <input name="cost" type="number" min="0" max="${pr}" step="1" value="${t}">
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
function ac(n, e) {
  const t = n.querySelector('input[name="cost"]'), i = [...n.querySelectorAll('input[name="severity"]')], o = n.querySelector("[data-rally-cost]"), a = n.querySelector("[data-rally-after]"), r = n.querySelector("[data-rally-heading]"), s = n.querySelector("[data-rally-error]"), l = n.querySelector('button[data-action="ok"]');
  if (!t) return;
  const u = () => {
    const c = Number(t.value), p = i.find((m) => m.checked)?.value, h = p ? game.cypherv2.services.rally.preview(e, p, c) : null;
    o && (o.textContent = Number.isInteger(c) ? String(c) : "—"), a && (a.textContent = h?.success ? String(h.mightValue) : "—"), s && (s.hidden = h?.success === !0, s.textContent = game.i18n.localize(h?.failure === "insufficient-might" ? "CYPHERV2.Rally.InsufficientMight" : h?.failure === "invalid-cost" ? "CYPHERV2.Rally.InvalidCost" : "CYPHERV2.Rally.NoWound")), l && (l.disabled = h?.success !== !0);
  };
  for (const c of i) c.addEventListener("change", () => {
    c.checked && (t.value = String(Number(c.dataset.defaultCost ?? 0)), r && (r.textContent = c.nextElementSibling?.textContent ?? c.value), u());
  });
  t.addEventListener("input", u), u();
}
async function rc(n, e) {
  const t = vn(n.system, e), i = await foundry.applications.api.DialogV2.input({
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
    _e(new Error(game.i18n.localize("CYPHERV2.Overrides.Invalid")));
    return;
  }
  await n.update({ [t.path]: o });
}
function Ao(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function wi(n, e) {
  const t = Number(n);
  if (!Number.isInteger(t)) throw new Error(`${e} must be a whole number.`);
  return t;
}
function hr(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
function sc(n, e) {
  for (const t of ae) {
    if (!Number.isInteger(e[t])) throw new Error(`${t} modifier must be a whole number.`);
    if (n[t] + e[t] < 1)
      throw new Error(`${t} Wound capacity must remain at least 1.`);
  }
  return { ...e };
}
async function lc(n) {
  const e = n.system.derived.wounds.calculatedCapacities, t = n.system.overrides.wounds ?? { minor: 0, moderate: 0, major: 0 }, i = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Overrides.WoundsEdit") },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-wound-override-dialog">
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.WoundModifiers")}</span>
        <div class="cypherv2-dialog-field-grid">
          ${ae.map((o) => `<label class="cypherv2-dialog-field">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${o}`)}
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
      const o = sc(e, {
        minor: wi(i.minor, "Minor"),
        moderate: wi(i.moderate, "Moderate"),
        major: wi(i.major, "Major")
      });
      await n.update({ "system.overrides.wounds": o });
    } catch (o) {
      hr(o);
    }
}
function cc(n) {
  return Ae.map((e) => `<option value="${e}"${e === n ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Recovery.${e}`)}</option>`).join("");
}
function gr(n) {
  return `<div class="recovery-override-slot" data-recovery-slot-id="${Ao(n.id)}">
    <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
    <select name="slotType__${Ao(n.id)}" aria-label="${game.i18n.localize("CYPHERV2.Overrides.RecoverySlotType")}">${cc(n.type)}</select>
    <span class="recovery-slot-state">${n.used ? game.i18n.localize("CYPHERV2.Overrides.Used") : game.i18n.localize("CYPHERV2.Overrides.Available")}</span>
    <span class="character-settings-row-actions">
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="up" title="${game.i18n.localize("CYPHERV2.Actions.MoveUp")}"><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="down" title="${game.i18n.localize("CYPHERV2.Actions.MoveDown")}"><i class="fa-solid fa-arrow-down"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-remove title="${game.i18n.localize("CYPHERV2.Actions.Remove")}"><i class="fa-solid fa-trash"></i></button>
    </span>
  </div>`;
}
function dc(n, e) {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-override-dialog">
    <section class="cypherv2-dialog-section">
      <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.RecoveryTrack")}</span>
      <input type="hidden" name="slotOrder" value="${n.map((t) => t.id).join(",")}">
      <div class="recovery-override-slots">${n.map(gr).join("")}</div>
      <button type="button" class="compact-inline-action recovery-slot-add" data-recovery-slot-add><i class="fa-solid fa-plus"></i> ${game.i18n.localize("CYPHERV2.Overrides.AddRecoverySlot")}</button>
    </section>
    <section class="cypherv2-dialog-section">
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Overrides.RecoveryRollModifier")}
        <input name="rollModifier" type="number" min="-20" max="20" step="1" value="${e}">
      </label>
    </section>
  </div>`;
}
function _i(n) {
  const e = [...n.querySelectorAll("[data-recovery-slot-id]")], t = n.querySelector('input[name="slotOrder"]');
  t && (t.value = e.map((i) => i.dataset.recoverySlotId ?? "").filter(Boolean).join(","));
  for (const [i, o] of e.entries()) {
    const a = o.querySelector('[data-recovery-slot-move="up"]'), r = o.querySelector('[data-recovery-slot-move="down"]'), s = o.querySelector("[data-recovery-slot-remove]");
    a && (a.disabled = i === 0), r && (r.disabled = i === e.length - 1), s && (s.disabled = e.length <= 1);
  }
}
function uc(n) {
  _i(n), n.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target.closest("button") : null;
    if (!t) return;
    const i = t.closest("[data-recovery-slot-id]"), o = n.querySelector(".recovery-override-slots");
    if (t.hasAttribute("data-recovery-slot-add") && o) {
      const a = { id: Oe(), type: "one-action", used: !1 };
      o.insertAdjacentHTML("beforeend", gr(a)), _i(n);
      return;
    }
    !i || !o || (t.hasAttribute("data-recovery-slot-remove") && i.remove(), t.dataset.recoverySlotMove === "up" && i.previousElementSibling && o.insertBefore(i, i.previousElementSibling), t.dataset.recoverySlotMove === "down" && i.nextElementSibling && o.insertBefore(i.nextElementSibling, i), _i(n));
  });
}
function mc(n, e) {
  const t = String(n.slotOrder ?? "").split(",").filter(Boolean);
  if (t.length === 0 || new Set(t).size !== t.length) throw new Error("Recovery track must contain unique slots.");
  const i = new Map(e.map((r) => [r.id, r])), o = t.map((r) => {
    const s = String(n[`slotType__${r}`] ?? "");
    if (!Ae.includes(s)) throw new Error(`Invalid Recovery type '${s}'.`);
    return { id: r, type: s, used: i.get(r)?.used ?? !1 };
  }), a = wi(n.rollModifier, "Recovery roll modifier");
  if (a < -20 || a > 20) throw new Error("Recovery roll modifier must be between -20 and 20.");
  return { slots: o, rollModifier: a };
}
async function pc(n) {
  const e = n.system.recovery.slots, t = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Overrides.RecoveryEdit") },
    content: dc(e, n.system.recovery.rollModifier),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") },
    render: (i, o) => uc(o.element)
  });
  if (t)
    try {
      const i = mc(t, e);
      await n.update({
        "system.recovery.slots": i.slots,
        "system.recovery.used": Ct(i.slots),
        "system.recovery.customized": !0,
        "system.recovery.rollModifier": i.rollModifier
      });
    } catch (i) {
      hr(i);
    }
}
async function fc(n) {
  await n.update({ "system.overrides.wounds": { minor: 0, moderate: 0, major: 0 } });
}
async function hc(n) {
  const e = Es(n.system.recovery.slots);
  await n.update({
    "system.recovery.slots": e,
    "system.recovery.used": Ct(e),
    "system.recovery.customized": !1,
    "system.recovery.rollModifier": 0
  });
}
function gc(n) {
  const e = n?.token?.texture?.src;
  if (typeof e == "string" && e.trim()) return e;
  const t = n?.img;
  return typeof t == "string" ? t.trim() : "";
}
function Se(n) {
  const e = gc(n), t = n?.system && typeof n.system == "object" ? n.system : null, i = t?.appearance && typeof t.appearance == "object" ? t.appearance : null, o = typeof i?.color == "string" ? i.color : "", a = tr(o), r = er(o), s = [
    ...a ? [`--cypherv2-chat-accent: ${a}`] : [],
    ...r ? [`--cypherv2-chat-tint: ${r}`] : []
  ].join("; ");
  return {
    ...e ? { actorImage: e } : {},
    ...s ? { chatCardStyle: s } : {}
  };
}
function yc(n, e = []) {
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
function bc(n) {
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
function Ki(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return e.kind === "gm-intrusion" && typeof e.intrusionId == "string" && typeof e.sourceActorId == "string" && (e.mode === "targeted" || e.mode === "group" || e.mode === "free") && (e.status === "pending" || e.status === "resolving" || e.status === "resolved") && Array.isArray(e.recipients);
}
class wc {
  async publish(e, t, i = []) {
    const o = yc(e, i), a = await this.render(o, t);
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
        ...bc(e),
        ...Se(t)
      }
    );
  }
}
const Vt = "system." + I;
function Lt() {
  return [...game.users];
}
function yr() {
  return Lt().filter((n) => n.active);
}
function ri() {
  return [...game.actors].filter((n) => n.type === "character").map((n) => n);
}
function Ve(n) {
  const e = game.actors.get(n);
  return e?.type === "character" ? e : null;
}
function Xi() {
  return yr().filter((n) => n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function Yt(n, e) {
  return Lt().filter((t) => !t.isGM && (!e || t.active)).filter((t) => n.testUserPermission(t, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).sort((t, i) => t.id.localeCompare(i.id));
}
function Ji(n) {
  const e = n.filter((t) => !t.isGM).sort((t, i) => t.id.localeCompare(i.id));
  return e.find((t) => t.active) ?? e[0] ?? null;
}
function si(n, e) {
  const t = new Set(Lt().filter((o) => !o.isGM).map((o) => o.character?.id).filter((o) => typeof o == "string" && o.length > 0));
  return [...new Map(n.filter((o) => o.type === "character").map((o) => [o.id, o])).values()].filter((o) => o.id !== e).filter((o) => t.has(o.id)).map((o) => ({ actorId: o.id, actorName: o.name, actorImage: o.img ?? "" })).sort((o, a) => o.actorName.localeCompare(a.actorName));
}
function Ho(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && typeof e.messageId == "string" && e.messageId.length > 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function vc(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && e.messageId === void 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function Cc(n, e) {
  return JSON.stringify(n) === JSON.stringify(e);
}
class Ec {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Map();
  #o = !1;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(Vt, (e) => {
      this.#d(e).catch((t) => {
        console.error(I + " | GM Intrusion socket error", t), game.user.isGM && ui.notifications.error(t instanceof Error ? t.message : String(t));
      });
    }), Hooks.on("renderChatMessageHTML", (e, t) => {
      this.#l(e, t);
    }), Hooks.on("updateUser", () => {
      this.#u() && this.retryPendingDistributions();
    }), Hooks.on("createActor", () => {
      this.#u() && this.retryPendingDistributions();
    }), Hooks.on("deleteActor", () => {
      this.#u() && setTimeout(() => {
        this.#g();
      }, 0);
    }), Hooks.on("updateActor", () => {
      this.#u() && this.retryPendingDistributions();
    }), Hooks.on("cypherv2IntrusionPendingChanged", () => {
      this.#u() && this.retryPendingDistributions();
    }), this.#u() && setTimeout(() => {
      this.#g().then(() => this.retryPendingDistributions());
    }, 1e3);
  }
  async createManual(e) {
    if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.GMOnly"));
    if (this.#o) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyCreating"));
    this.#o = !0;
    try {
      const t = e.actorIds.map(Ve).filter((r) => r !== null), i = Me();
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
        const r = Ji(Yt(a, !1)), s = si(ri(), a.id), l = await this.#t.publish(o, a, s), u = {
          intrusionId: o.id,
          messageId: l.id,
          sourceActorId: a.id,
          amount: o.sharedXp,
          ...r ? { responderUserId: r.id } : {}
        };
        await this.#f(u), await this.#c(u, !0);
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
      if (this.#u()) {
        await this.#r(e.id, t.naturalRoll);
        return;
      }
      if (!Xi()) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoActiveGM"));
        return;
      }
      game.socket.emit(Vt, { type: "create-free", actorId: e.id, naturalRoll: t.naturalRoll });
    }
  }
  async retryPendingDistributions() {
    if (this.#u())
      for (const e of this.#m()) await this.#c(e);
  }
  async requestDistribution(e, t) {
    const i = this.#w(e), o = Ve(i.sourceActorId);
    if (!o || !this.#a(o, i))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
    if (this.#u()) {
      await this.#s(e, t, game.user.id);
      return;
    }
    if (!Xi()) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NoActiveGM"));
    const a = Oe();
    await new Promise((r, s) => {
      const l = setTimeout(() => {
        this.#n.delete(a), s(new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RequestTimeout")));
      }, 1e4);
      this.#n.set(a, { resolve: r, reject: s, timeout: l }), game.socket.emit(Vt, {
        type: "distribution-choice",
        intrusionId: e,
        recipientActorId: t,
        requesterUserId: game.user.id,
        requestId: a
      });
    });
  }
  async #r(e, t) {
    const i = Ve(e);
    if (!i) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
    const o = Me(), a = await this.#e.createFree(i, t, o.enabledRuleModuleIds ?? []);
    Hooks.callAll("cypherv2GMIntrusionCreated", a);
  }
  #l(e, t) {
    const i = e.getFlag(I, "gmIntrusion");
    if (!Ki(i)) return;
    const o = this.#m().find((s) => s.intrusionId === i.intrusionId), a = o ? Ve(o.sourceActorId) : null, r = i.status === "pending" && (game.user.isGM || !!(o && a && this.#a(a, o)));
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
  #a(e, t) {
    return game.user.isGM ? !0 : game.user.id === t.responderUserId && e.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  }
  async #c(e, t = !1) {
    const i = Ve(e.sourceActorId), o = game.messages.get(e.messageId);
    if (!i || !o) {
      await this.#p(e.intrusionId);
      return;
    }
    let a = e.responderUserId ? Lt().find((l) => l.id === e.responderUserId) ?? null : null;
    (!a || !Yt(i, !1).some((l) => l.id === a?.id)) && (a = Ji(Yt(i, !1)), a && (e = { ...e, responderUserId: a.id }, await this.#f(e)));
    const r = o.getFlag(I, "gmIntrusion");
    if (!Ki(r) || r.status !== "pending") return;
    const s = si(ri(), i.id);
    (t || !Cc(r.recipients, s)) && await this.#t.update(o, { ...r, recipients: s }, i);
  }
  async #s(e, t, i) {
    if (this.#i.has(e))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    this.#i.add(e);
    let o = !1, a = null, r = null, s = null;
    try {
      const l = this.#w(e);
      s = Ve(l.sourceActorId);
      const u = Ve(t);
      if (r = game.messages.get(l.messageId) ?? null, !s || !u || !r)
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
      const c = r.getFlag(I, "gmIntrusion");
      if (!Ki(c) || c.intrusionId !== e || c.status !== "pending")
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
      a = c;
      const p = yr().find((f) => f.id === i);
      if (!(p?.isGM === !0 || !!(p && p.id === l.responderUserId && Yt(s, !0).some((f) => f.id === p.id)))) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
      const y = si(ri(), s.id).find((f) => f.actorId === u.id);
      if (!y) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable"));
      await this.#t.update(r, { ...c, status: "resolving" }, s), await this.#e.distributeSecondXp(s, u, l.amount), o = !0, await this.#p(e), await this.#t.update(r, {
        ...c,
        status: "resolved",
        recipients: [],
        resolvedRecipient: y
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
    if (this.#u()) {
      if (e.type === "create-free") await this.#r(e.actorId, e.naturalRoll);
      else if (e.type === "distribution-choice")
        try {
          await this.#s(e.intrusionId, e.recipientActorId, e.requesterUserId), game.socket.emit(Vt, {
            type: "distribution-result",
            requestId: e.requestId,
            recipientUserId: e.requesterUserId,
            success: !0
          });
        } catch (t) {
          throw game.socket.emit(Vt, {
            type: "distribution-result",
            requestId: e.requestId,
            recipientUserId: e.requesterUserId,
            success: !1,
            error: t instanceof Error ? t.message : String(t)
          }), t;
        }
    }
  }
  #m() {
    const e = game.settings.get(I, U.pendingIntrusionXP);
    return Array.isArray(e) ? e.filter(Ho).map((t) => ({
      intrusionId: t.intrusionId,
      messageId: t.messageId,
      sourceActorId: t.sourceActorId,
      amount: t.amount,
      ...t.responderUserId ? { responderUserId: t.responderUserId } : {}
    })) : [];
  }
  #w(e) {
    const t = this.#m().find((i) => i.intrusionId === e);
    if (!t) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    return t;
  }
  async #f(e) {
    const t = this.#m(), i = t.findIndex((o) => o.intrusionId === e.intrusionId);
    i < 0 ? t.push(e) : t[i] = e, await game.settings.set(I, U.pendingIntrusionXP, t);
  }
  async #p(e) {
    await game.settings.set(
      I,
      U.pendingIntrusionXP,
      this.#m().filter((t) => t.intrusionId !== e)
    );
  }
  async #g() {
    const e = game.settings.get(I, U.pendingIntrusionXP), t = [];
    for (const i of Array.isArray(e) ? e : []) {
      if (Ho(i)) {
        Ve(i.sourceActorId) && game.messages.get(i.messageId) && t.push({
          intrusionId: i.intrusionId,
          messageId: i.messageId,
          sourceActorId: i.sourceActorId,
          amount: i.amount,
          ...i.responderUserId ? { responderUserId: i.responderUserId } : {}
        });
        continue;
      }
      if (!vc(i)) continue;
      const o = Ve(i.sourceActorId), a = [...game.messages].find(
        (u) => u.getFlag(I, "gmIntrusionId") === i.intrusionId
      );
      if (!o || !a) continue;
      const r = i.responderUserId ? Lt().find((u) => u.id === i.responderUserId) : Ji(Yt(o, !1)), s = this.#e.policy(Me().enabledRuleModuleIds ?? []), l = {
        kind: "gm-intrusion",
        intrusionId: i.intrusionId,
        mode: "targeted",
        sourceActorId: o.id,
        sourceActorName: o.name,
        targetXp: s.targetedXpToTarget,
        sharedXp: i.amount,
        status: "pending",
        recipients: si(ri(), o.id)
      };
      await this.#t.update(a, l, o), t.push({
        intrusionId: i.intrusionId,
        messageId: a.id,
        sourceActorId: i.sourceActorId,
        amount: i.amount,
        ...r ? { responderUserId: r.id } : {}
      });
    }
    (!Array.isArray(e) || JSON.stringify(e) !== JSON.stringify(t)) && await game.settings.set(I, U.pendingIntrusionXP, t);
  }
  #u() {
    return game.user.isGM && Xi()?.id === game.user.id;
  }
}
let xt = null;
function Rc(n, e) {
  return xt = new Ec(n, e), xt.initialize(), xt;
}
function Xt() {
  if (!xt) throw new Error("GM Intrusion controller is not ready.");
  return xt;
}
async function to(n, e) {
  await game.cypherv2.services.rollChat.publish(n, e, Di(), {
    showGmAudit: Ti()
  }), await Xt().requestFreeFromNaturalResult(n, e.result);
}
function ke(n, e) {
  if (!Number.isFinite(e)) throw new Error("Step modifier amount must be finite.");
  const t = Math.abs(Math.trunc(e));
  return t === 0 ? "0" : `${n === "ease" ? "+" : "-"}${t}`;
}
function Pc(n) {
  if (!Number.isFinite(n)) throw new Error("Net step modifier must be finite.");
  return n === 0 ? "0" : ke(n > 0 ? "ease" : "hinder", n);
}
const $o = /* @__PURE__ */ new Set([
  "manual.skill",
  "manual.other-ease",
  "manual.other-hindrance",
  "core.assets",
  "core.effort.paid",
  "core.effort.free"
]);
function lt(n) {
  return String(n).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function io(n) {
  return game.i18n.localize(n);
}
function no(n, e) {
  return e(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function Io(n, e) {
  return e.context.difficulty.mode === "hidden" && n.id.startsWith("npc-modification.");
}
function Vo(n, e) {
  return {
    id: n.id,
    label: e(n.label),
    modifier: ke(n.direction, n.steps),
    direction: n.direction
  };
}
function Sc(n, e, t) {
  const i = n.breakdown.filter((c) => Io(c, n)), o = n.breakdown.filter((c) => !Io(c, n)), a = o.filter((c) => $o.has(c.id)).map((c) => Vo(c, t)), r = o.filter((c) => !$o.has(c.id)).map((c) => Vo(c, t)), s = n.context.difficulty.mode === "known", l = n.context.pool;
  if (l === null) throw new Error("Configured rolls require a Pool.");
  const u = e.system.stats[l].value;
  return {
    rollLabel: t(n.context.label),
    pool: l,
    poolLabel: no(l, t),
    modifiers: a,
    automaticModifiers: r,
    netModifier: i.length === 0 ? Pc(n.netSteps) : null,
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
function Yo(n) {
  const e = {};
  for (const t of n.querySelectorAll("[name]"))
    e[t.name] = t instanceof HTMLInputElement && t.type === "checkbox" ? t.checked : t.value;
  return e;
}
function re(n, e) {
  return String(n[e] ?? "");
}
function G(n, e) {
  return Number(n[e] ?? 0);
}
function kc(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function Jt(n, e) {
  const t = re(n, "difficulty").trim();
  return t ? {
    mode: kc(n, "hidden") ? "hidden" : "known",
    value: Number(t)
  } : { mode: "unknown" };
}
function Qt(n) {
  const e = G(n, "situationalSteps");
  return re(n, "situationalDirection") === "hinder" ? { otherEase: 0, otherHindrance: e } : { otherEase: e, otherHindrance: 0 };
}
function ge(n, e = 0) {
  return Array.from({ length: n + 1 }, (t, i) => `<option value="${i}"${i === e ? " selected" : ""}>${i}</option>`).join("");
}
function br(n) {
  return ["might", "speed", "intellect"].map((e) => `<option value="${e}"${e === n ? " selected" : ""}>${lt(no(e, io))}</option>`).join("");
}
const Ac = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function gt(n) {
  return Ac[n];
}
function oo(n = 0, e = "") {
  return ee.map((t) => {
    const i = gt(t), o = game.i18n.localize(`CYPHERV2.Skill.Ranks.${t}`), a = i === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : ke(i > 0 ? "ease" : "hinder", i);
    return `<option value="${e}${i}"${n !== null && i === n ? " selected" : ""}>${lt(o)} · ${a}</option>`;
  }).join("");
}
function Zt() {
  return `<div class="roll-dialog-inline-field roll-dialog-situational">
    <span class="roll-dialog-field-label">${game.i18n.localize("CYPHERV2.Roll.SituationalModifier")}</span>
    <select name="situationalDirection" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierDirection")}">
      <option value="ease">${game.i18n.localize("CYPHERV2.Roll.Ease")}</option>
      <option value="hinder">${game.i18n.localize("CYPHERV2.Roll.Hinder")}</option>
    </select>
    <input name="situationalSteps" type="number" value="0" min="0" max="10" step="1" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierSteps")}">
  </div>`;
}
function ei(n, e) {
  return `<div class="roll-dialog-inline-field roll-dialog-difficulty-field">
    <label>${game.i18n.localize("CYPHERV2.Roll.BaseDifficulty")}
      <input name="difficulty" type="number" min="0" max="${n}" step="1" placeholder="${game.i18n.localize("CYPHERV2.Roll.Optional")}">
    </label>
    ${e ? `<label class="roll-dialog-checkbox"><input name="hidden" type="checkbox"> ${game.i18n.localize("CYPHERV2.Roll.HiddenDifficulty")}</label>` : ""}
  </div>`;
}
function ti(n) {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-dialog-fields cypherv2-roll-dialog">
    <div class="roll-dialog-layout">
      <section class="roll-dialog-settings" aria-labelledby="cypherv2-roll-settings-heading">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-settings-heading">${game.i18n.localize("CYPHERV2.Roll.Settings")}</span>
          <strong>${lt(n.identity)}</strong>
        </header>
        <div class="roll-dialog-settings-grid">${n.settings}</div>
      </section>
      <aside class="roll-dialog-summary" aria-labelledby="cypherv2-roll-summary-heading" aria-live="polite">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-summary-heading">${game.i18n.localize("CYPHERV2.Roll.Summary")}</span>
          <strong data-roll-summary="label">${lt(n.identity)}</strong>
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
function ne(n, e, t = "") {
  return `<div class="roll-summary-row ${t}"><span>${lt(n)}</span><strong>${lt(e)}</strong></div>`;
}
function Fo(n) {
  return n.length === 0 ? `<p class="roll-summary-empty">${game.i18n.localize("CYPHERV2.Common.None")}</p>` : n.map((e) => ne(
    e.label,
    e.modifier,
    e.direction === "ease" ? "is-ease" : "is-hindrance"
  )).join("");
}
function Ke(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.innerHTML = t);
}
function Dt(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.textContent = t);
}
function Hc(n, e, t) {
  Dt(n, "label", e.rollLabel), Dt(n, "pool", e.poolLabel), Ke(n, "modifiers", Fo(e.modifiers)), Dt(n, "net", e.netModifier ?? game.i18n.localize("CYPHERV2.Roll.HiddenValue"));
  const i = n.querySelector('[data-roll-summary-section="automatic"]');
  i && (i.hidden = e.automaticModifiers.length === 0), Ke(n, "automatic", Fo(e.automaticModifiers));
  const o = n.querySelector('[data-roll-summary-section="effort"]');
  o && (o.hidden = e.totalEffortApplied === 0), Ke(n, "effort", [
    ne(
      game.i18n.localize("CYPHERV2.Roll.PaidAppliedEffort"),
      `${e.paidEffortApplied} / ${e.effortMaximum}`
    ),
    ne(game.i18n.localize("CYPHERV2.Roll.FreeAppliedEffort"), String(e.freeEffortApplied)),
    ne(
      game.i18n.localize("CYPHERV2.Roll.TotalAppliedEffort"),
      e.totalEffortMaximum === null ? `${e.totalEffortApplied} / ${game.i18n.localize("CYPHERV2.Genre.Unlimited")}` : `${e.totalEffortApplied} / ${e.totalEffortMaximum}`,
      e.totalEffortMaximum !== null && e.totalEffortApplied === e.totalEffortMaximum ? "is-total" : ""
    )
  ].join(""));
  const a = e.difficultyMode === "hidden" ? ne(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.HiddenValue")) : e.difficultyMode === "unknown" ? ne(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.NotProvided")) : [
    ne(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), String(e.baseDifficulty)),
    ne(
      game.i18n.localize("CYPHERV2.Roll.FinalDifficulty"),
      e.automaticSuccess ? game.i18n.localize("CYPHERV2.Roll.AutomaticSuccess") : String(e.finalDifficulty)
    ),
    ne(game.i18n.localize("CYPHERV2.Roll.TargetNumber"), String(e.targetNumber))
  ].join("");
  Ke(n, "difficulty", a);
  const r = n.querySelector('[data-roll-summary-section="attack"]');
  r && t !== void 0 && (r.hidden = !t, Ke(n, "attack", t));
  const s = [
    ...e.actionCost > 0 ? [ne(game.i18n.localize("CYPHERV2.Roll.ActionCost"), String(e.actionCost))] : [],
    ...e.effortCost > 0 ? [ne(game.i18n.localize("CYPHERV2.Roll.EffortCost"), String(e.effortCost))] : [],
    ...e.edgeApplied > 0 ? [ne(game.i18n.localize("CYPHERV2.Roll.EdgeApplied"), `-${e.edgeApplied}`)] : [],
    ne(game.i18n.localize("CYPHERV2.Roll.TotalCost"), `${e.totalCost} ${e.poolLabel}`, "is-total"),
    ne(game.i18n.localize("CYPHERV2.Roll.PoolAfterRoll"), `${e.poolValue} → ${e.poolAfter}`)
  ];
  Ke(n, "cost", s.join(""));
  const l = ["might", "speed", "intellect"].map((u) => {
    const c = e.pool === u ? e.poolAfter : null, p = e.pool === u ? e.poolValue : null, h = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}`], m = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Max`], y = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Edge`];
    return `<div class="roll-summary-pool${e.pool === u ? " is-selected" : ""}">
      <span>${lt(no(u, io))}</span>
      <strong>${p === null ? h : `${p} → ${c}`} / ${m}</strong>
      <small>${game.i18n.localize("CYPHERV2.Pools.Edge")} ${y}</small>
    </div>`;
  }).join("");
  Ke(n, "character", `${l}<div class="roll-summary-effort"><span>${game.i18n.localize("CYPHERV2.Character.Effort")}</span><strong>${e.effortUsed} / ${e.effortMaximum}</strong></div>`), Dt(n, "error", e.poolValue < e.totalCost ? game.i18n.localize("CYPHERV2.Roll.InsufficientPool") : "");
}
function ii(n, e) {
  for (const i of ["might", "speed", "intellect"]) {
    const o = `pool${i[0].toUpperCase()}${i.slice(1)}`;
    n.dataset[o] = String(e.actor.system.stats[i].value), n.dataset[`${o}Max`] = String(e.actor.system.derived.pools[i].max), n.dataset[`${o}Edge`] = String(e.actor.system.derived.pools[i].edge);
  }
  const t = () => {
    try {
      const i = e.buildRequest(Yo(n)), o = game.cypherv2.services.rolls.preview(e.actor, i, e.policyRequest);
      Hc(
        n,
        Sc(o, e.actor, io),
        e.attackSummary?.(Yo(n), o)
      );
    } catch (i) {
      Dt(n, "error", i instanceof Error ? i.message : String(i));
    }
  };
  return n.addEventListener("input", t), n.addEventListener("change", t), t(), t;
}
function Do(n) {
  return {
    label: "CYPHERV2.Roll.TaskRoll",
    pool: re(n, "pool"),
    difficulty: Jt(n),
    skillSteps: G(n, "skillSteps"),
    assets: G(n, "assets"),
    paidEffort: G(n, "paidEffort"),
    freeEffort: G(n, "freeEffort"),
    ...Qt(n),
    purpose: "task"
  };
}
function $c(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
async function Ic(n, e = "might") {
  const t = Me(), i = game.cypherv2.rules.resolveDifficultyPolicy(
    t.base,
    t.enabledRuleModuleIds ?? []
  ), o = `
    ${ei(i.difficultyCeiling, mr())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
      <select name="pool">${br(e)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}
      <select name="skillSteps">${oo()}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}
      <select name="assets">${ge(i.assetLimit)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}
      <select name="paidEffort">${ge(n.system.derived.effort.max)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}
      <input name="freeEffort" type="number" value="0" min="0" step="1">
    </label>
    ${Zt()}`, a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Roll.TaskRoll"), resizable: !0 },
    position: { width: 800 },
    content: ti({
      identity: `${n.name} · ${game.i18n.localize("CYPHERV2.Roll.Task")}`,
      settings: o
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (r, s) => {
      ii(s.element, {
        actor: n,
        policyRequest: t,
        buildRequest: Do
      });
    }
  });
  if (a)
    try {
      const r = await game.cypherv2.services.rolls.execute(
        n,
        Do(a),
        t
      );
      await to(n, r);
    } catch (r) {
      $c(r);
    }
}
function Qi(n, e) {
  return n === e ? " selected" : "";
}
function Vc(n, e) {
  const t = re(n, "skillRank");
  return ee.includes(t) ? t : e;
}
function To(n, e, t) {
  const i = re(e, "pool");
  return game.cypherv2.services.skills.buildRollRequest(n, {
    ...i === "might" || i === "speed" || i === "intellect" ? { pool: i } : {},
    rankOverride: Vc(e, n.system.rank),
    difficulty: Jt(e),
    assets: G(e, "assets"),
    paidEffort: G(e, "paidEffort"),
    freeEffort: G(e, "freeEffort"),
    ...Qt(e),
    enabledRuleModuleIds: t
  });
}
async function Yc(n, e) {
  const t = Me(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = game.cypherv2.services.skills.configuredPool(e) ?? "choose", r = `
    ${a === "choose" ? `<option value="" selected disabled>${game.i18n.localize("CYPHERV2.Skill.ChoosePool")}</option>` : ""}
    <option value="might"${Qi(a, "might")}>${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
    <option value="speed"${Qi(a, "speed")}>${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
    <option value="intellect"${Qi(a, "intellect")}>${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>`, s = ee.map((c) => `<option value="${c}"${c === e.system.rank ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${c}`)} · ${gt(c) === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : gt(c) > 0 ? `+${gt(c)}` : gt(c)}</option>`).join(""), l = `
    ${ei(o.difficultyCeiling, mr())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${r}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillRank">${s}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ge(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ge(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Zt()}`, u = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Skill.Roll")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: ti({ identity: e.name, settings: l }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (c, p) => {
      ii(p.element, {
        actor: n,
        policyRequest: t,
        buildRequest: (h) => To(e, h, i)
      });
    }
  });
  if (u)
    try {
      const c = To(e, u, i), p = await game.cypherv2.services.rolls.execute(n, c, t);
      await to(n, p);
    } catch (c) {
      ui.notifications.error(c instanceof Error ? c.message : String(c));
    }
}
function Si(n) {
  const e = n.token, t = n.tokenId ?? e?.id, i = n.tokenUuid ?? e?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...t ? { tokenId: t } : {},
    ...i ? { tokenUuid: i } : {}
  };
}
function jt(n, e) {
  return Object.assign(Object.create(n), {
    ...e.actorUuid ? { actorUuid: e.actorUuid } : {},
    ...e.tokenId ? { tokenId: e.tokenId } : {},
    ...e.tokenUuid ? { tokenUuid: e.tokenUuid } : {},
    update: n.update.bind(n),
    testUserPermission: n.testUserPermission.bind(n)
  });
}
function wr(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "npc" ? null : jt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function vr(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "character" ? null : jt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function Rn(n) {
  if (n.tokenId) {
    const e = canvas.tokens?.get(n.tokenId)?.actor;
    return e instanceof Actor ? e : null;
  }
  return n.tokenUuid ? null : game.actors.get(n.actorId) ?? null;
}
async function Pn(n) {
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
  return n.tokenId || n.tokenUuid ? null : Rn(n);
}
function Fc(n, e) {
  return String(n[e] ?? "");
}
function Cr(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function Er(n, e = "manual:0") {
  const t = e.startsWith("manual:") ? Number(e.slice(7)) : null;
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${oo(t, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...Cr(n).map((i) => `<option value="${i.id}"${i.id === e ? " selected" : ""}>${i.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${i.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function Rr(n, e) {
  return Cr(n).find((t) => t.id === e);
}
function Pr(n) {
  const e = re(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function Dc(n, e) {
  const t = e === "dodge";
  return {
    pool: t ? "speed" : "might",
    armorDirection: t ? "hinder" : "ease",
    armorSteps: t ? n.system.derived.combat.armor.dodgeHindrance : n.system.derived.combat.armor.blockEase
  };
}
async function Sr(n) {
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
  return i && Fc(i, "choice") === "damage" ? "damage" : "effect";
}
async function Tc(n, e) {
  const t = Me(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = game.cypherv2.services.combat.policy(i), r = game.cypherv2.services.targets.nativeNpcTargets(), l = r.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${r.map((w) => w.name).join(", ")}</span><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : ei(o.difficultyCeiling, !0), u = game.cypherv2.services.combat.weaponAttackPool(e), c = `manual:${gt(e.system.skillLevel ?? "untrained")}`, p = (w) => {
    const C = Rr(n, re(w, "skillId"));
    return {
      pool: re(w, "pool"),
      targets: r,
      difficulty: Jt(w),
      ...C ? { skill: C } : {},
      skillSteps: Pr(w),
      assets: G(w, "assets"),
      paidEffort: G(w, "paidEffort"),
      damageEffort: G(w, "damageEffort"),
      freeDamageEffort: G(w, "freeDamageEffort"),
      freeEffort: G(w, "freeEffort"),
      ...Qt(w),
      extremeRange: re(w, "extremeRange") === "true" || w.extremeRange === !0 || w.extremeRange === "on",
      enabledRuleModuleIds: i
    };
  }, h = (w) => {
    const C = game.cypherv2.services.combat.buildWeaponAttackPlan(n, e, p(w)).requests[0];
    if (!C) throw new Error("Weapon attack preview did not produce a roll request.");
    return C;
  }, m = game.cypherv2.services.combat.weaponBaseDamage(e, a), y = `
    ${l}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${br(u)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${Er(n, c)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ge(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ge(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${ge(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Zt()}
    ${e.system.attackType === "ranged" ? `<label class="roll-dialog-checkbox"><input name="extremeRange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</label>` : ""}`, f = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Combat.Attack")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: ti({ identity: e.name, settings: y, attackSummary: " " }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Combat.Attack") },
    render: (w, C) => {
      ii(C.element, {
        actor: n,
        policyRequest: t,
        buildRequest: h,
        attackSummary: (P, Y) => [
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${m}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${Y.context.damageEffort ?? 0}</strong></div>`,
          ...(Y.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${Y.context.freeDamageEffort}</strong></div>`] : [],
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${Y.damageEffortApplied}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${a.damageEffortBonus}</strong></div>`,
          ...e.system.rangeCategory !== "immediate" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${game.i18n.localize(`CYPHERV2.Combat.Range.${e.system.rangeCategory}`)}</strong></div>`] : [],
          ...re(P, "extremeRange") === "true" || P.extremeRange === !0 ? [`<div class="roll-summary-row is-hindrance"><span>${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</span><strong>-1</strong></div>`] : []
        ].join("")
      });
    }
  });
  if (f)
    try {
      let w = await game.cypherv2.services.combat.executeWeaponAttack(
        n,
        e,
        p(f),
        t
      );
      const C = await Sr(w);
      C && (w = game.cypherv2.services.combat.chooseAttackOutcomes(
        w,
        C,
        i
      ));
      for (const Y of w)
        await game.cypherv2.services.combatChat.publishWeaponAttack(
          n,
          Y,
          Di(),
          Ti()
        );
      const P = w[0];
      P && await Xt().requestFreeFromNaturalResult(n, P.execution.result);
    } catch (w) {
      ui.notifications.error(w instanceof Error ? w.message : String(w));
    }
}
async function Sn(n, e, t) {
  if (e === "blockWithShield")
    try {
      const m = await game.cypherv2.services.shields.normalizeEquipped(n);
      if (!m || game.cypherv2.services.shields.isBroken(m))
        return ui.notifications.warn(game.i18n.localize("CYPHERV2.Shield.BlockUnavailable")), !1;
    } catch (m) {
      return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
    }
  const i = Me(), o = i.enabledRuleModuleIds ?? [], a = game.cypherv2.rules.resolveDifficultyPolicy(i.base, o), r = t ? `<div class="roll-dialog-context"><strong>${t.source.name} → ${n.name}</strong><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : ei(a.difficultyCeiling, !0), s = game.cypherv2.services.combat.applicableDefenseSkills(
    n,
    e,
    o
  )[0], l = Dc(n, e), u = (m) => {
    const y = Rr(n, re(m, "skillId"));
    return {
      ...y ? { skill: y } : {},
      skillSteps: Pr(m),
      assets: G(m, "assets"),
      paidEffort: G(m, "paidEffort"),
      freeEffort: G(m, "freeEffort"),
      ...Qt(m),
      enabledRuleModuleIds: o
    };
  }, c = (m) => t ? game.cypherv2.services.combat.buildDefenseAgainstNpcRequest(
    n,
    t.source,
    e,
    u(m)
  ) : game.cypherv2.services.combat.buildDefenseRequest(n, e, {
    ...u(m),
    difficulty: Jt(m)
  }), p = `
    ${r}
    <div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${l.pool === "speed" ? "Speed" : "Might"}`)}</span></div>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${Er(n, s?.id)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ge(a.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ge(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Zt()}`, h = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`), resizable: !0 },
    position: { width: 800 },
    content: ti({
      identity: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`),
      settings: p
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (m, y) => {
      ii(y.element, { actor: n, policyRequest: i, buildRequest: c });
    }
  });
  if (!h) return !1;
  try {
    const m = c(h), y = await game.cypherv2.services.rolls.execute(n, m, i), w = (t ? await game.cypherv2.services.combat.resolveDefenseWound(
      n,
      y.result,
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
      y,
      w,
      t?.source ?? null,
      Di(),
      Ti()
    ), await Xt().requestFreeFromNaturalResult(n, y.result), !0;
  } catch (m) {
    return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
  }
}
async function zc(n) {
  if (!game.user.isGM) return;
  const e = [...game.user.targets ?? []].map((i) => vr(i)).filter((i) => i !== null).map((i) => i);
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
async function ki(n) {
  try {
    const e = await game.cypherv2.services.depletion.roll(n);
    await game.cypherv2.services.depletionChat.publish(n, e);
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
const zo = 2, No = 1e3;
function Wt(n) {
  const e = String(n.die).trim().match(/^d(\d+)$/i), t = Number(e?.[1]);
  if (!Number.isInteger(t) || t < zo || t > No)
    throw new Error(`Depletion die must have ${zo} to ${No} sides.`);
  return t;
}
function Nc(n) {
  return `1d${Wt(n)}`;
}
function Zi(n) {
  const e = Wt(n), t = Number(n.threshold);
  if (!Number.isInteger(t) || t < 1 || t > e)
    throw new Error(`Depletion threshold must be between 1 and ${e}.`);
  return `${kr(t)} in 1d${e}`;
}
function kr(n) {
  return n === 1 ? "1" : `1-${n}`;
}
function Mc(n) {
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
function qc(n, e) {
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
function xc(n) {
  return n.replace(/[&<>'"]/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[e]);
}
async function Ar(n, e) {
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
  const i = t.abilitySnapshot.name || t.id, o = xc(i), a = t.abilitySnapshot.description || game.i18n.localize("CYPHERV2.Focus.MissingAbility");
  await foundry.applications.api.DialogV2.input({
    window: { title: i },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-focus-snapshot"><h3>${o}</h3><div>${a}</div></div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Close") }
  });
}
function Mo(n, e) {
  return {
    left: n.left - e.left,
    top: n.top - e.top,
    width: n.width,
    height: n.height
  };
}
function Uc(n, e) {
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
function Gc(n) {
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
    const c = Uc(
      Mo(l.getBoundingClientRect(), i),
      Mo(u.getBoundingClientRect(), i)
    );
    s.setAttribute("x1", String(c.x1)), s.setAttribute("y1", String(c.y1)), s.setAttribute("x2", String(c.x2)), s.setAttribute("y2", String(c.y2));
  }
}
class Hr {
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
    for (const e of this.#i) Gc(e);
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
function Oc(n, e, t, i = 8) {
  const o = n.right + i, a = o + e.width <= t.width - i ? o : n.left - e.width - i;
  return {
    left: Math.max(i, Math.min(a, t.width - e.width - i)),
    top: Math.max(i, Math.min(n.top, t.height - e.height - i))
  };
}
class $r {
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
    const o = e.getBoundingClientRect(), a = i.getBoundingClientRect(), r = e.ownerDocument.defaultView, s = Oc(o, a, {
      width: r?.innerWidth ?? e.ownerDocument.documentElement.clientWidth,
      height: r?.innerHeight ?? e.ownerDocument.documentElement.clientHeight
    });
    i.style.left = `${s.left}px`, i.style.top = `${s.top}px`, this.#i = e, this.#t = i;
  }
}
class Rt extends Error {
  diagnostics;
  constructor(e) {
    super(e.map((t) => t.message).join("; ")), this.name = "FocusGraphValidationError", this.diagnostics = e;
  }
}
function Bc(n, e) {
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
function kn(n) {
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
  return !e.some((a) => a.severity === "error") && Bc(n, t) && e.push({
    severity: "warning",
    code: "directed-cycle",
    message: "Focus graph contains a directed cycle; evaluation remains direct and deterministic."
  }), e;
}
function Lc(n) {
  const e = kn(n), t = e.filter((i) => i.severity === "error");
  if (t.length > 0) throw new Rt(t);
  return e;
}
class ao {
  evaluate(e, t) {
    if (!Number.isInteger(t.tier) || t.tier < 1)
      throw new Error("Character Tier must be an integer of at least 1.");
    const i = [...Lc(e)], o = new Set(e.nodes.map((c) => c.id)), a = new Set(t.ownedNodeIds);
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
      const p = [...new Set((r.get(c.id) ?? []).filter((h) => s.has(h)))].sort((h, m) => h.localeCompare(m));
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
class Ge extends Error {
  constructor() {
    super("Grant conflict resolution was cancelled."), this.name = "GrantConflictCancelledError";
  }
}
function Ir(n, e) {
  return `${n}:${String(e ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}
function Pe(n, e, t = "") {
  return { type: n, contentUuid: t, contentKey: Ir(n, e) };
}
function jc(n) {
  if (n.type !== "ability" && n.type !== "skill") return null;
  const e = n.system.grantedBy ?? {};
  return {
    type: n.type,
    contentUuid: String(e.contentUuid ?? ""),
    contentKey: String(e.contentKey || Ir(n.type, n.name))
  };
}
function Wc(n, e) {
  return n.type !== e.type ? !1 : n.contentUuid && e.contentUuid ? n.contentUuid === e.contentUuid : n.contentKey === e.contentKey;
}
function Vr(n, e) {
  return !!zi(n, e);
}
function zi(n, e) {
  return [...n].find((t) => {
    const i = jc(t);
    return i ? Wc(i, e) : !1;
  }) ?? null;
}
class de extends Error {
  code;
  dependentNodeIds;
  constructor(e, t, i = []) {
    super(t), this.name = "FocusAcquisitionError", this.code = e, this.dependentNodeIds = i;
  }
}
const _c = async (n) => {
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
function li(n, e) {
  return n.focusUuid === e.uuid || n.focusUuid === e.id;
}
function qo(n, e, t) {
  return n.type === "ability" && n.system.sourceFocusUuid === e && n.system.sourceNodeId === t;
}
function en(n, e) {
  const t = `${n}\0${e}`;
  let i = 2166136261, o = 2654435769;
  for (let a = 0; a < t.length; a += 1) {
    const r = t.charCodeAt(a);
    i = Math.imul(i ^ r, 16777619) >>> 0, o = Math.imul(o ^ r + a, 2246822507) >>> 0;
  }
  return `${i.toString(16).padStart(8, "0")}${o.toString(16).padStart(8, "0")}`;
}
class Kc {
  #e;
  #t;
  #i;
  #n = /* @__PURE__ */ new Map();
  constructor(e = new ao(), t = _c, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  missingOwnedNodeIds(e, t, i) {
    const o = [...e.items];
    return new Set(i.ownedNodeIds.filter((a) => !o.some((r) => qo(r, t.uuid, a))));
  }
  async acquire(e, t, i, o) {
    return this.#C(this.#b(e), () => this.#o(e, t, i, !1, !0, o));
  }
  /** Character-facing permissive acquisition. Pending choices remain untouched. */
  async acquireManual(e, t, i, o) {
    return this.#C(this.#b(e), () => this.#o(e, t, i, !1, !1, o));
  }
  /** Explicit GM-only sheet action; callers must enforce GM authorization. */
  async acquireWithGmOverride(e, t, i) {
    return this.#C(this.#b(e), () => this.#o(e, t, i, !0, !1));
  }
  /** GM repair/import action. It intentionally bypasses both eligibility and choices. */
  async markOwnedWithGmOverride(e, t, i) {
    return this.#C(this.#b(e), () => this.#r(e, t, i));
  }
  async undo(e, t, i, o = {}) {
    return this.#C(this.#b(e), () => this.#l(e, t, i, o));
  }
  hasEmbeddedAbility(e, t, i) {
    return !!this.#d(e, t, i);
  }
  async restoreAbility(e, t, i) {
    return this.#C(this.#b(e), () => this.#c(e, t, i));
  }
  async #o(e, t, i, o, a, r) {
    this.#u(e);
    const s = this.#g(t, i), l = this.#p(e, t);
    if (l.ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let u;
    try {
      u = this.#e.evaluateProgress(t.system.graph, L(e.system), l).nodes.find((w) => w.node.id === i);
    } catch (w) {
      if (!(w instanceof Rt)) throw w;
    }
    const c = e.system.advancement.pendingFocusChoices.find((w) => w.focusUuid === "" || w.focusUuid === t.uuid || w.focusUuid === t.id), p = a && !o && u?.state === "available" && !!c;
    let h = !1, m = !1, y = null;
    if (!this.#d(e, t.uuid, i)) {
      const w = await this.#s(t, s);
      if (!this.#d(e, t.uuid, i)) {
        const C = this.#w(e, t, s, w);
        if (C) {
          if (!r)
            throw new de(
              "duplicate-grant",
              `Focus node '${i}' grants an Ability already present on this Character; choose a replacement with the GM.`
            );
          const P = await r(C);
          if (P.action === "cancel") throw new Ge();
          if (P.action !== "gmOverride")
            throw new de(
              "duplicate-grant",
              "A Focus node cannot be replaced by an arbitrary Ability. Choose another valid node or use an explicit GM Override."
            );
          m = !0;
        } else
          y = await this.#f(e, t, i, w), h = !!y;
      }
    }
    if (!this.#p(e, t).ownedNodeIds.includes(i)) {
      const w = e.system.focusProgress.map((C) => li(C, t) ? {
        ...C,
        ownedNodeIds: [...C.ownedNodeIds, i],
        acquisitions: [
          ...C.acquisitions ?? [],
          this.#m(
            i,
            o || m ? "gmOverride" : p ? "choice" : "manualOverride",
            p ? c : null
          )
        ]
      } : { ...C, ownedNodeIds: [...C.ownedNodeIds], acquisitions: [...C.acquisitions ?? []] });
      try {
        await e.update({
          "system.focusProgress": w,
          ...p && !m && c ? {
            "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((C) => C.id !== c.id)
          } : {}
        });
      } catch (C) {
        throw y?.delete && await y.delete(), C;
      }
    }
    return { status: "acquired", abilityCreated: h };
  }
  async #r(e, t, i) {
    this.#u(e);
    const o = this.#g(t, i);
    if (this.#p(e, t).ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let r = null;
    if (!this.#d(e, t.uuid, i)) {
      const l = await this.#s(t, o);
      this.#d(e, t.uuid, i) || (r = await this.#f(e, t, i, l));
    }
    const s = e.system.focusProgress.map((l) => li(l, t) ? {
      ...l,
      ownedNodeIds: [...l.ownedNodeIds, i],
      acquisitions: [
        ...l.acquisitions ?? [],
        this.#m(i, "gmManual", null)
      ]
    } : { ...l, ownedNodeIds: [...l.ownedNodeIds], acquisitions: [...l.acquisitions ?? []] });
    try {
      await e.update({ "system.focusProgress": s });
    } catch (l) {
      throw r?.delete && await r.delete(), l;
    }
    return { status: "acquired", abilityCreated: !!r };
  }
  async #l(e, t, i, o) {
    this.#u(e), this.#g(t, i);
    const a = this.#p(e, t);
    if (!a.ownedNodeIds.includes(i))
      throw new de("undo-not-owned", `Focus node '${i}' is not owned.`);
    const r = a.ownedNodeIds.filter((f) => f !== i), s = new Set(this.#a(
      t,
      L(e.system),
      a.ownedNodeIds
    )), l = this.#a(t, L(e.system), r), u = l.filter((f) => !s.has(f));
    if (u.length > 0 && !o.force)
      throw new de(
        "undo-dependent-nodes",
        `Undo would invalidate acquired descendant nodes: ${u.join(", ")}.`,
        u
      );
    const c = (a.acquisitions ?? []).find((f) => f.nodeId === i), p = c && c.choiceSource !== "none" && c.choiceId ? {
      id: c.choiceId,
      source: c.choiceSource,
      grantTier: c.choiceGrantTier,
      focusUuid: c.choiceFocusUuid
    } : null, h = e.system.focusProgress.map((f) => li(f, t) ? {
      ...f,
      ownedNodeIds: r,
      acquisitions: (f.acquisitions ?? []).filter((w) => w.nodeId !== i)
    } : { ...f, ownedNodeIds: [...f.ownedNodeIds], acquisitions: [...f.acquisitions ?? []] }), m = p && !e.system.advancement.pendingFocusChoices.some((f) => f.id === p.id) ? [...e.system.advancement.pendingFocusChoices, p] : [...e.system.advancement.pendingFocusChoices];
    await e.update({
      "system.focusProgress": h,
      "system.advancement.pendingFocusChoices": m
    });
    let y = !1;
    if (o.deleteAbility) {
      const f = this.#d(e, t.uuid, i);
      f?.delete && (await f.delete(), y = !0);
    }
    return { choiceRestored: p, abilityDeleted: y, invalidOwnedNodeIds: l };
  }
  #a(e, t, i) {
    try {
      return this.#e.invalidOwnedNodeIds(e.system.graph, t, i);
    } catch (o) {
      if (o instanceof Rt) return [];
      throw o;
    }
  }
  async #c(e, t, i) {
    this.#u(e);
    const o = this.#g(t, i);
    if (!this.#p(e, t).ownedNodeIds.includes(i))
      throw new de(
        "restore-not-owned",
        `Focus node '${i}' is not owned and cannot be restored.`
      );
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const r = await this.#s(t, o);
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const s = !!await this.#f(e, t, i, r);
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
        _id: en(e.uuid, t.id),
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
      throw new de(
        "ability-data-unavailable",
        `Focus node '${t.id}' has neither a valid source Ability nor a usable snapshot.`
      );
    return {
      _id: en(e.uuid, t.id),
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
    return [...e.items].find((o) => qo(o, t, i)) ?? null;
  }
  #m(e, t, i) {
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
  #w(e, t, i, o) {
    const r = (o.system ?? {}).grantedBy ?? {}, s = Pe("ability", String(o.name ?? i.abilitySnapshot.name), String(r.contentUuid ?? i.abilityUuid)), l = zi(e.items, s);
    if (!l) return null;
    const c = (l.system ?? {}).grantedBy ?? {}, p = Pe("ability", l.name ?? "", String(c.contentUuid ?? ""));
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
        id: en(t.uuid, i.id),
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
  async #f(e, t, i, o) {
    const r = (o.system ?? {}).grantedBy ?? {};
    if (Vr(e.items, {
      type: "ability",
      contentUuid: String(r.contentUuid ?? ""),
      contentKey: String(r.contentKey ?? `ability:${String(o.name ?? "").trim().toLocaleLowerCase()}`)
    }))
      throw new de(
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
  #p(e, t) {
    const i = e.system.focusProgress.filter((o) => li(o, t));
    if (i.length === 0)
      throw new de(
        "progress-missing",
        `Character has no progression entry for Focus '${t.uuid}'.`
      );
    if (i.length > 1)
      throw new de(
        "progress-duplicated",
        `Character has duplicate progression entries for Focus '${t.uuid}'.`
      );
    return i[0];
  }
  #g(e, t) {
    const i = e.system.graph.nodes.find((o) => o.id === t);
    if (!i)
      throw new de("node-not-found", `Focus node '${t}' was not found.`);
    return i;
  }
  #u(e) {
    if (e.type !== "character")
      throw new de("not-character", "Focus acquisition requires a Character.");
  }
  #b(e) {
    return e.uuid;
  }
  async #C(e, t) {
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
class X extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "AdvancementError";
  }
  code;
}
const Xc = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
}, Jc = () => globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function Qc(n) {
  return n.system.category === "attack" || n.system.category === "defense" || n.system.contexts.some((e) => e === "attack" || e.startsWith("attack.") || e === "defense" || e.startsWith("defense."));
}
function Zc(n) {
  return n === "inability" ? "untrained" : n === "untrained" ? "trained" : n === "trained" ? "specialized" : null;
}
function xo(n) {
  return [...new Set(n)];
}
class ed {
  #e;
  #t;
  #i;
  #n;
  #o = /* @__PURE__ */ new Map();
  constructor(e, t = Jc, i = Date.now, o = Xc) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  policy(e = []) {
    return this.#e.resolveAdvancementPolicy(Oa, e);
  }
  view(e, t = []) {
    const i = this.policy(t), o = e.system.advancement.purchases, a = o.length >= i.purchasesPerTier;
    return {
      policy: i,
      purchasedCount: o.length,
      remainingCount: Math.max(0, i.purchasesPerTier - o.length),
      canAdvanceTier: o.length === i.purchasesPerTier,
      options: Un.map((r) => {
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
    const i = L(e.system);
    return {
      tier: i,
      completed: (e.system.advancement.guidanceCompletedTiers ?? []).includes(i),
      focusAbilityCount: i === 1 ? 2 : 1,
      includesGenreAbility: this.policy(t).genreChoiceForTier(i)
    };
  }
  async completeProgressionGuidance(e) {
    return this.#m(e, async () => {
      this.#c(e);
      const t = new Set(e.system.advancement.guidanceCompletedTiers ?? []);
      t.add(L(e.system)), await e.update({
        "system.advancement.guidanceCompletedTiers": [...t].sort((i, o) => i - o)
      });
    });
  }
  async resetProgressionGuidance(e) {
    return this.#m(e, async () => {
      this.#c(e), await e.update({
        "system.advancement.guidanceCompletedTiers": (e.system.advancement.guidanceCompletedTiers ?? []).filter((t) => t !== L(e.system))
      });
    });
  }
  skillTrainingOptions(e, t = []) {
    const i = this.policy(t);
    return [...e.items].filter((o) => o.type === "skill" && ee.includes(o.system.rank)).map((o) => {
      const a = Zc(o.system.rank), r = a === "trained" ? i.attackDefenseTrainingTier : a === "specialized" ? i.attackDefenseSpecializationTier : 0, s = !!(a && Qc(o) && L(e.system) < r);
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
    return this.#m(e, () => this.#r(e, t, i, !1));
  }
  /** Explicit integration point for GM tooling; Core slot and benefit validation still applies. */
  async purchaseWithGmOverride(e, t, i = []) {
    return this.#m(e, () => this.#r(e, t, i, !0));
  }
  async advanceTier(e, t = []) {
    return this.#m(e, async () => {
      this.#c(e);
      const i = this.policy(t);
      if (e.system.advancement.purchases.length !== i.purchasesPerTier)
        throw new X("tier-not-ready", "Four Advancements are required before advancing Tier.");
      const o = oi(e.system, "tier", 1), a = o.value, r = {
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
    this.#c(e);
    const a = this.policy(i), r = e.system.advancement.purchases;
    if (r.length >= a.purchasesPerTier)
      throw new X("cycle-complete", "This advancement cycle is complete.");
    if (t.kind === "other") {
      if (r.some((f) => f.kind === "other"))
        throw new X("other-already-purchased", "Other Advancement is unique per cycle.");
    } else if (r.some((f) => f.kind === t.kind))
      throw new X("already-purchased", "That Advancement was already purchased this cycle.");
    const s = o ? 0 : a.xpCost;
    if (e.system.xp < s)
      throw new X("insufficient-xp", "This Character does not have enough XP.");
    const l = L(e.system), u = a.resourcePointsForTier(l);
    if (!Number.isInteger(u) || u < 0)
      throw new Error("Advancement policy Resource Points must be a non-negative integer.");
    const c = {};
    let p = null, h = null, m;
    if (t.kind === "increaseCapabilities") {
      const f = Object.values(t.allocation);
      if (f.some((w) => !Number.isInteger(w) || w < 0) || f.reduce((w, C) => w + C, 0) !== a.capabilityPoints)
        throw new X("invalid-allocation", "Pool allocation must distribute exactly four points.");
      for (const w of ["might", "speed", "intellect"]) {
        const C = t.allocation[w], P = oi(
          e.system,
          `${w}Max`,
          C
        );
        c[P.path] = P.value;
        const Y = P.overrideActive ? P.value : e.system.derived.pools[w].max + C;
        c[`system.stats.${w}.value`] = Math.min(
          e.system.stats[w].value + C,
          Y
        );
      }
    } else if (t.kind === "moveTowardPerfection") {
      const f = oi(
        e.system,
        `${t.pool}Edge`,
        1
      );
      c[f.path] = f.value;
    } else if (t.kind === "extraEffort") {
      if (this.#s(e) >= a.effortMaximum)
        throw new X("effort-maximum", "Core Effort is already at its maximum.");
      const f = oi(e.system, "effort", 1);
      c[f.path] = f.value;
    } else if (t.kind === "skillTraining")
      if (t.mode === "improve") {
        const f = this.skillTrainingOptions(e, i).find((C) => C.id === t.skillId), w = [...e.items].find((C) => C.id === t.skillId && C.type === "skill");
        if (!f || !w) throw new X("skill-not-found", "Skill Item not found.");
        if (f.reason === "maximum" || !f.nextRank)
          throw new X("skill-maximum", "This Skill cannot be improved by Core Advancement.");
        if (f.reason === "tier")
          throw new X("skill-tier", "Attack and defense training is not available at this Tier.");
        p = { skill: w, rank: w.system.rank }, m = f.nextRank;
      } else {
        const f = await this.#l(e, t, a);
        if (h = (await e.createEmbeddedDocuments("Item", [f]))[0] ?? null, !h) throw new Error("Foundry did not create the learned Skill Item.");
        m = "trained";
      }
    else
      this.#a(e, t.otherKind, a, c);
    const y = {
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
      "system.advancement.purchases": [...r, y]
    }), p && m && await p.skill.update({ "system.rank": m });
    try {
      await e.update(c);
    } catch (f) {
      throw p && await p.skill.update({ "system.rank": p.rank }), h?.delete && await h.delete(), f;
    }
    return { ...m ? { skillRank: m } : {}, record: y, resourcePointsGranted: u };
  }
  async #l(e, t, i) {
    const o = t.sourceUuid ? await this.#n(t.sourceUuid) : null;
    if (t.sourceUuid && !o)
      throw new X("skill-not-found", "The selected Skill source is unavailable.");
    const a = o?.name.trim() || t.customName?.trim() || "";
    if (!a) throw new X("skill-not-found", "A new custom Skill requires a name.");
    if ([...e.items].some((c) => c.type === "skill" && (c.name.trim().toLocaleLowerCase() === a.toLocaleLowerCase() || !!(o?.uuid && c.system.acquisition?.grantedByUuid === o.uuid))))
      throw new X("duplicate-skill", "This Character already owns that Skill.");
    const s = o?.system.category ?? t.customCategory ?? "general", l = o?.system.contexts ?? (s === "general" ? [] : [s]), u = s === "attack" || s === "defense" || l.some((c) => c === "attack" || c.startsWith("attack.") || c === "defense" || c.startsWith("defense."));
    if (u && L(e.system) < i.attackDefenseTrainingTier)
      throw new X("skill-tier", "Attack and defense training is not available at this Tier.");
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
  #a(e, t, i, o) {
    if (t === "recovery")
      o["system.recovery.bonus"] = e.system.recovery.bonus + i.recoveryBonus;
    else if (t === "focus") {
      const a = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: L(e.system),
        focusUuid: ""
      };
      o["system.advancement.pendingFocusChoices"] = [
        ...e.system.advancement.pendingFocusChoices,
        a
      ];
    } else if (t === "armor")
      o["system.proficiencies.armorCategories"] = xo([
        ...e.system.proficiencies.armorCategories,
        ...Ue
      ]);
    else if (t === "weapons")
      o["system.proficiencies.weaponCategories"] = xo([
        ...e.system.proficiencies.weaponCategories,
        ...xe
      ]);
    else {
      if (L(e.system) < 3)
        throw new X("genre-tier", "Genre Advancement requires Tier 3 or higher.");
      const a = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: L(e.system)
      };
      o["system.advancement.pendingGenreChoices"] = [
        ...e.system.advancement.pendingGenreChoices,
        a
      ];
    }
  }
  #c(e) {
    if (e.type !== "character")
      throw new X("not-character", "Advancement requires a Character.");
  }
  #s(e) {
    return e.system.derived.effort?.max ?? ft(e.system.stats.effortBase, e.system.overrides?.effort);
  }
  #d(e) {
    return e.uuid ?? e.id;
  }
  async #m(e, t) {
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
function ci(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
const td = {
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
function Xe(n, e) {
  return String(n[e] ?? "");
}
function tn(n, e) {
  return Number(n[e] ?? 0);
}
function id() {
  return ["might", "speed", "intellect"].map((n) => `<option value="${n}">${game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`)}</option>`).join("");
}
async function ut(n, e) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Advancement.Purchase") }
  });
}
function Yr(n) {
  n instanceof X ? ui.notifications.error(game.i18n.localize(td[n.code])) : (console.error(n), ui.notifications.error(game.i18n.localize("CYPHERV2.Advancement.Errors.Unexpected")));
}
async function nd(n, e) {
  const t = game.i18n.localize(`CYPHERV2.Advancement.Option.${e}`);
  if (e === "increaseCapabilities") {
    const i = await ut(t, `
      <p>${game.i18n.localize("CYPHERV2.Advancement.CapabilitiesPrompt")}</p>
      <label>${game.i18n.localize("CYPHERV2.Pools.Might")}<input name="might" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Speed")}<input name="speed" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")}<input name="intellect" type="number" min="0" max="4" value="0"></label>`);
    return i ? { kind: e, allocation: {
      might: tn(i, "might"),
      speed: tn(i, "speed"),
      intellect: tn(i, "intellect")
    } } : null;
  }
  if (e === "moveTowardPerfection") {
    const i = await ut(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChoosePool")}<select name="pool">${id()}</select></label>`);
    return i ? { kind: e, pool: Xe(i, "pool") } : null;
  }
  if (e === "skillTraining") {
    const i = await ut(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.SkillMode")}<select name="mode">
      <option value="learn">${game.i18n.localize("CYPHERV2.Advancement.LearnNewSkill")}</option>
      <option value="improve">${game.i18n.localize("CYPHERV2.Advancement.ImproveExistingSkill")}</option>
    </select></label>`);
    if (!i) return null;
    if (Xe(i, "mode") === "learn") {
      const s = [...game.items].filter((c) => c.type === "skill").sort((c, p) => c.name.localeCompare(p.name)), l = await ut(t, `
        <label>${game.i18n.localize("CYPHERV2.Advancement.SkillSource")}<select name="sourceUuid">
          <option value="custom">${game.i18n.localize("CYPHERV2.Advancement.CustomSkill")}</option>
          ${s.map((c) => `<option value="${ci(c.uuid)}">${ci(c.name)}</option>`).join("")}
        </select></label>
        <label>${game.i18n.localize("CYPHERV2.Advancement.CustomSkillName")}<input name="customName" type="text"></label>
        <label>${game.i18n.localize("CYPHERV2.Skill.Category")}<select name="customCategory">
          <option value="general">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.general")}</option>
          <option value="attack">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.attack")}</option>
          <option value="defense">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.defense")}</option>
        </select></label>`);
      if (!l) return null;
      const u = Xe(l, "sourceUuid");
      return u === "custom" ? {
        kind: e,
        mode: "learn",
        customName: Xe(l, "customName"),
        customCategory: Xe(l, "customCategory")
      } : { kind: e, mode: "learn", sourceUuid: u };
    }
    const a = game.cypherv2.services.advancement.skillTrainingOptions(
      n,
      ot()
    ).filter((s) => s.eligible);
    if (a.length === 0)
      return ui.notifications.warn(game.i18n.localize("CYPHERV2.Advancement.NoEligibleSkills")), null;
    const r = await ut(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChooseSkill")}<select name="skillId">${a.map((s) => `<option value="${ci(s.id)}">${ci(s.name)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s.currentRank}`)} → ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s.nextRank}`)}</option>`).join("")}</select></label>`);
    return r ? { kind: e, mode: "improve", skillId: Xe(r, "skillId") } : null;
  }
  if (e === "other") {
    const i = Ua.filter((a) => a !== "genre" || L(n.system) >= 3), o = await ut(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.OtherType")}<select name="otherKind">${i.map((a) => `<option value="${a}">${game.i18n.localize(`CYPHERV2.Advancement.Other.${a}`)}</option>`).join("")}</select></label>`);
    return o ? { kind: e, otherKind: Xe(o, "otherKind") } : null;
  }
  return { kind: e };
}
async function od(n, e) {
  const t = await nd(n, e);
  if (t)
    try {
      const i = await game.cypherv2.services.advancement.purchase(
        n,
        t,
        ot()
      );
      ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.PurchasedNotice", {
        resourcePoints: i.resourcePointsGranted
      }));
    } catch (i) {
      Yr(i);
    }
}
async function ad(n) {
  try {
    const e = await game.cypherv2.services.advancement.advanceTier(
      n,
      ot()
    );
    ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.TierAdvancedNotice", { tier: e.tier }));
  } catch (e) {
    Yr(e);
  }
}
class Te extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusAssociationError";
  }
  code;
}
const rd = () => globalThis.crypto?.randomUUID?.() ?? `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`;
class sd {
  #e;
  #t;
  #i = /* @__PURE__ */ new Map();
  constructor(e = rd, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async attach(e, t, i) {
    return this.#l(e, async () => {
      if (this.#n(e, t), e.system.focusProgress.some((l) => this.#o(l, t)))
        throw new Te("duplicate", "This Focus is already attached.");
      if (i === "creation") {
        if (L(e.system) !== 1)
          throw new Te("creation-tier", "A creation Focus requires a Tier 1 Character.");
        if (e.system.focusProgress.some((l) => l.provenance === "creation"))
          throw new Te("creation-focus-exists", "This Character already has a creation Focus.");
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
    return this.#l(e, async () => {
      if (e.type !== "character")
        throw new Te("not-character", "Focus association requires a Character.");
      const i = e.system.focusProgress.find((a) => a.focusUuid === t);
      if (!i) throw new Te("progress-missing", "Focus progression was not found.");
      const o = e.system.advancement.pendingFocusChoices.filter((a) => a.focusUuid === t).map((a) => a.id);
      return await e.update({
        "system.focusProgress": e.system.focusProgress.filter((a) => a !== i),
        "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((a) => a.focusUuid !== t)
      }), { progress: i, removedPendingChoiceIds: o };
    });
  }
  #n(e, t) {
    if (e.type !== "character")
      throw new Te("not-character", "Focus association requires a Character.");
    if (t.type !== "focus" || !t.uuid)
      throw new Te("not-focus", "Only a Focus Item can be attached.");
  }
  #o(e, t) {
    return e.focusUuid === t.uuid || e.focusUuid === t.id;
  }
  #r(e) {
    return e.uuid ?? e.id;
  }
  async #l(e, t) {
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
function nn(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Fr(n) {
  const e = n instanceof Te ? `CYPHERV2.Focus.Association.Errors.${n.code}` : "CYPHERV2.Focus.Errors.Unexpected";
  n instanceof Te || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function Uo(n, e) {
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
        <select name="focusUuid">${a.map((s) => `<option value="${nn(s.uuid)}">${nn(s.name)}</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Focus.Association.Add") }
    });
    if (!r) return;
    t = await fromUuid(String(r.focusUuid ?? "")) ?? void 0;
  }
  if (!t) return;
  const i = L(n.system) === 1 && !n.system.focusProgress.some((a) => a.provenance === "creation"), o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Add") },
    content: `<div class="cypherv2-dialog-fields">
      <p><strong>${nn(t.name)}</strong></p>
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
      Fr(a);
    }
}
async function ld(n, e) {
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
      Fr(a);
    }
}
class ue extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "CharacterInitializationError";
  }
  code;
}
const cd = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
};
function Go(n) {
  return n.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
class dd {
  #e;
  #t;
  constructor(e = cd, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async setup(e, t) {
    this.#n(e);
    const i = Object.values(t.pools);
    if (i.some((p) => !Number.isInteger(p) || p < 0) || i.reduce((p, h) => p + h, 0) !== 6)
      throw new ue("invalid-pools", "Core Setup must distribute exactly six Pool points.");
    const o = t.skills.filter((p) => p.rank === "trained"), a = t.skills.filter((p) => p.rank === "inability");
    if (!(o.length === 2 && a.length === 0 || o.length === 3 && a.length === 1))
      throw new ue(
        "invalid-skills",
        "Core Setup requires two trained Skills, or three trained Skills and one different Inability."
      );
    const s = await Promise.all(t.skills.map((p) => this.#i(p))), l = new Set([...e.items].filter((p) => p.type === "skill").map((p) => Go(p.name))), u = /* @__PURE__ */ new Set();
    for (const p of s) {
      const h = Go(String(p.name));
      if (!h || l.has(h) || u.has(h))
        throw new ue("duplicate-skill", "Starting Skills must all be different.");
      u.add(h);
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
        throw new ue(
          "state-not-persisted",
          "Foundry did not expose the persisted Core initialization state after update."
        );
    } catch (p) {
      throw await Promise.allSettled(c.map((h) => h.delete?.())), p;
    }
  }
  async markInitialized(e, t) {
    if (e.type !== "character")
      throw new ue("not-character", "Core Setup requires a Character.");
    if (!e.system.creation.coreInitialized && (await e.update({ "system.creation": {
      coreInitialized: !0,
      mode: t,
      initializedAt: this.#t()
    } }), !e.system.creation.coreInitialized))
      throw new ue(
        "state-not-persisted",
        "Foundry did not expose the persisted Core initialization state after update."
      );
  }
  async #i(e) {
    if (e.sourceUuid) {
      const o = await this.#e(e.sourceUuid);
      if (!o)
        throw new ue("skill-source-missing", "A selected Skill source is unavailable.");
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
      throw new ue("invalid-skills", "A custom Skill requires a name.");
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
      throw new ue("not-character", "Core Setup requires a Character.");
    if (e.system.creation.coreInitialized)
      throw new ue("already-initialized", "Core Setup has already been finalized.");
  }
}
function on(n, e) {
  return Number(n[e] ?? 0);
}
function Oo(n, e) {
  return String(n[e] ?? "").trim();
}
function An(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function ud() {
  return [
    `<option value="custom">${game.i18n.localize("CYPHERV2.Creation.CustomSkill")}</option>`,
    ...[...game.items].filter((n) => n.type === "skill").sort((n, e) => n.name.localeCompare(e.name)).map((n) => `<option value="${An(n.uuid)}">${An(n.name)}</option>`)
  ].join("");
}
function di(n, e) {
  return `<fieldset><legend>${e}</legend>
    <label>${game.i18n.localize("CYPHERV2.Creation.SkillSource")}<select name="source${n}">${ud()}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Creation.CustomSkillName")}<input name="name${n}" type="text"></label>
  </fieldset>`;
}
function mi(n, e, t) {
  const i = Oo(n, `source${e}`);
  return i === "custom" ? { customName: Oo(n, `name${e}`), category: "general", rank: t } : { sourceUuid: i, rank: t };
}
async function an(n, e, t) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    render: t ? (i, o) => t(o.element) : void 0,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Apply") }
  });
}
function md(n) {
  const e = [...n.querySelectorAll(
    'input[name="might"], input[name="speed"], input[name="intellect"]'
  )], t = n.querySelector("[data-core-points-remaining]"), i = n.querySelector('button[data-action="ok"]'), o = () => {
    const a = e.map((l) => Number(l.value)), r = a.every((l) => Number.isInteger(l) && l >= 0 && l <= 6), s = 6 - a.reduce((l, u) => l + u, 0);
    t && (t.value = String(s)), i && (i.disabled = !r || s !== 0);
  };
  e.forEach((a) => a.addEventListener("input", o)), o();
}
function Hn(n) {
  const e = n instanceof ue ? `CYPHERV2.Creation.Errors.${n.code}` : "CYPHERV2.Creation.Errors.Unexpected";
  n instanceof ue || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function pd(n) {
  const e = await an(
    game.i18n.localize("CYPHERV2.Creation.StepPools"),
    `<p>${game.i18n.localize("CYPHERV2.Creation.PoolsPrompt")}</p>
     <label>${game.i18n.localize("CYPHERV2.Pools.Might")} 8 + <input name="might" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Speed")} 8 + <input name="speed" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")} 8 + <input name="intellect" type="number" min="0" max="6" value="0"></label>
     <p>${game.i18n.localize("CYPHERV2.Creation.PointsRemaining")}: <output data-core-points-remaining>6</output> / 6</p>`,
    md
  );
  if (!e) return;
  const t = { might: on(e, "might"), speed: on(e, "speed"), intellect: on(e, "intellect") };
  if (Object.values(t).reduce((u, c) => u + c, 0) !== 6 || Object.values(t).some((u) => !Number.isInteger(u) || u < 0)) {
    Hn(new ue("invalid-pools", "Invalid Pool allocation."));
    return;
  }
  const i = await an(
    game.i18n.localize("CYPHERV2.Creation.StepSkills"),
    di(1, game.i18n.localize("CYPHERV2.Creation.SkillOne")) + di(2, game.i18n.localize("CYPHERV2.Creation.SkillTwo"))
  );
  if (!i) return;
  const o = [mi(i, 1, "trained"), mi(i, 2, "trained")];
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.OptionalThird") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Creation.OptionalThirdPrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.AddThird") },
    no: { label: game.i18n.localize("CYPHERV2.Creation.KeepTwo") }
  })) {
    const u = await an(
      game.i18n.localize("CYPHERV2.Creation.OptionalThird"),
      di(3, game.i18n.localize("CYPHERV2.Creation.SkillThree")) + di(4, game.i18n.localize("CYPHERV2.Creation.Inability"))
    );
    if (!u) return;
    o.push(mi(u, 3, "trained"), mi(u, 4, "inability"));
  }
  const r = o.map((u) => u.customName || [...game.items].find((c) => c.uuid === u.sourceUuid)?.name || game.i18n.localize("CYPHERV2.Creation.UnknownSkill"));
  if (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.StepReview") },
    content: `<div class="cypherv2-dialog-fields">
      <p>${game.i18n.localize("CYPHERV2.Pools.Might")} ${8 + t.might} · ${game.i18n.localize("CYPHERV2.Pools.Speed")} ${8 + t.speed} · ${game.i18n.localize("CYPHERV2.Pools.Intellect")} ${8 + t.intellect}</p>
      <ul>${r.map((u, c) => `<li>${An(u)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${o[c].rank}`)}</li>`).join("")}</ul>
    </div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.Finalize") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const l = { pools: t, skills: o };
  try {
    await game.cypherv2.services.characterInitialization.setup(n, l), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize("CYPHERV2.Creation.Completed"));
  } catch (u) {
    Hn(u);
  }
}
async function Bo(n, e) {
  try {
    await game.cypherv2.services.characterInitialization.markInitialized(n, e), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize(
      e === "skipped" ? "CYPHERV2.Creation.Skipped" : "CYPHERV2.Creation.Marked"
    ));
  } catch (t) {
    Hn(t);
  }
}
function pi(n, e) {
  return e.map((t) => n.system.graph.nodes.find((i) => i.id === t)?.abilitySnapshot.name || t).join(", ");
}
async function fd(n, e, t) {
  return game.cypherv2.services.focusAcquisition.hasEmbeddedAbility(n, e.uuid, t) ? !!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoDeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.UndoDeletePrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoDeleteAbility") },
    no: { label: game.i18n.localize("CYPHERV2.Focus.UndoKeepAbility") }
  }) : !1;
}
async function Lo(n, e, t, i = !1) {
  const o = e.system.graph.nodes.find((s) => s.id === t);
  if (!o || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.UndoConfirm", { name: o.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const r = await fd(n, e, t);
  try {
    const s = await game.cypherv2.services.focusAcquisition.undo(
      n,
      e,
      t,
      { deleteAbility: r, force: i }
    );
    ui.notifications.info(game.i18n.localize(s.choiceRestored ? "CYPHERV2.Focus.UndoChoiceRestored" : "CYPHERV2.Focus.UndoCompleted")), s.invalidOwnedNodeIds.length > 0 && ui.notifications.warn(game.i18n.format("CYPHERV2.Focus.ProgressionEdit.InvalidWarning", {
      nodes: pi(e, s.invalidOwnedNodeIds)
    }));
  } catch (s) {
    if (s instanceof de && s.code === "undo-dependent-nodes") {
      if (!game.user.isGM) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Focus.Errors.UndoDependencies", {
          nodes: pi(e, s.dependentNodeIds)
        }));
        return;
      }
      if (await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.ForceUndo") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.ForceUndoWarning", {
          nodes: pi(e, s.dependentNodeIds)
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
          nodes: pi(e, u.invalidOwnedNodeIds)
        }));
      }
      return;
    }
    console.error(s), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
  }
}
async function hd(n, e, t) {
  if (!game.user.isGM) return;
  const i = e.system.graph.nodes.find((a) => a.id === t);
  !i || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.MarkOwnedConfirm", { name: i.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (await game.cypherv2.services.focusAcquisition.markOwnedWithGmOverride(n, e, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkedOwned")));
}
function Ce(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function jo(n) {
  return n ? game.i18n.localize(`CYPHERV2.Skill.Ranks.${n}`) : "";
}
function gd(n) {
  const e = n.toObject();
  return {
    name: n.name,
    ...e.img ? { img: e.img } : {},
    system: structuredClone(e.system ?? {})
  };
}
async function Wo(n, e, t) {
  const i = e ? await fromUuid(e) : null;
  return !(i instanceof Item) || i.type !== n.type ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.InvalidReplacement")), null) : {
    action: "replace",
    selectionKind: t,
    replacement: {
      id: i.uuid,
      type: n.type,
      name: i.name,
      itemUuid: i.uuid,
      snapshot: gd(i),
      reason: game.i18n.localize(t === "compendium" ? "CYPHERV2.GrantConflict.CompendiumItem" : "CYPHERV2.GrantConflict.WorldItem"),
      reasonSourceUuid: i.uuid
    }
  };
}
async function $t(n) {
  const e = [...game.items].filter((u) => u.type === n.type).filter((u) => u.uuid !== n.existing.contentUuid && u.uuid !== n.proposed.contentUuid).sort((u, c) => u.name.localeCompare(c.name)), t = n.suggestions.length ? n.suggestions.map((u) => `
      <label class="grant-conflict-option">
        <input type="radio" name="resolution" value="suggestion:${Ce(u.id)}">
        <span><strong>${Ce(u.name)}</strong><small>${Ce(u.reason)}</small></span>
      </label>`).join("") : `<p class="empty-list">${game.i18n.localize("CYPHERV2.GrantConflict.NoSuggestions")}</p>`, i = game.i18n.localize(n.type === "skill" ? "CYPHERV2.GrantConflict.Skill" : "CYPHERV2.GrantConflict.Ability"), o = n.existing.rank ? ` — ${Ce(jo(n.existing.rank))}` : "", a = n.proposed.rank ? ` — ${Ce(jo(n.proposed.rank))}` : "", r = game.user.isGM ? `
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="world"><span>${game.i18n.localize("CYPHERV2.GrantConflict.WorldItem")}</span></label>
      <select name="worldUuid">${e.map((u) => `<option value="${Ce(u.uuid)}">${Ce(u.name)}</option>`).join("")}</select>
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="uuid"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CompendiumUuid")}</span></label>
      <input name="documentUuid" type="text" placeholder="Compendium.world.pack.Item.id">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.GmExternalOnly")}</p>`, s = n.context === "package" ? `<fieldset><legend>${game.i18n.format("CYPHERV2.GrantConflict.ChooseAnother", { type: i })}</legend>
      ${r}
      ${n.allowCustom ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="custom"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill")}</span></label><input name="customName" type="text" placeholder="${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkillName")}">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.NoCustomAbility")}</p>`}
    </fieldset>` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.FocusRestriction")}</p>`, l = `<div class="cypherv2 cypherv2-dialog grant-conflict-dialog">
    <div class="grant-conflict-comparison">
      <p><span>${game.i18n.localize("CYPHERV2.GrantConflict.AlreadyHave")}</span><strong>${Ce(n.existing.name)}${o}</strong></p>
      <p><span>${game.i18n.format("CYPHERV2.GrantConflict.WouldGrant", { source: Ce(n.packageName) })}</span><strong>${Ce(n.proposed.name)}${a}</strong></p>
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
      const p = n.suggestions.find((h) => h.id === c.slice(11));
      if (p) return { action: "replace", replacement: p, selectionKind: "suggested" };
    }
    if (c === "world") {
      const p = await Wo(n, String(u.worldUuid ?? ""), "world");
      if (p) return p;
    }
    if (c === "uuid") {
      const p = String(u.documentUuid ?? "").trim(), h = await Wo(n, p, p.startsWith("Compendium.") ? "compendium" : "world");
      if (h) return h;
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
function mt(n) {
  return n.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}
function yd(n, e) {
  const t = n.genre === "custom" ? String(n.customGenreId ?? "") : String(n.genre ?? "");
  if (!t || t === "none") return null;
  const i = [...e].sort((o, a) => o.uuid.localeCompare(a.uuid));
  return i.find((o) => o.uuid === t) ?? i.find((o) => mt(o.system.legacyKey) === mt(t)) ?? i.find((o) => mt(String(o.system.slug ?? "")) === mt(t)) ?? i.find((o) => mt(o.name) === mt(t)) ?? null;
}
async function Dr(n, e, t) {
  if (n.genre === "custom" && n.customGenreId) {
    const i = await t(n.customGenreId);
    if (i?.type === "genre") return i;
  }
  return yd(n, e);
}
class Tt extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreAssociationError";
  }
  code;
}
class x extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreChoiceError";
  }
  code;
}
function bd() {
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
function _o(n) {
  return structuredClone(n);
}
class wd {
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
      if (this.#c(e), t.type !== "genre" || !t.uuid)
        throw new Tt("not-genre", "Only a Genre Item can be attached.");
      if (e.system.genre.sourceUuid === t.uuid)
        throw new Tt("duplicate", "This Genre is already attached.");
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
      this.#c(e);
      const t = _o(e.system.genre);
      if (!t.sourceUuid) throw new Tt("missing", "No Genre is attached.");
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
    return t.system.abilityCatalog.filter((o) => (o.catalog ?? "progression") === "progression" && o.minimumTier <= L(e.system) && o.minimumTier <= i.grantTier);
  }
  manualCatalog(e, t) {
    return t.system.abilityCatalog.filter((i) => (i.catalog ?? "progression") === "progression").map((i) => ({
      id: i.id,
      name: i.snapshot.name || i.id,
      minimumTier: i.minimumTier,
      normallyAvailable: i.minimumTier <= L(e.system),
      owned: !!this.#l(e, t, e.system.genre, i, "active")
    })).sort((i, o) => i.minimumTier - o.minimumTier || i.name.localeCompare(o.name));
  }
  async acquireManual(e, t, i) {
    return this.#s(e, async () => {
      this.#c(e);
      const o = e.system.genre;
      if (!o.sourceUuid) throw new x("genre-required", "Attach a Genre before acquiring an Ability.");
      const a = await this.#e(o.sourceUuid);
      if (!a || a.type !== "genre") throw new x("genre-unavailable", "The active Genre source is unavailable.");
      const r = a.system.abilityCatalog.find((m) => m.id === t);
      if (!r) throw new x("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if ((r.catalog ?? "progression") !== "progression")
        throw new x("entry-ineligible", "Origin Abilities are not part of Genre progression.");
      if (this.#l(e, a, o, r, "active")) return { entry: r, abilityCreated: !1, conflictOverridden: !1 };
      const l = this.#l(e, a, o, r, "retained");
      if (l?.update)
        return await l.update({ "system.grantedBy.status": "active" }), { entry: r, abilityCreated: !1, conflictOverridden: !1 };
      const u = await this.#r(a, o, r), c = this.#a(e, a, r, u);
      let p = !1;
      if (c) {
        if (!i) throw new x("duplicate-grant", "This Ability is already present on the Character.");
        const m = await i(c);
        if (m.action === "cancel") throw new Ge();
        if (m.action !== "gmOverride")
          throw new x("duplicate-grant", "A Genre acquisition must use an Ability from its Genre catalog.");
        p = !0;
      }
      const h = c ? void 0 : (await e.createEmbeddedDocuments("Item", [u]))[0];
      return { entry: r, abilityCreated: !!h, conflictOverridden: p };
    });
  }
  async undoManual(e, t, i) {
    return this.#s(e, async () => {
      this.#c(e);
      const o = e.system.genre;
      if (!o.sourceUuid) throw new x("genre-required", "No active Genre is attached.");
      const a = await this.#e(o.sourceUuid);
      if (!a || a.type !== "genre") throw new x("genre-unavailable", "The active Genre source is unavailable.");
      const r = a.system.abilityCatalog.find((l) => l.id === t);
      if (!r) throw new x("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      const s = this.#l(e, a, o, r, "active");
      if (!s) throw new x("entry-missing", "This Genre Ability is not currently owned.");
      if (i) {
        if (!s.delete) throw new x("ability-unavailable", "The embedded Genre Ability cannot be deleted.");
        return await s.delete(), { abilityDeleted: !0, abilityRetained: !1 };
      }
      if (!s.update) throw new x("ability-unavailable", "The embedded Genre Ability cannot be retained.");
      return await s.update({ "system.grantedBy.status": "retained" }), { abilityDeleted: !1, abilityRetained: !0 };
    });
  }
  async acquire(e, t, i, o) {
    return this.#s(e, async () => {
      this.#c(e);
      const a = e.system.genre;
      if (!a.sourceUuid) throw new x("genre-required", "Attach a Genre before spending this choice.");
      const r = await this.#e(a.sourceUuid);
      if (!r || r.type !== "genre") throw new x("genre-unavailable", "The active Genre source is unavailable.");
      const s = e.system.advancement.pendingGenreChoices.find((m) => m.id === t);
      if (!s) throw new x("choice-missing", "The pending Genre Choice no longer exists.");
      const l = r.system.abilityCatalog.find((m) => m.id === i);
      if (!l) throw new x("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (!this.eligibleEntries(e, r, s).some((m) => m.id === l.id))
        throw new x("entry-ineligible", "This Genre Ability is not eligible for the selected choice.");
      const u = await this.#r(r, a, l), c = this.#a(e, r, l, u);
      let p = !1;
      if (c) {
        if (!o) throw new x("duplicate-grant", "This Ability is already present on the Character.");
        const m = await o(c);
        if (m.action === "cancel") throw new Ge();
        if (m.action !== "gmOverride")
          throw new x("duplicate-grant", "A Genre choice must grant an Ability from its Genre catalog.");
        p = !0;
      }
      let h;
      c || (h = (await e.createEmbeddedDocuments("Item", [u]))[0]);
      try {
        await e.update({
          "system.advancement.pendingGenreChoices": e.system.advancement.pendingGenreChoices.filter((m) => m.id !== s.id)
        });
      } catch (m) {
        throw await h?.delete?.(), m;
      }
      return { entry: l, abilityCreated: !!h, conflictOverridden: p };
    });
  }
  async #r(e, t, i) {
    const o = i.abilityUuid ? await this.#t(i.abilityUuid) : null, a = o?.type === "ability" ? o : null, r = i.snapshot;
    if (!a && (!r.name || !r.system))
      throw new x("ability-unavailable", "The Genre Ability source and snapshot are unavailable.");
    const s = a?.name ?? r.name, l = a?.img ?? r.img ?? "", u = a?.system ?? r.system, c = Pe("ability", s, i.abilityUuid || a?.uuid || ""), p = {
      kind: "genre",
      sourceUuid: e.uuid,
      instanceId: t.instanceId,
      grantId: i.id,
      status: "active",
      contentUuid: c.contentUuid,
      contentKey: c.contentKey,
      replacement: bd()
    };
    return { name: s, img: l, type: "ability", system: { ..._o(u), grantedBy: p } };
  }
  #l(e, t, i, o, a) {
    return [...e.items].find((r) => {
      if (r.type !== "ability") return !1;
      const s = r.system.grantedBy ?? {};
      return s.kind === "genre" && s.sourceUuid === t.uuid && s.instanceId === i.instanceId && s.grantId === o.id && s.status === a;
    }) ?? null;
  }
  #a(e, t, i, o) {
    const r = o.system.grantedBy, s = Pe("ability", String(o.name), r.contentUuid), l = zi(e.items, s);
    if (!l) return null;
    const u = l.system.grantedBy ?? {}, c = Pe("ability", l.name, String(u.contentUuid ?? "")), p = (h, m, y) => ({
      id: m,
      name: h.name,
      type: "ability",
      rank: "",
      contentUuid: y.contentUuid,
      contentKey: y.contentKey
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
  #c(e) {
    if (e.type !== "character") throw new Tt("not-character", "Genre association requires a Character.");
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
function ze(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Ni(n) {
  if (n instanceof Ge) return;
  console.error(n);
  const e = n instanceof Tt ? `CYPHERV2.Genre.Errors.${n.code}` : n instanceof x ? `CYPHERV2.Genre.Errors.${n.code}` : "CYPHERV2.Genre.Errors.unexpected";
  ui.notifications.error(game.i18n.localize(e));
}
async function $n(n, e, t = "manual") {
  let i = e;
  if (!i) {
    const o = [...game.items].filter((r) => r.type === "genre").sort((r, s) => r.name.localeCompare(s.name));
    if (!o.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldGenres"));
      return;
    }
    const a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Add") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Label")}<select name="uuid">${o.map((r) => `<option value="${ze(r.uuid)}">${ze(r.name)}</option>`).join("")}</select></label></div>`,
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
      Ni(o);
    }
}
async function vd(n) {
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Genre.Remove") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.RemoveConfirm")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Remove") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }))
    try {
      await game.cypherv2.services.genres.remove(n), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Removed"));
    } catch (t) {
      Ni(t);
    }
}
async function Cd(n, e) {
  try {
    const t = await game.cypherv2.services.genres.active(n);
    if (!t) throw new x("genre-required", "Attach a Genre first.");
    const i = n.system.advancement.pendingGenreChoices.find((r) => r.id === e);
    if (!i) throw new x("choice-missing", "Choice not found.");
    const o = game.cypherv2.services.genres.eligibleEntries(n, t, i);
    if (!o.length) throw new x("entry-ineligible", "No eligible Genre Ability is available.");
    const a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.ChooseAbility") },
      content: `<div class="cypherv2-dialog-fields"><p><strong>${ze(t.name)}</strong></p><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}<select name="entryId">${o.map((r) => `<option value="${ze(r.id)}">${ze(r.snapshot.name)} (${game.i18n.localize("CYPHERV2.Focus.Tier")} ${r.minimumTier})</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Genre.Acquire") }
    });
    if (!a) return;
    await game.cypherv2.services.genres.acquire(
      n,
      i.id,
      String(a.entryId ?? ""),
      $t
    ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
  } catch (t) {
    Ni(t);
  }
}
async function Ed(n) {
  try {
    const e = await game.cypherv2.services.genres.active(n);
    if (!e) throw new x("genre-required", "Attach a Genre first.");
    const t = game.cypherv2.services.genres.manualCatalog(n, e);
    if (!t.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoCatalogAbilities"));
      return;
    }
    const i = `<div class="cypherv2 genre-ability-browser">
      <p class="genre-browser-source"><strong>${ze(e.name)}</strong></p>
      <div class="genre-browser-list">${t.map((u, c) => `
        <label class="genre-browser-entry${u.owned ? " is-owned" : ""}${u.normallyAvailable ? "" : " is-future"}">
          <input type="radio" name="entryId" value="${ze(u.id)}"${c === 0 ? " checked" : ""}>
          <span><strong>${ze(u.name)}</strong><small>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")} ${u.minimumTier}</small></span>
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
        $t
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
      return;
    }
    if (!await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Browser.Undo") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.Browser.UndoConfirm", { name: ze(r.name) })}</p></div>`,
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
    Ni(e);
  }
}
function Ut(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Rd(n, e, t) {
  return n.includes(e) ? n.filter((i) => i !== e) : n.length >= t ? [...n] : [...n, e];
}
function Pd() {
  let n = !1;
  return () => n ? !1 : (n = !0, !0);
}
function Sd(n, e) {
  return n.map((t, i) => `<button type="button" class="package-choice-option"${e ? ` data-action="package-choice-${i}"` : ""} data-package-choice-option data-option-id="${Ut(t.id)}" aria-pressed="false"><i class="fa-solid fa-check package-choice-check" aria-hidden="true"></i><span>${Ut(t.label)}</span></button>`).join("");
}
async function Mi(n) {
  const e = n.options.filter((l, u, c) => l.id && c.findIndex((p) => p.id === l.id) === u);
  if (!Number.isInteger(n.choose) || n.choose < 1 || n.choose > e.length) return null;
  const t = n.choose === 1, i = Pd();
  let o = [];
  const a = `<div class="cypherv2 cypherv2-dialog package-choice-dialog ${t ? "package-choice-single" : "package-choice-multiple"}" data-package-choice-required="${n.choose}">
    <header class="cypherv2-dialog-heading package-choice-heading"><strong>${Ut(n.title)}</strong></header>
    <p class="cypherv2-dialog-help package-choice-prompt">${Ut(n.prompt)}</p>
    <div class="package-choice-options" role="group" aria-label="${Ut(n.ariaLabel)}">${Sd(e, t)}</div>
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
      const c = [...u.element.querySelectorAll("button[data-package-choice-option]")], p = u.element.querySelector('button[data-action="confirm-package-choice"]'), h = u.element.querySelector("[data-package-choice-count]"), m = () => {
        for (const y of c) {
          const f = o.includes(y.dataset.optionId ?? "");
          y.classList.toggle("is-selected", f), y.setAttribute("aria-pressed", String(f));
        }
        p && (p.disabled = o.length !== n.choose), h && (h.textContent = game.i18n.format("CYPHERV2.Packages.SelectionCount", {
          selected: o.length,
          required: n.choose
        }));
      };
      for (const y of c)
        y.addEventListener("click", () => {
          o = Rd(o, y.dataset.optionId ?? "", n.choose), m();
        });
      m();
    }
  });
  return Array.isArray(s) && s.length === n.choose ? s : null;
}
const kd = "cypherv2.descriptors";
function Ad(n) {
  return structuredClone(n);
}
function Hd(n) {
  const e = n.toObject?.() ?? {};
  return {
    name: String(e.name ?? n.name),
    ...String(e.img ?? n.img ?? "") ? { img: String(e.img ?? n.img) } : {},
    system: Ad(e.system ?? n.system)
  };
}
function $d(n, e) {
  const t = n.name.toLocaleLowerCase(), i = e.name.toLocaleLowerCase();
  return t < i ? -1 : t > i ? 1 : n.uuid < e.uuid ? -1 : n.uuid > e.uuid ? 1 : 0;
}
function Id(n, e) {
  const t = /* @__PURE__ */ new Map();
  for (const o of e)
    o.type !== "descriptor" || !o.uuid || t.has(o.uuid) || t.set(o.uuid, o);
  const i = [...t.values()].sort($d).map((o) => ({
    id: o.uuid,
    descriptorUuid: o.uuid,
    snapshot: Hd(o)
  }));
  return n.map((o) => (o.sourceMode ?? "fixed") !== "catalog" ? o : {
    ...o,
    options: o.catalogItemType === "descriptor" ? i : []
  });
}
async function Vd() {
  const n = game, e = n.packs?.get(kd), t = e ? await e.getDocuments() : [], i = [...n.items].filter((o) => o.type === "descriptor");
  return [...t, ...i];
}
async function Yd(n) {
  return n.some((e) => (e.sourceMode ?? "fixed") === "catalog") ? Id(n, await Vd()) : [...n];
}
function Pt(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function qi(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
async function ro(n) {
  const e = [...game.items].filter((i) => i.type === n).sort((i, o) => i.name.localeCompare(o.name));
  if (!e.length)
    return ui.notifications.warn(game.i18n.localize(`CYPHERV2.Packages.NoWorld${n === "characterType" ? "Types" : n === "descriptor" ? "Descriptors" : "Species"}`)), null;
  const t = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n === "characterType" ? "CYPHERV2.Packages.AddType" : n === "descriptor" ? "CYPHERV2.Packages.AddDescriptor" : "CYPHERV2.Packages.AddSpecies") },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}
      <select name="uuid">${e.map((i) => `<option value="${Pt(i.uuid)}">${Pt(i.name)}</option>`).join("")}</select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
  });
  return t ? await fromUuid(String(t.uuid ?? "")) : null;
}
async function so(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Packages.Remove") },
    content: `<div class="cypherv2-dialog-fields"><p>${game.i18n.format("CYPHERV2.Packages.RemoveConfirm", { name: Pt(n) })}</p>
      <label>${game.i18n.localize("CYPHERV2.Packages.GrantedItems")}
        <select name="mode"><option value="delete">${game.i18n.localize("CYPHERV2.Packages.RemoveWithGrants")}</option><option value="keep">${game.i18n.localize("CYPHERV2.Packages.KeepGrants")}</option></select>
      </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Packages.Remove") }
  });
  return e && (e.mode === "delete" || e.mode === "keep") ? e.mode : null;
}
function xi(n) {
  console.error(n), ui.notifications.error(n instanceof Error ? n.message : String(n));
}
function lo(n) {
  return n.map((e) => ({
    id: e,
    label: game.i18n.localize(`CYPHERV2.Pools.${e[0].toUpperCase()}${e.slice(1)}`)
  }));
}
async function Tr(n) {
  const t = (await Mi({
    title: n,
    prompt: game.i18n.format("CYPHERV2.Packages.ChooseOne", {
      label: game.i18n.localize("CYPHERV2.Packages.EdgeChoice")
    }),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.EdgeChoice"),
    choose: 1,
    options: lo(V)
  }))?.[0];
  return V.includes(t) ? t : null;
}
async function Fd(n) {
  const t = (await Mi({
    title: n,
    prompt: game.i18n.localize("CYPHERV2.Packages.SuperheroicsPoolPrompt"),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.SuperheroicsPool"),
    choose: 1,
    options: lo(V)
  }))?.[0];
  return V.includes(t) ? t : null;
}
async function Ko(n, e) {
  const t = e ?? await ro("characterType");
  if (!t) return;
  const i = qi(n).find((p) => p.type === "characterType");
  let o, a;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Packages.ReplaceType") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Packages.ReplaceTypeConfirm", { name: Pt(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (o = i.id, a = await so(i.name) ?? void 0, !a)))
    return;
  const r = t.system;
  let s;
  if (r.edgeGrant.mode === "choice" && (s = await Tr(t.name) ?? void 0, !s))
    return;
  let l;
  if (r.genre === "superhero" && r.superhero?.superheroics?.enabled && (l = await Fd(t.name) ?? void 0, !l))
    return;
  const u = await tt(t.name, r.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (u === null) return;
  const c = await tt(t.name, r.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (c !== null)
    try {
      await game.cypherv2.services.characterPackages.attachType(n, t, {
        conflictResolver: $t,
        skillChoices: u,
        abilityChoices: c,
        ...s ? { edgePool: s } : {},
        ...l ? { superheroicsPool: l } : {},
        ...o ? { replaceItemId: o } : {},
        ...a ? { replaceGrantedItemsMode: a } : {}
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.TypeAttached"));
      const p = n;
      if (!p.system.genre.sourceUuid) {
        const h = [...game.items].filter((y) => y.type === "genre"), m = await Dr(
          r,
          h,
          async (y) => await fromUuid(y)
        );
        m && await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("CYPHERV2.Genre.TypeSuggestion") },
          content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.TypeSuggestionPrompt", { genre: Pt(m.name) })}</p></div>`,
          yes: { label: game.i18n.localize("CYPHERV2.Genre.AttachSuggestion") },
          no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
        }) && await $n(p, m, "typeSuggestion");
      }
    } catch (p) {
      p instanceof Ge || xi(p);
    }
}
async function Xo(n, e) {
  const t = e ?? await ro("descriptor");
  if (!t) return;
  const i = qi(n).some((l) => l.type === "descriptor" && l.system.instance.role === "primary"), o = await foundry.applications.api.DialogV2.input({
    window: { title: t.name },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.DescriptorRole")}
      <select name="role">${i ? "" : `<option value="primary">${game.i18n.localize("CYPHERV2.Packages.Role.primary")}</option>`}<option value="additional">${game.i18n.localize("CYPHERV2.Packages.Role.additional")}</option><option value="custom">${game.i18n.localize("CYPHERV2.Packages.Role.custom")}</option></select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Next") }
  });
  if (!o) return;
  const a = t.system, r = await zr(t.name, a.poolBonusChoiceGroups ?? []);
  if (r === null) return;
  const s = await tt(
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
        conflictResolver: $t
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.DescriptorAttached"));
    } catch (l) {
      l instanceof Ge || xi(l);
    }
}
async function zr(n, e) {
  const t = {};
  for (const i of e) {
    const o = [...new Set(i.pools)].filter((r) => V.includes(r));
    if (i.choose < 1 || i.choose > o.length)
      return ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null;
    const a = await Mi({
      title: n,
      prompt: i.choose === 1 ? game.i18n.localize("CYPHERV2.Packages.ChooseOnePool") : game.i18n.format("CYPHERV2.Packages.ChooseManyPools", { count: i.choose }),
      ariaLabel: game.i18n.localize("CYPHERV2.Packages.AllowedPools"),
      choose: i.choose,
      options: lo(o)
    });
    if (!a) return null;
    t[i.id] = a.filter((r) => V.includes(r));
  }
  return t;
}
async function tt(n, e, t) {
  const i = {};
  for (const o of e) {
    const a = o.rank ? game.i18n.format("CYPHERV2.Packages.ChooseSkills", {
      count: o.choose,
      rank: game.i18n.localize(`CYPHERV2.Skill.Ranks.${o.rank}`)
    }) : game.i18n.format(
      o.choose === 1 ? "CYPHERV2.Packages.ChooseOne" : "CYPHERV2.Packages.ChooseMany",
      { count: o.choose, label: t }
    ), r = await Mi({
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
async function Jo(n, e) {
  const t = e ?? await ro("species");
  if (!t) return;
  const i = qi(n).find((f) => f.type === "species");
  let o, a;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Species.Replace") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Species.ReplaceConfirm", { name: Pt(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (o = i.id, a = await so(i.name) ?? void 0, !a)))
    return;
  const r = t.system;
  let s;
  if (r.edgeGrant.mode === "choice" && (s = await Tr(t.name) ?? void 0, !s))
    return;
  const l = await tt(t.name, r.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (l === null) return;
  const u = await tt(t.name, r.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (u === null) return;
  const c = await Yd(r.descriptorChoiceGroups ?? []), p = await tt(
    t.name,
    c,
    game.i18n.localize("CYPHERV2.Species.DescriptorChoice")
  );
  if (p === null) return;
  const h = c.flatMap((f) => f.options.filter((w) => p[f.id]?.includes(w.id)).map((w) => ({ ...w, id: `${f.id}:${w.id}` }))), m = {}, y = {};
  for (const f of [...r.descriptorGrants ?? [], ...h]) {
    const w = f.descriptorUuid ? await fromUuid(f.descriptorUuid) : null, C = w?.system ?? f.snapshot.system, P = await zr(
      f.snapshot.name || w?.name || t.name,
      C.poolBonusChoiceGroups ?? []
    );
    if (P === null) return;
    const Y = await tt(f.snapshot.name || w?.name || t.name, C.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
    if (Y === null) return;
    m[f.id] = Y, y[f.id] = P;
  }
  try {
    await game.cypherv2.services.characterPackages.attachSpecies(n, t, {
      ...s ? { edgePool: s } : {},
      skillChoices: l,
      abilityChoices: u,
      descriptorChoices: p,
      resolvedDescriptorChoiceGroups: c,
      descriptorSkillChoices: m,
      descriptorPoolChoices: y,
      conflictResolver: $t,
      ...o ? { replaceItemId: o } : {},
      ...a ? { replaceGrantedItemsMode: a } : {}
    }), ui.notifications.info(game.i18n.localize("CYPHERV2.Species.Attached"));
  } catch (f) {
    f instanceof Ge || xi(f);
  }
}
async function Dd(n, e) {
  const t = qi(n).find((o) => o.id === e);
  if (!t) return;
  const i = await so(t.name);
  if (i)
    try {
      await game.cypherv2.services.characterPackages.remove(n, e, i), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.Removed"));
    } catch (o) {
      xi(o);
    }
}
function Nr(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function Td() {
  return [...game.user.targets ?? []].flatMap((n) => {
    const e = wr(n);
    if (e) return [e];
    const t = vr(n);
    return t ? [t] : [];
  });
}
function Qo(n, e) {
  const t = We(n);
  if (t.length === 1) {
    const o = t[0];
    return `<input type="hidden" name="pool" value="${o}"><div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${o[0].toUpperCase()}${o.slice(1)}`)}</span></div>`;
  }
  if (!e && t.length === 0) return "";
  const i = t.length > 1 ? t : gl;
  return `<label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${i.map((o) => `<option value="${o}">${game.i18n.localize(`CYPHERV2.Pools.${o[0].toUpperCase()}${o.slice(1)}`)}</option>`).join("")}</select></label>`;
}
function zd(n) {
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${oo(0, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...Nr(n).map((e) => `<option value="${e.id}">${e.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${e.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function Nd(n, e) {
  const t = re(e, "skillId");
  return Nr(n).find((i) => i.id === t);
}
function Md(n) {
  const e = re(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function Zo(n) {
  const e = re(n, "pool");
  return e === "might" || e === "speed" || e === "intellect" ? e : void 0;
}
async function qd(n, e) {
  if (!game.cypherv2.services.abilities.canUse(e)) return;
  const t = Me(), i = t.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), a = e.system.targetMode === "none" ? [] : Td(), r = a.filter((f) => f.type === "npc"), s = e.system.roll !== "none", l = e.system.targetMode === "none" ? "" : `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${a.length ? a.map((f) => f.name).join(", ") : game.i18n.localize("CYPHERV2.Common.None")}</span></div>`;
  if (!s) {
    const f = await foundry.applications.api.DialogV2.input({
      window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}` },
      content: `<div class="cypherv2 cypherv2-dialog-fields"><p><strong>${e.name}</strong></p>${l}${Qo(e, !1)}</div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Ability.Use") }
    });
    if (!f) return;
    try {
      const w = Zo(f), C = await game.cypherv2.services.abilities.executeNoRoll(n, e, {
        ...w ? { pool: w } : {},
        targets: a,
        enabledRuleModuleIds: i
      });
      await game.cypherv2.services.abilityChat.publishNoRoll(n, C);
    } catch (w) {
      ui.notifications.error(w instanceof Error ? w.message : String(w));
    }
    return;
  }
  const u = r.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</strong><span>${game.i18n.localize("CYPHERV2.Roll.HiddenValue")}</span></div>` : ei(o.difficultyCeiling, !0), c = (f) => {
    const w = Nd(n, f), C = Zo(f);
    return {
      ...C ? { pool: C } : {},
      targets: a,
      difficulty: Jt(f),
      ...w ? { skill: w } : {},
      skillSteps: Md(f),
      assets: G(f, "assets"),
      paidEffort: G(f, "paidEffort"),
      damageEffort: G(f, "damageEffort"),
      freeDamageEffort: G(f, "freeDamageEffort"),
      freeEffort: G(f, "freeEffort"),
      ...Qt(f),
      enabledRuleModuleIds: i
    };
  }, p = (f) => {
    const w = game.cypherv2.services.abilities.buildRollPlan(n, e, c(f)).requests[0];
    if (!w) throw new Error("Ability preview did not produce a roll request.");
    return w;
  }, h = `
    ${l}
    ${u}
    ${Qo(e, !0)}
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${zd(n)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ge(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ge(n.system.derived.effort.max)}</select></label>
    ${e.system.roll === "attack" ? `<label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${ge(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>` : ""}
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${Zt()}`, m = game.cypherv2.services.combat.policy(i), y = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: ti({
      identity: e.name,
      settings: h,
      ...e.system.roll === "attack" ? { attackSummary: " " } : {}
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (f, w) => {
      ii(w.element, {
        actor: n,
        policyRequest: t,
        buildRequest: p,
        ...e.system.roll === "attack" ? {
          attackSummary: (C, P) => [
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${e.system.damage}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${P.context.damageEffort ?? 0}</strong></div>`,
            ...(P.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${P.context.freeDamageEffort}</strong></div>`] : [],
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${P.damageEffortApplied}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${m.damageEffortBonus}</strong></div>`,
            ...e.system.woundSeverity !== "none" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Npc.WoundSeverity")}</span><strong>${game.i18n.localize(`CYPHERV2.Wounds.${e.system.woundSeverity[0].toUpperCase()}${e.system.woundSeverity.slice(1)}`)}</strong></div>`] : [],
            ...e.system.range ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${e.system.range}</strong></div>`] : []
          ].join("")
        } : {}
      });
    }
  });
  if (y)
    try {
      let f = await game.cypherv2.services.abilities.executeRoll(
        n,
        e,
        c(y),
        t
      );
      if (e.system.roll === "attack") {
        const C = await Sr(f);
        C && (f = game.cypherv2.services.abilities.chooseAttackOutcomes(f, C));
      }
      for (const C of f)
        await game.cypherv2.services.abilityChat.publishRoll(
          n,
          C,
          Di(),
          Ti()
        );
      const w = f[0];
      w && await Xt().requestFreeFromNaturalResult(n, w.execution.result);
    } catch (f) {
      ui.notifications.error(f instanceof Error ? f.message : String(f));
    }
}
function xd(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function Ud(n) {
  const e = String(n.pool ?? "");
  return e === "might" || e === "speed" || e === "intellect" ? e : null;
}
async function Gd(n, e) {
  const t = We(e);
  if (e.system.cost.amount <= 0 || t.length === 0)
    throw new Error(game.i18n.localize("CYPHERV2.Ability.Payment.NoCost"));
  let i = t.length === 1 ? t[0] : null;
  if (!i) {
    const r = t.map(
      (l) => game.cypherv2.services.abilities.previewPayment(n, e, l)
    ).map((l, u) => `
      <label class="ability-payment-choice">
        <input type="radio" name="pool" value="${l.pool}" ${u === 0 ? "checked" : ""}>
        <strong>${xd(l.pool)}</strong>
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
    if (i = Ud(s), !i || !t.includes(i)) throw new Error("Invalid Ability payment Pool.");
  }
  const o = await game.cypherv2.services.abilities.payCost(n, e, i);
  await game.cypherv2.services.abilityChat.publishPayment(n, o);
}
const Od = {
  descriptor: { accepts: "descriptor", placeholder: "[DESCRIPTOR]" },
  species: { accepts: "species", placeholder: "[SPECIES]" },
  type: { accepts: "characterType", placeholder: "[TYPE]" },
  focus: { accepts: "focus", placeholder: "[FOCUS]" }
}, Bd = {
  "one-action": "CYPHERV2.Hud.Recovery.Action",
  "10-minutes": "CYPHERV2.Hud.Recovery.TenMinutes",
  "1-hour": "CYPHERV2.Hud.Recovery.OneHour",
  "10-hours": "CYPHERV2.Hud.Recovery.TenHours"
};
function Ft(n, e) {
  const t = Od[n];
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
const ea = {
  primary: 0,
  additional: 1,
  custom: 1,
  speciesGranted: 2
};
function rn(n) {
  return n.instanceId || n.id || n.uuid || `${n.role ?? "custom"}:${n.name.trim().toLocaleLowerCase("en-US")}`;
}
function Ld(n = []) {
  const e = /* @__PURE__ */ new Map();
  for (const t of n) {
    const i = rn(t);
    e.has(i) || e.set(i, t);
  }
  return [...e.values()].sort((t, i) => ea[t.role ?? "custom"] - ea[i.role ?? "custom"] || (t.attachedAt ?? 0) - (i.attachedAt ?? 0) || t.name.localeCompare(i.name, "en-US") || rn(t).localeCompare(rn(i), "en-US"));
}
function jd(n) {
  const e = n.trim().replace(/^[^a-z]+/i, "").toLocaleLowerCase("en-US");
  return /^(honest|honor|hour|heir)/.test(e) ? "AN" : /^(one|once|euro|user|use|uni(?:t|v|q))/.test(e) ? "A" : /^[aeiou]/.test(e) ? "AN" : "A";
}
function Wd(n = {}) {
  const e = Ld(n.descriptors), t = e.map((c) => Ft("descriptor", c));
  e.some((c) => c.role === "primary") || t.unshift(Ft("descriptor"));
  const i = n.species ? Ft("species", n.species) : null, o = Ft("type", n.type), a = Ft("focus", n.focus), r = n.hideFocus !== !0, s = jd(t[0].displayName), u = [t.map((c) => c.displayName).join(" AND "), i?.displayName, o.displayName].filter(Boolean).join(" ");
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
function _d(n, e) {
  const t = Math.max(0, Math.trunc(e)), i = Math.max(0, Math.min(t, Math.trunc(n)));
  return Array.from({ length: t }, (o, a) => ({
    index: a,
    filled: a < i,
    targetCount: a + 1 === i ? i - 1 : a + 1
  }));
}
function vi(n, e) {
  return ["minor", "moderate", "major"].map((t) => ({
    severity: t,
    count: n[t],
    capacity: e[t],
    overCapacity: Math.max(0, n[t] - e[t]),
    pips: _d(n[t], e[t])
  }));
}
function Kd(n) {
  return (Array.isArray(n) ? n : at(n)).map((t) => {
    const i = t.used;
    return { id: t.id, type: t.type, used: i, available: !i, shortLabel: Bd[t.type] };
  });
}
function Mr(n, e) {
  const t = Number.isFinite(e) ? Math.max(0, e) : 0, i = Number.isFinite(n) ? Math.max(0, Math.min(t, n)) : 0, o = t > 0 ? i / t : 0;
  return { current: i, max: t, ratio: o, percent: o * 100 };
}
const Xd = ["name", "rank"], ta = {
  expert: 0,
  specialized: 1,
  trained: 2,
  untrained: 3,
  inability: 4
};
function Jd(n) {
  return Xd.includes(n);
}
function Qd(n, e) {
  return [...n].sort((t, i) => (e === "rank" ? ta[t.rank] - ta[i.rank] : 0) || t.name.localeCompare(i.name, "en-US"));
}
function Zd(n) {
  const e = n.system.grantedBy;
  return !e || e.status === "retained" ? !0 : !e.sourceUuid && !e.instanceId && !e.grantId;
}
function ia(n) {
  const e = We(n), t = Number.isInteger(n.system.cost.amount) && n.system.cost.amount > 0 ? n.system.cost.amount : 0;
  return {
    archived: n.system.archived === !0,
    cost: {
      amount: t,
      scalable: n.system.cost.scalable === !0,
      pools: e,
      payable: t > 0 && e.length > 0
    },
    description: n.system.description.trim(),
    canDelete: Zd(n)
  };
}
function eu(n) {
  const e = new Intl.Collator("en-US", { sensitivity: "base", numeric: !0 });
  return n.map((t, i) => ({ ability: t, index: i })).sort((t, i) => +(t.ability.system.archived === !0) - +(i.ability.system.archived === !0) || e.compare(t.ability.name, i.ability.name) || t.index - i.index).map(({ ability: t }) => t);
}
class tu {
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
function Ui(n) {
  return String(n.level ?? "1").trim() || "1";
}
function Ai(n) {
  return !/^\d+$/.test(Ui(n));
}
function In(n) {
  return n.depleted !== !0;
}
function qr(n) {
  return Nn.includes(n) ? n : "subtle";
}
function xr(n) {
  return Mn.includes(n) ? n : "low";
}
function co(n) {
  const e = Number(n.level);
  return n.levelOverride === !0 && Number.isInteger(e) && e >= 1 ? e : qr(n.manifestation) === "manifest" ? 6 : 4;
}
const Vn = ["equipment", "cypher", "artifact"];
function na(n, e) {
  const t = Number(n);
  return Number.isInteger(t) && t >= 0 ? t : e;
}
function Ci(n) {
  return Vn.includes(n);
}
function iu(n) {
  if (!Ci(n.type)) return null;
  const e = n.system.depletion && typeof n.system.depletion == "object" ? n.system.depletion : null;
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    level: n.type === "cypher" ? co(n.system) : n.type === "artifact" ? Ui(n.system) : null,
    levelRollable: n.type === "artifact" && Ai(n.system),
    power: n.type === "cypher" ? xr(n.system.power) : null,
    quantity: n.type === "equipment" ? na(n.system.quantity, 1) : null,
    equipped: n.type === "equipment" && typeof n.system.equipped == "boolean" ? n.system.equipped : null,
    description: typeof n.system.description == "string" ? n.system.description.trim() : "",
    depleted: n.type === "artifact" && n.system.depleted === !0,
    usable: n.type !== "artifact" || In(n.system),
    depletion: n.type === "artifact" && e ? {
      enabled: !!e.enabled,
      formula: String(e.formula || `1${String(e.die ?? "d6")}`),
      threshold: na(e.threshold, 1)
    } : null
  };
}
class oa {
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
function Yn(n) {
  const e = n.track, t = n.severity, i = n.count, o = i === void 0 || i.trim() === "" ? Number.NaN : Number(i);
  if (e !== "character" && e !== "shield" || !ae.includes(t) || !Number.isInteger(o) || o < 0) throw new Error("Invalid Wound count action data.");
  if (e === "shield") {
    const a = n.shieldId?.trim();
    if (!a) throw new Error("Invalid Wound count action data.");
    return { track: e, shieldId: a, severity: t, count: o };
  }
  return { track: e, severity: t, count: o };
}
async function nu(n, e) {
  const t = rt(e);
  if (!t) throw new Error("Weapon family must not be blank.");
  const i = se([...n.system.proficiencies.weaponFamilies, t]);
  return await n.update({ "system.proficiencies.weaponFamilies": i }), i;
}
async function ou(n, e) {
  const t = rt(e), i = se(n.system.proficiencies.weaponFamilies).filter((o) => o !== t);
  return await n.update({ "system.proficiencies.weaponFamilies": i }), i;
}
async function au(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Settings.Character.AddWeaponFamily") },
    content: `<div class="cypherv2 cypherv2-dialog"><label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Settings.Character.WeaponFamily")}
      <input name="family" type="text" list="cypherv2-character-weapon-families" required autofocus>
      <datalist id="cypherv2-character-weapon-families">${Ba.map((t) => `<option value="${ht(t)}"></option>`).join("")}</datalist>
    </label></div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
  });
  e && await nu(n, e.family);
}
function ru(n) {
  const e = n.family, t = n.category;
  if (e !== "weapon" && e !== "armor") throw new Error("Invalid familiarity action data.");
  if (!t || !(e === "weapon" ? xe : Ue).includes(t)) throw new Error("Invalid familiarity action data.");
  return { family: e, category: t };
}
function su(n, e) {
  const t = /* @__PURE__ */ new Set([...xe, ...Ue]), i = new Set(n.filter((o) => t.has(o)));
  return i.has(e) ? i.delete(e) : i.add(e), [...i];
}
async function lu(n, e, t) {
  const i = e === "weapon" ? "weaponCategories" : "armorCategories", o = su(n.system.proficiencies[i], t);
  return await n.update({ [`system.proficiencies.${i}`]: o }), o;
}
function fi(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function cu(n) {
  const e = n ?? { category: "Accuracy", shifts: 1, specification: "", description: "" };
  return `<div class="cypherv2 cypherv2-dialog cypherv2-power-shift-dialog">
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Category")}
      <input name="category" type="text" value="${fi(e.category)}" list="cypherv2-power-shift-categories" required>
      <datalist id="cypherv2-power-shift-categories">${$s.map((t) => `<option value="${fi(t)}"></option>`).join("")}</datalist>
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Shifts")}
      <input name="shifts" type="number" min="1" step="1" value="${e.shifts}" required>
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Specification")}
      <input name="specification" type="text" value="${fi(e.specification)}">
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Description")}
      <textarea name="description" rows="3">${fi(e.description)}</textarea>
    </label>
  </div>`;
}
async function aa(n, e, t) {
  const i = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(t ? "CYPHERV2.PowerShifts.Edit" : "CYPHERV2.PowerShifts.Add") },
    content: cu(t),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (!i) return;
  const o = Fs(e, {
    ...t ? { id: t.id } : {},
    category: String(i.category ?? ""),
    shifts: Number(i.shifts),
    specification: String(i.specification ?? ""),
    description: String(i.description ?? "")
  });
  await n.update({ "system.powerShifts": o });
}
async function du(n, e, t) {
  await n.update({ "system.powerShifts": Ds(e, t) });
}
const hi = "system." + I;
function Ur() {
  return [...game.users];
}
function ra() {
  return Ur().filter((n) => n.active && n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function sa(n, e) {
  return e.isGM || n.testUserPermission(e, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function uu(n) {
  return [...game.messages].some((e) => {
    const t = e.getFlag(I, "playerIntrusion");
    return !!(t && typeof t == "object" && t.requestId === n);
  });
}
class mu {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(hi, (e) => {
      this.#r(e);
    });
  }
  async activate(e) {
    if (!sa(e, game.user))
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
      const i = Oe(), o = ra();
      return o && o.id !== game.user.id ? game.socket.emit(hi, {
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
    if (!(this.#n.has(e) || uu(e))) {
      this.#n.add(e);
      try {
        const a = await fromUuid(t);
        if (!a || a.type !== "character" || a.uuid !== t)
          throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.CharacterMissing"));
        const r = Ur().find((l) => l.id === i && l.active);
        if (!r || !sa(a, r))
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
    const o = ra();
    if (!(!game.user.isGM || o?.id !== game.user.id))
      try {
        await this.#o(i.requestId, i.actorUuid, i.requesterUserId), game.socket.emit(hi, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !0
        });
      } catch (a) {
        game.socket.emit(hi, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !1,
          error: a instanceof Error ? a.message : String(a)
        });
      }
  }
}
let Gt = null;
function pu(n, e) {
  return Gt = new mu(n, e), Gt.initialize(), Gt;
}
function fu() {
  if (!Gt) throw new Error("Player Intrusion controller is not ready.");
  return Gt;
}
const sn = "is-quick-roll-pulse";
function hu(n) {
  n.classList.remove(sn), n.offsetWidth, n.classList.add(sn), n.addEventListener("animationend", () => {
    n.classList.remove(sn);
  }, { once: !0 });
}
const gu = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);
function la(n) {
  const e = n.dataset.severity, t = n.dataset.woundId;
  if (!ae.includes(e) || !t)
    throw new Error("Invalid Wound action data.");
  return { severity: e, woundId: t };
}
function q(n) {
  const e = n.dataset.itemId;
  if (!e) throw new Error("Missing Item ID.");
  return e;
}
function yu(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function ln(n) {
  return n > 0 ? `+${n}` : String(n);
}
function Je(n) {
  const e = n.dataset.focusUuid, t = n.dataset.nodeId;
  if (!e || !t) throw new Error("Missing Focus node action data.");
  return { focusUuid: e, nodeId: t };
}
const bu = {
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
async function Ye(n, e) {
  try {
    const i = await fromUuid(e);
    if (i?.type === "focus") return i;
  } catch {
  }
  const t = n.items.get(e);
  return t?.type === "focus" ? t : null;
}
const ca = /* @__PURE__ */ new Set([
  "applyWound",
  "setCharacterWoundCount",
  "setShieldWoundCount",
  "toggleFamiliarity",
  "addWeaponFamily",
  "removeWeaponFamily",
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
  "addPowerShift",
  "editPowerShift",
  "deletePowerShift",
  "sendItemToChat",
  "createInventoryItem",
  "deleteInventoryItem",
  "rollInventoryDepletion",
  "rollArtifactLevel",
  "playerIntrusion"
]);
class R extends gu {
  #e = new Hr();
  #t = new $r();
  #i = null;
  #n = !1;
  #o = "name";
  #r = new tu();
  #l = new oa();
  #a = new oa();
  #c = null;
  #s = null;
  #d = "skills";
  static DEFAULT_OPTIONS = {
    ...Xn,
    classes: ["cypherv2", "sheet", "actor", "character-sheet"],
    actions: Qn({
      applyWound: R.#J,
      setCharacterWoundCount: R.#Q,
      setShieldWoundCount: R.#Z,
      toggleFamiliarity: R.#ee,
      addWeaponFamily: R.#te,
      removeWeaponFamily: R.#ie,
      editWound: R.#re,
      deleteWound: R.#se,
      poolDamage: R.#le,
      recovery: R.#ce,
      recoveryType: R.#de,
      resetRecoveries: R.#ue,
      rally: R.#me,
      editCharacterOverride: R.#fe,
      clearCharacterOverride: R.#he,
      editWoundCapacityOverride: R.#ge,
      resetWoundCapacityOverride: R.#ye,
      editRecoveryOverride: R.#H,
      resetRecoveryOverride: R.#y,
      rollPool: R.#$,
      inspectHeaderFocus: R.#I,
      createSkill: R.#v,
      setSkillSort: R.#V,
      rollSkill: R.#Y,
      configureSkillRoll: R.#R,
      editSkill: R.#P,
      deleteSkill: R.#k,
      resetHeaderAppearance: R.#we,
      createWeapon: R.#F,
      createArmor: R.#E,
      createShield: R.#h,
      attackWeapon: R.#Ce,
      toggleCombatDetails: R.#Ee,
      rollCombatDepletion: R.#Re,
      reloadWeapon: R.#Pe,
      toggleShieldEquipped: R.#Se,
      toggleArmorEquipped: R.#ke,
      editCombatItem: R.#Ae,
      deleteCombatItem: R.#He,
      block: R.#$e,
      dodge: R.#Ie,
      openFocusNode: R.#Ve,
      acquireFocusNode: R.#Ye,
      gmAcquireFocusNode: R.#Fe,
      purchaseAdvancement: R.#De,
      advanceTier: R.#Te,
      completeProgressionGuidance: R.#ze,
      resetProgressionGuidance: R.#Ne,
      addFocus: R.#Me,
      removeFocus: R.#qe,
      toggleGmProgressionEdit: R.#xe,
      undoFocusAcquisition: R.#Ue,
      gmMarkFocusOwned: R.#Ge,
      gmRemoveFocusOwned: R.#Oe,
      beginCoreSetup: R.#Be,
      skipCoreSetup: R.#Le,
      markCoreInitialized: R.#je,
      restoreFocusAbility: R.#We,
      addType: R.#w,
      addDescriptor: R.#f,
      addSpecies: R.#p,
      addGenre: R.#g,
      inspectGenre: R.#u,
      removeGenre: R.#b,
      acquireGenreAbility: R.#C,
      browseGenreAbilities: R.#D,
      inspectPackage: R.#T,
      removePackage: R.#z,
      inspectGrantedItem: R.#N,
      createAbility: R.#q,
      useAbility: R.#M,
      payAbilityCost: R.#G,
      toggleAbilityArchived: R.#O,
      toggleAbilityDetails: R.#x,
      inspectAbility: R.#U,
      deleteAbility: R.#B,
      addPowerShift: R.#ne,
      editPowerShift: R.#oe,
      deletePowerShift: R.#ae,
      sendItemToChat: R.#X,
      createInventoryItem: R.#L,
      openInventoryItem: R.#j,
      deleteInventoryItem: R.#_,
      toggleInventoryDetails: R.#W,
      rollInventoryDepletion: R.#A,
      rollArtifactLevel: R.#K,
      playerIntrusion: R.#pe
    }, ca),
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
    if (await super._onRender(e, t), Zn(this.element, this.isEditable, ca), this.#s) {
      this.#d = this.#s.activeTab;
      const i = this.changeTab;
      typeof i == "function" && i.call(this, this.#d, "primary"), qc(this.element, this.#s), this.#s = null;
    }
    this.#e.bind(this.element), this.#t.bind(this.element), this.#be(), this.#m();
  }
  _onClose(e) {
    this.#i?.abort(), this.#i = null, this.#e.disconnect(), this.#t.disconnect(), this.#c?.abort(), this.#c = null, super._onClose(e);
  }
  #m() {
    this.#c?.abort(), this.#c = null;
    const e = [...this.element.querySelectorAll("input[data-inventory-quantity]")], t = [...this.element.querySelectorAll(
      ".combat-weapon-row[data-action], .combat-shield-row[data-action], .combat-armor-row[data-action]"
    )];
    if (!e.length && !t.length) return;
    const i = new AbortController();
    this.#c = i;
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
    return a && i?.type !== a ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.Hud.InvalidIdentityDrop")), null) : i?.type === "focus" ? (await Uo(this.actor, i), i) : i?.type === "characterType" ? (await Ko(this.actor, i), i) : i?.type === "descriptor" ? (await Xo(this.actor, i), i) : i?.type === "species" ? (await Jo(this.actor, i), i) : i?.type === "genre" ? (await $n(this.actor, i), i) : super._onDropDocument(e, t);
  }
  static async #w() {
    await Ko(this.actor);
  }
  static async #f() {
    await Xo(this.actor);
  }
  static async #p() {
    await Jo(this.actor);
  }
  static async #g() {
    await $n(this.actor);
  }
  static async #u() {
    await (await game.cypherv2.services.genres.active(this.actor))?.sheet?.render(!0);
  }
  static async #b() {
    await vd(this.actor);
  }
  static async #C(e, t) {
    const i = t.dataset.choiceId;
    i && await Cd(this.actor, i);
  }
  static async #D() {
    await Ed(this.actor), await this.render({ force: !0 });
  }
  static async #T(e, t) {
    const i = this.actor.items.get(q(t));
    i?.type !== "characterType" && i?.type !== "descriptor" && i?.type !== "species" || await i.sheet?.render(!0);
  }
  static async #z(e, t) {
    await Dd(this.actor, q(t));
  }
  static async #N(e, t) {
    await this.actor.items.get(q(t))?.sheet?.render(!0);
  }
  static async #M(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await qd(
      this.actor,
      i
    );
  }
  static async #q() {
    await (await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Ability.New"),
      type: "ability"
    }]))[0]?.sheet?.render(!0);
  }
  static #x(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = q(t), o = this.#r.toggle(i), a = t.closest(".compact-ability");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-ability-details");
    r && (r.hidden = !o);
    for (const s of a.querySelectorAll("[data-action='toggleAbilityDetails']"))
      s.setAttribute("aria-expanded", String(o));
  }
  static async #U(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await i.sheet?.render(!0);
  }
  static async #G(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    try {
      await Gd(
        this.actor,
        i
      );
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #O(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    const o = i.system.archived === !0;
    await i.update({ "system.archived": !o });
  }
  static async #B(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    if (!ia(i).canDelete) {
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
  static async #L(e, t) {
    const i = t.dataset.itemType;
    if (!Ci(i)) throw new Error("Invalid Inventory Item type.");
    await (await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize(`CYPHERV2.Inventory.New.${i}`),
      type: i
    }]))[0]?.sheet?.render(!0);
  }
  static async #j(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || !Ci(i.type)) throw new Error("Inventory Item not found.");
    await i.sheet?.render(!0);
  }
  static #W(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = q(t), o = this.#l.toggle(i), a = t.closest(".compact-inventory-item");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-inventory-details");
    r && (r.hidden = !o), t.setAttribute("aria-expanded", String(o));
  }
  static async #_(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || !Ci(i.type)) throw new Error("Inventory Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Inventory.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Inventory.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#l.remove(i.id), await i.delete());
  }
  static async #A(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    await ki(i);
  }
  static async #K(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    try {
      const o = await game.cypherv2.services.artifacts.rollLevel(i);
      await game.cypherv2.services.itemChat.publishArtifactLevelRoll(i, o);
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #X(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || !["ability", "weapon", "shield", "armor", ...Vn].includes(i.type))
      throw new Error("Chat Item not found.");
    await game.cypherv2.services.itemChat.publish(i);
  }
  static async #J() {
    await tc(this.actor);
  }
  static async #Q(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = Yn(t.dataset);
    if (i.track !== "character") throw new Error("Invalid Character Wound count action data.");
    await game.cypherv2.services.wounds.setCount(
      this.actor,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #Z(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = Yn(t.dataset);
    if (i.track !== "shield") throw new Error("Invalid Shield Wound count action data.");
    const o = this.actor.items.get(i.shieldId);
    if (!o || o.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setCount(
      o,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #ee(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const { family: i, category: o } = ru(t.dataset);
    await lu(this.actor, i, o), await this.render({ force: !0 });
  }
  static async #te() {
    await au(this.actor), await this.render({ force: !0 });
  }
  static async #ie(e, t) {
    e.preventDefault(), e.stopPropagation(), await ou(
      this.actor,
      t.dataset.weaponFamily
    ), await this.render({ force: !0 });
  }
  static #S(e) {
    const t = e.actor.system, i = [...e.actor.items].filter((o) => o.type === "characterType");
    return vo(t.powerShifts ?? [], i);
  }
  static async #ne() {
    await aa(
      this.actor,
      R.#S(this)
    );
  }
  static async #oe(e, t) {
    const i = R.#S(this), o = i.find((a) => a.id === t.dataset.powerShiftId);
    o && await aa(this.actor, i, o);
  }
  static async #ae(e, t) {
    const i = t.dataset.powerShiftId;
    i && await du(
      this.actor,
      R.#S(this),
      i
    );
  }
  static async #re(e, t) {
    const { severity: i, woundId: o } = la(t);
    await Zl(this.actor, i, o);
  }
  static async #se(e, t) {
    const { severity: i, woundId: o } = la(t);
    await ec(this.actor, i, o);
  }
  static async #le() {
    await ic(this.actor);
  }
  static async #ce() {
    await ko(this.actor);
  }
  static async #de(e, t) {
    const i = t.dataset.recoveryType, o = t.dataset.recoverySlotId;
    !i || !Ae.includes(i) || await ko(this.actor, i, o);
  }
  static async #ue() {
    if (!game.user.isGM || !await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Hud.ResetRecoveriesConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })) return;
    const t = this.actor.system.recovery.slots.map((i) => ({ ...i, used: !1 }));
    await this.actor.update({
      "system.recovery.slots": t,
      "system.recovery.used": Ct(t)
    }), ui.notifications.info(game.i18n.localize("CYPHERV2.Hud.RecoveriesReset"));
  }
  static async #me(e) {
    e?.stopPropagation(), await nc(this.actor);
  }
  static async #pe(e, t) {
    e.preventDefault(), e.stopPropagation(), t instanceof HTMLButtonElement && (t.disabled = !0);
    try {
      await fu().activate(
        this.actor
      );
    } catch (i) {
      ui.notifications.error(i instanceof Error ? i.message : String(i));
    } finally {
      t instanceof HTMLButtonElement && this.actor.system.xp >= 1 && (t.disabled = !1);
    }
  }
  static async #fe(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    !i || !Gi.includes(i) || await rc(this.actor, i);
  }
  static async #he(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    if (!i || !Gi.includes(i)) return;
    const o = vn(
      this.actor.system,
      i
    );
    await this.actor.update({ [o.path]: null });
  }
  static async #ge(e) {
    e.preventDefault(), e.stopPropagation(), await lc(this.actor);
  }
  static async #ye(e) {
    e.preventDefault(), e.stopPropagation(), await fc(this.actor);
  }
  static async #H(e) {
    e.preventDefault(), e.stopPropagation(), await pc(this.actor);
  }
  static async #y(e) {
    e.preventDefault(), e.stopPropagation(), await hc(this.actor);
  }
  static async #$(e, t) {
    if (e.target instanceof Element && e.target.closest("input, button, select, textarea, a")) return;
    const i = t.dataset.pool;
    !i || !V.includes(i) || await Ic(this.actor, i);
  }
  #be() {
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
  static async #I(e, t) {
    const i = t.dataset.focusUuid;
    if (!i) return;
    await (await Ye(this.actor, i))?.sheet?.render(!0);
  }
  static async #v() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Skill.New"),
      type: "skill"
    }]);
  }
  static #V(e, t) {
    const i = t.dataset.sortMode;
    !Jd(i) || i === this.#o || (this.#o = i, this.render({ force: !0 }));
  }
  static async #Y(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    hu(t);
    try {
      const o = ot(), a = game.cypherv2.services.skills.buildQuickRollRequest(
        i,
        { enabledRuleModuleIds: o }
      ), r = await game.cypherv2.services.rolls.execute(
        this.actor,
        a,
        Me()
      );
      await to(this.actor, r);
    } catch (o) {
      ui.notifications.error(o instanceof Error ? o.message : String(o));
    }
  }
  static async #R(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await Yc(
      this.actor,
      i
    );
  }
  static async #we(e) {
    e.preventDefault(), e.stopPropagation(), await this.actor.update({
      "system.appearance.backgroundMode": "theme",
      "system.appearance.customImage": "",
      "system.appearance.color": ""
    });
  }
  static async #P(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await i.sheet?.render(!0);
  }
  static async #k(e, t) {
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Skill.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Skill.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && await i.delete();
  }
  static async #F() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Weapon.New"), type: "weapon" }]);
  }
  static async #E() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Armor.New"), type: "armor" }]);
  }
  static async #h() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Shield.New"),
      type: "shield"
    }]);
  }
  static async #Ce(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    if (!game.cypherv2.services.weapons.ammunition(i).canAttack) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.Weapon.InsufficientAmmo"));
      return;
    }
    await Tc(
      this.actor,
      i
    );
  }
  static #Ee(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = q(t), o = this.#a.toggle(i), a = t.closest(".compact-combat-item");
    if (!a) return;
    a.classList.toggle("is-expanded", o);
    const r = a.querySelector(".compact-combat-details");
    r && (r.hidden = !o), t.setAttribute("aria-expanded", String(o));
  }
  static async #Re(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || !["weapon", "shield", "armor"].includes(i.type))
      throw new Error("Combat Item not found.");
    await ki(i);
  }
  static async #Pe(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    await game.cypherv2.services.weapons.reload(i);
  }
  static async #Se(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setEquipped(
      this.actor,
      i,
      !i.system.equipped
    );
  }
  static async #ke(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "armor") throw new Error("Armor Item not found.");
    await i.update({ "system.equipped": !i.system.equipped });
  }
  static async #Ae(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await i.sheet?.render(!0);
  }
  static async #He(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(q(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Combat.DeleteItem") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.DeleteItemConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#a.remove(i.id), await i.delete());
  }
  static async #$e() {
    await Sn(this.actor, "block");
  }
  static async #Ie() {
    await Sn(this.actor, "dodge");
  }
  static async #Ve(e, t) {
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
    if (!a) throw new Error("Focus Item not found.");
    await Ar(a, o);
  }
  static async #Ye(e, t) {
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
    if (!a) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const r = await game.cypherv2.services.focusAcquisition.acquireManual(
        this.actor,
        a,
        o,
        $t
      );
      ui.notifications.info(game.i18n.localize(
        r.status === "acquired" ? "CYPHERV2.Focus.Acquired" : "CYPHERV2.Focus.AlreadyOwned"
      )), r.status === "acquired" && await this.actor.sheet?.render(!0);
    } catch (r) {
      R.#ve(r);
    }
  }
  static async #Fe(e, t) {
    if (!game.user.isGM) return;
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
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
        R.#ve(s);
      }
  }
  static async #De(e, t) {
    const i = t.dataset.kind;
    i !== "other" && !Un.includes(i) || await od(
      this.actor,
      i
    );
  }
  static async #Te() {
    await ad(this.actor);
  }
  static async #ze() {
    await game.cypherv2.services.advancement.completeProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #Ne() {
    await game.cypherv2.services.advancement.resetProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #Me() {
    await Uo(this.actor);
  }
  static async #qe(e, t) {
    const i = t.dataset.focusUuid;
    i && await ld(this.actor, i);
  }
  static async #xe() {
    game.user.isGM && (this.#n = !this.#n, await this.render({ force: !0 }));
  }
  static async #Ue(e, t) {
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
    a && (await Lo(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #Ge(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
    a && (await hd(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #Oe(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
    a && (await Lo(
      this.actor,
      a,
      o
    ), await this.render({ force: !0 }));
  }
  static async #Be() {
    await pd(this.actor);
  }
  static async #Le() {
    game.user.isGM && await Bo(this.actor, "skipped");
  }
  static async #je() {
    game.user.isGM && await Bo(this.actor, "manual");
  }
  static async #We(e, t) {
    const { focusUuid: i, nodeId: o } = Je(t), a = await Ye(this.actor, i);
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
      R.#ve(r);
    }
  }
  static #ve(e) {
    if (!(e instanceof Ge)) {
      if (e instanceof de) {
        ui.notifications.error(game.i18n.localize(bu[e.code]));
        return;
      }
      console.error(e), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
    }
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#s = Mc(this.element), this.#d = this.#s.activeTab);
    const t = await super._prepareContext(e), i = Qd([...this.actor.items].filter((g) => g.type === "skill").map((g) => {
      const v = g, T = game.cypherv2.services.skills.configuredPool(v);
      return {
        id: v.id,
        name: v.name,
        rank: v.system.rank,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${v.system.rank}`),
        poolLabel: T ? game.i18n.localize(`CYPHERV2.Pools.${T[0].toUpperCase()}${T.slice(1)}`) : game.i18n.localize("CYPHERV2.Skill.ChoosePool")
      };
    }), this.#o), o = eu([...this.actor.items].filter((g) => g.type === "ability").map((g) => g));
    this.#r.retain(o.map((g) => g.id));
    const a = await Promise.all(o.map(async (g, v) => {
      const T = g, N = ia(g), ce = this.#r.isExpanded(g.id), Ie = lr(
        N.cost.amount,
        N.cost.pools,
        yu,
        {
          pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
          middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
          final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
        },
        N.cost.scalable
      ), ct = N.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        N.description,
        { async: !0, relativeTo: T }
      ) : "";
      return {
        id: g.id,
        name: g.name,
        archived: N.archived,
        startsArchivedGroup: N.archived && (v === 0 || o[v - 1].system.archived !== !0),
        canPay: this.isEditable && N.cost.payable,
        canDelete: this.isEditable && N.canDelete,
        expanded: ce,
        costLabel: Ie,
        enrichedDescription: ct,
        hasDescription: !!N.description
      };
    })), r = this.actor, s = [...this.actor.items].filter((g) => g.type === "weapon" || g.type === "shield" || g.type === "armor");
    s.filter((g) => g.type === "shield" && !!g.system.equipped).length > 1 && this.isEditable && await game.cypherv2.services.shields.normalizeEquipped(
      r
    ), this.#a.retain(s.map((g) => g.id));
    const u = async (g, v) => v ? foundry.applications.ux.TextEditor.implementation.enrichHTML(v, { async: !0, relativeTo: g }) : "", c = (await Promise.all(s.filter((g) => g.type === "weapon").map(async (g) => {
      const v = g, T = v.system.description.trim();
      return {
        id: v.id,
        name: v.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${v.system.category}`),
        attackType: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${v.system.attackType}`),
        range: game.i18n.localize(`CYPHERV2.Combat.Range.${v.system.rangeCategory}`),
        damage: game.cypherv2.services.combat.weaponBaseDamage(v),
        depletionEnabled: v.system.depletion.enabled,
        depletionLabel: v.system.depletion.enabled ? Zi(v.system.depletion) : "",
        ammoEnabled: v.system.ammo.enabled,
        ammoLabel: v.system.ammo.enabled ? `${v.system.ammo.value} / ${v.system.ammo.max}` : "",
        canAttack: game.cypherv2.services.weapons.ammunition(v).canAttack,
        depleted: !!v.system.depleted,
        freelyUsed: game.cypherv2.services.combat.weaponFreelyUsed(r, v),
        expanded: this.#a.isExpanded(v.id),
        hasDescription: !!T,
        enrichedDescription: await u(g, T)
      };
    }))).sort((g, v) => g.name.localeCompare(v.name)), p = (await Promise.all(s.filter((g) => g.type === "armor").map(async (g) => {
      const v = g, T = v.system.description.trim(), N = v.system.depletion;
      return {
        id: v.id,
        name: v.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${v.system.category}`),
        equipped: v.system.equipped,
        freelyUsed: game.cypherv2.services.combat.armorFreelyUsed(r, v),
        depletionEnabled: !!N?.enabled,
        depletionLabel: N?.enabled ? Zi(N) : "",
        depleted: !!v.system.depleted,
        expanded: this.#a.isExpanded(v.id),
        hasDescription: !!T,
        enrichedDescription: await u(g, T)
      };
    }))).sort((g, v) => g.name.localeCompare(v.name)), h = (await Promise.all(s.filter((g) => g.type === "shield").map(async (g) => {
      const v = g, T = v.system.description.trim(), N = v.system.depletion, ce = vi({
        minor: v.system.wounds.minor.length,
        moderate: v.system.wounds.moderate.length,
        major: v.system.wounds.major.length
      }, v.system.derived.capacities).map((Ie) => ({
        ...Ie,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${Ie.severity}`),
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${Ie.severity}`)
      }));
      return {
        id: v.id,
        name: v.name,
        equipped: v.system.equipped,
        broken: game.cypherv2.services.shields.isBroken(v),
        minor: v.system.wounds.minor.length,
        moderate: v.system.wounds.moderate.length,
        major: v.system.wounds.major.length,
        capacities: v.system.derived.capacities,
        woundTracks: ce,
        depletionEnabled: !!N?.enabled,
        depletionLabel: N?.enabled ? Zi(N) : "",
        depleted: !!v.system.depleted,
        expanded: this.#a.isExpanded(v.id),
        hasDescription: !!T,
        enrichedDescription: await u(g, T)
      };
    }))).sort((g, v) => g.name.localeCompare(v.name)), m = h.filter((g) => g.equipped).length > 1, y = this.actor.system, f = [], w = [], C = [];
    for (const g of y.focusProgress ?? []) {
      const v = await Ye(this.actor, g.focusUuid);
      if (!v || v.type !== "focus") {
        w.push(g.focusUuid);
        continue;
      }
      C.push({
        uuid: g.focusUuid,
        name: v.name,
        provenance: g.provenance ?? "additional"
      });
      const T = await game.cypherv2.services.focusTrees.prepare(v, {
        characterTier: L(this.actor.system),
        progress: g,
        editable: this.isEditable,
        missingOwnedNodeIds: game.cypherv2.services.focusAcquisition.missingOwnedNodeIds(
          this.actor,
          v,
          g
        ),
        gmOverrideAllowed: game.user.isGM,
        gmProgressionEdit: this.#n
      });
      f.push({
        ...T,
        provenance: g.provenance ?? "additional",
        provenanceLabel: `CYPHERV2.Focus.Association.${g.provenance === "creation" ? "Creation" : "Additional"}`,
        ownedCount: g.ownedNodeIds.length
      });
    }
    const P = game.cypherv2.services.advancement.view(
      this.actor,
      ot()
    ), Y = game.cypherv2.services.advancement.progressionGuidance(
      this.actor,
      ot()
    ), k = [...this.actor.items].filter((g) => g.type === "characterType"), H = k.map((g) => ({ id: g.id, name: g.name })), M = [...this.actor.items].filter((g) => g.type === "species").map((g) => ({ id: g.id, name: g.name })), O = [...this.actor.items].filter((g) => g.type === "descriptor").map((g) => {
      const v = g.system.instance, T = v?.role ?? "custom";
      return {
        id: g.id,
        name: g.name,
        role: T,
        instanceId: v?.instanceId ?? g.id,
        attachedAt: v?.attachedAt ?? 0,
        roleLabel: game.i18n.localize(`CYPHERV2.Packages.Role.${T}`)
      };
    }), A = new Map([...this.actor.items].filter((g) => g.type === "characterType" || g.type === "descriptor" || g.type === "species").map((g) => [g.system.instance?.instanceId ?? "", g.name])), D = [...this.actor.items].filter((g) => {
      const v = g.system.grantedBy;
      return v?.instanceId && (v.kind === "type" || v.kind === "descriptor" || v.kind === "species");
    }).map((g) => {
      const v = g.system.grantedBy;
      return {
        id: g.id,
        name: g.name,
        type: g.type,
        sourceName: A.get(v.instanceId) ?? game.i18n.localize("CYPHERV2.Packages.Retained"),
        grantId: v.grantId,
        status: v.status,
        replacementLabel: v.replacement?.active ? `${v.replacement.originalName} → ${v.replacement.replacementName}` : ""
      };
    }), S = this.actor.system, K = vo(
      S.powerShifts ?? [],
      k
    ), j = Ys(
      K,
      Vs(k)
    ), He = {
      enabled: S.presentation.powerShiftsEnabled,
      allocated: j.allocated,
      available: j.available,
      overBudget: j.overBudget,
      legacy: (S.powerShifts ?? []).length === 0 && K.some((g) => g.id.startsWith("legacy-")),
      entries: K.map((g) => ({
        ...g,
        categoryWarning: j.categoryWarnings.has(g.category.trim().toLocaleLowerCase("en-US"))
      }))
    }, B = await game.cypherv2.services.genres.active(
      this.actor
    ), $ = B ? {
      attached: !0,
      available: !0,
      name: B.name,
      uuid: B.uuid,
      img: B.img,
      provenance: S.genre.provenance,
      totalEffortCapMode: B.system.options.totalEffortCapMode,
      totalEffortCapLabel: game.i18n.localize(
        `CYPHERV2.Genre.EffortCap.${B.system.options.totalEffortCapMode}`
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
    }, W = [...this.actor.items].filter((g) => Vn.includes(g.type)).sort((g, v) => g.name.localeCompare(v.name, "en-US"));
    this.#l.retain(W.map((g) => g.id));
    const J = (await Promise.all(W.map(async (g) => {
      const v = iu(g);
      if (!v) return null;
      const T = this.#l.isExpanded(g.id), N = v.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        v.description,
        { async: !0, relativeTo: g }
      ) : "";
      return {
        ...v,
        expanded: T,
        hasDescription: !!v.description,
        enrichedDescription: N,
        depletionLabel: v.depletion?.enabled ? v.depletion.formula : "",
        powerLabel: v.power ? game.i18n.localize(`CYPHERV2.Cypher.Power.${v.power}`) : "",
        canRollLevel: v.levelRollable && v.usable,
        canRollDepletion: !!(v.depletion?.enabled && v.usable)
      };
    }))).filter((g) => g !== null), ie = {
      cypherLimit: S.derived.cypherLimit.max,
      equipment: J.filter((g) => g.type === "equipment"),
      cyphers: J.filter((g) => g.type === "cypher"),
      artifacts: J.filter((g) => g.type === "artifact")
    }, pe = C.find((g) => g.provenance === "creation") ?? C[0], le = Wd({
      descriptors: O,
      ...M[0] ? { species: { id: M[0].id, name: M[0].name } } : {},
      ...H[0] ? { type: { id: H[0].id, name: H[0].name } } : {},
      ...pe ? { focus: { uuid: pe.uuid, name: pe.name } } : {},
      hideFocus: S.presentation.hideFocusInSentence
    }), Be = {
      ...le,
      descriptors: le.descriptors.map((g) => ({
        ...g,
        displayName: g.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Descriptor") : g.displayName
      })),
      type: {
        ...le.type,
        displayName: le.type.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Type") : le.type.displayName
      },
      focus: {
        ...le.focus,
        displayName: le.focus.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Focus") : le.focus.displayName
      }
    }, $e = vi({
      minor: S.wounds.minor.length,
      moderate: S.wounds.moderate.length,
      major: S.wounds.major.length
    }, S.derived.wounds.capacities).map((g) => ({
      ...g,
      shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${g.severity}`),
      pips: g.pips.map((v) => ({
        ...v,
        tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${g.severity}`),
          count: v.targetCount
        })
      })),
      tooltip: game.i18n.format("CYPHERV2.Hud.CharacterWoundTooltip", {
        severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${g.severity}`),
        count: g.count,
        capacity: g.capacity
      })
    })), be = h.filter((g) => g.equipped), b = be.find((g) => !g.broken) ?? be[0], Le = b ? {
      ...b,
      tracks: vi({
        minor: b.minor,
        moderate: b.moderate,
        major: b.major
      }, b.capacities).map((g) => ({
        ...g,
        itemId: b.id,
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${g.severity}`),
        pips: g.pips.map((v) => ({
          ...v,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetShieldWoundCount", {
            shield: b.name,
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${g.severity}`),
            count: v.targetCount
          })
        })),
        tooltip: game.i18n.format("CYPHERV2.Hud.ShieldWoundTooltip", {
          shield: b.name,
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${g.severity}`),
          count: g.count,
          capacity: g.capacity
        })
      }))
    } : null, ns = $e.map((g, v) => ({
      character: g,
      shield: Le?.tracks[v] ?? null
    })), os = {
      appearance: Xs(S.appearance, this.actor.img),
      identity: Be,
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
      pools: V.map((g) => ({
        key: g,
        isMight: g === "might",
        canRally: g === "might" && game.cypherv2.services.rally.canApply(this.actor),
        label: game.i18n.localize(`CYPHERV2.Pools.${g[0].toUpperCase()}${g.slice(1)}`),
        value: S.stats[g].value,
        max: S.derived.pools[g].max,
        edge: S.derived.pools[g].edge,
        gauge: Mr(S.stats[g].value, S.derived.pools[g].max)
      })),
      wounds: {
        tracks: $e,
        rows: ns,
        hindrance: S.derived.wounds.hindrance,
        hindranceModifier: ke("hinder", S.derived.wounds.hindrance),
        dead: S.derived.wounds.dead
      },
      recoveries: Kd(S.recovery.slots).map((g) => ({
        ...g,
        label: game.i18n.localize(`CYPHERV2.Recovery.${g.type}`)
      })),
      recoveryFormulaLabel: S.derived.recovery.formula,
      canResetRecoveries: game.user.isGM,
      shield: Le
    }, as = (g, v) => [
      ...this.actor.items
    ].filter((T) => T.type !== "characterType" && T.type !== "species" ? !1 : T.system[g === "weapon" ? "weaponUse" : "armorUse"]?.[v] === !0).map((T) => T.name), po = (g, v, T, N) => v.map((ce) => {
      const Ie = as(g, ce), ct = T.includes(ce), ni = Ie.length > 0, ms = N.includes(ce), ps = ct && ni ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityManualAndGranted", { sources: Ie.join(", ") }) : ct ? game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityManual") : ni ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityGranted", { sources: Ie.join(", ") }) : game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityAbsent");
      return {
        family: g,
        category: ce,
        label: game.i18n.localize(`CYPHERV2.Combat.${g === "weapon" ? "Weapon" : "Armor"}.Category.${ce}`),
        manual: ct,
        packageGranted: ni,
        effective: ms,
        canToggle: this.isEditable && (ct || !ni),
        sourceHint: ps
      };
    }), rs = {
      weapons: po(
        "weapon",
        xe,
        S.proficiencies.weaponCategories,
        S.derived.packages.weaponCategories
      ),
      armor: po(
        "armor",
        Ue,
        S.proficiencies.armorCategories,
        S.derived.packages.armorCategories
      ),
      weaponFamilies: se([
        ...S.proficiencies.weaponFamilies,
        ...S.derived.packages.weaponFamilies ?? []
      ]).map((g) => {
        const v = [...this.actor.items].filter((N) => N.type === "characterType").filter((N) => {
          const ce = N.system;
          return se([
            ...ce.weaponFamilies ?? [],
            ...Fi(ce.weaponFamilyUse)
          ]).includes(g);
        }).map((N) => N.name), T = S.proficiencies.weaponFamilies.includes(g);
        return {
          id: g,
          label: ht(g),
          manual: T,
          packageGranted: v.length > 0,
          canRemove: this.isEditable && T,
          sourceHint: v.length > 0 ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityGranted", { sources: v.join(", ") }) : game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityManual")
        };
      })
    }, ss = {
      tier: "CYPHERV2.Character.Tier",
      effort: "CYPHERV2.Character.Effort",
      mightMax: "CYPHERV2.Overrides.MightMax",
      mightEdge: "CYPHERV2.Overrides.MightEdge",
      speedMax: "CYPHERV2.Overrides.SpeedMax",
      speedEdge: "CYPHERV2.Overrides.SpeedEdge",
      intellectMax: "CYPHERV2.Overrides.IntellectMax",
      intellectEdge: "CYPHERV2.Overrides.IntellectEdge"
    }, ls = Gi.map((g) => {
      const v = vn(S, g);
      return { ...v, label: game.i18n.localize(ss[g]), hasOverride: v.override !== null };
    }), It = S.overrides.wounds ?? { minor: 0, moderate: 0, major: 0 }, cs = {
      hasOverride: Object.values(It).some((g) => g !== 0),
      calculated: S.derived.wounds.calculatedCapacities,
      modifiers: It,
      modifierLabels: {
        minor: ln(It.minor),
        moderate: ln(It.moderate),
        major: ln(It.major)
      },
      effective: S.derived.wounds.capacities
    }, ds = {
      hasOverride: S.recovery.customized || S.recovery.rollModifier !== 0,
      calculatedSlots: 4,
      calculatedFormula: S.derived.recovery.calculatedFormula,
      effectiveSlots: S.recovery.slots.length,
      effectiveFormula: S.derived.recovery.formula,
      modifier: S.recovery.rollModifier
    }, fo = [game.i18n.localize(Y.focusAbilityCount === 2 ? "CYPHERV2.Advancement.Guidance.TwoFocusAbilities" : "CYPHERV2.Advancement.Guidance.FocusAbility")];
    Y.includesGenreAbility && fo.push(game.i18n.localize("CYPHERV2.Advancement.Guidance.GenreAbility"));
    const ho = typeof this.actor._source?.system?.notes == "string" ? this.actor._source.system.notes : "", us = ho ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(ho, {
      async: !0,
      relativeTo: this.actor
    }) : "";
    return {
      ...t,
      actor: this.actor,
      system: this.actor.system,
      systemFields: Jn(this.actor),
      editable: this.isEditable,
      enriched: { notes: us },
      familiarities: rs,
      powerShifts: He,
      characterOverrides: ls,
      woundOverride: cs,
      recoveryOverride: ds,
      genre: $,
      woundHindranceModifier: ke("hinder", S.derived.wounds.hindrance),
      header: os,
      skillItems: i,
      skillSort: {
        mode: this.#o,
        nameActive: this.#o === "name",
        rankActive: this.#o === "rank"
      },
      abilityItems: a,
      inventory: ie,
      weaponItems: c,
      armorItems: p,
      shieldItems: h,
      multipleShieldsEquipped: m,
      focusTrees: f,
      missingFoci: w,
      advancement: {
        ...P,
        options: P.options.map((g) => ({
          ...g,
          label: `CYPHERV2.Advancement.Option.${g.kind}`,
          shortLabel: `CYPHERV2.Advancement.Short.${g.kind}`,
          xpCost: P.policy.xpCost
        })),
        other: {
          ...P.other,
          label: "CYPHERV2.Advancement.OtherAdvancement",
          shortLabel: "CYPHERV2.Advancement.Short.other",
          xpCost: P.policy.xpCost
        },
        purchases: y.advancement.purchases.map((g) => ({
          ...g,
          label: g.kind === "other" ? `CYPHERV2.Advancement.Other.${g.otherKind}` : `CYPHERV2.Advancement.Option.${g.kind}`
        })),
        guidance: {
          ...Y,
          title: game.i18n.format("CYPHERV2.Advancement.Guidance.Title", { tier: Y.tier }),
          reminder: fo.join(" · ")
        }
      },
      isGM: game.user.isGM,
      gmProgressionEdit: game.user.isGM && this.#n,
      typeItems: H,
      speciesItems: M,
      descriptorItems: O,
      primaryDescriptorItems: O.filter((g) => g.role === "primary"),
      additionalDescriptorItems: O.filter((g) => g.role === "additional" || g.role === "custom"),
      speciesDescriptorItems: O.filter((g) => g.role === "speciesGranted"),
      packageGrantedItems: D,
      coreCreation: this.actor.system.creation,
      activeArmorCategoryLabel: game.i18n.localize(
        `CYPHERV2.Combat.Armor.Category.${r.system.derived.combat.armor.category}`
      ),
      recoveryAvailableLabels: this.actor.system.derived.recovery.availableTypes.map((g) => game.i18n.localize(`CYPHERV2.Recovery.${g}`)).join(", "),
      phase: "0.1.0"
    };
  }
}
class ye extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusTreeEditorError";
  }
  code;
}
class wu {
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
      throw new ye("node-not-selected", "Select a Focus node before connecting.");
    return this.#t = this.#e, this.#t;
  }
  connectionTo(e) {
    if (!this.#t)
      throw new ye("node-not-selected", "No source node is selected for the connection.");
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
function vu() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "") ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function Fe(n) {
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
function da(n) {
  const e = n._source?.system?.description ?? n.system?.description;
  return {
    name: n.name,
    description: typeof e == "string" ? e : ""
  };
}
function ua(n) {
  if (n.type !== "ability")
    throw new ye("not-ability", "Only Ability Items can be added to a Focus Tree.");
  if (!n.uuid.trim())
    throw new ye("ability-uuid-missing", "The Ability must have a resolvable UUID.");
}
function ma(n) {
  if (!Number.isInteger(n) || n < 1 || n > 6)
    throw new ye("invalid-tier", "Focus node Tier must be an integer from 1 to 6.");
}
function pa(n, e) {
  return n.nodes.filter((t) => t.tier === e).sort((t, i) => {
    const o = t.position.x ?? Number.MAX_SAFE_INTEGER, a = i.position.x ?? Number.MAX_SAFE_INTEGER;
    return o - a || t.id.localeCompare(i.id);
  });
}
class Cu {
  #e;
  #t;
  #i;
  #n = !1;
  constructor(e, t = vu) {
    this.#e = t, this.#t = Fe(e), this.#i = Fe(e);
  }
  get graph() {
    return Fe(this.#i);
  }
  get dirty() {
    return this.#n;
  }
  diagnostics() {
    return kn(this.#i);
  }
  addAbility(e, t = 1) {
    ua(e), ma(t);
    const o = pa(this.#i, t).reduce((r, s) => Math.max(r, s.position.x ?? -1), -1), a = {
      id: this.#l("node", new Set(this.#i.nodes.map((r) => r.id))),
      abilityUuid: e.uuid,
      abilitySnapshot: da(e),
      tier: t,
      position: { x: o + 1, y: null }
    };
    return this.#i = { ...this.#i, nodes: [...this.#i.nodes, a] }, this.#n = !0, Fe({ ...this.#i, nodes: [a] }).nodes[0];
  }
  setTier(e, t) {
    return ma(t), this.#r(e, (i) => ({ ...i, tier: t }));
  }
  moveNode(e, t) {
    const i = this.#o(e), o = pa(this.#i, i.tier), a = o.findIndex((h) => h.id === e), r = t === "left" ? a - 1 : a + 1;
    if (r < 0 || r >= o.length) return Fe({
      version: this.#i.version,
      nodes: [i],
      connections: []
    }).nodes[0];
    const s = o[r], l = o[t === "left" ? r - 1 : r + 1], u = s.position.x ?? r, c = l?.position.x, p = t === "left" ? c == null ? u - 1 : (c + u) / 2 : c == null ? u + 1 : (u + c) / 2;
    return this.#r(e, (h) => ({
      ...h,
      position: { ...h.position, x: p }
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
      throw new ye("self-connection", "A Focus node cannot connect to itself.");
    if (this.#i.connections.some((o) => o.from === e && o.to === t))
      throw new ye(
        "duplicate-connection",
        `Focus connection '${e}' -> '${t}' already exists.`
      );
    const i = {
      id: this.#l(
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
      throw new ye(
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
    ua(t);
    const i = this.#o(e);
    if (t.uuid !== i.abilityUuid)
      throw new ye(
        "ability-source-mismatch",
        "The refreshed Ability does not match the node source UUID."
      );
    return this.#r(e, (o) => ({
      ...o,
      abilitySnapshot: da(t)
    }));
  }
  cancel() {
    return this.#i = Fe(this.#t), this.#n = !1, this.graph;
  }
  async save(e) {
    const t = kn(this.#i), i = t.filter((a) => a.severity === "error");
    if (i.length > 0) throw new Rt(i);
    const o = this.graph;
    return await e(o), this.#t = Fe(o), this.#i = Fe(o), this.#n = !1, { graph: o, diagnostics: t };
  }
  #o(e) {
    const t = this.#i.nodes.find((i) => i.id === e);
    if (!t)
      throw new ye("node-not-found", `Focus node '${e}' was not found.`);
    return t;
  }
  #r(e, t) {
    const i = this.#o(e), o = t(i);
    return this.#i = {
      ...this.#i,
      nodes: this.#i.nodes.map((a) => a.id === e ? o : a)
    }, this.#n = !0, Fe({ version: this.#i.version, nodes: [o], connections: [] }).nodes[0];
  }
  #l(e, t) {
    for (let i = 0; i < 100; i += 1) {
      const o = this.#e().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24), a = `${e}-${o}`;
      if (o && !t.has(a)) return a;
    }
    throw new ye(
      "unique-id-unavailable",
      `Unable to generate a unique ${e} ID.`
    );
  }
}
function Eu(n) {
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
function Ru(n, e) {
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
class Pu extends Error {
  constructor(e) {
    super("Only one Shield may be equipped at a time."), this.shieldIds = e, this.name = "MultipleEquippedShieldsError";
  }
  shieldIds;
}
class Gr extends Error {
  constructor(e, t, i) {
    super(`Shield ${e} capacity cannot be lower than its current Wound count (${i}).`), this.severity = e, this.requested = t, this.current = i, this.name = "ShieldCapacityBelowWoundsError";
  }
  severity;
  requested;
  current;
}
class Or {
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
    if (t.length > 1) throw new Pu(t.map((i) => i.id));
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
    return e.system.derived?.capacities ?? e.system.woundCapacities ?? et;
  }
  async setCapacity(e, t, i) {
    if (!Number.isInteger(i) || i < 0)
      throw new RangeError("Shield Wound capacity must be a non-negative whole number.");
    const o = e.system.wounds[t].length;
    if (i < o) throw new Gr(t, i, o);
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
function fa(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function Su(n, e, t) {
  const i = n.system.wounds[e].find((a) => a.id === t);
  if (!i) throw new Error(`Shield Wound '${t}' was not found.`);
  const o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}<input name="label" type="text" value="${fa(i.label)}"></label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}<textarea name="description">${fa(i.description)}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  o && await game.cypherv2.services.shields.edit(n, e, t, {
    label: String(o.label ?? ""),
    description: String(o.description ?? "")
  });
}
async function ku(n, e, t) {
  await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.DeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Wounds.DeleteConfirm")}</p></div>`,
    rejectClose: !1,
    modal: !0,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) && await game.cypherv2.services.shields.delete(n, e, t);
}
function Au(n) {
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
function Hu(n) {
  return n.defaultPool !== "choose" || n.category !== "general" || n.contexts.length > 0 || n.initiative;
}
function $u(n) {
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
function Iu(n, e) {
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
function Ee(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function te(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
const Vu = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
), ha = /* @__PURE__ */ new Set([
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
  "editSkillGrantNote",
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
class F extends Vu {
  #e = new Hr();
  #t = new wu();
  #i = new $r();
  #n = null;
  #o = null;
  #r = null;
  #l = null;
  #a = null;
  #c = null;
  #s = null;
  #d = /* @__PURE__ */ new Set();
  #m = /* @__PURE__ */ new Set();
  #w = null;
  #f = null;
  #p = null;
  #g = null;
  static #u(e) {
    const t = e.dataset.severity, i = e.dataset.woundId;
    if (!ae.includes(t) || !i)
      throw new Error("Invalid Shield Wound action data.");
    return { severity: t, woundId: i };
  }
  static async #b(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || this.item.actor && !game.user.isGM && !this.item.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = Yn(t.dataset);
    if (i.track !== "shield" || i.shieldId !== this.item.id)
      throw new Error("Invalid Shield Wound count action data.");
    await game.cypherv2.services.shields.setCount(
      this.item,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #C(e, t) {
    const i = F.#u(t);
    await Su(this.item, i.severity, i.woundId);
  }
  static async #D(e, t) {
    const i = F.#u(t);
    await ku(this.item, i.severity, i.woundId);
  }
  static async #T() {
    !this.isEditable || this.item.type !== "weapon" || (await game.cypherv2.services.weapons.reload(this.item), await this.render({ force: !0 }));
  }
  static DEFAULT_OPTIONS = {
    ...Xn,
    classes: ["cypherv2", "sheet", "item", "item-sheet"],
    actions: Qn({
      rollDepletion: F.#S,
      reloadWeapon: F.#T,
      openFocusNode: F.#ne,
      editFocusTree: F.#oe,
      addFocusAbility: F.#ae,
      saveFocusTree: F.#re,
      cancelFocusTree: F.#se,
      selectFocusEditorNode: F.#le,
      moveFocusNode: F.#ce,
      setFocusNodeTier: F.#de,
      startFocusConnection: F.#ue,
      completeFocusConnection: F.#me,
      cancelFocusConnection: F.#pe,
      deleteFocusConnection: F.#fe,
      clearFocusConnections: F.#he,
      refreshFocusSnapshot: F.#ge,
      deleteFocusNode: F.#ye,
      addPackageGrant: F.#O,
      addChoiceGroup: F.#_,
      addChoiceOption: F.#Q,
      editSkillGrantNote: F.#Z,
      inspectPackageGrant: F.#ee,
      refreshPackageGrant: F.#te,
      removePackageGrant: F.#ie,
      addPoolBonusChoiceGroup: F.#K,
      editPoolBonusChoiceGroup: F.#X,
      removePoolBonusChoiceGroup: F.#J,
      setShieldWoundCount: F.#b,
      editShieldWound: F.#C,
      deleteShieldWound: F.#D,
      addGenreAbility: F.#B,
      inspectGenreAbility: F.#L,
      refreshGenreAbility: F.#j,
      removeGenreAbility: F.#W
    }, ha),
    position: { width: 620, height: 680 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/item/item-sheet.hbs" }
  };
  async _onRender(e, t) {
    if (await super._onRender(e, t), Zn(this.element, this.isEditable, ha), this.#s?.abort(), this.#s = null, this.#c && (Ru(this.element, this.#c), this.#c = null), this.#w && (Iu(this.element, this.#w), this.#w = null), this.#t.connectionSourceNodeId) {
      const i = new AbortController();
      this.#s = i, this.element.addEventListener("keydown", (o) => {
        o.key === "Escape" && (o.preventDefault(), o.stopPropagation(), this.#t.cancelConnection(), this.#h());
      }, { signal: i.signal }), this.element.querySelector(".focus-tree-node-editor")?.focus({ preventScroll: !0 });
    }
    this.#e.bind(this.element), this.#i.bind(this.element), this.#q(), this.#x(), this.#U(), this.#G(), this.#z(), this.#N(), this.#M();
  }
  _onClose(e) {
    this.#e.disconnect(), this.#i.disconnect(), this.#n?.abort(), this.#n = null, this.#o?.abort(), this.#o = null, this.#r?.abort(), this.#r = null, this.#l?.abort(), this.#l = null, this.#f?.abort(), this.#f = null, this.#p?.abort(), this.#p = null, this.#g?.abort(), this.#g = null, this.#a?.cancel(), this.#a = null, this.#t.reset(), this.#c = null, this.#s?.abort(), this.#s = null, super._onClose(e);
  }
  #z() {
    this.#f?.abort();
    const e = new AbortController();
    this.#f = e;
    const t = [...this.element.querySelectorAll("details")];
    for (const [i, o] of t.entries()) {
      const a = o.dataset.persistentDisclosure ?? `item-details-${i}`;
      this.#d.has(a) ? o.open = !0 : this.#m.has(a) && (o.open = !1), o.addEventListener("toggle", () => {
        o.open ? (this.#d.add(a), this.#m.delete(a)) : (this.#d.delete(a), this.#m.add(a));
      }, { signal: e.signal });
    }
  }
  #N() {
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
      const o = t.value.trim().match(/^1(?:-(\d+))?$/), a = Number(o?.[1] ?? (o ? 1 : Number.NaN)), r = Wt(this.item.system.depletion);
      if (!Number.isInteger(a) || a < 1 || a > r) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Depletion.InvalidThreshold", { sides: r })), await this.render({ force: !0 });
        return;
      }
      await this.item.update({ "system.depletion.threshold": a });
    }, { signal: i.signal });
  }
  #M() {
    if (this.#g?.abort(), this.#g = null, this.item.type !== "shield" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll("input[data-shield-capacity]")];
    if (!e.length) return;
    const t = new AbortController();
    this.#g = t;
    for (const i of e)
      i.addEventListener("change", async (o) => {
        o.preventDefault(), o.stopPropagation();
        const a = i.dataset.severity;
        if (ae.includes(a))
          try {
            await game.cypherv2.services.shields.setCapacity(
              this.item,
              a,
              Number(i.value)
            );
          } catch (r) {
            r instanceof Gr ? ui.notifications.warn(game.i18n.format("CYPHERV2.Shield.CapacityTooLow", {
              severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${r.severity}`),
              count: r.current
            })) : te(r), await this.render({ force: !0 });
          }
      }, { signal: t.signal });
  }
  #q() {
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
        const a = e.filter((r) => r.checked).map((r) => r.value).filter((r) => V.includes(r));
        try {
          await this.item.update({ "system.cost.allowedPools": a });
        } catch (r) {
          te(r), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #x() {
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
          const s = $l(r, a, Number(i.value));
          await this.item.update({ "system.abilityCatalog": s });
        } catch (s) {
          te(s), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #U() {
    if (this.#r?.abort(), this.#r = null, this.item.type !== "characterType") return;
    const e = this.element.querySelector("select[data-type-genre-select]"), t = this.element.querySelector("[data-type-custom-genre]"), i = this.element.querySelector("[data-type-superhero]");
    if (!e || !t) return;
    const o = new AbortController();
    this.#r = o;
    const a = () => {
      t.hidden = e.value !== "custom", i && (i.hidden = e.value !== "superhero");
    };
    e.addEventListener("change", a, { signal: o.signal }), a();
  }
  #G() {
    if (this.#l?.abort(), this.#l = null, this.item.type !== "characterType" && this.item.type !== "species" || !this.isEditable) return;
    const e = this.element.querySelector("input[data-package-weapon-families]");
    if (!e) return;
    const t = new AbortController();
    this.#l = t, e.addEventListener("change", async (i) => {
      i.preventDefault(), i.stopPropagation();
      try {
        await this.item.update({ "system.weaponFamilies": se(e.value) });
      } catch (o) {
        te(o), await this.render({ force: !0 });
      }
    }, { signal: t.signal });
  }
  _canDragDrop(e) {
    return this.item.type !== "focus" ? this.isEditable : !!(this.isEditable && game.user.isGM && this.#a);
  }
  async _onDropDocument(e, t) {
    if (!this.isEditable) return null;
    if (this.item.type === "genre" && t?.type === "ability")
      return await this.#Y(t), t;
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
      return await this.#be(t), t;
    } catch (o) {
      return te(o), null;
    }
  }
  static async #O(e, t) {
    const i = this.item.type === "characterType" ? t.dataset.grantTarget ?? "ability" : this.item.type === "descriptor" ? "skill" : t.dataset.grantTarget;
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species" || i !== "ability" && i !== "skill" && i !== "descriptor") return;
    const o = [...game.items].filter((s) => s.type === i).sort((s, l) => s.name.localeCompare(l.name)), a = i === "skill" ? `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>` : "";
    if (!o.length && i === "ability") {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.NoWorldAbilities"));
      return;
    }
    const r = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(i === "ability" ? "CYPHERV2.Packages.AddAbility" : i === "skill" ? "CYPHERV2.Packages.AddFixedSkill" : "CYPHERV2.Species.AddDescriptorGrant") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${a}${o.map((s) => `<option value="${Ee(s.uuid)}">${Ee(s.name)}</option>`).join("")}</select></label>${i === "skill" ? `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${ee.map((s) => `<option value="${s}" ${s === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s}`)}</option>`).join("")}</select></label><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="2"></textarea></label>` : ""}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (r)
      if (r.uuid === "custom") {
        const s = String(r.customName ?? "").trim();
        if (!s) return;
        await this.#we(s, String(r.rank ?? "trained"), String(r.notes ?? ""));
      } else {
        const s = await fromUuid(String(r.uuid ?? ""));
        s && await this.#P(s, "fixed", String(r.rank ?? "trained"), String(r.notes ?? ""));
      }
  }
  static async #B() {
    if (this.item.type !== "genre") return;
    const e = [...game.items].filter((o) => o.type === "ability").sort((o, a) => o.name.localeCompare(a.name));
    if (!e.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldAbilities"));
      return;
    }
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.AddAbility") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}
        <select name="uuid">${e.map((o) => `<option value="${Ee(o.uuid)}">${Ee(o.name)}</option>`).join("")}</select></label>
        <label>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")}<input name="minimumTier" type="number" min="${nt}" max="${Bt}" value="${nt}"></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!t) return;
    const i = await fromUuid(String(t.uuid ?? ""));
    i && await this.#Y(i, Number(t.minimumTier ?? 1));
  }
  static async #L(e, t) {
    const i = this.#V(t.dataset.entryId);
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
  static async #j(e, t) {
    const i = this.#V(t.dataset.entryId);
    if (!i) return;
    const o = i.abilityUuid ? await fromUuid(i.abilityUuid) : null;
    if (!o) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    const a = this.item.system.abilityCatalog;
    await this.item.update({
      "system.abilityCatalog": Il(a, i.id, this.#v(o))
    });
  }
  static async #W(e, t) {
    const i = t.dataset.entryId;
    if (!i || this.item.type !== "genre") return;
    const o = this.item.system.abilityCatalog;
    await this.item.update({ "system.abilityCatalog": Vl(o, i) });
  }
  static async #_(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = t.dataset.choiceKind ?? "skill", o = this.item.type !== "descriptor" && i === "ability", a = this.item.type === "species" && i === "descriptor", r = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.AddChoiceGroup") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="1"></label>${a ? `<label>${game.i18n.localize("CYPHERV2.Packages.ChoiceSource")}<select name="sourceMode"><option value="fixed">${game.i18n.localize("CYPHERV2.Packages.FixedOptions")}</option><option value="catalog">${game.i18n.localize("CYPHERV2.Packages.AllAvailableDescriptors")}</option></select></label>` : o ? "" : `<label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${ee.map((l) => `<option value="${l}" ${l === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${l}`)}</option>`).join("")}</select></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!r) return;
    const s = this.item.system;
    if (o) {
      const l = { id: crypto.randomUUID(), choose: Math.max(1, Number(r.choose) || 1), options: [] };
      await this.item.update({ "system.abilityChoiceGroups": [...s.abilityChoiceGroups, l] });
    } else if (a) {
      const l = r.sourceMode === "catalog", u = {
        id: crypto.randomUUID(),
        choose: Math.max(1, Number(r.choose) || 1),
        sourceMode: l ? "catalog" : "fixed",
        catalogItemType: l ? "descriptor" : "none",
        options: []
      }, c = s.descriptorChoiceGroups ?? [];
      await this.item.update({ "system.descriptorChoiceGroups": [...c, u] });
    } else {
      const l = { id: crypto.randomUUID(), choose: Math.max(1, Number(r.choose) || 1), rank: String(r.rank), options: [] };
      await this.item.update({ "system.choiceGroups": [...s.choiceGroups, l] });
    }
  }
  async #A(e) {
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(e ? "CYPHERV2.Packages.EditPoolBonusChoiceGroup" : "CYPHERV2.Packages.AddPoolBonusChoiceGroup") },
      content: `<div class="cypherv2 cypherv2-dialog package-pool-choice-authoring">
        <div class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.Amount")}<input name="amount" type="number" min="1" value="${e?.amount ?? 1}"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="${e?.choose ?? 1}"></label>
        </div>
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Packages.AllowedPools")}</span>
        <div class="package-pool-choice-options">
          ${V.map((r) => `<label class="cypherv2-dialog-toggle"><input name="pool_${r}" type="checkbox" ${e?.pools.includes(r) ? "checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Pools.${r[0].toUpperCase()}${r.slice(1)}`)}</span></label>`).join("")}
        </div>
      </div>`,
      ok: { label: game.i18n.localize(e ? "CYPHERV2.Actions.Save" : "CYPHERV2.Actions.Add") }
    });
    if (!t) return null;
    const i = Math.trunc(Number(t.amount)), o = Math.trunc(Number(t.choose)), a = V.filter((r) => !!t[`pool_${r}`]);
    return !Number.isInteger(i) || i < 1 || !Number.isInteger(o) || o < 1 || o > a.length ? (ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null) : { amount: i, choose: o, pools: a };
  }
  static async #K() {
    if (this.item.type !== "descriptor") return;
    const e = await this.#A();
    if (!e) return;
    const t = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({ "system.poolBonusChoiceGroups": [...t, { id: crypto.randomUUID(), ...e }] });
  }
  static async #X(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [], o = i.find((r) => r.id === t.dataset.groupId);
    if (!o) return;
    const a = await this.#A(o);
    a && await this.item.update({
      "system.poolBonusChoiceGroups": i.map((r) => r.id === o.id ? { ...r, ...a } : r)
    });
  }
  static async #J(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({
      "system.poolBonusChoiceGroups": i.filter((o) => o.id !== t.dataset.groupId)
    });
  }
  static async #Q(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = t.dataset.groupId, o = this.item.system, a = t.dataset.choiceKind ?? "skill", r = this.item.type !== "descriptor" && a === "ability", s = this.item.type === "species" && a === "descriptor";
    if (!(r ? o.abilityChoiceGroups.find((m) => m.id === i) : s ? o.descriptorChoiceGroups.find((m) => m.id === i) : o.choiceGroups.find((m) => m.id === i))) return;
    const u = r ? "ability" : s ? "descriptor" : "skill", c = [...game.items].filter((m) => m.type === u).sort((m, y) => m.name.localeCompare(y.name)), p = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(r ? "CYPHERV2.Species.AddAbilityOption" : s ? "CYPHERV2.Species.AddDescriptorOption" : "CYPHERV2.Packages.AddSkillOption") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${r || s ? "" : `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>`}${c.map((m) => `<option value="${Ee(m.uuid)}">${Ee(m.name)}</option>`).join("")}</select></label>${r || s ? "" : `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="2"></textarea></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!p) return;
    const h = p.uuid === "custom" ? null : await fromUuid(String(p.uuid ?? ""));
    if (r) {
      if (!h) return;
      const m = { id: crypto.randomUUID(), abilityUuid: h.uuid, snapshot: this.#v(h) }, y = o.abilityChoiceGroups;
      await this.item.update({ "system.abilityChoiceGroups": y.map((f) => f.id === i ? { ...f, options: [...f.options, m] } : f) });
    } else if (s) {
      if (!h) return;
      const m = { id: crypto.randomUUID(), descriptorUuid: h.uuid, snapshot: this.#v(h) }, y = o.descriptorChoiceGroups;
      await this.item.update({ "system.descriptorChoiceGroups": y.map((f) => f.id === i ? { ...f, options: [...f.options, m] } : f) });
    } else {
      const m = this.#R(h, String(p.customName ?? ""), String(p.notes ?? ""));
      if (!m) return;
      await this.item.update({ "system.choiceGroups": o.choiceGroups.map((y) => y.id === i ? { ...y, options: [...y.options, m] } : y) });
    }
  }
  static async #Z(e, t) {
    const i = this.#k(t);
    if (!i || !("skillUuid" in i)) return;
    const o = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.EditSkillContextNote") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="3">${Ee(String(i.notes ?? ""))}</textarea></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
    });
    o && await this.#F(t, { ...i, notes: String(o.notes ?? "") });
  }
  static async #ee(e, t) {
    const i = this.#k(t);
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
  static async #te(e, t) {
    const i = this.#k(t);
    if (!i) return;
    const o = "abilityUuid" in i ? i.abilityUuid : "skillUuid" in i ? i.skillUuid : i.descriptorUuid, a = o ? await fromUuid(o) : null;
    if (!a) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    await this.#F(t, { ...i, snapshot: this.#v(a) });
  }
  static async #ie(e, t) {
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
      } else if (i === "descriptorOption") {
        const a = t.dataset.groupId, r = this.item.system.descriptorChoiceGroups;
        await this.item.update({ "system.descriptorChoiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.filter((l) => l.id !== o) } : s) });
      } else if (i === "descriptorGroup") {
        const a = this.item.system.descriptorChoiceGroups;
        await this.item.update({ "system.descriptorChoiceGroups": a.filter((r) => r.id !== o) });
      }
    }
  }
  static async #S() {
    await ki(this.item);
  }
  static async #ne(e, t) {
    const i = t.dataset.nodeId;
    if (!i) throw new Error("Missing Focus node ID.");
    await Ar(this.#$(), i);
  }
  static async #oe() {
    try {
      this.#H(), this.#a = new Cu(
        this.item.system.graph
      ), this.#t.reset(), await this.#h();
    } catch (e) {
      te(e);
    }
  }
  static async #ae() {
    try {
      const e = this.#y(), t = [...game.items].filter((r) => r.type === "ability").sort((r, s) => r.name.localeCompare(s.name));
      if (t.length === 0) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Editor.NoWorldAbilities"));
        return;
      }
      const i = await foundry.applications.api.DialogV2.input({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") },
        content: `<div class="cypherv2-dialog-fields">
          <label>${game.i18n.localize("CYPHERV2.Focus.Editor.Ability")}
            <select name="abilityUuid">${t.map((r) => `<option value="${Ee(r.uuid)}">${Ee(r.name)}</option>`).join("")}</select>
          </label>
          ${this.#I()}
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
      te(e);
    }
  }
  static async #re() {
    try {
      const e = this.#y(), t = e.diagnostics().filter((i) => i.severity === "warning");
      t.length > 0 && ui.notifications.warn(t.map((i) => i.message).join(`
`)), await e.save((i) => this.item.update({ "system.graph": i })), this.#a = null, this.#t.reset(), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Editor.Saved")), await this.#h();
    } catch (e) {
      if (e instanceof Rt) {
        ui.notifications.error(e.diagnostics.map((t) => t.message).join(`
`));
        return;
      }
      te(e);
    }
  }
  static async #se() {
    this.#a?.cancel(), this.#a = null, this.#t.reset(), await this.#h();
  }
  static async #le(e, t) {
    e.preventDefault(), e.stopPropagation(), this.#y(), this.#t.select(this.#E(t)), await this.#h();
  }
  static async #ce(e, t) {
    try {
      const i = t.dataset.direction;
      if (i !== "left" && i !== "right") throw new Error("Missing movement direction.");
      this.#y().moveNode(this.#E(t), i), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  static async #de(e, t) {
    try {
      this.#y().setTier(this.#E(t), Number(t.dataset.tier)), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  static async #ue(e, t) {
    this.#y(), this.#t.startConnection(), await this.#h();
  }
  static async #me(e, t) {
    try {
      const i = this.#E(t), o = this.#t.connectionTo(i);
      this.#y().connect(o.from, o.to), this.#t.finishConnection(i), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  static async #pe() {
    this.#t.cancelConnection(), await this.#h();
  }
  static async #fe(e, t) {
    try {
      const i = t.dataset.connectionId;
      if (!i) throw new Error("Missing Focus connection ID.");
      this.#y().deleteConnection(i), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  static async #he() {
    try {
      const e = this.#y();
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
      te(e);
    }
  }
  static async #ge(e, t) {
    try {
      const i = this.#E(t), o = this.#y().graph.nodes.find((r) => r.id === i);
      if (!o) throw new Error(`Focus node '${i}' was not found.`);
      const a = await fromUuid(o.abilityUuid);
      if (!a) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      this.#y().refreshSnapshot(i, a), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  static async #ye(e, t) {
    try {
      const i = this.#E(t), o = this.#y().graph.nodes.find((r) => r.id === i);
      if (!o) throw new Error(`Focus node '${i}' was not found.`);
      if (!await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.DeleteNode") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.Editor.DeleteNodeConfirm", {
          name: Ee(o.abilitySnapshot.name || o.id)
        })}</p></div>`,
        rejectClose: !1,
        modal: !0,
        yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) return;
      this.#y().deleteNode(i), this.#t.clearSelection(i), await this.#h();
    } catch (i) {
      te(i);
    }
  }
  #H() {
    if (this.item.type !== "focus" || !game.user.isGM || !this.isEditable)
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.GmOnly"));
  }
  #y() {
    if (this.#H(), !this.#a) throw new Error("Focus Tree editing is not active.");
    return this.#a;
  }
  #$() {
    const e = this.#a?.graph ?? this.item.system.graph;
    return {
      id: this.item.id,
      uuid: this.item.uuid,
      name: this.item.name,
      type: this.item.type,
      system: { graph: e }
    };
  }
  async #be(e) {
    const t = this.#y();
    if (e.type !== "ability")
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.DropAbilityOnly"));
    const i = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.ChooseTier") },
      content: `<div class="cypherv2-dialog-fields">${this.#I()}</div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") }
    });
    if (!i) return;
    const o = t.addAbility(e, Number(i.tier ?? 1));
    this.#t.select(o.id), await this.#h();
  }
  #I() {
    return `<label>${game.i18n.localize("CYPHERV2.Focus.Tier")}
      <select name="tier">${[1, 2, 3, 4, 5, 6].map((e) => `<option value="${e}">${e}</option>`).join("")}</select>
    </label>`;
  }
  #v(e) {
    const t = e.img;
    return { name: e.name, ...t ? { img: t } : {}, system: structuredClone(e.system) };
  }
  #V(e) {
    return !e || this.item.type !== "genre" ? null : this.item.system.abilityCatalog.find((t) => t.id === e) ?? null;
  }
  async #Y(e, t = 1) {
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
      minimumTier: cr(t),
      catalog: "progression",
      minimumSuperheroRank: 0,
      snapshot: this.#v(e)
    };
    await this.item.update({ "system.abilityCatalog": [...i.abilityCatalog, o] });
  }
  #R(e, t = "", i = "") {
    const o = t.trim();
    return !e && !o ? null : {
      id: crypto.randomUUID(),
      skillUuid: e?.uuid ?? "",
      customName: e ? "" : o,
      notes: i.trim(),
      snapshot: e ? this.#v(e) : { name: o, system: {} }
    };
  }
  async #we(e, t, i = "") {
    const o = this.item.system, a = this.#R(null, e, i);
    if (!a) return;
    const r = { ...a, rank: t };
    await this.item.update({ "system.skillGrants": [...o.skillGrants, r] });
  }
  async #P(e, t, i = "trained", o = "") {
    if (this.item.type === "characterType" && e.type === "ability") {
      const a = this.item.system, r = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#v(e) };
      await this.item.update({ "system.abilityGrants": [...a.abilityGrants, r] });
      return;
    }
    if (this.item.type === "characterType" && e.type === "skill") {
      const a = this.item.system, r = this.#R(e, "", o);
      if (!r) return;
      await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...r, rank: i }] });
      return;
    }
    if (this.item.type === "descriptor" && e.type === "skill") {
      const a = this.item.system, r = this.#R(e, "", o);
      if (!r) return;
      await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...r, rank: i }] });
      return;
    }
    if (this.item.type === "species") {
      const a = this.item.system;
      if (e.type === "ability") {
        const r = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#v(e) };
        await this.item.update({ "system.abilityGrants": [...a.abilityGrants, r] });
        return;
      }
      if (e.type === "skill") {
        const r = this.#R(e, "", o);
        if (!r) return;
        await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...r, rank: i }] });
        return;
      }
      if (e.type === "descriptor") {
        const r = { id: crypto.randomUUID(), descriptorUuid: e.uuid, snapshot: this.#v(e) };
        await this.item.update({ "system.descriptorGrants": [...a.descriptorGrants, r] });
        return;
      }
    }
    throw new Error(game.i18n.localize("CYPHERV2.Packages.InvalidDrop"));
  }
  #k(e) {
    const t = e.dataset.grantKind, i = e.dataset.grantId;
    if (!i) return null;
    if (t === "ability") return this.item.system.abilityGrants.find((a) => a.id === i) ?? null;
    const o = this.item.system;
    return t === "skill" ? o.skillGrants.find((a) => a.id === i) ?? null : t === "option" ? o.choiceGroups.find((a) => a.id === e.dataset.groupId)?.options.find((a) => a.id === i) ?? null : t === "abilityOption" ? this.item.system.abilityChoiceGroups.find((a) => a.id === e.dataset.groupId)?.options.find((a) => a.id === i) ?? null : t === "descriptor" ? this.item.system.descriptorGrants.find((a) => a.id === i) ?? null : t === "descriptorOption" ? this.item.system.descriptorChoiceGroups.find((a) => a.id === e.dataset.groupId)?.options.find((a) => a.id === i) ?? null : null;
  }
  async #F(e, t) {
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
    } else if (i === "descriptorOption") {
      const a = e.dataset.groupId, r = this.item.system.descriptorChoiceGroups;
      await this.item.update({ "system.descriptorChoiceGroups": r.map((s) => s.id === a ? { ...s, options: s.options.map((l) => l.id === o ? t : l) } : s) });
    }
  }
  #E(e) {
    const t = e.dataset.nodeId;
    if (!t) throw new Error("Missing Focus node ID.");
    return t;
  }
  async #h() {
    this.#c = Eu(this.element), await this.render({ force: !0 });
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#w = $u(this.element));
    const t = await super._prepareContext(e), i = this.item.system, o = this.item.type === "skill", a = this.item.type === "ability", r = this.item.type === "weapon", s = this.item.type === "armor", l = this.item.type === "shield", u = this.item.type === "equipment", c = this.item.type === "cypher", p = this.item.type === "artifact", h = this.item.type === "focus", m = this.item.type === "genre", y = this.item.type === "characterType", f = this.item.type === "descriptor", w = this.item.type === "species", C = y && String(i.genre ?? "none") === "superhero", P = y ? i.instance : void 0, Y = ["ability", "focus", "genre", "skill", "weapon", "armor", "shield", "equipment", "cypher", "artifact", "characterType", "descriptor", "species"].includes(this.item.type), k = typeof this.item._source?.system?.description == "string" ? this.item._source.system.description : "", H = Y ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(k, {
      async: !0,
      relativeTo: this.item
    }) : "", M = y ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.backgroundOptions ?? ""), { async: !0, relativeTo: this.item }) : "", O = y ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.equipmentNotes ?? ""), { async: !0, relativeTo: this.item }) : "", A = String(i.rank ?? "untrained"), D = String(i.defaultPool ?? "choose"), S = Array.isArray(i.contexts) ? i.contexts : [], K = a ? We(this.item) : [], j = a ? Au(i) : null, He = j ? {
      ...j,
      rollModifierLabel: game.i18n.localize(
        j.rollModifierLabel === "task" ? "CYPHERV2.Ability.TaskModifier" : j.rollModifierLabel === "defense" ? "CYPHERV2.Ability.DefenseModifier" : "CYPHERV2.Ability.RollModifier"
      )
    } : null, B = a ? this.item.flags?.cypherv2?.genreAbility : void 0, $ = B ? {
      catalogLabel: game.i18n.localize(`CYPHERV2.Genre.CatalogKind.${B.catalog ?? "progression"}`),
      genresLabel: (B.genres ?? []).map((b) => game.i18n.localize(`CYPHERV2.Packages.Genre.${b}`)).join(" · "),
      progressionBandLabel: B.progressionBand === "origin" ? game.i18n.localize("CYPHERV2.Genre.CatalogKind.origin") : game.i18n.localize(`CYPHERV2.Genre.ProgressionBand.${B.progressionBand ?? "mid-tier"}`),
      minimumSuperheroRank: Number(B.minimumSuperheroRank ?? 0)
    } : null, W = m ? i.abilityCatalog.map((b) => ({
      ...b,
      catalogLabel: game.i18n.localize(`CYPHERV2.Genre.CatalogKind.${b.catalog ?? "progression"}`),
      progressionBandLabel: (b.catalog ?? "progression") === "progression" ? b.minimumTier === 3 ? game.i18n.localize("CYPHERV2.Genre.ProgressionBand.mid-tier") : b.minimumTier === 6 ? game.i18n.localize("CYPHERV2.Genre.ProgressionBand.high-tier") : "" : "",
      minimumSuperheroRank: Number(b.minimumSuperheroRank ?? 0)
    })) : [], J = o && Hu({
      defaultPool: D,
      category: String(i.category ?? "general"),
      contexts: S,
      initiative: !!i.initiative
    }), ie = i.grantedBy, pe = !!(ie?.sourceUuid || ie?.instanceId || ie?.grantId), le = h ? this.#$() : null, Be = le?.system.graph, $e = Be?.nodes.find((b) => b.id === this.#t.selectedNodeId), be = new Map(Be?.nodes.map((b) => [
      b.id,
      b.abilitySnapshot.name || b.id
    ]) ?? []);
    return {
      ...t,
      item: this.item,
      system: this.item.system,
      systemFields: Jn(this.item),
      enriched: { description: H, backgroundOptions: M, equipmentNotes: O },
      usesRichDescription: Y,
      isSkill: o,
      isAbility: a,
      isWeapon: r,
      isArmor: s,
      isShield: l,
      isEquipment: u,
      isCypher: c,
      isArtifact: p,
      isFocus: h,
      isGenre: m,
      isCharacterType: y,
      typeCustomGenreSelected: y && String(i.genre ?? "none") === "custom",
      typeSuperheroSelected: C,
      typeSuperheroAttached: C && !!P?.instanceId,
      typeSuperheroicsPoolLabel: P?.selections?.superheroicsPool && P.selections.superheroicsPool !== "none" ? game.i18n.localize(`CYPHERV2.Pools.${P.selections.superheroicsPool[0].toUpperCase()}${P.selections.superheroicsPool.slice(1)}`) : game.i18n.localize("CYPHERV2.Common.None"),
      typeWeaponFamiliesValue: y ? se(i.weaponFamilies).map(ht).join(", ") : "",
      speciesWeaponFamiliesValue: w ? se(i.weaponFamilies).map(ht).join(", ") : "",
      weaponFamilySuggestions: Ba.map((b) => ({ value: ht(b) })),
      isDescriptor: f,
      isSpecies: w,
      isCompactRuleItem: a || o || r || s || l || u || c || p || m || y || w,
      usesCleanItemHeader: a || o || r || s || l || u || c || p || h || m || f || y || w,
      hideNormalItemFooter: a || o || r || s || l || u || c || p || h || m || f || y || w,
      genreEffortCapOptions: m ? ["core", "unlimited"].map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Genre.EffortCap.${b}`),
        selected: i.options?.totalEffortCapMode === b
      })) : [],
      genreMinimumTierMin: nt,
      genreMinimumTierMax: Bt,
      genreCatalogEntries: W,
      abilityMechanics: He,
      abilityGenreReview: $,
      skillOptionalMechanics: J,
      hasGrantProvenance: pe,
      packagePoolOptions: ["none", ...V].map((b) => ({
        value: b,
        label: b === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${b[0].toUpperCase()}${b.slice(1)}`),
        selected: i.edgeGrant?.pool === b
      })),
      packageGenreOptions: ["none", "fantasy", "scienceFiction", "superhero", "custom"].map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Packages.Genre.${b}`),
        selected: i.genre === b
      })),
      edgeModeOptions: ["none", "fixed", "choice"].map((b) => ({
        value: b,
        label: game.i18n.localize(b === "none" ? "CYPHERV2.Common.None" : b === "fixed" ? "CYPHERV2.Packages.FixedPool" : "CYPHERV2.Packages.ChoicePool"),
        selected: i.edgeGrant?.mode === b
      })),
      descriptorSkillGrants: f ? i.skillGrants.map((b) => ({
        ...b,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`)
      })) : [],
      descriptorPoolBonusChoiceGroups: f ? (i.poolBonusChoiceGroups ?? []).map((b) => ({
        ...b,
        poolsLabel: b.pools.map((Le) => game.i18n.localize(
          `CYPHERV2.Pools.${Le[0].toUpperCase()}${Le.slice(1)}`
        )).join(" · ")
      })) : [],
      descriptorChoiceGroups: f ? i.choiceGroups.map((b) => ({
        ...b,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`)
      })) : [],
      typeSkillGrants: y ? i.skillGrants.map((b) => ({
        ...b,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`)
      })) : [],
      typeSkillChoiceGroups: y ? i.choiceGroups.map((b) => ({
        ...b,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`)
      })) : [],
      typeAbilityChoiceGroups: y ? i.abilityChoiceGroups : [],
      speciesSkillGrants: w ? i.skillGrants.map((b) => ({ ...b, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`) })) : [],
      speciesSkillChoiceGroups: w ? i.choiceGroups.map((b) => ({ ...b, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b.rank}`) })) : [],
      speciesAbilityChoiceGroups: w ? i.abilityChoiceGroups : [],
      speciesDescriptorChoiceGroups: w ? i.descriptorChoiceGroups.map((b) => ({
        ...b,
        catalogMode: (b.sourceMode ?? "fixed") === "catalog",
        catalogLabel: game.i18n.localize("CYPHERV2.Packages.AllAvailableDescriptors")
      })) : [],
      canEditFocusTree: !!(h && game.user.isGM && this.isEditable && !this.#a),
      focusTreeEditing: !!this.#a,
      focusEditor: this.#a ? {
        dirty: this.#a.dirty,
        tierOptions: [1, 2, 3, 4, 5, 6],
        connecting: !!this.#t.connectionSourceNodeId,
        connectionSourceName: this.#t.connectionSourceNodeId ? be.get(this.#t.connectionSourceNodeId) : "",
        selectedNode: $e ? {
          ...$e,
          canMoveLeft: !0,
          canMoveRight: !0
        } : null,
        connections: Be?.connections.map((b) => ({
          ...b,
          fromName: be.get(b.from) ?? b.from,
          toName: be.get(b.to) ?? b.to
        })) ?? []
      } : null,
      focusTrees: h ? [await game.cypherv2.services.focusTrees.prepare(le, this.#a ? {
        editor: {
          selectedNodeId: this.#t.selectedNodeId,
          connectionSourceNodeId: this.#t.connectionSourceNodeId
        }
      } : {})] : [],
      isHeavyWeapon: r && i.category === "heavy",
      abilityActivationOptions: a ? Ta.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Ability.Activation.${b}`),
        selected: i.activation === b
      })) : [],
      abilityAllowedPoolOptions: a ? V.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Pools.${b[0].toUpperCase()}${b.slice(1)}`),
        selected: K.includes(b)
      })) : [],
      abilityRollOptions: a ? za.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Ability.Roll.${b}`),
        selected: i.roll === b
      })) : [],
      abilityWoundOptions: a ? ["none", ...ae].map((b) => ({
        value: b,
        label: game.i18n.localize(b === "none" ? "CYPHERV2.Common.None" : `CYPHERV2.Wounds.Severity.${b}`),
        selected: i.woundSeverity === b
      })) : [],
      abilityTargetOptions: a ? Na.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Ability.TargetMode.${b}`),
        selected: i.targetMode === b
      })) : [],
      cypherManifestationOptions: c ? Nn.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${b}`),
        selected: i.manifestation === b
      })) : [],
      cypherPowerOptions: c ? Mn.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Cypher.Power.${b}`),
        selected: i.power === b
      })) : [],
      cypherEffectiveLevel: c ? co(i) : 0,
      artifactLevelRollable: p ? Ai(i) : !1,
      skillRankOptions: o ? ee.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b}`),
        selected: b === A
      })) : [],
      skillPoolOptions: o ? [
        { value: "choose", label: game.i18n.localize("CYPHERV2.Skill.ChoosePool"), selected: D === "choose" },
        ...V.map((b) => ({
          value: b,
          label: game.i18n.localize(`CYPHERV2.Pools.${b[0].toUpperCase()}${b.slice(1)}`),
          selected: b === D
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
      ].map((b) => ({
        value: b,
        label: game.i18n.localize(
          b === "attack" ? "CYPHERV2.Combat.Context.AnyAttack" : b === "defense" ? "CYPHERV2.Combat.Context.AnyDefense" : `CYPHERV2.Combat.Context.${b}`
        ),
        selected: S.includes(b)
      })) : [],
      weaponCategoryOptions: r ? xe.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${b}`),
        selected: i.category === b
      })) : [],
      weaponFamilyDisplay: r ? ht(i.family) : "",
      weaponDefaultPoolOptions: r ? ["none", ...V].map((b) => ({
        value: b,
        label: b === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${b[0].toUpperCase()}${b.slice(1)}`),
        selected: i.defaultPool === b
      })) : [],
      weaponAttackTypeOptions: r ? Fa.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${b}`),
        selected: i.attackType === b
      })) : [],
      rangeOptions: r ? wn.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Combat.Range.${b}`),
        selected: i.rangeCategory === b
      })) : [],
      weaponAttackModifierOptions: r ? [-2, -1, 0, 1, 2].map((b) => ({
        value: b,
        label: b > 0 ? `+${b}` : String(b),
        selected: i.attackModifier === b
      })) : [],
      weaponSkillLevelOptions: r ? ee.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${b}`),
        selected: i.skillLevel === b
      })) : [],
      combatResourcesExpanded: (r || s || l) && this.#d.has("combat-resources"),
      advancedExpanded: this.#d.has("advanced"),
      shieldWoundsExpanded: l && this.#d.has("shield-wounds"),
      combatDepletionSides: r || s || l ? Wt(i.depletion ?? { die: "d6" }) : 0,
      combatDepletionThreshold: r || s || l ? kr(Number(i.depletion?.threshold ?? 1)) : "",
      depletionDieOptions: r || p ? hs.map((b) => ({
        value: b,
        label: `1 in 1${b}`,
        selected: i.depletion?.die === b
      })) : [],
      armorCategoryOptions: s ? Ue.map((b) => ({
        value: b,
        label: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${b}`),
        selected: i.category === b
      })) : [],
      shieldWoundTracks: l ? vi({
        minor: i.wounds.minor.length,
        moderate: i.wounds.moderate.length,
        major: i.wounds.major.length
      }, i.derived.capacities).map((b) => ({
        ...b,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${b.severity}`),
        pips: b.pips.map((Le) => ({
          ...Le,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${b.severity}`),
            count: Le.targetCount
          })
        }))
      })) : []
    };
  }
}
function Qe(n, e) {
  return String(n[e] ?? "");
}
function gi(n) {
  return n.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
async function Br(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n ? "CYPHERV2.Combat.Modification.Edit" : "CYPHERV2.Combat.Modification.Create") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Common.Name")} <input name="label" type="text" value="${gi(n?.label ?? "")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Contexts")} <input name="contexts" type="text" value="${gi(n?.contexts.join(", ") ?? "defense.speed")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.ModeLabel")}
        <select name="mode">
          ${["levelOverride", "levelDelta", "ease", "hinder"].map((o) => `<option value="${o}"${n?.mode === o ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${o}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Value")} <input name="value" type="number" step="1" value="${n?.value ?? 0}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Predicate")} <textarea name="predicate">${gi(JSON.stringify(n?.predicate ?? {}))}</textarea></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Visibility")}
        <select name="visibility"><option value="gm">${game.i18n.localize("CYPHERV2.Combat.Modification.Gm")}</option><option value="public"${n?.visibility === "public" ? " selected" : ""}>${game.i18n.localize("CYPHERV2.Combat.Modification.Public")}</option></select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Common.Description")} <textarea name="description">${gi(n?.description ?? "")}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (!e) return null;
  const t = JSON.parse(Qe(e, "predicate") || "{}");
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("NPC modification predicate must be a JSON object.");
  const i = Qe(e, "mode");
  return {
    id: n?.id ?? Oe(),
    label: Qe(e, "label"),
    contexts: Qe(e, "contexts").split(",").map((o) => o.trim()).filter(Boolean),
    mode: i,
    value: Number(Qe(e, "value")),
    visibility: Qe(e, "visibility") === "public" ? "public" : "gm",
    predicate: t,
    description: Qe(e, "description")
  };
}
async function Yu(n) {
  try {
    const e = await Br();
    if (!e) return;
    await n.update({ "system.modifications": [...n.system.modifications, e] });
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
async function Fu(n, e) {
  try {
    const t = n.system.modifications.find((o) => o.id === e);
    if (!t) throw new Error(`NPC modification '${e}' was not found.`);
    const i = await Br(t);
    if (!i) return;
    await n.update({
      "system.modifications": n.system.modifications.map((o) => o.id === e ? i : o)
    });
  } catch (t) {
    ui.notifications.error(t instanceof Error ? t.message : String(t));
  }
}
async function Du(n, e) {
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
function Tu(n) {
  const e = typeof n == "number" ? n : typeof n == "string" && n.trim() !== "" ? Number(n) : Number.NaN;
  return Number.isInteger(e) && e >= 0 ? e * 3 : null;
}
function zu(n, e) {
  const t = Mr(n, e), i = t.ratio > 0.5 ? "healthy" : t.ratio > 0.25 ? "intermediate" : "low";
  return { ...t, state: i };
}
const Nu = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
), ga = /* @__PURE__ */ new Set([
  "requestDefense",
  "createModification",
  "editModification",
  "deleteModification"
]);
class yt extends Nu {
  static DEFAULT_OPTIONS = {
    ...Xn,
    classes: ["cypherv2", "sheet", "actor", "npc-sheet"],
    actions: Qn({
      requestDefense: yt.#e,
      createModification: yt.#t,
      editModification: yt.#i,
      deleteModification: yt.#n
    }, ga),
    position: { width: 680, height: 700 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/actor/npc-sheet.hbs" }
  };
  static async #e() {
    await zc(this.actor);
  }
  static async #t() {
    await Yu(this.actor);
  }
  static async #i(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await Fu(this.actor, i);
  }
  static async #n(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await Du(this.actor, i);
  }
  async _onRender(e, t) {
    await super._onRender(e, t), Zn(this.element, this.isEditable, ga);
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
      systemFields: Jn(this.actor),
      editable: this.isEditable,
      isGM: game.user.isGM,
      enriched: { notes: r },
      targetNumber: Tu(i.level) ?? "—",
      healthGauge: zu(
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
function Mu() {
  const { DocumentSheetConfig: n } = foundry.applications.apps;
  n.registerSheet(foundry.documents.Actor, I, R, {
    types: ["character"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Character"
  }), n.registerSheet(foundry.documents.Actor, I, yt, {
    types: ["npc"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Npc"
  }), n.registerSheet(foundry.documents.Item, I, F, {
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Item"
  });
}
function Z(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function Lr(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function qu(n) {
  const e = Z(n, "Paid Effort");
  return e === 0 ? 0 : 3 + (e - 1) * 2;
}
function Fn(n, e, t, i = !1) {
  const o = Z(n, "Action cost"), a = Z(e, "Effort cost"), r = o + a, s = a + (i ? 0 : o), l = Math.min(s, Math.max(0, Math.trunc(t)));
  return {
    actionCostBeforeEdge: o,
    effortCostBeforeEdge: a,
    totalCostBeforeEdge: r,
    edgeApplied: l,
    poolCost: Math.max(0, r - l)
  };
}
function jr(n) {
  if (Z(n, "Natural d20 result", 1), n > 20) throw new Error("Natural d20 result cannot exceed 20.");
  return [1, 17, 18, 19, 20].includes(n) ? [`natural-${n}`] : [];
}
function xu(n) {
  return jr(n), Math.floor(n / 3);
}
function cn(n, e, t, i, o) {
  return { id: n, label: e, direction: t, steps: i, source: o };
}
function Uu(n) {
  const e = Z(n.limits.difficultyCeiling, "Difficulty ceiling"), t = Z(n.limits.assetLimit, "Asset limit"), i = Z(n.limits.paidEffortMaximum, "Maximum Effort"), o = Z(n.assets, "Assets"), a = Z(n.paidEffort, "Paid Effort"), r = Z(n.damageEffort ?? 0, "Damage Effort"), s = Z(n.freeDamageEffort ?? 0, "Free Damage Effort"), l = Z(n.freeEffort, "Free Effort"), u = n.limits.totalEffortMaximum === null ? null : Z(n.limits.totalEffortMaximum, "Maximum total Effort");
  if (Z(n.poolValue, "Pool value"), o > t) throw new Error(`Assets cannot exceed the current limit of ${t}.`);
  const c = r + s, p = a + c + l, h = a + r, m = l + s;
  if (u !== null && p > u)
    throw new Error(`Maximum total Effort: ${u}.`);
  if (h > i)
    throw new Error(`Paid Effort cannot exceed the Character maximum of ${i}.`);
  const y = [];
  o > 0 && y.push(cn(
    "core.assets",
    "CYPHERV2.Roll.Breakdown.Assets",
    "ease",
    o,
    "asset"
  )), a > 0 && y.push(cn(
    "core.effort.paid",
    "CYPHERV2.Roll.Breakdown.PaidEffort",
    "ease",
    a,
    "effort"
  )), l > 0 && y.push(cn(
    "core.effort.free",
    "CYPHERV2.Roll.Breakdown.FreeEffort",
    "ease",
    l,
    "free-effort"
  ));
  for (const H of n.contributions)
    Z(H.steps, `Steps for '${H.id}'`), H.steps > 0 && y.push({ ...H });
  const f = y.filter((H) => H.direction === "ease").reduce((H, M) => H + M.steps, 0), w = y.filter((H) => H.direction === "hinder").reduce((H, M) => H + M.steps, 0), C = f - w, P = Fn(
    n.actionCost ?? 0,
    qu(h),
    n.edge,
    n.actionCostIgnoresEdge ?? !1
  );
  let Y = null, k = null;
  if (n.difficulty.mode !== "unknown") {
    const H = Z(n.difficulty.value, "Difficulty");
    if (H > e)
      throw new Error(`Difficulty cannot exceed the current ceiling of ${e}.`);
    Y = Lr(H - C, 0, e), k = Y * 3;
  }
  return {
    context: n,
    breakdown: y,
    totalEase: f,
    totalHindrance: w,
    netSteps: C,
    damageEffortApplied: c,
    totalEffortApplied: p,
    paidEffortApplied: h,
    freeEffortApplied: m,
    totalEffortMaximum: u,
    ...P,
    finalDifficulty: Y,
    targetNumber: k
  };
}
function Gu(n, e) {
  if (n.finalDifficulty === 0) return Wr(n);
  const t = jr(e), i = n.targetNumber === null ? null : e >= n.targetNumber, o = xu(e), a = Lr(
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
function Wr(n) {
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
function dn(n) {
  return n === null ? "unresolved" : n ? "applied" : "inapplicable";
}
function Ou(n, e = 1) {
  const t = n.naturalRoll;
  if (t === null) return [];
  const i = { sourceId: "cypherv2.core", naturalRoll: t }, o = Ht(e);
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
      status: r ? dn(n.success) : "inapplicable",
      label: `CYPHERV2.Roll.NaturalEffects.Damage${t}`,
      damageBonus: t === 17 ? 1 : 2
    }];
  }
  if (t === 19) {
    const r = dn(n.success);
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
    const r = dn(n.success), s = n.prepared.context.purpose === "damage" ? [{
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
const Ze = {
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
function Bu(n) {
  n.register(Ze), n.registerDifficultyPolicy(Ze.id, (e) => ({
    ...e,
    assetLimit: 2
  })), n.registerSkillRankRule(Ze.id, Wu), n.registerNaturalResultRule(Ze.id, (e, t) => [
    ...t,
    ...Ou(e, e.prepared.context.horrorIntrusionRange)
  ]), n.registerGMIntrusionPolicy(Ze.id, (e) => ({
    ...e,
    targetedXpToTarget: 1,
    targetedXpToShare: 1,
    groupXpPerTarget: 1,
    freeXp: 0
  })), n.registerCombatPolicy(Ze.id, () => Lu), n.registerAdvancementPolicy(Ze.id, () => Oa);
}
const Lu = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
}), ju = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function Wu(n, e) {
  const t = ju[n];
  return t === 0 ? null : {
    id: `core.skill.${e.id}.rank`,
    label: `CYPHERV2.Skill.Ranks.${n}`,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: "skill",
    sourceId: e.id
  };
}
class _u {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Map();
  #n = /* @__PURE__ */ new Map();
  #o = /* @__PURE__ */ new Map();
  #r = /* @__PURE__ */ new Map();
  #l = /* @__PURE__ */ new Map();
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
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
    const i = this.#l.get(e) ?? [];
    i.push(t), this.#l.set(e, i);
  }
  resolveCombatPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#l.get(o.id) ?? [])
        i = { ...a(Object.freeze({ ...i })) };
    return Object.freeze(i);
  }
  registerTargetResolutionRule(e, t) {
    this.#s(e, "targetRules");
    const i = this.#a.get(e) ?? [];
    i.push(t), this.#a.set(e, i);
  }
  enrichTargetResolution(e, t, i, o = []) {
    let a = e;
    for (const r of this.active(o))
      for (const s of this.#a.get(r.id) ?? [])
        a = s(Object.freeze(a), Object.freeze(t), Object.freeze(i));
    return Object.freeze(a);
  }
  registerAdvancementPolicy(e, t) {
    this.#s(e, "advancementRules");
    const i = this.#c.get(e) ?? [];
    i.push(t), this.#c.set(e, i);
  }
  resolveAdvancementPolicy(e, t = []) {
    let i = { ...e };
    for (const o of this.active(t))
      for (const a of this.#c.get(o.id) ?? [])
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
async function Ku() {
  const n = await new Roll("1d6").evaluate();
  return Number(n.total);
}
function yi(n, e, t, i) {
  if (!Number.isInteger(n) || n < e || n > t)
    throw new Error(`${i} must be an integer from ${e} to ${t}.`);
  return n;
}
class Xu {
  #e;
  #t;
  #i;
  constructor(e = Ku, t = Oe, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  calculateRoll(e, t, i, o = !1, a = 0, r = "") {
    yi(i, 1, 6, "Recovery die"), yi(t, 1, Number.MAX_SAFE_INTEGER, "Tier"), yi(a, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, "Recovery bonus");
    const s = a + (e === "one-action" && o ? 2 : 0);
    return { slotId: r, type: e, dieResult: i, tier: t, bonus: s, total: Math.max(0, i + t + s), lastAction: o };
  }
  availableTypes(e) {
    return Ma(e);
  }
  isAvailable(e, t) {
    return !e[_t[t]];
  }
  slots(e) {
    return e.system.recovery.slots?.length ? e.system.recovery.slots.map((t) => ({ ...t })) : at(e.system.recovery.used);
  }
  availableSlots(e) {
    return Mt(this.slots(e));
  }
  async roll(e, t, i = !1, o) {
    Ne(e);
    const a = this.availableSlots(e).find((r) => r.type === t && (!o || r.id === o));
    if (!a)
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    return this.calculateRoll(
      t,
      L(e.system),
      await this.#e(),
      i,
      e.system.derived.recovery.bonus,
      a.id
    );
  }
  distribute(e, t, i) {
    const o = V.reduce((s, l) => s + yi(i[l], 0, Number.MAX_SAFE_INTEGER, `${l} allocation`), 0);
    if (o > t.total) throw new Error("Recovery allocations exceed the Recovery result.");
    const a = {}, r = {};
    for (const s of V) {
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
    Ne(e);
    const o = this.slots(e), a = t.slotId || Mt(o).find((c) => c.type === t.type)?.id || "", r = bo(o, a, t.type), s = this.distribute(e, t, i), l = Ct(r), u = {
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
    Ne(e);
    const o = this.slots(e), a = Mt(o).find((c) => c.type === t && (!i || c.id === i));
    if (!a)
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    const r = bo(o, a.id, t), s = Ct(r), l = { might: 0, speed: 0, intellect: 0 }, u = {
      id: this.#t(),
      slotId: a.id,
      kind: "nonRest",
      type: t,
      rolled: !1,
      dieResult: 0,
      tier: L(e.system),
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
const Ju = {
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
function Qu(n) {
  return n === "one-action" ? null : n;
}
function ya(n, e) {
  const t = [n === "normal" ? "recovery" : "non-rest-recovery"];
  return e !== "one-action" && t.push("10-minute-or-longer"), (e === "1-hour" || e === "10-hours") && t.push("1-hour-or-longer"), e === "10-hours" && t.push("10-hour"), t;
}
class Zu {
  #e;
  #t;
  #i;
  constructor(e, t, i = Ju) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async rollNormal(e, t, i = !1, o) {
    return this.#e.roll(e, t, i, o);
  }
  async completeNormal(e, t, i, o = {}) {
    Ne(e);
    const a = Qu(t.type), r = a ? this.#t.prepare(e, a, o) : null, s = this.#e.prepareNormal(e, t, i), l = {
      kind: "normal",
      type: t.type,
      recovery: s,
      rest: r,
      durationTriggers: ya("normal", t.type)
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
    Ne(e);
    const o = this.#e.prepareNonRest(e, t, i), a = {
      kind: "nonRest",
      type: t,
      recovery: o,
      rest: null,
      durationTriggers: ya("nonRest", t)
    };
    return await this.#i.beforeComplete(a), await e.update({
      "system.recovery.used": o.used,
      "system.recovery.slots": o.slots,
      "system.recovery.history": [...e.system.recovery.history, o.historyEntry]
    }), await this.#i.processDurations(a), await this.#i.afterComplete(a), await this.#i.refresh(a), a;
  }
}
class em {
  #e;
  #t;
  constructor(e = Oe, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  rest(e, t, i = {}) {
    const o = pt(e), a = [];
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
    Ne(e);
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
const ba = { minor: 3, moderate: 3, major: 3 };
function zt(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function tm(n) {
  return zt(n, "Pool damage overflow"), n === 0 ? null : n <= 4 ? "minor" : n <= 8 ? "moderate" : "major";
}
class im {
  #e;
  constructor(e = Oe) {
    this.#e = e;
  }
  applyWound(e, t, i = ba, o = {}) {
    const a = pt(e), r = {
      id: o.id ?? this.#e(),
      label: o.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
      description: o.description ?? "",
      sourceUuid: o.sourceUuid ?? "cypherv2.core",
      treated: o.treated ?? !1
    }, s = ae.indexOf(t);
    if (s < 0) throw new Error(`Unsupported Wound severity '${t}'.`);
    for (let l = s; l < ae.length; l += 1) {
      const u = ae[l];
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
      overflowSteps: ae.length - s,
      record: null,
      applied: !1,
      dead: a.major.length >= i.major
    };
  }
  removeOne(e, t, i) {
    const o = pt(e), a = i ? o[t].findIndex((s) => s.id === i) : o[t].length - 1;
    if (a < 0) return { wounds: o, removed: null };
    const [r] = o[t].splice(a, 1);
    return { wounds: o, removed: r ?? null };
  }
  updateWound(e, t, i, o) {
    if (typeof o.label != "string" || typeof o.description != "string")
      throw new Error("Wound label and description must be strings.");
    const a = pt(e), r = a[t].findIndex((u) => u.id === i);
    if (r < 0) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    const l = { ...a[t][r], label: o.label, description: o.description };
    return a[t][r] = l, { wounds: a, updated: l };
  }
  removeAll(e, t) {
    const i = pt(e), o = i[t];
    return i[t] = [], { wounds: i, removed: o };
  }
  setWoundCount(e, t, i, o, a = {}) {
    const r = zt(i, "Wound count"), s = zt(o, "Wound capacity");
    if (r > s) throw new Error("Wound count cannot exceed its capacity.");
    const l = pt(e), u = l[t], c = u.length, p = r < c ? u.splice(r) : [], h = [];
    for (; u.length < r; ) {
      const m = {
        id: this.#e(),
        label: a.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
        description: a.description ?? "",
        sourceUuid: a.sourceUuid ?? "cypherv2.manual",
        treated: a.treated ?? !1
      };
      u.push(m), h.push(m);
    }
    return { wounds: l, severity: t, previousCount: c, count: r, added: h, removed: p };
  }
  applyPoolDamage(e, t, i, o, a = ba, r = {}) {
    const s = zt(i, "Pool value"), l = zt(o, "Pool damage"), u = Math.min(s, l), c = s - u, p = l - u, h = tm(p), m = h ? this.applyWound(e, h, a, {
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
      overflowSeverity: h,
      wound: m
    };
  }
  async apply(e, t, i = {}) {
    return oe(e), this.applyTrack(e, t, e.system.derived.wounds.capacities, i);
  }
  async applyTrack(e, t, i, o = {}) {
    const a = this.applyWound(e.system.wounds, t, i, o);
    return a.applied && await e.update({ "system.wounds": a.wounds }), a;
  }
  async edit(e, t, i, o) {
    return oe(e), this.editTrack(e, t, i, o);
  }
  async editTrack(e, t, i, o) {
    const a = this.updateWound(e.system.wounds, t, i, o);
    return await e.update({ "system.wounds": a.wounds }), a;
  }
  async setCount(e, t, i, o = {}) {
    return oe(e), this.setTrackCount(
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
    return oe(e), this.deleteTrack(e, t, i);
  }
  async deleteTrack(e, t, i) {
    const o = this.removeOne(e.system.wounds, t, i);
    if (!o.removed) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    return await e.update({ "system.wounds": o.wounds }), { wounds: o.wounds, removed: o.removed };
  }
  async damagePool(e, t, i, o = {}) {
    oe(e);
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
function nm(n, e) {
  return n.naturalEffects.filter((t) => t.status !== "inapplicable").map((t) => ({
    kind: t.kind,
    label: e(t.label),
    status: e(`CYPHERV2.Roll.NaturalEffects.Status.${t.status}`),
    isIntrusion: t.kind === "gm-intrusion",
    ...t.damageBonus === void 0 ? {} : { damageBonus: t.damageBonus }
  }));
}
function om(n, e) {
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
function wa(n, e, t) {
  return `${ke(e, n)} ${t(e === "ease" ? n === 1 ? "CYPHERV2.Roll.EaseStep" : "CYPHERV2.Roll.EaseSteps" : n === 1 ? "CYPHERV2.Roll.HindranceStep" : "CYPHERV2.Roll.HindranceSteps")}`;
}
function am(n, e) {
  return n.breakdown.map((t) => ({
    label: e(t.label),
    value: ke(t.direction, t.steps)
  }));
}
function rm(n, e) {
  return n.breakdown.length === 0 && n.totalEase === 0 && n.totalHindrance === 0 ? [] : [{
    label: e("CYPHERV2.Roll.TotalEase"),
    value: n.totalEase === 0 ? 0 : ke("ease", n.totalEase)
  }, {
    label: e("CYPHERV2.Roll.TotalHindrance"),
    value: n.totalHindrance === 0 ? 0 : ke("hinder", n.totalHindrance)
  }];
}
function sm(n, e) {
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
function lm(n, e) {
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
function cm(n, e) {
  const t = n.naturalEffects.find((i) => i.kind === "gm-intrusion" && i.status === "applied" && i.intrusionProvenance === "horror-mode" && i.horrorIntrusionRange !== void 0);
  return t?.horrorIntrusionRange === void 0 ? [] : [{
    label: e("CYPHERV2.Horror.Title"),
    value: `1–${t.horrorIntrusionRange}`
  }];
}
function _r(n, e) {
  const t = n.prepared, i = t.context.pool ? `${t.context.pool[0].toUpperCase()}${t.context.pool.slice(1)}` : null, o = nm(n, e), a = o.filter((s) => !s.isIntrusion), r = [
    ...t.totalEase > 0 ? [wa(t.totalEase, "ease", e)] : [],
    ...t.totalHindrance > 0 ? [wa(t.totalHindrance, "hinder", e)] : []
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
      modifier: ke(s.direction, s.steps)
    })),
    modifierDetails: am(t, e),
    modifierTotalDetails: rm(t, e),
    effortDetails: sm(n, e),
    costDetails: lm(n, e),
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
    specialRoll: om(n, e),
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
function dm(n, e) {
  return n ? { outcome: e("CYPHERV2.Roll.Success"), outcomeIcon: "✓", outcomeClass: "success" } : { outcome: e("CYPHERV2.Roll.Failure"), outcomeIcon: "✕", outcomeClass: "failure" };
}
function Dn(n, e, t = !0) {
  return n.automaticSuccess && t ? { outcome: e("CYPHERV2.Roll.AutomaticSuccess"), outcomeIcon: "✓", outcomeClass: "success" } : dm(n.success === !0, e);
}
function um(n, e, t = (i) => i) {
  const i = _r(n, t), o = n.beatsDifficulty === null ? {} : {
    beatsDifficulty: n.beatsDifficulty,
    showBeatsDifficulty: !0
  }, a = cm(n, t), r = n.prepared.context.difficulty;
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
      ...Dn(n, t),
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
    ...Dn(n, t, !1),
    resolutionDetails: a,
    hasDetails: a.length > 0 || i.modifierDetails.length > 0 || i.modifierTotalDetails.length > 0 || i.effortDetails.length > 0 || i.costDetails.length > 0
  };
}
function mm(n, e = (t) => t) {
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
function pm(n, e = (t) => t) {
  const t = n.prepared.context.difficulty;
  if (t.mode !== "hidden") throw new Error("Only hidden-difficulty rolls require an audit card.");
  return {
    ..._r(n, e),
    originalDifficulty: t.value,
    finalDifficulty: n.prepared.finalDifficulty ?? 0,
    targetNumber: n.prepared.targetNumber ?? 0,
    ...Dn(n, e)
  };
}
class fm {
  async publish(e, t, i, o = {}) {
    const a = (y) => game.i18n.localize(y), r = um(t.result, i, a), s = mm(o.combat, a), l = {
      ...r,
      ...s,
      hasDetails: r.hasDetails || s.damageDetails.length > 0 || s.damageTotalDetails.length > 0,
      ...Se(e),
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
    const p = pm(t.result, a);
    if (Hooks.callAll("cypherv2HiddenRollAudit", p, e, t), o.showGmAudit !== !0) return;
    const h = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-audit-card.hbs",
      {
        ...p,
        ...s,
        ...Se(e)
      }
    ), m = {
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: h,
      whisper: ChatMessage.getWhisperRecipients("GM").map((y) => y.id),
      blind: !0
    };
    await ChatMessage.create(m);
  }
}
const hm = async () => {
  const n = await new Roll("1d20").evaluate();
  if (n.total === null) throw new Error("The d20 roll did not produce a total.");
  return { naturalRoll: n.total, chatRoll: n };
}, gm = (n) => {
  const e = n.system.genre.sourceUuid;
  if (!e || typeof fromUuidSync != "function") return "core";
  const t = fromUuidSync(e);
  return t?.type === "genre" ? t.system.options.totalEffortCapMode : "core";
}, ym = () => En();
function va(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function un(n, e, t, i) {
  if (!Number.isInteger(t)) throw new Error(`${e} steps must be an integer.`);
  return t === 0 ? null : {
    id: n,
    label: e,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: i
  };
}
class bm {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t = hm, i = gm, o = ym) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  preview(e, t, i) {
    oe(e), va(t.otherEase, "Other Ease"), va(t.otherHindrance, "Other Hindrance");
    const o = [], a = un(
      "manual.skill",
      "CYPHERV2.Roll.Breakdown.Skill",
      t.skillSteps,
      "skill"
    );
    a && o.push(a);
    const r = un(
      "manual.other-ease",
      "CYPHERV2.Roll.Breakdown.OtherEase",
      t.otherEase,
      "other"
    );
    r && o.push(r);
    const s = un(
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
      for (const w of c?.speedTaskContributions ?? [])
        o.push({
          id: w.id,
          label: `CYPHERV2.Combat.Armor.Unfamiliar.${c?.category ?? "light"}`,
          direction: "hinder",
          steps: w.value,
          source: "other",
          sourceId: w.sourceId
        });
    if (o.push(...t.contributions ?? []), t.pool === null && (t.paidEffort > 0 || (t.damageEffort ?? 0) > 0 || (t.actionCost ?? 0) > 0))
      throw new Error("A Pool-less roll cannot pay Effort or an action cost.");
    const h = i.enabledRuleModuleIds ?? [], m = this.#e.resolveDifficultyPolicy(i.base, h), y = {
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
        totalEffortMaximum: Ls(this.#i(e))
      },
      contributions: o,
      horrorIntrusionRange: Ht(this.#n()),
      tags: u,
      ...t.target ? { target: t.target } : {},
      ...t.purpose ? { purpose: t.purpose } : {},
      ...t.origin ? { origin: t.origin } : {}
    }, f = this.#e.enrichRollContext(y, h);
    return Uu(f);
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
      const y = m.finalDifficulty === 0 ? Wr(m) : Gu(m, u.naturalRoll), f = this.#e.resolveNaturalEffects(
        y,
        i.enabledRuleModuleIds ?? []
      );
      return { ...y, naturalEffects: f };
    }), p = c.some((m) => m.naturalEffects.some(
      (y) => y.status === "applied" && y.refundsPoolCost === !0
    )) ? a.poolCost : 0;
    p > 0 && r !== null && await e.update({ [`system.stats.${r}.value`]: s });
    let h = !1;
    return c.map((m) => {
      const y = {
        ...m,
        poolCostPaid: a.poolCost - p,
        poolCostRefunded: p
      };
      return u?.chatRoll === void 0 || m.automaticSuccess || h ? { result: y } : (h = !0, { result: y, chatRoll: u.chatRoll });
    });
  }
}
function wm(n) {
  return V.includes(n);
}
class vm {
  #e;
  constructor(e) {
    this.#e = e;
  }
  configuredPool(e) {
    if (!Ya.includes(e.system.defaultPool))
      throw new Error(`Unknown Skill default Pool '${e.system.defaultPool}'.`);
    return wm(e.system.defaultPool) ? e.system.defaultPool : null;
  }
  rankContribution(e, t = []) {
    if (e.type !== "skill") throw new Error("Skill contributions require a Skill Item.");
    if (!ee.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    return this.#e.resolveSkillRankContribution(
      e.system.rank,
      { id: e.id, name: e.name },
      t
    );
  }
  buildRollRequest(e, t) {
    if (e.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!ee.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    const i = t.pool ?? this.configuredPool(e);
    if (!i) throw new Error("Choose a Pool for this Skill roll.");
    const o = t.rankOverride ? { ...e, system: { ...e.system, rank: t.rankOverride } } : e;
    if (!ee.includes(o.system.rank))
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
    if (!ee.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
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
const Cm = Object.freeze({
  targetedXpToTarget: 0,
  targetedXpToShare: 0,
  groupXpPerTarget: 0,
  freeXp: 0
});
function Em(n) {
  return {
    actorId: n.id,
    actorName: n.name,
    ...n.img ? { actorImage: n.img } : {}
  };
}
class Rm {
  #e;
  #t;
  constructor(e, t = Oe) {
    this.#e = e, this.#t = t;
  }
  policy(e = []) {
    return this.#e.resolveGMIntrusionPolicy(Cm, e);
  }
  async createTargeted(e, t = []) {
    oe(e);
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
    i.forEach(oe);
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
    oe(e);
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
    if (oe(e), oe(t), t.id === e.id)
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
      targets: t.map(Em),
      targetXp: i,
      sharedXp: o,
      naturalRoll: a
    };
  }
}
function St(n) {
  const e = n.tokenId ?? n.token?.id, t = n.tokenUuid ?? n.token?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...e ? { tokenId: e } : {},
    ...t ? { tokenUuid: t } : {}
  };
}
const Ca = [
  "none",
  "minor",
  "moderate",
  "major"
];
function Pm(n, e) {
  const t = Ca.indexOf(n);
  return Ca[Math.max(0, t - Math.max(0, Math.trunc(e)))] ?? "none";
}
function Ei(n, e, t) {
  if (!Number.isInteger(n) || t !== void 0 && n < t)
    throw new Error(`${e} must be an integer${t === void 0 ? "" : ` of at least ${t}`}.`);
  return n;
}
function Sm(n, e) {
  return n.contexts.every((t) => e.tags.includes(t));
}
function km(n, e) {
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
function Ea(n) {
  return n.contexts.length + Object.keys(n.predicate).length;
}
function Am(n) {
  return Ei(n.value, `NPC modification '${n.id}'`, 0), {
    id: `npc-modification.${n.id}`,
    label: "CYPHERV2.Combat.TargetModification",
    direction: n.mode === "ease" ? "ease" : "hinder",
    steps: n.value,
    source: "other",
    sourceId: n.id
  };
}
class Hm {
  #e;
  constructor(e) {
    this.#e = e;
  }
  resolve(e, t, i = []) {
    if (e.type !== "npc") throw new Error("Combat targets must be NPC Actors.");
    const o = Ei(e.system.level, "NPC Level", 0), a = e.system.modifications.map((c, p) => ({ modification: c, index: p })).filter(({ modification: c }) => Sm(c, t) && km(c.predicate, t)), r = a.filter(({ modification: c }) => c.mode === "levelOverride").sort((c, p) => Ea(p.modification) - Ea(c.modification) || p.index - c.index)[0]?.modification;
    let s = r ? Ei(r.value, `NPC modification '${r.id}'`, 0) : o;
    const l = r ? [r.id] : [];
    for (const { modification: c } of a)
      c.mode === "levelDelta" && (s += Ei(c.value, `NPC modification '${c.id}'`), l.push(c.id));
    s = Math.max(0, s);
    const u = a.map(({ modification: c }) => c).filter((c) => c.mode === "ease" || c.mode === "hinder").map((c) => (l.push(c.id), Am(c)));
    return this.#e.enrichTargetResolution({
      targetId: e.id,
      targetIdentity: St(e),
      targetName: e.name,
      baseLevel: o,
      difficulty: s,
      contributions: u,
      appliedModificationIds: l
    }, e, t, i);
  }
  nativeNpcTargets() {
    return [...game.user.targets ?? []].map((e) => wr(e)).filter((e) => e !== null);
  }
}
class $m {
  async npcDamage() {
  }
  async characterWound() {
  }
}
async function Im(n) {
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
class Vm {
  async #e(e, t, i) {
    const o = await Im(e);
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
class Ym {
  async syncNpcDead() {
  }
}
class Fm {
  async syncNpcDead(e, t) {
    const i = Si(e);
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
function Dm(n) {
  if ("system.health.value" in n) return !0;
  const e = n.system;
  if (!e || typeof e != "object") return !1;
  const t = e.health;
  return !!(t && typeof t == "object" && "value" in t);
}
function Tm(n) {
  Hooks.on("updateActor", (e, t, i = {}) => {
    if (i.cypherv2SkipDeadStatusSync === !0 || e.type !== "npc" || !Dm(t)) return;
    const o = Number(e.system.health?.value);
    Number.isFinite(o) && n.syncNpcDead(e, o <= 0);
  });
}
function mn(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative whole number.`);
  return n;
}
class Kr {
  ammunition(e) {
    const t = e.system.ammo.enabled, i = mn(e.system.ammo.value, "Current ammunition"), o = mn(e.system.ammo.max, "Maximum ammunition"), a = mn(e.system.ammo.perAttack, "Ammunition per attack");
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
const zm = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
});
function pn(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function Ra(n, e, t) {
  return {
    id: n.id,
    label: t,
    direction: e,
    steps: n.value,
    source: "other",
    sourceId: n.sourceId
  };
}
function Ot(n) {
  return n.naturalEffects.filter((e) => e.kind === "damage-bonus" && e.status === "applied").reduce((e, t) => e + (t.damageBonus ?? 0), 0);
}
function Xr(n, e) {
  return n.naturalEffects.filter((i) => i.status === "available").length === 0 ? n : {
    ...n,
    naturalEffects: n.naturalEffects.map((i) => {
      if (i.status !== "available") return i;
      const o = e === "damage" && i.kind === "damage-bonus", a = e === "effect" && (i.kind === "minor-effect" || i.kind === "major-effect");
      return { ...i, status: o || a ? "applied" : "inapplicable" };
    })
  };
}
class Nm {
  #e;
  #t;
  #i;
  #n;
  #o;
  #r;
  #l;
  #a;
  #c;
  constructor(e, t, i, o, a, r = new $m(), s = new Ym(), l = new Or(a), u = new Kr()) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o, this.#o = a, this.#r = r, this.#l = s, this.#a = l, this.#c = u;
  }
  policy(e = []) {
    return this.#e.resolveCombatPolicy(zm, e);
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
    return i && i !== "none" && V.includes(i) ? i : e.system.attackType === "melee" ? "might" : "speed";
  }
  weaponFreelyUsed(e, t) {
    const i = e.system.derived.packages?.weaponCategories ?? e.system.proficiencies.weaponCategories, o = e.system.derived.packages?.weaponFamilies ?? [], a = rt(t.system.family);
    return i.includes(t.system.category) || a !== "" && o.some((r) => rt(r) === a);
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
    }, u = i.targets ?? [], c = u.map((k) => this.#n.resolve(k, l, o)), p = u.length > 0 ? u : [null], h = c.length > 0 ? c : [null], m = [];
    t.system.category === "light" && a.lightWeaponEase > 0 && m.push({
      id: `weapon.${t.id}.light`,
      label: "CYPHERV2.Combat.Weapon.LightEase",
      direction: "ease",
      steps: a.lightWeaponEase,
      source: "other",
      sourceId: t.id
    });
    const y = this.weaponFamiliarityContribution(e, t, o);
    if (y && m.push(y), i.extremeRange && m.push({
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
    const f = i.skill ? this.#i.rankContribution(i.skill, o) : null;
    f && m.push(f);
    const w = a.weaponDamage[t.system.category], C = t.system.bonusDamage, P = this.weaponBaseDamage(t, a), Y = h.map((k, H) => ({
      label: t.name,
      pool: s,
      difficulty: k ? { mode: "hidden", value: k.difficulty } : i.difficulty ?? { mode: "unknown" },
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
        ...k?.contributions ?? [],
        ...i.contributions ?? []
      ].map((M) => [M.id, M])).values()],
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
        baseDamage: P
      },
      ...p[H] ? {
        target: {
          ...St(p[H]),
          name: p[H].name,
          type: "npc"
        }
      } : {}
    }));
    return {
      weapon: t,
      categoryDamage: w,
      weaponBonusDamage: C,
      baseDamage: P,
      freelyUsed: r,
      requests: Y,
      targets: p,
      targetResolutions: h,
      policy: a
    };
  }
  async executeWeaponAttack(e, t, i, o) {
    this.#c.assertCanAttack(t);
    const a = this.buildWeaponAttackPlan(e, t, i), r = await this.#t.executeBatch(e, a.requests, o), s = r.length > 0 ? await this.#s(t) : void 0;
    return r.map((l, u) => {
      const c = l.result.prepared.damageEffortApplied * a.policy.damageEffortBonus, p = Ot(l.result), h = a.baseDamage + c + p, m = a.targets[u] ?? null, y = m?.system.armorBase ?? 0;
      return {
        target: m,
        targetResolution: a.targetResolutions[u] ?? null,
        execution: l,
        grossDamage: h,
        categoryDamage: a.categoryDamage,
        weaponBonusDamage: a.weaponBonusDamage,
        effortDamage: c,
        naturalDamage: p,
        armor: y,
        netDamage: Math.max(0, h - y),
        ...u === 0 && s ? { weaponUse: s } : {}
      };
    });
  }
  async #s(e) {
    const t = await this.#c.consumeAttack(e);
    return t ? { ammo: t } : {};
  }
  chooseAttackOutcomes(e, t, i = []) {
    const o = this.policy(i);
    return e.map((a) => {
      const r = Xr(a.execution.result, t), s = r.prepared.context.origin;
      if (s?.kind !== "weapon") return a;
      const l = s.baseDamage + r.prepared.damageEffortApplied * o.damageEffortBonus + Ot(r), u = r.prepared.damageEffortApplied * o.damageEffortBonus, c = Ot(r);
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
    if (!Da.includes(t)) throw new Error(`Unknown defense '${t}'.`);
    const o = i.enabledRuleModuleIds ?? [], a = t === "dodge" ? "speed" : "might", r = e.system.derived.combat.armor, s = t === "dodge" ? r.dodgeContributions.map((u) => Ra(u, "hinder", "CYPHERV2.Combat.Armor.DodgeHindrance")) : r.blockContributions.map((u) => Ra(u, "ease", "CYPHERV2.Combat.Armor.BlockEase")), l = i.skill ? this.#i.rankContribution(i.skill, o) : null;
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
    return e.success !== !0 ? i : t === "dodge" || t === "blockWithShield" ? "none" : Pm(i, this.policy(o).blockSeverityReduction);
  }
  async resolveDefenseWound(e, t, i, o, a, r = []) {
    if (i !== "blockWithShield" || t.success !== !0) {
      const l = this.woundAfterDefense(t, i, o, r);
      return {
        recipient: l === "none" ? "none" : "character",
        severity: l
      };
    }
    const s = await this.#a.normalizeEquipped(e);
    if (!s || this.#a.isBroken(s))
      throw new Error("Block With Shield requires one equipped, functional Shield.");
    return {
      recipient: "shield",
      severity: o,
      shieldId: s.id,
      shieldName: s.name
    };
  }
  async transferWoundToShield(e, t, i, o) {
    const a = await this.#a.applyResolved(e, t, i, {
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
    const i = pn(t, "Damage"), o = pn(e.system.armorBase, "NPC Armor"), a = pn(e.system.health.value, "NPC Health"), r = Math.max(0, i - o), s = Math.max(0, a - r);
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
    return await this.#l.syncNpcDead(e, l.dead), await this.#r.npcDamage(e, l), l;
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
function Hi(n) {
  return {
    targetActorId: n.actorId,
    ...n.actorUuid ? { targetActorUuid: n.actorUuid } : {},
    ...n.tokenId ? { targetTokenId: n.tokenId } : {},
    ...n.tokenUuid ? { targetTokenUuid: n.tokenUuid } : {}
  };
}
class Mm {
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
          ...Hi(St(t.target)),
          requestedDamage: t.grossDamage,
          applied: !1
        }
      } : {}
    };
    await this.#e.publish(e, t.execution, i, { combat: s, showGmAudit: o });
  }
  async publishDefense(e, t, i, o, a, r = !1) {
    const s = i.recipient === "character" ? i.severity : "none", l = Hi(Si(e)), u = o ? { sourceActorId: o.id, sourceName: o.name } : {}, c = {
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
    const a = St(e), r = Si(t), s = [...o];
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
        ...Se(e),
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
const qm = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The depletion roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class xm {
  #e;
  constructor(e = qm) {
    this.#e = e;
  }
  async roll(e) {
    const t = e.system.depletion;
    if (!t.enabled) throw new Error("Depletion is not enabled for this Item.");
    const i = ["artifact", "weapon", "shield", "armor"].includes(e.type);
    if (i && e.system.depleted)
      throw new Error(`This ${e.name} is already depleted.`);
    const a = ["weapon", "shield", "armor"].includes(e.type) ? "" : t.formula?.trim() ?? "";
    if (Wt(t), !Number.isInteger(t.threshold) || t.threshold < 1)
      throw new Error("Depletion threshold must be a positive whole number.");
    const r = a || Nc(t), s = Number(r.match(/^1d(\d+)$/i)?.[1]);
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
class Um {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/depletion-card.hbs",
      {
        itemName: t.itemName,
        ...Se(e.actor),
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
const Pa = 124, Gm = 58, Sa = 108, Om = 10, Bm = async (n) => {
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
}, Lm = async (n, e) => typeof foundry > "u" || !foundry.applications?.ux?.TextEditor?.implementation ? n : foundry.applications.ux.TextEditor.implementation.enrichHTML(n, e ? { async: !0, relativeTo: e } : { async: !0 });
function jm(n) {
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
function Wm(n, e = 120) {
  const t = n.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
  return t.length <= e ? t : `${t.slice(0, Math.max(0, e - 1)).trimEnd()}…`;
}
class _m {
  #e;
  #t;
  #i;
  constructor(e = new ao(), t = Bm, i = Lm) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async prepare(e, t = {}) {
    const i = t.characterTier ?? Number.MAX_SAFE_INTEGER, o = t.progress ?? { focusUuid: e.uuid, ownedNodeIds: [] }, a = t.missingOwnedNodeIds ?? /* @__PURE__ */ new Set();
    let r;
    try {
      r = this.#e.evaluateProgress(e.system.graph, i, o);
    } catch (m) {
      if (!(m instanceof Rt)) throw m;
      if (t.progress) {
        const y = new Set(o.ownedNodeIds);
        r = {
          characterTier: i,
          ownedNodeIds: [...y],
          diagnostics: m.diagnostics,
          nodes: e.system.graph.nodes.map((f) => ({
            node: f,
            state: y.has(f.id) ? "owned" : f.tier > i ? "future" : "available",
            reason: y.has(f.id) ? "owned" : f.tier > i ? "tier-too-low" : "tier-one-choice",
            requiredTier: f.tier,
            reachableFrom: []
          })).sort((f, w) => f.node.tier - w.node.tier || f.node.id.localeCompare(w.node.id))
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
    const s = jm(r.nodes.map((m) => m.node)), l = t.editor ? 6 : Math.max(1, ...r.nodes.map((m) => m.node.tier)), u = /* @__PURE__ */ new Map();
    for (const m of r.nodes)
      u.set(m.node.tier, (u.get(m.node.tier) ?? 0) + 1);
    const c = Math.max(440, ...[...u.values()].map((m) => m * Pa + (m + 1) * Om)), p = await Promise.all(r.nodes.map(async (m) => {
      const y = await this.#t(m.node.abilityUuid), f = m.state === "owned" && a.has(m.node.id), w = y?.description ?? m.node.abilitySnapshot.description ?? "", C = r.diagnostics.some((M) => M.code === "invalid-owned-progression" && M.nodeId === m.node.id || M.severity === "error" && (!M.nodeId || M.nodeId === m.node.id)), P = m.state !== "owned" && m.node.tier > i, Y = m.state !== "owned" && m.reason === "no-owned-prerequisite", k = m.state !== "owned" && (m.state !== "available" || C), H = t.editable && t.progress && !t.gmProgressionEdit ? m.state === "owned" ? "undoFocusAcquisition" : "acquireFocusNode" : "openFocusNode";
      return {
        id: m.node.id,
        abilityUuid: m.node.abilityUuid,
        abilityName: y?.name || m.node.abilitySnapshot.name || m.node.id,
        descriptionExcerpt: Wm(w),
        descriptionHtml: await this.#i(w, y?.relativeTo ?? e),
        tier: m.node.tier,
        state: m.state,
        stateLabel: `CYPHERV2.Focus.State.${m.state}`,
        reason: m.reason,
        requiredTier: m.requiredTier,
        reachableFrom: m.reachableFrom,
        missingAbility: !y,
        missingOwnedAbility: f,
        isOwned: m.state === "owned",
        advisoryUnavailable: k,
        tierLocked: P,
        prerequisiteLocked: Y,
        invalidProgression: C,
        canAcquire: !!(t.editable && t.progress && !t.gmProgressionEdit && m.state !== "owned"),
        canRestoreAbility: !!(t.editable && t.progress && f),
        canUndoAcquisition: !!(t.editable && t.progress && m.state === "owned" && !t.gmProgressionEdit),
        canGmMarkOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state !== "owned"),
        canGmRemoveOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state === "owned"),
        primaryAction: t.editor?.connectionSourceNodeId ? "completeFocusConnection" : t.editor ? "selectFocusEditorNode" : H,
        selected: t.editor?.selectedNodeId === m.node.id,
        connectionSource: t.editor?.connectionSourceNodeId === m.node.id,
        xPercent: s.get(m.node.id) ?? 50,
        width: Pa,
        height: Gm
      };
    })), h = e.system.graph.connections.map(({ id: m, from: y, to: f }) => ({ id: m, from: y, to: f }));
    return {
      focusUuid: e.uuid,
      focusName: e.name,
      markerId: `focus-arrow-${e.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      mode: t.editor ? "editor" : t.progress ? "progression" : "focus",
      editor: !!t.editor,
      width: c,
      height: l * Sa,
      nodes: p,
      connections: h,
      tiers: Array.from({ length: l }, (m, y) => {
        const f = y + 1;
        return {
          tier: f,
          top: y * Sa,
          nodes: p.filter((w) => w.tier === f).sort((w, C) => w.xPercent - C.xPercent || w.id.localeCompare(C.id))
        };
      }),
      diagnostics: r.diagnostics,
      invalid: !1
    };
  }
}
function it(n) {
  return structuredClone(n);
}
function Re(n) {
  return new Set(n).size === n.length;
}
function fn(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, img: n.img, type: e, system: it(n.system) };
}
function Km(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, ...n.img ? { img: n.img } : {}, type: e, system: it(n.system) };
}
function ka(n, e, t, i, o) {
  return {
    kind: n,
    sourceUuid: e,
    instanceId: t,
    grantId: i,
    status: "active",
    contentUuid: o.contentUuid,
    contentKey: o.contentKey,
    replacement: uo()
  };
}
function uo() {
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
function hn() {
  return {
    kind: "other",
    sourceUuid: "",
    instanceId: "",
    grantId: "",
    status: "active",
    contentUuid: "",
    contentKey: "",
    replacement: uo()
  };
}
function Nt(n) {
  return { name: n.name, img: n.img, type: n.type, system: it(n.system) };
}
function gn(n, e) {
  const t = Nt(n);
  return t.type = e, t;
}
function De(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
function Xm(n, e) {
  return [...n.items].filter((t) => t.system.grantedBy?.instanceId === e);
}
function Tn(n, e) {
  return Xm(n, e).flatMap((i) => {
    if (i.type !== "descriptor" && i.type !== "characterType" && i.type !== "species") return [i];
    const o = i.system.instance?.instanceId;
    return [i, ...o ? Tn(n, o) : []];
  });
}
class Jm {
  #e;
  #t;
  #i;
  constructor(e = async (o) => await fromUuid(o), t = () => globalThis.crypto?.randomUUID?.() ?? `package-${Date.now()}-${Math.random()}`, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async attachType(e, t, i = {}) {
    this.#b(e, t, "characterType");
    const o = i.replaceItemId ? De(e).find((k) => k.id === i.replaceItemId && k.type === "characterType") : void 0;
    if (De(e).some((k) => k.type === "characterType" && k.id !== o?.id))
      throw new Error("This Character already has an active Type.");
    const a = it(t.system), r = a.edgeGrant.mode === "choice" ? i.edgePool : a.edgeGrant.pool;
    if (a.edgeGrant.mode === "choice" && !r) throw new Error("This Type requires an Edge Pool choice.");
    const s = a.genre === "superhero" && a.superhero?.superheroics?.enabled === !0, l = i.superheroicsPool;
    if (s && !l)
      throw new Error("This Superhero Type requires a Superheroics Pool choice.");
    if (l && !V.includes(l))
      throw new Error("Invalid Superheroics Pool choice.");
    const u = Number.isInteger(a.superhero?.powerShiftCount) ? Math.max(0, Number(a.superhero?.powerShiftCount)) : 0, c = Array.from({ length: u }, (k, H) => String(i.powerShifts?.[H] ?? "").trim()), p = this.#f(a.choiceGroups ?? [], i.skillChoices ?? {}), h = this.#p(a.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), m = this.#t(), y = a.instance?.sourceUuid || t.uuid, f = (a.abilityChoiceGroups ?? []).flatMap((k) => k.options.filter((H) => h[k.id]?.includes(H.id)).map((H) => ({ ...H, id: `${k.id}:${H.id}` }))), w = [
      ...await this.#r([...a.abilityGrants ?? [], ...f], "type", y, m),
      ...await this.#l(a.skillGrants ?? [], "type", y, m),
      ...await this.#a(a.choiceGroups ?? [], p, "type", y, m)
    ], { grants: C, skippedGrantIds: P } = await this.#s(
      e,
      w,
      t,
      i.conflictResolver
    ), Y = Nt(t);
    return Y.system = {
      ...a,
      instance: {
        sourceUuid: y,
        instanceId: m,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: r ?? "none",
          superheroicsPool: s ? l : "none",
          powerShifts: c,
          poolChoices: [],
          skillChoices: Object.entries(p).map(([k, H]) => ({ groupId: k, optionIds: H })),
          abilityChoices: Object.entries(h).map(([k, H]) => ({ groupId: k, optionIds: H })),
          descriptorChoices: [],
          suppressedGrantIds: P
        },
        parent: hn()
      }
    }, this.#n(e, Y, C, o, i.replaceGrantedItemsMode ?? "delete", P);
  }
  async attachDescriptor(e, t, i) {
    this.#b(e, t, "descriptor");
    const o = it(t.system), a = o.instance?.sourceUuid || t.uuid;
    if (De(e).some((m) => m.type === "descriptor" && m.system.instance.sourceUuid === a)) throw new Error("This Descriptor is already attached.");
    if (i.role === "primary" && De(e).some((m) => m.type === "descriptor" && m.system.instance.role === "primary")) throw new Error("This Character already has a primary Descriptor.");
    const r = this.#t(), s = this.#u(o.poolBonusChoiceGroups ?? [], i.poolChoices ?? {}), l = this.#f(o.choiceGroups ?? [], i.skillChoices ?? {}), u = [
      ...await this.#l(o.skillGrants ?? [], "descriptor", a, r),
      ...await this.#a(o.choiceGroups ?? [], l, "descriptor", a, r)
    ], { grants: c, skippedGrantIds: p } = await this.#s(
      e,
      u,
      t,
      i.conflictResolver
    ), h = Nt(t);
    return h.system = {
      ...o,
      instance: {
        sourceUuid: a,
        instanceId: r,
        role: i.role,
        attachedAt: this.#i(),
        selections: {
          edgePool: "none",
          superheroicsPool: "none",
          powerShifts: [],
          poolChoices: Object.entries(s).map(([m, y]) => ({ groupId: m, pools: y })),
          skillChoices: Object.entries(l).map(([m, y]) => ({ groupId: m, optionIds: y })),
          abilityChoices: [],
          descriptorChoices: [],
          suppressedGrantIds: p
        },
        parent: i.parent ?? hn()
      }
    }, i.parent && (h.system.grantedBy = i.parent), this.#n(e, h, c, void 0, "delete", p);
  }
  async attachSpecies(e, t, i = {}) {
    this.#b(e, t, "species");
    const o = i.replaceItemId ? De(e).find((A) => A.id === i.replaceItemId && A.type === "species") : void 0;
    if (De(e).some((A) => A.type === "species" && A.id !== o?.id))
      throw new Error("This Character already has an active Species.");
    const a = it(t.system), r = a.edgeGrant.mode === "choice" ? i.edgePool : a.edgeGrant.pool;
    if (a.edgeGrant.mode === "choice" && !r) throw new Error("This Species requires an Edge Pool choice.");
    const s = this.#f(a.choiceGroups ?? [], i.skillChoices ?? {}), l = this.#p(a.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), u = new Map(
      (i.resolvedDescriptorChoiceGroups ?? []).map((A) => [A.id, A])
    ), c = (a.descriptorChoiceGroups ?? []).map((A) => {
      if ((A.sourceMode ?? "fixed") !== "catalog") return A;
      const D = u.get(A.id);
      return { ...A, options: D?.options ?? A.options };
    }), p = this.#g(
      c,
      i.descriptorChoices ?? {}
    ), h = this.#t(), m = a.instance?.sourceUuid || t.uuid, y = (a.abilityChoiceGroups ?? []).flatMap((A) => A.options.filter((D) => l[A.id]?.includes(D.id)).map((D) => ({ ...D, id: `${A.id}:${D.id}` }))), f = c.flatMap((A) => A.options.filter((D) => p[A.id]?.includes(D.id)).map((D) => ({ ...D, id: `${A.id}:${D.id}` }))), w = [
      ...await this.#r([...a.abilityGrants ?? [], ...y], "species", m, h),
      ...await this.#l(a.skillGrants ?? [], "species", m, h),
      ...await this.#a(a.choiceGroups ?? [], s, "species", m, h)
    ], C = await this.#s(
      e,
      w,
      t,
      i.conflictResolver
    ), P = [...C.grants], Y = [...C.skippedGrantIds], k = [...C.skippedGrantIds], H = new Set(De(e).filter((A) => A.type === "descriptor").map((A) => A.system.instance.sourceUuid || `snapshot:${A.name.trim().toLocaleLowerCase()}`)), M = [...a.descriptorGrants ?? [], ...f];
    if (!Re(M.map((A) => A.id)))
      throw new Error("Species Descriptor grant IDs must be unique.");
    for (const A of M) {
      const D = A.descriptorUuid ? await this.#e(A.descriptorUuid) : null;
      if (D && D.type !== "descriptor") throw new Error("A Species Descriptor grant references a non-Descriptor Item.");
      const S = D ? Nt(D) : Km(A.snapshot, "descriptor");
      if (!S) throw new Error(`Descriptor grant '${A.id}' has neither a source nor a usable snapshot.`);
      const K = it(S.system), j = K.instance?.sourceUuid || A.descriptorUuid, He = j || `snapshot:${String(S.name).trim().toLocaleLowerCase()}`;
      if (H.has(He)) {
        Y.push(A.id), k.push(A.id);
        continue;
      }
      H.add(He);
      const B = this.#t(), $ = this.#u(
        K.poolBonusChoiceGroups ?? [],
        i.descriptorPoolChoices?.[A.id] ?? {}
      ), W = this.#f(
        K.choiceGroups ?? [],
        i.descriptorSkillChoices?.[A.id] ?? {}
      ), J = [
        ...await this.#l(K.skillGrants ?? [], "descriptor", j, B),
        ...await this.#a(K.choiceGroups ?? [], W, "descriptor", j, B)
      ], ie = {
        id: String(D?.id ?? A.id),
        uuid: j,
        name: String(S.name),
        type: "descriptor",
        ...S.img ? { img: String(S.img) } : {},
        system: K
      }, pe = await this.#s(
        e,
        J,
        ie,
        i.conflictResolver,
        P
      );
      k.push(...pe.skippedGrantIds);
      const le = {
        contentUuid: j,
        contentKey: `descriptor:${String(S.name).trim().toLocaleLowerCase()}`
      }, Be = {
        kind: "species",
        sourceUuid: m,
        instanceId: h,
        grantId: A.id,
        status: "active",
        ...le,
        replacement: uo()
      };
      S.system = {
        ...K,
        grantedBy: Be,
        instance: {
          sourceUuid: j,
          instanceId: B,
          role: "speciesGranted",
          attachedAt: this.#i(),
          selections: {
            edgePool: "none",
            superheroicsPool: "none",
            powerShifts: [],
            poolChoices: Object.entries($).map(([$e, be]) => ({ groupId: $e, pools: be })),
            skillChoices: Object.entries(W).map(([$e, be]) => ({ groupId: $e, optionIds: be })),
            abilityChoices: [],
            descriptorChoices: [],
            suppressedGrantIds: pe.skippedGrantIds
          },
          parent: Be
        }
      }, P.push(S, ...pe.grants);
    }
    const O = Nt(t);
    return O.system = {
      ...a,
      instance: {
        sourceUuid: m,
        instanceId: h,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: r ?? "none",
          superheroicsPool: "none",
          powerShifts: [],
          poolChoices: [],
          skillChoices: Object.entries(s).map(([A, D]) => ({ groupId: A, optionIds: D })),
          abilityChoices: Object.entries(l).map(([A, D]) => ({ groupId: A, optionIds: D })),
          descriptorChoices: Object.entries(p).map(([A, D]) => ({ groupId: A, optionIds: D })),
          suppressedGrantIds: Y
        },
        parent: hn()
      }
    }, this.#n(
      e,
      O,
      P,
      o,
      i.replaceGrantedItemsMode ?? "delete",
      k
    );
  }
  async remove(e, t, i) {
    const o = De(e).find((c) => c.id === t);
    if (!o) throw new Error("Character Package not found.");
    const a = o.system.instance.instanceId, r = Tn(e, a), s = Object.fromEntries(V.map((c) => [c, e.system.derived.pools[c].max])), l = Li(o), u = i === "delete" ? r.map((c) => c.id) : [];
    return i === "keep" && await Promise.all(r.map((c) => c.update({
      "system.grantedBy.status": "retained",
      ...c.type === "descriptor" || c.type === "characterType" || c.type === "species" ? { "system.instance.parent.status": "retained" } : {}
    }))), await e.deleteEmbeddedDocuments("Item", [o.id, ...u]), await this.#o(e, s, Object.fromEntries(V.map((c) => [c, s[c] - l[c]]))), {
      removedPackageId: o.id,
      deletedGrantedItemIds: u,
      retainedGrantedItemIds: i === "keep" ? r.map((c) => c.id) : []
    };
  }
  async #n(e, t, i, o, a = "delete", r = []) {
    const s = Object.fromEntries(V.map((h) => [h, e.system.derived.pools[h].max])), l = Li(t), u = o ? Li(o) : { might: 0, speed: 0, intellect: 0 }, c = await e.createEmbeddedDocuments("Item", [t, ...i]);
    try {
      if (o) {
        const m = Tn(e, o.system.instance.instanceId);
        a === "keep" && await Promise.all(m.map((y) => y.update({
          "system.grantedBy.status": "retained",
          ...y.type === "descriptor" || y.type === "characterType" || y.type === "species" ? { "system.instance.parent.status": "retained" } : {}
        }))), await e.deleteEmbeddedDocuments("Item", [
          o.id,
          ...a === "delete" ? m.map((y) => y.id) : []
        ]);
      }
      const h = Object.fromEntries(V.map((m) => [m, s[m] + l[m] - u[m]]));
      await this.#o(e, s, h);
    } catch (h) {
      const m = c.map((y) => y.id).filter((y) => !!y);
      throw m.length && await e.deleteEmbeddedDocuments("Item", m), h;
    }
    const p = t.system.instance.instanceId;
    return { packageItem: c[0], grantedItems: c.slice(1), instanceId: p, skippedGrantIds: r };
  }
  async #o(e, t, i) {
    const o = {};
    for (const a of V)
      o[`system.stats.${a}.value`] = Ka(e.system.stats[a].value, t[a], Math.max(0, i[a]));
    await e.update(o);
  }
  async #r(e, t, i, o) {
    if (!Re(e.map((a) => a.id))) throw new Error("Type Ability grant IDs must be unique.");
    return Promise.all(e.map(async (a) => {
      const r = a.abilityUuid ? await this.#e(a.abilityUuid) : null;
      if (r && r.type !== "ability") throw new Error("An Ability grant references a non-Ability Item.");
      const s = r ? gn(r, "ability") : fn(a.snapshot, "ability");
      if (!s) throw new Error(`Ability grant '${a.id}' has neither a source nor a usable snapshot.`);
      const l = Pe("ability", String(s.name ?? a.snapshot.name), a.abilityUuid);
      return s.system = { ...s.system, grantedBy: ka(t, i, o, a.id, l) }, s;
    }));
  }
  async #l(e, t, i, o) {
    if (!Re(e.map((a) => a.id))) throw new Error("Descriptor Skill grant IDs must be unique.");
    return Promise.all(e.map((a) => this.#c(a, a.rank, t, i, o, a.id)));
  }
  async #a(e, t, i, o, a) {
    const r = [];
    for (const s of e)
      for (const l of t[s.id] ?? []) {
        const u = s.options.find((c) => c.id === l);
        r.push(await this.#c(u, s.rank, i, o, a, `${s.id}:${u.id}`));
      }
    return r;
  }
  async #c(e, t, i, o, a, r) {
    const s = e.skillUuid ? await this.#e(e.skillUuid) : null;
    if (s && s.type !== "skill") throw new Error("A Skill grant references a non-Skill Item.");
    const l = s ? gn(s, "skill") : fn(e.snapshot, "skill") ?? (e.customName ? { name: e.customName, type: "skill", system: {} } : null);
    if (!l) throw new Error(`Skill grant '${r}' has neither a source, custom name, nor usable snapshot.`);
    const u = Pe("skill", String(l.name ?? e.customName), e.skillUuid), c = l.system, p = c.acquisition && typeof c.acquisition == "object" ? c.acquisition : {}, h = String(e.notes ?? "");
    return l.system = {
      ...c,
      ...h ? { acquisition: { ...p, notes: h } } : {},
      rank: t,
      grantedBy: ka(i, o, a, r, u)
    }, l;
  }
  async #s(e, t, i, o, a = []) {
    const r = [], s = [], l = [...e.items], u = a.filter((c) => c.type === "ability" || c.type === "skill");
    for (const c of t) {
      let p = c;
      const h = p.type;
      if (h !== "ability" && h !== "skill") {
        r.push(p);
        continue;
      }
      for (; ; ) {
        const m = p.system.grantedBy ?? {}, y = { type: h, contentUuid: m.contentUuid, contentKey: m.contentKey }, f = [...l, ...u, ...r], w = zi(f, y);
        if (!w) {
          r.push(p);
          break;
        }
        if (!o) {
          s.push(m.grantId);
          break;
        }
        const C = {
          id: `${m.instanceId}:${m.grantId}`,
          type: h,
          packageName: i.name,
          packageSourceUuid: i.uuid,
          grantId: m.grantId,
          existing: this.#d(w, h),
          proposed: this.#d(p, h),
          suggestions: this.#w(e, i, h, m.grantId),
          allowCustom: h === "skill",
          allowSuppress: !0,
          allowGmOverride: !1,
          context: "package"
        }, P = await o(C);
        if (P.action === "cancel") throw new Ge();
        if (P.action === "suppress") {
          s.push(m.grantId);
          break;
        }
        if (P.action !== "replace")
          throw new Error("GM Override is not a valid Character Package grant resolution.");
        p = await this.#m(p, P.replacement, P.selectionKind);
      }
    }
    return { grants: r, skippedGrantIds: s };
  }
  #d(e, t) {
    const i = e, o = i.system ?? {}, a = o.grantedBy ?? {}, r = Pe(t, String(i.name ?? ""), String(a.contentUuid ?? ""));
    return {
      id: String(i.id ?? i.uuid ?? r.contentKey),
      name: String(i.name ?? ""),
      type: t,
      rank: t === "skill" ? String(o.rank ?? "untrained") : "",
      contentUuid: String(a.contentUuid ?? r.contentUuid),
      contentKey: String(a.contentKey ?? r.contentKey)
    };
  }
  async #m(e, t, i) {
    const o = e.type;
    if (o !== "ability" && o !== "skill") throw new Error("Only Skill and Ability grants can be replaced.");
    if (t.type !== o) throw new Error("A grant replacement must use the same Item type.");
    const a = t.itemUuid ? await this.#e(t.itemUuid) : null;
    if (a && a.type !== o) throw new Error(`The selected replacement is not a ${o} Item.`);
    const r = a ? gn(a, o) : fn(t.snapshot, o) ?? (o === "skill" && t.custom ? { name: t.name, type: o, system: {} } : null);
    if (!r) throw new Error(`The selected ${o} replacement is unavailable and has no usable snapshot.`);
    const s = e.system, l = s.grantedBy ?? {}, u = l.replacement?.active ? l.replacement : {
      originalName: String(e.name ?? ""),
      originalContentUuid: l.contentUuid,
      originalContentKey: l.contentKey
    }, c = Pe(o, String(r.name ?? t.name), t.itemUuid), p = r.system, h = s.acquisition && typeof s.acquisition == "object" ? s.acquisition : {}, m = p.acquisition && typeof p.acquisition == "object" ? p.acquisition : {};
    return r.system = {
      ...p,
      ...o === "skill" ? { rank: s.rank } : {},
      ...o === "skill" && h.notes ? { acquisition: { ...m, notes: h.notes } } : {},
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
  #w(e, t, i, o) {
    const a = [], r = (c, p, h) => {
      const m = c.snapshot?.name || c.customName;
      m && a.push({
        id: `${h}:${c.id}`,
        type: i,
        name: m,
        itemUuid: c.itemUuid,
        snapshot: c.snapshot,
        reason: p,
        reasonSourceUuid: h,
        ...i === "skill" && !c.itemUuid ? { custom: !0 } : {}
      });
    }, s = (c, p, h) => {
      for (const m of c ?? []) r(m, p, h);
    }, l = (c, p = !1) => {
      const h = c.system, m = "instance" in h ? h.instance?.selections : void 0;
      if (i === "skill") {
        for (const y of h.skillGrants ?? [])
          c.uuid === t.uuid && y.id === o && s(y.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const y of h.choiceGroups ?? []) {
          const f = m?.skillChoices.find((C) => C.groupId === y.id)?.optionIds ?? [], w = o.startsWith(`${y.id}:`) ? o.slice(y.id.length + 1) : "";
          if (c.uuid === t.uuid && w)
            for (const C of y.options) C.id !== w && r({ id: C.id, itemUuid: C.skillUuid, customName: C.customName, snapshot: C.snapshot }, `${c.name} — Skill choice`, c.uuid);
          else if (!p)
            for (const C of y.options) f.includes(C.id) || r({ id: C.id, itemUuid: C.skillUuid, customName: C.customName, snapshot: C.snapshot }, `${c.name} — unused Skill choice`, c.uuid);
        }
      } else {
        for (const y of h.abilityGrants ?? [])
          c.uuid === t.uuid && y.id === o && s(y.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const y of h.abilityChoiceGroups ?? []) {
          const f = m?.abilityChoices.find((C) => C.groupId === y.id)?.optionIds ?? [], w = o.startsWith(`${y.id}:`) ? o.slice(y.id.length + 1) : "";
          if (c.uuid === t.uuid && w)
            for (const C of y.options) C.id !== w && r({ id: C.id, itemUuid: C.abilityUuid, customName: "", snapshot: C.snapshot }, `${c.name} — Ability choice`, c.uuid);
          else if (!p)
            for (const C of y.options) f.includes(C.id) || r({ id: C.id, itemUuid: C.abilityUuid, customName: "", snapshot: C.snapshot }, `${c.name} — unused Ability choice`, c.uuid);
        }
      }
    };
    l(t, !0);
    for (const c of De(e)) l(c);
    const u = /* @__PURE__ */ new Set();
    return a.filter((c) => {
      const p = Pe(i, c.name, c.itemUuid), h = p.contentUuid || p.contentKey;
      return u.has(h) || Vr(e.items, p) ? !1 : (u.add(h), !0);
    });
  }
  #f(e, t) {
    const i = {};
    for (const o of e) {
      const a = t[o.id] ?? [];
      if (a.length !== o.choose || !Re(a) || a.some((r) => !o.options.some((s) => s.id === r)))
        throw new Error(`Descriptor choice '${o.id}' requires exactly ${o.choose} valid option(s).`);
      i[o.id] = [...a];
    }
    return i;
  }
  #p(e, t) {
    const i = {};
    for (const o of e) {
      const a = t[o.id] ?? [];
      if (a.length !== o.choose || !Re(a) || a.some((r) => !o.options.some((s) => s.id === r)))
        throw new Error(`Ability choice '${o.id}' requires exactly ${o.choose} valid option(s).`);
      i[o.id] = [...a];
    }
    return i;
  }
  #g(e, t) {
    if (!Re(e.map((o) => o.id)))
      throw new Error("Species Descriptor choice group IDs must be unique.");
    const i = {};
    for (const o of e) {
      if (!Re(o.options.map((r) => r.id)))
        throw new Error(`Descriptor choice '${o.id}' option IDs must be unique.`);
      const a = t[o.id] ?? [];
      if (!Number.isInteger(o.choose) || o.choose < 1 || o.choose > o.options.length || a.length !== o.choose || !Re(a) || a.some((r) => !o.options.some((s) => s.id === r)))
        throw new Error(`Descriptor choice '${o.id}' requires exactly ${o.choose} valid option(s).`);
      i[o.id] = [...a];
    }
    return i;
  }
  #u(e, t) {
    if (!Re(e.map((o) => o.id)))
      throw new Error("Descriptor Pool bonus choice group IDs must be unique.");
    const i = {};
    for (const o of e) {
      const a = [...new Set(o.pools)].filter((s) => V.includes(s));
      if (a.length !== o.pools.length || !Number.isInteger(o.choose) || o.choose < 1 || o.choose > a.length || !Number.isInteger(o.amount) || o.amount < 1)
        throw new Error(`Descriptor Pool choice '${o.id}' is invalid.`);
      const r = t[o.id] ?? [];
      if (r.length !== o.choose || !Re(r) || r.some((s) => !a.includes(s)))
        throw new Error(`Descriptor Pool choice '${o.id}' requires exactly ${o.choose} valid Pool(s).`);
      i[o.id] = [...r];
    }
    return i;
  }
  #b(e, t, i) {
    if (e.type !== "character") throw new Error("Character Packages require a Character Actor.");
    if (t.type !== i) throw new Error(`Expected a ${i} Item.`);
  }
}
function bi(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function Aa(n, e, t) {
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
function Qm(n) {
  return n.type === "npc" ? St(n) : {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...n.tokenId ? { tokenId: n.tokenId } : {},
    ...n.tokenUuid ? { tokenUuid: n.tokenUuid } : {}
  };
}
class Zm {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t, i, o) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = o;
  }
  canUse(e) {
    return e.type === "ability" && !["passive", "enabler", "perpetual"].includes(e.system.activation);
  }
  pool(e, t) {
    const i = We(e);
    if (t && i.length > 0 && !i.includes(t))
      throw new Error(`${t} is not an allowed Pool for this Ability.`);
    return i.length === 1 ? i[0] : t ?? null;
  }
  previewPayment(e, t, i) {
    oe(e), this.#r(t);
    const o = We(t), a = bi(t.system.cost.amount, "Ability cost");
    if (a <= 0 || o.length === 0)
      throw new Error("This Ability has no payable Pool cost.");
    if (!o.includes(i)) throw new Error(`${i} is not an allowed Pool for this Ability.`);
    const r = bi(e.system.stats[i].value, `${i} Pool value`), s = Math.max(0, Math.trunc(e.system.derived.pools[i].edge)), l = Fn(a, 0, s, t.system.cost.ignoresEdge), u = r - l.poolCost;
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
    if (this.#r(t), !this.canUse(t)) throw new Error("Passive, Enabler, and Perpetual Abilities have no direct Use action.");
    if (t.system.roll !== "none") throw new Error("This Ability requires a roll.");
    const o = this.#o(t, i.targets ?? []), a = this.pool(t, i.pool), r = this.#l(t);
    if (r > 0 && !a) throw new Error("A Pool is required to pay this Ability cost.");
    if (!a) return { ability: t, actor: { id: e.id, name: e.name }, pool: null, costPaid: 0, edgeApplied: 0, targets: o };
    const s = e.system.stats[a].value, l = Fn(
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
    if (this.#r(t), !this.canUse(t)) throw new Error("Passive, Enabler, and Perpetual Abilities have no direct Use action.");
    if (t.system.roll === "none") throw new Error("This Ability does not require a roll.");
    const o = this.pool(t, i.pool);
    if (!o) throw new Error("Choose a Pool for this Ability roll.");
    const a = i.enabledRuleModuleIds ?? [], r = this.#o(t, i.targets ?? []), s = r.length ? r : [null], l = [
      "ability",
      `ability.${t.system.roll}`,
      ...t.system.roll === "attack" ? ["attack", "attack.ability", "defense.speed"] : [],
      ...t.system.roll === "defense" ? ["defense"] : [],
      ...o === "speed" ? ["speed-task"] : []
    ], u = { tags: l, pool: o }, c = s.map((f) => f?.type === "npc" ? this.#i.resolve(f, u, a) : null), p = [], h = Aa(t, t.system.rollModifier, "roll");
    if (h && p.push(h), t.system.roll === "attack") {
      const f = Aa(t, t.system.attackModifier, "attack");
      f && p.push(f);
    }
    const m = i.skill ? this.#t.rankContribution(i.skill, a) : null;
    m && p.push(m);
    const y = s.map((f, w) => ({
      label: t.name,
      pool: o,
      difficulty: c[w] ? { mode: "hidden", value: c[w].difficulty } : i.difficulty ?? { mode: "unknown" },
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: t.system.roll === "attack" ? i.damageEffort ?? 0 : 0,
      freeDamageEffort: t.system.roll === "attack" ? i.freeDamageEffort ?? 0 : 0,
      freeEffort: i.freeEffort ?? 0,
      actionCost: this.#l(t),
      actionCostIgnoresEdge: t.system.cost.ignoresEdge,
      otherEase: i.otherEase ?? 0,
      otherHindrance: i.otherHindrance ?? 0,
      contributions: [
        ...p,
        ...c[w]?.contributions ?? [],
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
        damage: bi(t.system.damage, "Ability damage"),
        woundSeverity: t.system.woundSeverity
      },
      ...f ? {
        target: {
          ...Qm(f),
          name: f.name,
          type: f.type === "npc" ? "npc" : "character"
        }
      } : {}
    }));
    return { ability: t, pool: o, requests: y, targets: s, targetResolutions: c, damage: t.system.damage };
  }
  async executeRoll(e, t, i, o) {
    const a = this.buildRollPlan(e, t, i), r = await this.#e.executeBatch(e, a.requests, o), s = this.#n.policy(i.enabledRuleModuleIds ?? []).damageEffortBonus;
    return r.map((l, u) => {
      const c = t.system.roll === "attack" ? l.result.prepared.damageEffortApplied * s : 0, p = t.system.roll === "attack" ? Ot(l.result) : 0;
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
      const o = Xr(i.execution.result, t), a = Ot(o);
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
  #l(e) {
    const t = bi(e.system.cost.amount, "Ability cost");
    return We(e).length > 0 ? t : 0;
  }
}
function Ha(n) {
  return n.type === "npc" ? St(n) : Si(n);
}
function $a(n, e) {
  const t = n.target;
  return t ? t.type === "npc" && n.grossDamage > 0 ? {
    damage: n.grossDamage,
    action: {
      kind: "npcDamage",
      ...Hi(Ha(t)),
      requestedDamage: n.grossDamage,
      applied: !1
    }
  } : t.type === "character" && n.woundSeverity !== "none" ? {
    woundSeverity: n.woundSeverity,
    action: {
      kind: "characterWound",
      ...Hi(Ha(t)),
      severity: n.woundSeverity,
      sourceActorId: e,
      sourceName: n.ability.name,
      applied: !1
    }
  } : {} : {};
}
class ep {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async publishRoll(e, t, i, o = !1) {
    const a = t.execution.result.success === !0, r = t.execution.result.success !== !1, l = {
      ...a ? $a(t, e.id) : {},
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
      const a = o ? $a({
        ability: t.ability,
        target: o,
        grossDamage: t.ability.system.damage,
        woundSeverity: t.ability.system.woundSeverity
      }, e.id) : {}, r = a.action, s = await foundry.applications.handlebars.renderTemplate(
        "systems/cypherv2/templates/chat/ability-card.hbs",
        {
          abilityName: t.ability.name,
          actorName: e.name,
          ...Se(e),
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
        ...Se(e),
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
const tp = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The Artifact level roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class ip {
  #e;
  constructor(e = tp) {
    this.#e = e;
  }
  canRollLevel(e) {
    return In(e.system) && Ai(e.system);
  }
  async rollLevel(e) {
    if (!In(e.system)) throw new Error("This Artifact is depleted.");
    if (!Ai(e.system)) throw new Error("This Artifact has a fixed Level.");
    const t = Ui(e.system), i = await this.#e(t);
    return await e.update({ "system.level": String(i.total) }), {
      itemId: e.id,
      itemName: e.name,
      formula: t,
      total: i.total,
      ...i.chatRoll === void 0 ? {} : { chatRoll: i.chatRoll }
    };
  }
}
function np(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function op(n) {
  const e = n._source?.system?.description;
  return typeof e == "string" ? e : "";
}
function ap(n) {
  const e = n.system;
  if (n.type === "equipment")
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Quantity"), value: Number(e.quantity ?? 1) },
      ...Number(e.level) > 0 ? [{ label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Number(e.level) }] : [],
      ...e.equipped === !0 ? [{ label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize("CYPHERV2.Common.Yes") }] : []
    ];
  if (n.type === "cypher") {
    const t = qr(e.manifestation), i = xr(e.power);
    return [
      { label: game.i18n.localize("CYPHERV2.Cypher.Manifestation.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${t}`) },
      ...String(e.form ?? "").trim() ? [{ label: game.i18n.localize("CYPHERV2.Cypher.Form"), value: String(e.form) }] : [],
      { label: game.i18n.localize("CYPHERV2.Cypher.Power.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Power.${i}`) },
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: co(e) }
    ];
  }
  if (n.type === "artifact") {
    const t = e.depletion;
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Ui(e) },
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
    const t = n, i = We(t), o = lr(t.system.cost.amount, i, np, {
      pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
      middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
      final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
    }, t.system.cost.scalable === !0);
    return o ? [{ label: game.i18n.localize("CYPHERV2.Ability.Cost"), value: o }] : [];
  }
  return [];
}
function rp(n) {
  return ap(n).filter(
    ({ label: e, value: t }) => e.trim().length > 0 && (typeof t == "number" || t.trim().length > 0)
  );
}
class sp {
  async publish(e) {
    const t = e.system, i = op(e), o = i ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(i, {
      async: !0,
      relativeTo: e
    }) : "", a = t.depletion, r = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-card.hbs",
      {
        itemName: e.name,
        ...Se(e.actor),
        itemType: game.i18n.localize(`TYPES.Item.${e.type}`),
        properties: rp(e),
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
        ...Se(e.actor),
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
class lp {
  canUse(e) {
    return e.type === "character" && e.system.xp >= 1;
  }
  async spend(e, t) {
    if (oe(e), !t) throw new Error("A Player Intrusion request ID is required.");
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
function cp(n) {
  return { actorName: n.actorName, xpSpent: n.xpSpent };
}
class dp {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/player-intrusion-card.hbs",
      {
        ...cp(e),
        ...Se(t)
      }
    );
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: t }),
      content: i,
      flags: { cypherv2: { playerIntrusion: e } }
    });
  }
}
function up(n) {
  const e = new im(), t = new Xu(), i = new em(), o = new bm(n), a = new vm(n), r = new Hm(n), s = new fm(), l = new Vm(), u = new Fm(), c = new Or(e), p = new xm(), h = new Kr(), m = new ao(), y = new Nm(
    n,
    o,
    a,
    r,
    e,
    l,
    u,
    c,
    h
  );
  return Object.freeze({
    wounds: e,
    recovery: new Zu(t, i),
    rally: new Jl(e),
    rolls: o,
    rollChat: s,
    skills: a,
    intrusions: new Rm(n),
    intrusionChat: new wc(),
    playerIntrusions: new lp(),
    playerIntrusionChat: new dp(),
    targets: r,
    combat: y,
    combatChat: new Mm(s, c),
    abilities: new Zm(o, a, r, y),
    abilityChat: new ep(s),
    shields: c,
    artifacts: new ip(),
    itemChat: new sp(),
    genres: new wd(),
    weapons: h,
    depletion: p,
    depletionChat: new Um(),
    combatStatuses: u,
    focusEvaluator: m,
    focusTrees: new _m(m),
    focusAcquisition: new Kc(m),
    advancement: new ed(n),
    focusAssociations: new sd(),
    characterInitialization: new dd(),
    characterPackages: new Jm()
  });
}
const mp = {
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
class pp {
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
function Ia(n) {
  return n.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function fp(n) {
  return n === !0 || n === "true" || n === "on";
}
async function hp() {
  if (!game.user.isGM) throw new Error("Only a GM can initiate a GM Intrusion.");
  const n = [...game.actors].filter((s) => s.type === "character").sort((s, l) => s.name.localeCompare(l.name));
  if (n.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoCharacters"));
    return;
  }
  const e = n.map((s) => '<option value="' + s.id + '">' + Ia(s.name) + "</option>").join(""), t = n.map((s) => '<label class="intrusion-character-choice"><input name="group-' + s.id + '" type="checkbox"> ' + Ia(s.name) + "</label>").join(""), i = [
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
      const u = l.element.querySelector('[name="mode"]'), c = l.element.querySelector('[data-intrusion-selection="single"]'), p = l.element.querySelector('[data-intrusion-selection="group"]'), h = () => {
        const m = u?.value === "group";
        c && (c.hidden = m), p && (p.hidden = !m);
      };
      u?.addEventListener("change", h), h();
    }
  });
  if (!o) return;
  const a = o.mode === "group" || o.mode === "free" ? o.mode : "targeted", r = a === "group" ? n.filter((s) => fp(o["group-" + s.id])).map((s) => s.id) : [String(o.targetActorId ?? "")];
  try {
    await Xt().createManual({ mode: a, actorIds: r });
  } catch (s) {
    ui.notifications.error(s instanceof Error ? s.message : String(s));
  }
}
function yn(n, e, t) {
  const i = t > st, o = n.querySelector("[data-horror-summary]"), a = n.querySelector("[data-horror-explanation]"), r = n.querySelector("[data-horror-value]");
  n.dataset.horrorBand = dr(t), n.style.setProperty("--cypherv2-horror-fill", `${ur(t)}%`), e.value = String(t), e.setAttribute("aria-valuetext", i ? `1–${t}` : "Natural 1"), r && (r.value = String(t)), o && (o.textContent = i ? game.i18n.format("CYPHERV2.Horror.RangeSummary", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalSummary")), a && (a.textContent = i ? game.i18n.format("CYPHERV2.Horror.Explanation", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalExplanation"));
}
async function gp() {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  const n = En(), e = `<div class="cypherv2 cypherv2-dialog cypherv2-horror-dialog" data-horror-dialog data-horror-band="${dr(n)}" style="--cypherv2-horror-fill: ${ur(n)}%">
    <header class="cypherv2-dialog-heading">
      <span>${game.i18n.localize("CYPHERV2.Horror.Title")}</span>
      <strong data-horror-summary></strong>
    </header>
    <section class="cypherv2-dialog-section">
      <div class="horror-range-control">
        <input class="horror-range-input" id="cypherv2-horror-intrusion-range" name="horrorIntrusionRange" type="range" min="${st}" max="${Kt}" step="1" value="${n}" aria-label="${game.i18n.localize("CYPHERV2.Horror.RangeLabel")}">
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
      !o || !a || (yn(o, a, n), a.addEventListener("input", () => {
        yn(o, a, Number(a.value));
      }), a.addEventListener("change", () => {
        Kl(Number(a.value)).catch((r) => {
          ui.notifications.error(r instanceof Error ? r.message : String(r)), yn(o, a, En());
        });
      }));
    }
  });
}
function yp() {
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
        hp();
      }
    }, t.cypherv2HorrorMode = {
      name: "cypherv2HorrorMode",
      title: "CYPHERV2.Horror.SceneControl",
      icon: "fa-solid fa-skull",
      order: i + 1,
      button: !0,
      visible: game.user.isGM,
      onChange: () => {
        gp();
      }
    };
  });
}
const Jr = `system.${I}`;
function $i(n) {
  return game.user.isGM || n.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function zn(n) {
  (n.tokenId || n.tokenUuid) && ui.notifications.error(game.i18n.localize("CYPHERV2.Combat.Errors.OriginalTokenMissing"));
}
function Qr(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function Zr(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function bp(n) {
  return {
    actorId: n.sourceActorId,
    ...n.sourceActorUuid ? { actorUuid: n.sourceActorUuid } : {},
    ...n.sourceTokenId ? { tokenId: n.sourceTokenId } : {},
    ...n.sourceTokenUuid ? { tokenUuid: n.sourceTokenUuid } : {}
  };
}
function es(n) {
  const e = n.getFlag(I, "combatAction");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "npcDamage" && t.kind !== "characterWound" && t.kind !== "shieldWound" || typeof t.targetActorId != "string" || typeof t.applied != "boolean" ? null : e;
}
function ts(n) {
  const e = n.getFlag(I, "defenseRequest");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "defenseRequest" || typeof t.sourceActorId != "string" || typeof t.targetActorId != "string" ? null : e;
}
async function wp(n, e) {
  const t = es(n);
  if (!t || t.applied) return;
  const i = Qr(t), o = await Pn(i);
  if (!o) {
    zn(i);
    return;
  }
  if (!$i(o)) return;
  const a = jt(o, i);
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
    await n.setFlag(I, "combatAction", { ...t, applied: !0 }), e.textContent = game.i18n.localize("CYPHERV2.Combat.Applied");
  } catch (r) {
    e.disabled = !1, ui.notifications.error(r instanceof Error ? r.message : String(r));
  }
}
async function vp(n, e, t, i) {
  if (e.resolved || !e.allowedDefenses.includes(t)) return;
  const o = Zr(e), a = bp(e), r = await Pn(o), s = await Pn(a);
  if (!r || !s) {
    r || zn(o), s || zn(a);
    return;
  }
  if (!$i(r)) return;
  if (i.disabled = !0, !await Sn(
    jt(r, o),
    t,
    {
      source: jt(s, a),
      woundSeverity: e.woundSeverity
    }
  )) {
    i.disabled = !1;
    return;
  }
  game.socket.emit(Jr, { type: "resolveDefenseRequest", messageId: n.id }), game.user.isGM && await n.setFlag(I, "defenseRequest", { ...e, resolved: !0 });
}
function Cp(n, e) {
  const t = es(n), i = e.querySelector("[data-action='applyCombatOutcome']");
  if (i) {
    const s = t ? Rn(Qr(t)) : null;
    !t || !s || !$i(s) ? i.remove() : t.applied ? (i.disabled = !0, i.textContent = game.i18n.localize("CYPHERV2.Combat.Applied")) : i.addEventListener("click", () => {
      wp(n, i);
    }, { once: !0 });
  }
  const o = ts(n), a = [...e.querySelectorAll("[data-action='rollRequestedDefense']")];
  if (a.length === 0) return;
  const r = o ? Rn(Zr(o)) : null;
  if (!o || !r || !$i(r) || o.resolved) {
    for (const s of a) s.remove();
    return;
  }
  for (const s of a) {
    const l = s.dataset.defense;
    if (!Da.includes(l)) {
      s.remove();
      continue;
    }
    s.addEventListener(
      "click",
      () => {
        vp(n, o, l, s);
      },
      { once: !0 }
    );
  }
}
function Ep() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    Cp(n, e);
  }), game.socket.on(Jr, (n) => {
    if (!game.user.isGM || n.type !== "resolveDefenseRequest") return;
    const e = game.messages.get(n.messageId);
    if (!e) return;
    const t = ts(e);
    !t || t.resolved || e.setFlag(I, "defenseRequest", { ...t, resolved: !0 });
  });
}
function Rp(n) {
  return n.actor ? n.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) : game.user.isGM;
}
function Pp() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    for (const t of e.querySelectorAll("[data-action='rollItemCardDepletion']"))
      t.addEventListener("click", async (i) => {
        i.preventDefault(), i.stopPropagation();
        const o = t.dataset.itemUuid, a = o ? await fromUuid(o) : null;
        if (!a || a.type !== "artifact" || !Rp(a)) {
          ui.notifications.warn(game.i18n.localize("CYPHERV2.Inventory.NotAuthorized"));
          return;
        }
        t.disabled = !0, await ki(a), t.disabled = a.system.depleted === !0;
      });
  });
}
async function Sp() {
  if (!game.user.isGM) return;
  const n = [...game.items].filter((e) => e.type === "genre");
  if (n.length)
    for (const e of game.actors)
      try {
        if (e.type !== "character") continue;
        const t = e, i = [...e.items].find((a) => a.type === "characterType");
        if (!i || t.system.genre.sourceUuid) continue;
        const o = await Dr(
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
class kp {
  #e = /* @__PURE__ */ new Set();
  constructor(e = []) {
    for (const t of e) this.#e.add(t.id);
  }
  mark(e, t) {
    const i = t.querySelector(".cypherv2-roll-card[data-cypherv2-entrance]");
    return !i || this.#e.has(e.id) ? !1 : (this.#e.add(e.id), i.classList.add("cypherv2-chat-card-enter"), !0);
  }
}
function Ap() {
  const n = new kp(game.messages);
  return Hooks.on("renderChatMessageHTML", (e, t) => {
    n.mark(e, t);
  }), n;
}
const Ii = "doneThisRound";
function is(n, e) {
  return !!(e && (n.isGM || e.testUserPermission(n, "OWNER")));
}
function Hp(n, e) {
  return e > 0 && n?.getFlag(I, Ii) === e;
}
async function $p(n, e, t) {
  if (!n.started) return { ok: !1, reason: "not-started" };
  if (!n.turns.length) return { ok: !1, reason: "empty" };
  const i = n.combatant;
  return n.turn === null || !i ? { ok: !1, reason: "no-current" } : i.id !== t ? { ok: !1, reason: "stale" } : is(e, i) ? (await i.setFlag(I, Ii, n.round), await n.nextTurn(), { ok: !0 }) : { ok: !1, reason: "not-authorized" };
}
async function Ip(n) {
  const e = Array.from(n.combatants).filter((t) => t.getFlag(I, Ii) !== void 0).map((t) => ({
    _id: t.id,
    [`flags.${I}.-=${Ii}`]: null
  }));
  e.length && await n.updateEmbeddedDocuments("Combatant", e, { turnEvents: !1 });
}
function Vp(n, e, t, i) {
  if (!n.includes(e)) return [...n];
  const o = n.filter((r) => r !== e);
  if (!t) return [...o, e];
  const a = o.indexOf(t);
  return a < 0 ? [...n] : (o.splice(a + (i ? 1 : 0), 0, e), o);
}
function Yp(n) {
  return n.map((e, t) => ({
    _id: e,
    initiative: (n.length - t) * 10
  }));
}
const Fp = foundry.applications.sidebar.tabs.CombatTracker, Va = "application/x-cypherv2-combatant";
function bn(n) {
  return n?.dataset.combatantId ?? null;
}
class mo extends Fp {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-combat-tracker"],
    actions: {
      endCypherTurn: mo.#e
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
    const i = this.viewed, o = bn(t.closest("[data-combatant-id]"));
    if (!i || !o) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.CombatTracker.Errors.NoCombat"));
      return;
    }
    t.setAttribute("disabled", "");
    try {
      const a = await $p(i, game.user, o);
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
      o.doneThisRound = Hp(a, i?.round ?? 0), o.canEndTurn = !!(i?.started && o.active && !o.doneThisRound && is(game.user, a));
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
    const t = e.currentTarget?.closest("[data-combatant-id]") ?? null, i = bn(t);
    i && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData(Va, i), e.dataTransfer.setData("text/plain", i), t?.classList.add("cypherv2-combatant-dragging"));
  }
  #i(e) {
    !game.user.isGM || !e.dataTransfer || (e.preventDefault(), e.dataTransfer.dropEffect = "move");
  }
  async #n(e) {
    if (e.preventDefault(), !game.user.isGM || !e.dataTransfer) return;
    const t = this.viewed, i = e.dataTransfer.getData(Va) || e.dataTransfer.getData("text/plain");
    if (!t || !i || !t.combatants.get(i)) return;
    const o = e.target?.closest(".combatant[data-combatant-id]") ?? null, a = bn(o), r = o?.getBoundingClientRect(), s = !!(r && e.clientY > r.top + r.height / 2), l = t.turns.map((h) => h.id), u = Vp(l, i, a, s);
    if (u.every((h, m) => h === l[m])) {
      this.#o();
      return;
    }
    const c = t.combatant?.id, p = c ? u.indexOf(c) : void 0;
    await t.updateEmbeddedDocuments(
      "Combatant",
      Yp(u),
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
function Dp() {
  CONFIG.ui.combat = mo;
}
function Tp() {
  Hooks.on("updateCombat", (n, e) => {
    !("round" in e) || !game.user.isActiveGM || Ip(n).catch((t) => {
      console.error("cypherv2 | Failed to reset Combat Tracker DONE states", t);
    });
  });
}
const zp = CONFIG.ui.pause;
class Np extends zp {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-game-pause"]
  };
  async _prepareContext(e) {
    return {
      ...await super._prepareContext(e),
      icon: _n.gamePaused,
      spin: !1
    };
  }
}
function Mp() {
  CONFIG.ui.pause = Np;
}
function qp() {
  CONFIG.Combat.fallbackTurnMarker = _n.turnMarker;
}
const xp = "--cypherv2-blank-canvas-background-image";
function Up(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function Gp(n = document.body, e = (t) => foundry.utils.getRoute(t)) {
  const t = ir(_n.lobby, e);
  n.style.setProperty(xp, Up(t));
}
Hooks.once("init", async () => {
  console.info(`${I} | Initializing`);
  const n = new _u();
  Bu(n);
  const e = new pp();
  e.register(mp), game.cypherv2 = bs(n, up(n), e), jl(), Nl(), Mu(), Dp(), Mp(), qp(), yp(), Hooks.callAll("cypherv2.registerRules", n), Hooks.callAll("cypherv2.registerThemes", e), _l(e), await foundry.applications.handlebars.loadTemplates([
    "systems/cypherv2/templates/focus/focus-tree.hbs"
  ]);
});
Hooks.once("ready", async () => {
  Gp();
  const n = String(game.settings.get(I, U.theme));
  game.cypherv2.themes.apply(game.cypherv2.themes.has(n) ? n : "core"), Rc(
    game.cypherv2.services.intrusions,
    game.cypherv2.services.intrusionChat
  ), pu(
    game.cypherv2.services.playerIntrusions,
    game.cypherv2.services.playerIntrusionChat
  ), Ep(), Pp(), Ap(), Tm(game.cypherv2.services.combatStatuses), Tp(), await Sp(), console.info(`${I} | Ready`);
});
//# sourceMappingURL=cypherv2.mjs.map
