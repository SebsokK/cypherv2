const S = "cypherv2", Ms = "0.1.0";
const _ = [
  "inability",
  "untrained",
  "trained",
  "specialized",
  "expert"
], co = ["choose", "might", "speed", "intellect"], De = ["light", "medium", "heavy"], uo = ["melee", "ranged"], Qi = ["immediate", "short", "long", "very-long", "specified"], Fe = ["light", "medium", "heavy"], mo = ["block", "blockWithShield", "dodge"], Us = ["d6", "d10", "d20"], bn = ["subtle", "manifest"], wn = ["low", "medium", "advanced", "high", "ultra"], re = ["minor", "moderate", "major"], po = ["action", "passive", "reaction", "special"], Jn = ["none", "might", "speed", "intellect", "choose"], fo = ["none", "task", "attack", "defense"], ho = ["none", "single", "multiple"], Tt = ["one-action", "10-minutes", "1-hour", "10-hours"], xs = ["normal", "nonRest"], qs = ["10-minutes", "1-hour", "10-hours"];
function Gs(n, e, t) {
  return Object.freeze({
    version: Ms,
    rules: n,
    services: e,
    themes: t
  });
}
const I = ["might", "speed", "intellect"], kt = {
  "one-action": "oneAction",
  "10-minutes": "tenMinutes",
  "1-hour": "oneHour",
  "10-hours": "tenHours"
};
function Zi(n = !1) {
  return { oneAction: n, tenMinutes: n, oneHour: n, tenHours: n };
}
function go(n) {
  return Tt.filter((e) => !n[kt[e]]);
}
let Qn = 0;
const Qe = () => {
  const n = globalThis.crypto?.randomUUID;
  return n ? n.call(globalThis.crypto) : (Qn += 1, `cypherv2-${Date.now()}-${Qn}`);
};
function ee(n) {
  if (n.type !== "character") throw new Error("Core Character services require a Character Actor.");
}
function $e(n) {
  if (ee(n), n.system.derived.wounds.dead) throw new Error("A dead Character cannot use this service.");
}
function it(n) {
  return {
    minor: n.minor.map((e) => ({ ...e })),
    moderate: n.moderate.map((e) => ({ ...e })),
    major: n.major.map((e) => ({ ...e }))
  };
}
const ki = [
  "tier",
  "effort",
  "mightMax",
  "mightEdge",
  "speedMax",
  "speedEdge",
  "intellectMax",
  "intellectEdge"
];
function Os() {
  return {
    tier: null,
    effort: null,
    stats: {
      might: { max: null, edge: null },
      speed: { max: null, edge: null },
      intellect: { max: null, edge: null }
    }
  };
}
function nt(n, e) {
  return Number.isInteger(e) ? Number(e) : n;
}
function vn(n) {
  return n.startsWith("might") ? "might" : n.startsWith("speed") ? "speed" : n.startsWith("intellect") ? "intellect" : null;
}
function st(n) {
  return n === "tier" || n === "effort" ? `system.overrides.${n}` : `system.overrides.stats.${vn(n)}.${n.endsWith("Max") ? "max" : "edge"}`;
}
function Lt(n, e, t) {
  if (!Number.isFinite(t)) throw new Error("Character progression delta must be finite.");
  if (e === "tier") {
    const l = Number.isInteger(n.overrides?.tier);
    return {
      path: l ? st(e) : "system.tier",
      value: (l ? Number(n.overrides.tier) : n.tier) + t,
      overrideActive: l
    };
  }
  if (e === "effort") {
    const l = Number.isInteger(n.overrides?.effort);
    return {
      path: l ? st(e) : "system.stats.effortBase",
      value: (l ? Number(n.overrides.effort) : n.stats.effortBase) + t,
      overrideActive: l
    };
  }
  const i = vn(e), a = e.endsWith("Max") ? "max" : "edge", o = n.overrides?.stats?.[i]?.[a], s = Number.isInteger(o), r = a === "max" ? n.stats[i].baseMax : n.stats[i].baseEdge;
  return {
    path: s ? st(e) : `system.stats.${i}.${a === "max" ? "baseMax" : "baseEdge"}`,
    value: (s ? Number(o) : r) + t,
    overrideActive: s
  };
}
function q(n) {
  return n.derived?.tier?.value ?? nt(n.tier, n.overrides?.tier);
}
function en(n, e) {
  if (e === "tier") return {
    key: e,
    path: st(e),
    calculated: n.derived.tier.calculated,
    override: n.overrides?.tier ?? null,
    effective: n.derived.tier.value,
    minimum: 1
  };
  if (e === "effort") return {
    key: e,
    path: st(e),
    calculated: n.derived.effort.calculatedMax,
    override: n.overrides?.effort ?? null,
    effective: n.derived.effort.max,
    minimum: 0
  };
  const t = vn(e), i = e.endsWith("Max") ? "max" : "edge", a = n.derived.pools[t];
  return {
    key: e,
    path: st(e),
    calculated: i === "max" ? a.calculatedMax : a.calculatedEdge,
    override: n.overrides?.stats?.[t]?.[i] ?? null,
    effective: a[i],
    minimum: i === "max" ? 1 : -20
  };
}
const Si = Object.freeze({
  light: 1,
  medium: 2,
  heavy: 3
});
function he(n) {
  return n.reduce((e, t) => e + t.value, 0);
}
function Ee(n, e, t, i, a) {
  return { id: n, sourceId: e, sourceType: t, label: i, value: a };
}
function Bs(n, e, t, i = {}, a = [], o = { armorCategories: [], freelyUse: [] }, s = 0, r = {
  weaponCategories: [],
  armorCategories: [],
  genre: "none",
  genreUuid: "",
  totalEffortCapMode: "core",
  typeNames: [],
  descriptorNames: [],
  speciesNames: [],
  characterSentence: ""
}, l = 2, u = 1, c = Os()) {
  const p = {};
  for (const V of I) {
    const x = [
      Ee(
        `pool.${V}.max.base`,
        `system.stats.${V}.baseMax`,
        "base",
        `${V} base maximum`,
        n[V].baseMax
      ),
      ...i.poolMax?.[V] ?? []
    ], ie = [
      Ee(
        `pool.${V}.edge.base`,
        `system.stats.${V}.baseEdge`,
        "base",
        `${V} base Edge`,
        n[V].baseEdge
      ),
      ...i.poolEdge?.[V] ?? []
    ], ue = he(x), O = he(ie);
    p[V] = {
      calculatedMax: ue,
      calculatedEdge: O,
      max: nt(ue, c.stats?.[V]?.max),
      edge: nt(O, c.stats?.[V]?.edge),
      maxContributions: x,
      edgeContributions: ie
    };
  }
  const f = [
    Ee(
      "effort.max.base",
      "system.stats.effortBase",
      "base",
      "Base Effort",
      n.effortBase ?? 0
    ),
    ...i.effortMax ?? []
  ], m = Math.max(0, he(f)), b = [
    Ee(
      "recovery.bonus.base",
      "system.recovery.bonus",
      "base",
      "Permanent Recovery bonus",
      s
    ),
    ...i.recoveryBonus ?? []
  ], g = he(b), y = [
    Ee("cypher-limit.base", "system.cypherLimitBase", "base", "Base Cypher Limit", l),
    ...i.cypherLimit ?? []
  ], v = {}, k = {};
  for (const V of re) {
    const x = [
      Ee(
        `wound.${V}.capacity.core`,
        "cypherv2.core",
        "core",
        `${V} Wound capacity`,
        3
      ),
      ...i.woundCapacity?.[V] ?? []
    ];
    v[V] = x, k[V] = Math.max(0, he(x));
  }
  const P = [];
  e.moderate.length >= k.moderate && P.push(
    Ee(
      "wound.moderate.full.hindrance",
      "cypherv2.core",
      "core",
      "Moderate Wounds full",
      1
    )
  );
  for (const V of e.major)
    P.push(
      Ee(
        `wound.major.${V.id}.hindrance`,
        V.id,
        "wound",
        V.label || "Major Wound",
        1
      )
    );
  P.push(...i.hindrance ?? []);
  const A = [...a].filter((V) => V.type === "armor" && V.system.equipped).filter((V) => Fe.includes(V.system.category)).sort((V, x) => Si[x.system.category] - Si[V.system.category] || V.id.localeCompare(x.id))[0], $ = A?.system.category ?? "none", D = A ? Si[A.system.category] : 0, K = A ? o.armorCategories.includes(A.system.category) : !0, de = (V, x, ie) => A && ie > 0 ? [Ee(
    `armor.${A.id}.${V}`,
    A.id,
    "item",
    x,
    ie
  )] : [], H = de("block", "Armor: Block", D), j = de("dodge", "Armor: Dodge", D), ve = de(
    "speed-task",
    "Unfamiliar armor: Speed task",
    K ? 0 : D
  );
  return {
    tier: {
      calculated: u,
      value: nt(u, c.tier)
    },
    pools: p,
    effort: {
      calculatedMax: m,
      max: Math.max(0, nt(m, c.effort)),
      contributions: f
    },
    wounds: {
      capacities: k,
      capacityContributions: v,
      hindrance: he(P),
      hindranceContributions: P,
      dead: e.major.length >= k.major
    },
    recovery: {
      formula: g === 0 ? "1d6 + Tier" : `1d6 + Tier + ${g}`,
      bonus: g,
      bonusContributions: b,
      availableTypes: go(t)
    },
    cypherLimit: { max: Math.max(0, he(y)), contributions: y },
    combat: {
      armor: {
        itemId: A?.id ?? "",
        category: $,
        freelyUsed: K,
        blockEase: he(H),
        dodgeHindrance: he(j),
        speedTaskHindrance: he(ve),
        blockContributions: H,
        dodgeContributions: j,
        speedTaskContributions: ve
      }
    },
    packages: r
  };
}
const {
  ArrayField: Cn,
  BooleanField: gi,
  HTMLField: yo,
  NumberField: ct,
  ObjectField: Ls,
  SchemaField: pt,
  StringField: le
} = foundry.data.fields, d = {
  ArrayField: Cn,
  BooleanField: gi,
  HTMLField: yo,
  NumberField: ct,
  ObjectField: Ls,
  SchemaField: pt,
  StringField: le
};
function E(n = 0, e = 0) {
  return new ct({ required: !0, nullable: !1, integer: !0, min: e, initial: n });
}
function Q(n = []) {
  return new Cn(
    new le({ required: !0, nullable: !1, blank: !1 }),
    { required: !0, nullable: !1, initial: [...n] }
  );
}
function Ai(n = 10) {
  return new pt({
    value: E(n),
    baseMax: E(n, 1),
    baseEdge: E(0, -20),
    max: new ct({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: n,
      persisted: !1
    }),
    edge: new ct({
      required: !0,
      nullable: !1,
      integer: !0,
      min: -20,
      initial: 0,
      persisted: !1
    })
  });
}
function rt() {
  return new pt({
    id: new le({ required: !0, nullable: !1, blank: !1 }),
    label: new le({ required: !0, nullable: !1, initial: "" }),
    description: new yo({ required: !0, nullable: !1, initial: "" }),
    sourceUuid: new le({ required: !0, nullable: !1, initial: "" }),
    treated: new gi({ required: !0, nullable: !1, initial: !1 })
  });
}
function js() {
  return new pt({
    id: new le({ required: !0, nullable: !1, blank: !1 }),
    sourceId: new le({ required: !0, nullable: !1, blank: !1 }),
    sourceType: new le({
      required: !0,
      nullable: !1,
      choices: ["base", "core", "rule-module", "wound", "item"]
    }),
    label: new le({ required: !0, nullable: !1, initial: "" }),
    value: new ct({ required: !0, nullable: !1, integer: !0, initial: 0 })
  });
}
function se() {
  return new Cn(js(), {
    required: !0,
    nullable: !1,
    initial: [],
    persisted: !1
  });
}
function Ws() {
  return new pt({
    enabled: new gi({ required: !0, nullable: !1, initial: !1 }),
    trigger: new le({
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
function yi(n = "") {
  return new pt({
    enabled: new gi({ required: !0, nullable: !1, initial: !1 }),
    die: new le({
      required: !0,
      nullable: !1,
      initial: "d6",
      validate: (e) => /^d(?:[2-9]|[1-9]\d{1,2}|1000)$/i.test(e)
    }),
    formula: new le({ required: !0, nullable: !1, initial: n }),
    threshold: new ct({
      required: !0,
      nullable: !1,
      integer: !0,
      min: 1,
      initial: 1
    })
  });
}
class bo extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      schemaVersion: E(1, 1),
      description: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      notes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      gmNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
const En = [
  "increaseCapabilities",
  "moveTowardPerfection",
  "extraEffort",
  "skillTraining"
], wo = [
  "recovery",
  "focus",
  "armor",
  "weapons",
  "genre"
], _s = [...En, "other"], vo = [
  "characterCreation",
  "additionalFocus",
  "otherAdvancement",
  "newTier"
], Ks = ["otherAdvancement", "newTier"], Co = Object.freeze({
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
function jt(n, e) {
  return Number.isInteger(n) && Number(n) >= e ? Number(n) : null;
}
function Zn(n, e = !1) {
  const t = {}, i = n.stats && typeof n.stats == "object" ? n.stats : {}, a = (o) => {
    const s = i[o] && typeof i[o] == "object" ? i[o] : {}, r = {};
    return (!e || G(s, "max")) && (r.max = jt(s.max, 1)), (!e || G(s, "edge")) && (r.edge = jt(s.edge, -20)), r;
  };
  if ((!e || G(n, "tier")) && (t.tier = jt(n.tier, 1)), (!e || G(n, "effort")) && (t.effort = jt(n.effort, 0)), !e || G(n, "stats")) {
    const o = {};
    for (const s of ["might", "speed", "intellect"])
      (!e || G(i, s)) && (o[s] = a(s));
    t.stats = o;
  }
  return t;
}
function G(n, e) {
  return Object.prototype.hasOwnProperty.call(n, e);
}
function Xs(n, e) {
  const t = { ...n };
  return (!e || G(n, "cycle")) && (t.cycle = Number.isInteger(n.cycle) ? n.cycle : 1), (!e || G(n, "purchases")) && (t.purchases = Array.isArray(n.purchases) ? n.purchases : []), (!e || G(n, "initializedFocusUuids")) && (t.initializedFocusUuids = Array.isArray(n.initializedFocusUuids) ? n.initializedFocusUuids : []), (!e || G(n, "pendingFocusChoices")) && (t.pendingFocusChoices = Array.isArray(n.pendingFocusChoices) ? n.pendingFocusChoices : []), (!e || G(n, "pendingGenreChoices")) && (t.pendingGenreChoices = Array.isArray(n.pendingGenreChoices) ? n.pendingGenreChoices : []), (!e || G(n, "guidanceCompletedTiers")) && (t.guidanceCompletedTiers = Array.isArray(n.guidanceCompletedTiers) ? [...new Set(n.guidanceCompletedTiers.filter((i) => Number.isInteger(i) && Number(i) >= 1).map(Number))].sort((i, a) => i - a) : []), (!e || G(n, "notes")) && (t.notes = typeof n.notes == "string" ? n.notes : ""), t;
}
function Js(n, e) {
  const t = { ...n };
  if ((!e || G(n, "coreInitialized")) && (t.coreInitialized = n.coreInitialized === !0), !e || G(n, "mode")) {
    const i = n.mode === "setup" ? "completed" : String(n.mode);
    t.mode = ["completed", "skipped", "manual"].includes(i) ? i : "uninitialized";
  }
  return (!e || G(n, "initializedAt")) && (t.initializedAt = Number.isInteger(n.initializedAt) ? n.initializedAt : 0), t;
}
function ea(n, e) {
  const t = {};
  if (!e || G(n, "backgroundMode")) {
    const i = String(n.backgroundMode ?? "theme");
    t.backgroundMode = ["theme", "portrait", "custom"].includes(i) ? i : "theme";
  }
  if ((!e || G(n, "customImage")) && (t.customImage = typeof n.customImage == "string" ? n.customImage : ""), !e || G(n, "color")) {
    const i = typeof n.color == "string" ? n.color.trim() : "";
    t.color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(i) ? i.toLocaleLowerCase("en-US") : "";
  }
  return t;
}
function Qs(n, e = {}) {
  const t = e.partial === !0;
  if (t ? n.overrides && typeof n.overrides == "object" && (n.overrides = Zn(n.overrides, !0)) : n.overrides = Zn(
    n.overrides && typeof n.overrides == "object" ? n.overrides : {}
  ), !t && (!n.genre || typeof n.genre != "object") && (n.genre = { sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0 }), t ? n.appearance && typeof n.appearance == "object" && (n.appearance = ea(n.appearance, !0)) : n.appearance = ea(
    n.appearance && typeof n.appearance == "object" ? n.appearance : {},
    !1
  ), Array.isArray(n.focusProgress) && (n.focusProgress = n.focusProgress.map((i) => {
    const a = i, o = Array.isArray(a.ownedNodeIds) ? a.ownedNodeIds : [], s = Array.isArray(a.acquisitions) ? a.acquisitions : o.map((r) => ({
      nodeId: r,
      mode: "legacy",
      choiceId: "",
      choiceSource: "none",
      choiceGrantTier: 1,
      choiceFocusUuid: "",
      acquiredAt: 0
    }));
    return {
      focusUuid: String(a.focusUuid ?? a.focusItemId ?? ""),
      ownedNodeIds: o,
      acquisitions: s,
      provenance: a.provenance === "creation" ? "creation" : "additional",
      initialChoicesGranted: a.initialChoicesGranted === !0,
      attachedAt: Number.isInteger(a.attachedAt) ? a.attachedAt : 0
    };
  })), n.advancement && typeof n.advancement == "object" && (n.advancement = Xs(n.advancement, t)), n.recovery && typeof n.recovery == "object") {
    const i = n.recovery;
    n.recovery = t && !G(i, "bonus") ? { ...i } : { ...i, bonus: Number.isInteger(i.bonus) ? i.bonus : 0 };
  }
  return n.creation && typeof n.creation == "object" && (n.creation = Js(n.creation, t)), n;
}
function yt(n, e, t) {
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
function Eo(n) {
  if (n.type !== "descriptor") return [];
  const e = n.system, t = e.instance?.selections?.poolChoices ?? [];
  return (e.poolBonusChoiceGroups ?? []).flatMap((i) => {
    const a = je(i.amount), o = new Set(i.pools.filter((l) => I.includes(l))), s = t.find((l) => l.groupId === i.id)?.pools ?? [], r = [...new Set(s)].filter((l) => o.has(l)).slice(0, je(i.choose));
    return a ? r.map((l) => ({ groupId: i.id, pool: l, amount: a })) : [];
  });
}
function Zs(n, e, t = []) {
  const i = [...n, ...e].join(" ").trim(), a = t.length > 0 ? `who ${t.join(" and ")}` : "";
  return [i, a].filter(Boolean).join(" ");
}
function er(n, e = [], t = [], i = []) {
  const a = {}, o = {}, s = {}, r = new Set(e.filter((m) => De.includes(m))), l = new Set(t.filter((m) => Fe.includes(m))), u = [], c = [], p = [], f = [];
  for (const m of n) {
    if (m.type === "characterType" || m.type === "species") {
      const g = m.system;
      if (m.type === "characterType")
        u.push(m.name);
      else {
        p.push(m.name);
        const v = je(g.cypherLimitBonus);
        v && f.push(yt(m, "cypher-limit", v));
      }
      for (const v of ["minor", "moderate", "major"]) {
        const k = je(g.woundBonuses[v]);
        k && (s[v] ??= []).push(yt(m, `wound.${v}`, k));
      }
      const y = g.edgeGrant.mode === "choice" ? g.instance.selections.edgePool : g.edgeGrant.pool;
      if (y !== "none" && I.includes(y)) {
        const v = je(g.edgeGrant.amount);
        v && (o[y] ??= []).push(yt(m, `edge.${y}`, v));
      }
      for (const v of De) g.weaponUse[v] && r.add(v);
      for (const v of Fe) g.armorUse[v] && l.add(v);
    } else
      c.push(m.name);
    const b = m.system.poolBonuses;
    for (const g of I) {
      const y = je(b[g]);
      y && (a[g] ??= []).push(yt(m, `pool.${g}`, y));
    }
    for (const g of Eo(m))
      (a[g.pool] ??= []).push(yt(
        m,
        `pool-choice.${g.groupId}.${g.pool}`,
        g.amount
      ));
  }
  return {
    extensions: { poolMax: a, poolEdge: o, woundCapacity: s, cypherLimit: f },
    weaponCategories: [...r],
    armorCategories: [...l],
    typeNames: u,
    descriptorNames: c,
    speciesNames: p,
    characterSentence: Zs(c, u, i)
  };
}
function Hi(n) {
  const e = n.system, t = Object.fromEntries(I.map((i) => [i, je(e.poolBonuses[i])]));
  for (const i of Eo(n)) t[i.pool] += i.amount;
  return t;
}
function Ro(n, e, t) {
  const i = Math.max(0, e - n);
  return Math.max(0, Math.min(t, t - i));
}
const tr = ["core", "unlimited"], ir = ["manual", "typeSuggestion", "migration"], nr = 6;
function ar(n, e) {
  if (!n.sourceUuid) return null;
  const t = e(n.sourceUuid);
  return !t || t.type !== "genre" ? null : {
    sourceUuid: t.uuid,
    name: t.name,
    totalEffortCapMode: t.system.options.totalEffortCapMode
  };
}
function or(n) {
  return n === "unlimited" ? null : nr;
}
const Po = ["theme", "portrait", "custom"], sr = "#96082a", rr = { r: 23, g: 24, b: 27 };
function Rn(n) {
  const e = n.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  return e ? `#${(e[1].length === 3 ? [...e[1]].map((i) => `${i}${i}`).join("") : e[1]).toLocaleLowerCase("en-US")}` : null;
}
function ko(n) {
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16)
  };
}
function So({ r: n, g: e, b: t }) {
  return `#${[n, e, t].map((i) => Math.max(0, Math.min(255, Math.round(i))).toString(16).padStart(2, "0")).join("")}`;
}
function Ao(n, e, t) {
  const i = 1 - t;
  return {
    r: n.r * t + e.r * i,
    g: n.g * t + e.g * i,
    b: n.b * t + e.b * i
  };
}
function lr(n) {
  const e = ko(n);
  return Math.max(e.r, e.g, e.b) < 96 ? So(Ao(e, { r: 255, g: 255, b: 255 }, 0.72)) : n;
}
function Ho(n) {
  const e = Rn(n);
  return e ? So(Ao(ko(e), rr, 0.2)) : null;
}
function Io(n) {
  const e = Rn(n);
  return e ? lr(e) : null;
}
function cr(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function $o(n, e = (t) => foundry.utils.getRoute(t)) {
  const t = n.trim();
  return t ? /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(t) ? t : e(t) : "";
}
function dr(n, e, t) {
  const i = Po.includes(n.backgroundMode) ? n.backgroundMode : "theme", a = n.customImage.trim(), o = Rn(n.color), s = o ? Io(o) : null, r = o ? Ho(o) : null, l = i === "portrait" ? e.trim() : i === "custom" ? a : "", u = $o(l, t), c = [
    ...s ? [`--cypherv2-character-accent: ${s}`] : [],
    ...r ? [`--cypherv2-character-tint: ${r}`] : [],
    ...u ? [`--cypherv2-character-background-image: ${cr(u)}`] : []
  ];
  return {
    backgroundMode: i,
    customImage: a,
    color: o ?? "",
    backgroundImage: u,
    hasBackgroundImage: !!u,
    hasCharacterColor: !!o,
    accent: s,
    tint: r,
    colorInput: o ?? sr,
    isTheme: i === "theme",
    isPortrait: i === "portrait",
    isCustom: i === "custom",
    style: c.join("; ")
  };
}
function ur() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    kind: new d.StringField({ required: !0, nullable: !1, choices: [..._s] }),
    otherKind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "none",
      choices: ["none", ...wo]
    }),
    tier: E(1, 1),
    xpCost: E(),
    resourcePointsGranted: E(),
    timestamp: E()
  });
}
function mr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...vo] }),
    grantTier: E(1, 1),
    focusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" })
  });
}
function pr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    source: new d.StringField({ required: !0, nullable: !1, choices: [...Ks] }),
    grantTier: E(1, 1)
  });
}
function fr() {
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
      choices: ["none", ...vo]
    }),
    choiceGrantTier: E(1, 1),
    choiceFocusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    acquiredAt: E()
  });
}
function hr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    kind: new d.StringField({
      required: !0,
      nullable: !1,
      initial: "normal",
      choices: [...xs]
    }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...Tt] }),
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
function gr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    type: new d.StringField({ required: !0, nullable: !1, choices: [...qs] }),
    choice: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    majorTaskSucceeded: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    removedWoundIds: Q(),
    timestamp: E()
  });
}
function Ii() {
  return new d.SchemaField({
    calculatedMax: E(),
    calculatedEdge: E(0, -20),
    max: E(),
    edge: E(0, -20),
    maxContributions: se(),
    edgeContributions: se()
  });
}
class yr extends bo {
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
        })
      }),
      xp: E(),
      resourcePoints: E(),
      stats: new d.SchemaField({
        effortBase: E(1),
        might: Ai(8),
        speed: Ai(8),
        intellect: Ai(8)
      }),
      recovery: new d.SchemaField({
        bonus: E(),
        used: new d.SchemaField({
          oneAction: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenMinutes: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          oneHour: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
          tenHours: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
        }),
        history: new d.ArrayField(hr(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      rest: new d.SchemaField({
        lastType: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        history: new d.ArrayField(gr(), {
          required: !0,
          nullable: !1,
          initial: []
        })
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] })
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
          acquisitions: new d.ArrayField(fr(), {
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
          choices: [...ir]
        }),
        attachedAt: E()
      }),
      appearance: new d.SchemaField({
        backgroundMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "theme",
          choices: [...Po]
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
      advancement: new d.SchemaField({
        cycle: E(1, 1),
        purchases: new d.ArrayField(ur(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        initializedFocusUuids: Q(),
        pendingFocusChoices: new d.ArrayField(mr(), {
          required: !0,
          nullable: !1,
          initial: []
        }),
        pendingGenreChoices: new d.ArrayField(pr(), {
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
            might: Ii(),
            speed: Ii(),
            intellect: Ii()
          }),
          effort: new d.SchemaField({
            calculatedMax: E(),
            max: E(),
            contributions: se()
          }),
          wounds: new d.SchemaField({
            capacities: new d.SchemaField({
              minor: E(3),
              moderate: E(3),
              major: E(3)
            }),
            capacityContributions: new d.SchemaField({
              minor: se(),
              moderate: se(),
              major: se()
            }),
            hindrance: E(),
            hindranceContributions: se(),
            dead: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
          }),
          recovery: new d.SchemaField({
            formula: new d.StringField({ required: !0, nullable: !1, initial: "1d6 + Tier" }),
            bonus: E(),
            bonusContributions: se(),
            availableTypes: new d.ArrayField(
              new d.StringField({ required: !0, nullable: !1, choices: [...Tt] }),
              { required: !0, nullable: !1, initial: [] }
            )
          }),
          cypherLimit: new d.SchemaField({ max: E(), contributions: se() }),
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
              blockContributions: se(),
              dodgeContributions: se(),
              speedTaskContributions: se()
            })
          }),
          packages: new d.SchemaField({
            weaponCategories: Q(),
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
    return Qs(super.migrateData(e), t);
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = [...this.parent.items ?? []], t = e.filter((l) => l.type === "armor").map((l) => ({
      id: l.id,
      type: l.type,
      system: l.system
    })), i = this.proficiencies, a = er(
      e.filter((l) => l.type === "characterType" || l.type === "descriptor" || l.type === "species"),
      i.weaponCategories,
      i.armorCategories
    ), o = ar(this.genre, (l) => typeof fromUuidSync != "function" ? null : fromUuidSync(l)), s = {
      armorCategories: a.armorCategories,
      freelyUse: i.freelyUse
    }, r = Bs(
      this.stats,
      this.wounds,
      this.recovery.used,
      a.extensions,
      t,
      s,
      this.recovery.bonus,
      {
        weaponCategories: [...a.weaponCategories],
        armorCategories: [...a.armorCategories],
        genre: o?.name ?? "none",
        genreUuid: o?.sourceUuid ?? "",
        totalEffortCapMode: o?.totalEffortCapMode ?? "core",
        typeNames: [...a.typeNames],
        descriptorNames: [...a.descriptorNames],
        speciesNames: [...a.speciesNames],
        characterSentence: a.characterSentence
      },
      this.cypherLimitBase,
      this.tier,
      this.overrides
    );
    Object.assign(this.derived.tier, r.tier), Object.assign(this.derived.pools.might, r.pools.might), Object.assign(this.derived.pools.speed, r.pools.speed), Object.assign(this.derived.pools.intellect, r.pools.intellect), Object.assign(this.derived.effort, r.effort), Object.assign(this.derived.wounds.capacities, r.wounds.capacities), Object.assign(this.derived.wounds.capacityContributions, r.wounds.capacityContributions), this.derived.wounds.hindrance = r.wounds.hindrance, this.derived.wounds.hindranceContributions = r.wounds.hindranceContributions, this.derived.wounds.dead = r.wounds.dead, Object.assign(this.derived.recovery, r.recovery), Object.assign(this.derived.cypherLimit, r.cypherLimit), Object.assign(this.derived.combat.armor, r.combat.armor), Object.assign(this.derived.packages, r.packages);
    for (const l of ["might", "speed", "intellect"])
      this.stats[l].max = r.pools[l].max, this.stats[l].edge = r.pools[l].edge;
  }
}
class br extends bo {
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
const wr = ["none", "fantasy", "scienceFiction", "superhero", "custom"], vr = ["primary", "additional", "speciesGranted", "custom"], Vo = ["none", "fixed", "choice"], Cr = ["type", "descriptor", "focus", "genre", "species", "other"], Er = ["active", "retained"];
function ft() {
  return new d.SchemaField({
    name: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    img: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    system: new d.ObjectField({ required: !0, nullable: !1, initial: {} })
  });
}
function Yo() {
  return new d.SchemaField({
    kind: new d.StringField({ required: !0, nullable: !1, initial: "other", choices: [...Cr] }),
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    grantId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    status: new d.StringField({ required: !0, nullable: !1, initial: "active", choices: [...Er] }),
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
function Do() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    itemUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: ft()
  });
}
function ta() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    optionIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
  });
}
function Rr() {
  return new d.SchemaField({
    groupId: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    pools: new d.ArrayField(
      new d.StringField({ required: !0, nullable: !1, blank: !1, choices: [...I] }),
      { required: !0, nullable: !1, initial: [] }
    )
  });
}
function Pn() {
  return new d.SchemaField({
    sourceUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    instanceId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    role: new d.StringField({ required: !0, nullable: !1, initial: "primary", choices: [...vr] }),
    attachedAt: E(),
    selections: new d.SchemaField({
      edgePool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
      poolChoices: new d.ArrayField(Rr(), { required: !0, nullable: !1, initial: [] }),
      skillChoices: new d.ArrayField(ta(), { required: !0, nullable: !1, initial: [] }),
      abilityChoices: new d.ArrayField(ta(), { required: !0, nullable: !1, initial: [] }),
      suppressedGrantIds: new d.ArrayField(new d.StringField({ required: !0, nullable: !1, blank: !1 }), { required: !0, nullable: !1, initial: [] })
    }),
    parent: Yo()
  });
}
function Pr() {
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
function kn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: ft(),
    alternatives: new d.ArrayField(Do(), { required: !0, nullable: !1, initial: [] })
  });
}
function kr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    snapshot: ft()
  });
}
function Sn() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    skillUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    customName: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [..._] }),
    snapshot: ft(),
    alternatives: new d.ArrayField(Do(), { required: !0, nullable: !1, initial: [] })
  });
}
function An() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    rank: new d.StringField({ required: !0, nullable: !1, initial: "trained", choices: [..._] }),
    options: new d.ArrayField(kr(), { required: !0, nullable: !1, initial: [] })
  });
}
function Fo() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    choose: E(1, 1),
    options: new d.ArrayField(kn(), { required: !0, nullable: !1, initial: [] })
  });
}
function ri() {
  return new d.SchemaField({
    light: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    medium: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
    heavy: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
  });
}
class oe extends foundry.abstract.TypeDataModel {
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
        duration: Ws(),
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
      grantedBy: Yo()
    };
  }
}
const Sr = [...I];
function tn(n, e = "none") {
  return Array.isArray(n) ? I.filter((t) => n.includes(t)) : e === "choose" || e === "any" ? [...I] : I.includes(e) ? [e] : [];
}
function Ne(n) {
  return tn(n.system.cost.allowedPools, n.system.pool);
}
function Ar(n, e, t) {
  const i = I.filter((a) => n.includes(a));
  return i.length === 0 ? "" : i.length === 1 ? e(i[0]) : i.length === 2 ? `${e(i[0])}${t.pair}${e(i[1])}` : `${e(i[0])}${t.middle}${e(i[1])}${t.final}${e(i[2])}`;
}
function To(n, e, t, i) {
  return !Number.isInteger(n) || n <= 0 || e.length === 0 ? "" : `${n} ${Ar(e, t, i)}`;
}
class Hr extends oe {
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
        choices: [...po]
      }),
      // Legacy V1 single-Pool source retained for safe document migration.
      // Runtime and UI use cost.allowedPools as the normalized authority.
      pool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...Jn]
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
        choices: [...fo]
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
        choices: ["none", ...re]
      }),
      range: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      targetMode: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "none",
        choices: [...ho]
      }),
      // Reserved for the later Focus acquisition workflow. Phase 1 never writes these fields.
      sourceFocusUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      sourceNodeId: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), a = i.cost && typeof i.cost == "object" ? i.cost : {};
    if (t.partial) {
      Object.hasOwn(i, "archived") && (i.archived = !!i.archived);
      const o = Object.hasOwn(a, "allowedPools"), s = Object.hasOwn(i, "pool") || Object.hasOwn(a, "pool");
      return (o || s) && (i.cost = {
        ...a,
        allowedPools: tn(
          o ? a.allowedPools : void 0,
          i.pool ?? a.pool
        )
      }), i.activation === "enabler" && (i.activation = "passive"), i;
    }
    if (i.pool === void 0) {
      const o = String(a.pool ?? "none");
      i.pool = Jn.includes(o) ? o : "none";
    }
    return i.archived = !!(i.archived ?? !1), i.cost = {
      amount: Number(a.amount ?? 0),
      ignoresEdge: !!(a.ignoresEdge ?? !1),
      allowedPools: tn(
        a.allowedPools,
        i.pool ?? a.pool
      )
    }, i.activation === "enabler" && (i.activation = "passive"), i.roll === void 0 && (i.roll = "none"), i.targetMode === void 0 && (i.targetMode = "none"), i;
  }
}
const Le = Object.freeze({
  minor: 3,
  moderate: 2,
  major: 1
});
class Ir extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      woundCapacities: new d.SchemaField({
        minor: E(Le.minor),
        moderate: E(Le.moderate),
        major: E(Le.major)
      }),
      wounds: new d.SchemaField({
        minor: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] }),
        moderate: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] }),
        major: new d.ArrayField(rt(), { required: !0, nullable: !1, initial: [] })
      }),
      derived: new d.SchemaField({
        capacities: new d.SchemaField({
          minor: E(Le.minor),
          moderate: E(Le.moderate),
          major: E(Le.major)
        }),
        broken: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
      }, { required: !0, nullable: !1, persisted: !1 })
    };
  }
  prepareDerivedData() {
    super.prepareDerivedData(), Object.assign(this.derived.capacities, this.woundCapacities), this.derived.broken = this.wounds.major.length >= this.derived.capacities.major;
  }
}
class $r extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "light",
        choices: [...Fe]
      }),
      // Legacy compatibility only. Effective Armor familiarity is derived from the Character.
      freelyUsed: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      depletion: yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
}
class Vr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: new d.StringField({ required: !0, nullable: !1, initial: "1", blank: !1 }),
      identified: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
      depletion: yi("1d6"),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      uses: E()
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t);
    if (Object.hasOwn(i, "level") && (i.level = String(i.level || "1")), typeof i.depletion == "string") {
      const a = i.depletion.match(/(\d+)\s*(?:in|on)\s*(\d*d\d+(?:\s*[+-]\s*\d+)?)/i), o = a?.[2] ?? "1d6", s = o.match(/^1?d(6|10|20)$/i)?.[1];
      i.depletion = a ? { enabled: !0, die: s ? `d${s}` : "d6", formula: o, threshold: Number(a[1]) } : { enabled: !1, die: "d6", formula: "1d6", threshold: 1 };
    } else if (!t.partial && i.depletion && typeof i.depletion == "object") {
      const a = i.depletion;
      i.depletion = {
        ...a,
        formula: String(a.formula ?? `1${String(a.die ?? "d6")}`)
      };
    }
    return i;
  }
}
class Yr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...Vo] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: ri(),
      armorUse: ri(),
      abilityGrants: new d.ArrayField(kn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(Fo(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Sn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(An(), { required: !0, nullable: !1, initial: [] }),
      genre: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...wr] }),
      customGenreId: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      backgroundOptions: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentNotes: new d.HTMLField({ required: !0, nullable: !1, initial: "" }),
      equipmentBundleUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      instance: Pn()
    };
  }
}
class Dr extends oe {
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
        choices: [...bn]
      }),
      form: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      power: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "low",
        choices: [...wn]
      }),
      identified: new d.BooleanField({ required: !0, nullable: !1, initial: !0 }),
      uses: E(1)
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), a = Object.hasOwn(i, "manifestation"), o = Object.hasOwn(i, "manifest");
    if (a ? i.manifest = i.manifestation === "manifest" : (!t.partial || o) && (i.manifestation = i.manifest === !0 ? "manifest" : "subtle"), !t.partial && !Object.hasOwn(i, "levelOverride")) {
      const s = Number(i.level);
      i.levelOverride = Object.hasOwn(i, "level") && Number.isInteger(s) && s > 1;
    }
    return i;
  }
}
class Fr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      poolBonusChoiceGroups: new d.ArrayField(Pr(), { required: !0, nullable: !1, initial: [] }),
      skillGrants: new d.ArrayField(Sn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(An(), { required: !0, nullable: !1, initial: [] }),
      instance: Pn()
    };
  }
}
class Tr extends oe {
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
function zr() {
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
function Nr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    from: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    to: new d.StringField({ required: !0, nullable: !1, blank: !1 })
  });
}
class Mr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      graph: new d.SchemaField({
        version: E(1, 1),
        nodes: new d.ArrayField(zr(), { required: !0, nullable: !1, initial: [] }),
        connections: new d.ArrayField(Nr(), {
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
    const a = Array.isArray(i.nodes) ? i.nodes : [], o = Array.isArray(i.connections) ? i.connections : [];
    return i.graph = {
      version: Number(i.graphVersion ?? 1),
      nodes: a.map((s) => {
        const r = s, l = r.abilitySnapshot && typeof r.abilitySnapshot == "object" ? r.abilitySnapshot : {}, u = r.position && typeof r.position == "object" ? r.position : {};
        return {
          id: String(r.id ?? ""),
          abilityUuid: String(r.abilitySourceUuid ?? ""),
          abilitySnapshot: {
            name: String(l.name ?? r.title ?? ""),
            description: String(l.description ?? "")
          },
          tier: Number(r.tierRequired ?? 1),
          position: {
            x: typeof u.x == "number" ? u.x : null,
            y: typeof u.y == "number" ? u.y : null
          }
        };
      }),
      connections: o.map((s) => {
        const r = s;
        return {
          id: String(r.id ?? ""),
          from: String(r.from ?? ""),
          to: String(r.to ?? "")
        };
      })
    }, delete i.graphVersion, delete i.startNodeIds, delete i.nodes, delete i.connections, i;
  }
}
const _e = 1, Vt = 6;
class Hn extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreCatalogError";
  }
  code;
}
function zo(n) {
  const e = Number(n);
  if (!Number.isInteger(e) || e < _e || e > Vt)
    throw new Hn(
      "invalid-minimum-tier",
      `Genre Ability Minimum Tier must be an integer from ${_e} to ${Vt}.`
    );
  return e;
}
function Ur(n, e, t) {
  const i = zo(t);
  let a = !1;
  const o = n.map((s) => s.id !== e ? s : (a = !0, { ...s, minimumTier: i }));
  if (!a) throw new Hn("entry-missing", "Genre Ability catalog entry not found.");
  return o;
}
function xr(n, e, t) {
  let i = !1;
  const a = n.map((o) => o.id !== e ? o : (i = !0, { ...o, snapshot: t }));
  if (!i) throw new Hn("entry-missing", "Genre Ability catalog entry not found.");
  return a;
}
function qr(n, e) {
  return n.filter((t) => t.id !== e);
}
function Gr() {
  return new d.SchemaField({
    id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
    abilityUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
    minimumTier: new d.NumberField({
      required: !0,
      nullable: !1,
      integer: !0,
      min: _e,
      max: Vt,
      initial: _e
    }),
    snapshot: ft()
  });
}
class Or extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      abilityCatalog: new d.ArrayField(Gr(), {
        required: !0,
        nullable: !1,
        initial: []
      }),
      options: new d.SchemaField({
        totalEffortCapMode: new d.StringField({
          required: !0,
          nullable: !1,
          initial: "core",
          choices: [...tr]
        })
      }),
      legacyKey: new d.StringField({ required: !0, nullable: !1, initial: "" })
    };
  }
}
class Br extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [..._]
      }),
      defaultPool: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "choose",
        choices: [...co]
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
    const i = super.migrateData(e, t), a = Object.hasOwn(i, "defaultPool");
    return (!t.partial || a) && (i.defaultPool === "" || i.defaultPool === null || i.defaultPool === void 0) && (i.defaultPool = "choose"), i;
  }
}
class Lr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      poolBonuses: new d.SchemaField({ might: E(), speed: E(), intellect: E() }),
      woundBonuses: new d.SchemaField({ minor: E(), moderate: E(), major: E() }),
      edgeGrant: new d.SchemaField({
        mode: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: [...Vo] }),
        pool: new d.StringField({ required: !0, nullable: !1, initial: "none", choices: ["none", "might", "speed", "intellect"] }),
        amount: E(1)
      }),
      weaponUse: ri(),
      armorUse: ri(),
      cypherLimitBonus: E(),
      skillGrants: new d.ArrayField(Sn(), { required: !0, nullable: !1, initial: [] }),
      choiceGroups: new d.ArrayField(An(), { required: !0, nullable: !1, initial: [] }),
      abilityGrants: new d.ArrayField(kn(), { required: !0, nullable: !1, initial: [] }),
      abilityChoiceGroups: new d.ArrayField(Fo(), { required: !0, nullable: !1, initial: [] }),
      descriptorGrants: new d.ArrayField(new d.SchemaField({
        id: new d.StringField({ required: !0, nullable: !1, blank: !1 }),
        descriptorUuid: new d.StringField({ required: !0, nullable: !1, initial: "" }),
        snapshot: ft()
      }), { required: !0, nullable: !1, initial: [] }),
      instance: Pn()
    };
  }
}
class jr extends oe {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "medium",
        choices: [...De]
      }),
      attackType: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "melee",
        choices: [...uo]
      }),
      rangeCategory: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "immediate",
        choices: [...Qi]
      }),
      rangeNotes: new d.StringField({ required: !0, nullable: !1, initial: "" }),
      skillLevel: new d.StringField({
        required: !0,
        nullable: !1,
        initial: "untrained",
        choices: [..._]
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
      depletion: yi(),
      depleted: new d.BooleanField({ required: !0, nullable: !1, initial: !1 }),
      equipped: new d.BooleanField({ required: !0, nullable: !1, initial: !1 })
    };
  }
  static migrateData(e, t = {}) {
    const i = super.migrateData(e, t), a = Object.hasOwn(i, "defaultPool");
    (!t.partial || a) && i.defaultPool !== "none" && !I.includes(i.defaultPool) && (i.defaultPool = "none");
    const o = De.includes(i.category) ? i.category : "medium", s = { light: 2, medium: 4, heavy: 6 }, r = typeof i.damageOverride == "number" ? i.damageOverride : typeof i.damage == "number" ? i.damage : null;
    if (i.bonusDamage === void 0 && r !== null && (i.bonusDamage = Math.max(0, r - s[o])), i.damageOverride = null, i.rangeCategory === void 0 && typeof i.range == "string") {
      const l = i.range;
      i.rangeCategory = Qi.includes(l) ? l : "specified", i.rangeCategory === "specified" && i.rangeNotes === void 0 && (i.rangeNotes = i.range);
    }
    return i;
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    const e = { light: 2, medium: 4, heavy: 6 };
    this.baseDamage = Math.max(0, e[this.category] + this.bonusDamage);
  }
}
function Wr() {
  Object.assign(CONFIG.Actor.dataModels, {
    character: yr,
    npc: br
  }), Object.assign(CONFIG.Item.dataModels, {
    ability: Hr,
    skill: Br,
    weapon: jr,
    armor: $r,
    shield: Ir,
    equipment: Tr,
    cypher: Dr,
    artifact: Vr,
    descriptor: Fr,
    characterType: Yr,
    focus: Mr,
    genre: Or,
    species: Lr
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
const B = "systems/cypherv2/assets", ia = {
  character: `${B}/icons/cypherpc.png`,
  npc: `${B}/icons/cyphernpc.png`
}, na = {
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
}, In = {
  gamePaused: `${B}/ui/cyphergamepaused.png`,
  lobby: `${B}/cypherlobby.png`,
  turnMarker: `${B}/ui/cypherturnmarker.png`
};
function _r(n) {
  return n in ia ? ia[n] : null;
}
function Kr(n) {
  return n in na ? na[n] : null;
}
function Xr(n) {
  if ("prototypeToken.actorLink" in n) return !0;
  const e = n.prototypeToken;
  return !!(e && typeof e == "object" && "actorLink" in e);
}
function Jr(n, e) {
  return n === "character" && !Xr(e);
}
class Qr extends Actor {
  static getDefaultArtwork(e) {
    const t = _r(String(e.type ?? ""));
    return t ? { img: t, texture: { src: t } } : super.getDefaultArtwork(e);
  }
  async _preCreate(e, t, i) {
    const a = await super._preCreate(e, t, i);
    return a === !1 ? !1 : (Jr(this.type, e) && this.prototypeToken.updateSource({ actorLink: !0 }), a);
  }
  /**
   * Rule actions will be delegated to services in later phases.
   * The document shell intentionally contains no roll or wound logic.
   */
}
function Zr(n) {
  return Object.keys(n).some((e) => e === "system.poolBonuses" || e.startsWith("system.poolBonuses.") || e === "system.poolBonusChoiceGroups" || e.startsWith("system.poolBonusChoiceGroups.") || e === "system.instance.selections.poolChoices" || e.startsWith("system.instance.selections.poolChoices.") || e === "system" && typeof n.system == "object" && n.system !== null && ("poolBonuses" in n.system || "poolBonusChoiceGroups" in n.system || "instance" in n.system && typeof n.system.instance == "object" && n.system.instance !== null && "selections" in n.system.instance && typeof n.system.instance.selections == "object" && n.system.instance.selections !== null && "poolChoices" in n.system.instance.selections));
}
function el(n) {
  if (n["system.equipped"] === !0) return !0;
  const e = n.system;
  return !!(e && typeof e == "object" && e.equipped === !0);
}
class tl extends Item {
  static getDefaultArtwork(e) {
    const t = Kr(String(e.type ?? ""));
    return t ? { img: t } : super.getDefaultArtwork(e);
  }
  async update(e, t = {}) {
    const i = this.actor?.type === "character" ? this.actor : null, a = i && (this.type === "characterType" || this.type === "descriptor" || this.type === "species") && Zr(e), o = a ? Object.fromEntries(I.map((l) => [
      l,
      Number(i.system.derived.pools[l].max)
    ])) : null, s = a ? Object.fromEntries(I.map((l) => [
      l,
      Number(i.system.stats[l].value)
    ])) : null, r = await super.update(e, t);
    if (i && (this.type === "shield" || this.type === "armor") && el(e) && t.cypherv2CombatEquipmentSync !== !0 && t.cypherv2ShieldEquipmentSync !== !0)
      for (const l of i.items)
        l.id === this.id || l.type !== this.type || l.system.equipped && await l.update(
          { "system.equipped": !1 },
          { cypherv2CombatEquipmentSync: !0 }
        );
    if (i && o && s) {
      const l = {};
      for (const u of I) {
        const c = Number(i.system.derived.pools[u].max);
        l[`system.stats.${u}.value`] = Ro(s[u], o[u], c);
      }
      await i.update(l, { cypherv2PackagePoolSync: !0 });
    }
    return r;
  }
}
function il() {
  CONFIG.Actor.documentClass = Qr, CONFIG.Item.documentClass = tl;
}
const Xe = 1, zt = 20, $n = 1;
function ht(n) {
  const e = Number(n);
  return Number.isFinite(e) ? Math.min(
    zt,
    Math.max(Xe, Math.trunc(e))
  ) : $n;
}
function nl(n) {
  return Number.isInteger(n) && Number(n) >= Xe && Number(n) <= zt;
}
function No(n) {
  const e = ht(n);
  return e === 1 ? "neutral" : e <= 3 ? "low" : e <= 5 ? "elevated" : e <= 8 ? "severe" : e <= 12 ? "extreme" : e <= 16 ? "catastrophic" : "maximum";
}
function Mo(n) {
  return (ht(n) - Xe) / (zt - Xe) * 100;
}
const N = {
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
function al(n) {
  game.settings.register(S, N.difficultyVisibility, {
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
  }), game.settings.register(S, N.showGmRollAudit, {
    name: "CYPHERV2.Settings.ShowGmRollAudit.Name",
    hint: "CYPHERV2.Settings.ShowGmRollAudit.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(S, N.defaultDifficultyCeiling, {
    name: "CYPHERV2.Settings.DifficultyCeiling.Name",
    hint: "CYPHERV2.Settings.DifficultyCeiling.Hint",
    scope: "world",
    config: !0,
    type: Number,
    default: 10,
    range: { min: 0, max: 15, step: 1 }
  }), game.settings.register(S, N.interfaceHiddenDifficulty, {
    name: "CYPHERV2.Settings.HiddenDifficulty.Name",
    hint: "CYPHERV2.Settings.HiddenDifficulty.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !0
  }), game.settings.register(S, N.enabledRuleModules, {
    scope: "world",
    config: !1,
    type: Array,
    default: []
  }), game.settings.register(S, N.debugRules, {
    name: "CYPHERV2.Settings.DebugRules.Name",
    hint: "CYPHERV2.Settings.DebugRules.Hint",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !1
  }), game.settings.register(S, N.worldSchemaVersion, {
    scope: "world",
    config: !1,
    type: Number,
    default: 1
  }), game.settings.register(S, N.theme, {
    name: "CYPHERV2.Settings.Theme.Name",
    hint: "CYPHERV2.Settings.Theme.Hint",
    scope: "world",
    config: !0,
    type: String,
    choices: n.choices(),
    default: "core",
    onChange: (e) => n.apply(e)
  }), game.settings.register(S, N.horrorIntrusionRange, {
    name: "CYPHERV2.Horror.SettingName",
    hint: "CYPHERV2.Horror.SettingHint",
    scope: "world",
    config: !1,
    type: Number,
    default: $n,
    range: {
      min: Xe,
      max: zt,
      step: 1
    },
    onChange: (e) => Hooks.callAll(
      "cypherv2HorrorIntrusionRangeChanged",
      ht(e)
    )
  }), game.settings.register(S, N.pendingIntrusionXP, {
    scope: "world",
    config: !1,
    type: Array,
    default: [],
    onChange: (e) => Hooks.callAll("cypherv2IntrusionPendingChanged", e)
  });
}
function Ve() {
  const n = Ke();
  return {
    base: {
      difficultyCeiling: Number(
        game.settings.get(S, N.defaultDifficultyCeiling)
      ),
      assetLimit: 0
    },
    enabledRuleModuleIds: n
  };
}
function Ke() {
  const n = game.settings.get(S, N.enabledRuleModules);
  return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
function bi() {
  const n = game.settings.get(S, N.difficultyVisibility);
  return n === "resultOnly" || n === "rollOnly" ? n : "full";
}
function Uo() {
  return game.settings.get(S, N.interfaceHiddenDifficulty) === !0;
}
function wi() {
  return game.settings.get(S, N.showGmRollAudit) === !0;
}
function nn() {
  return typeof game > "u" ? $n : ht(
    game.settings.get(S, N.horrorIntrusionRange)
  );
}
async function ol(n) {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  if (!nl(n))
    throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.InvalidRange"));
  return await game.settings.set(S, N.horrorIntrusionRange, n), n;
}
const Vn = {
  tag: "form",
  form: {
    closeOnSubmit: !1,
    submitOnChange: !0
  }
};
function Yn(n) {
  return n.system.schema.fields;
}
function Dn(n, e) {
  return Object.fromEntries(Object.entries(n).map(([t, i]) => [
    t,
    e.has(t) ? function(...o) {
      if (this.isEditable)
        return i.apply(this, o);
    } : i
  ]));
}
function Fn(n, e, t) {
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
const sl = Object.freeze({ minor: 2, moderate: 5 }), xo = 10;
class rl {
  #e;
  constructor(e) {
    this.#e = e;
  }
  costFor(e) {
    return sl[e];
  }
  canApply(e) {
    try {
      $e(e);
    } catch {
      return !1;
    }
    const { wounds: t, stats: i } = e.system;
    return this.rally(t, i.might.value, "minor").success || this.rally(t, i.might.value, "moderate").success;
  }
  preview(e, t, i = this.costFor(t)) {
    try {
      $e(e);
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
  rally(e, t, i, a, o) {
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
    const s = o ?? this.costFor(i);
    if (!Number.isInteger(s) || s < 0 || s > xo)
      return {
        success: !1,
        severity: i,
        cost: s,
        mightValue: t,
        wounds: e,
        removed: null,
        failure: "invalid-cost"
      };
    const r = this.#e.removeOne(e, i, a);
    return r.removed ? t < s ? {
      success: !1,
      severity: i,
      cost: s,
      mightValue: t,
      wounds: e,
      removed: null,
      failure: "insufficient-might"
    } : {
      success: !0,
      severity: i,
      cost: s,
      mightValue: t - s,
      wounds: r.wounds,
      removed: r.removed,
      failure: null
    } : {
      success: !1,
      severity: i,
      cost: s,
      mightValue: t,
      wounds: r.wounds,
      removed: null,
      failure: "no-wound"
    };
  }
  async apply(e, t, i, a) {
    $e(e);
    const o = this.rally(
      e.system.wounds,
      e.system.stats.might.value,
      t,
      i,
      a
    );
    return o.success && await e.update({
      "system.stats.might.value": o.mightValue,
      "system.wounds": o.wounds
    }), o;
  }
}
function qo(n) {
  return n === "one-action" ? ["normal", "lastAction", "nonRest"] : ["normal", "nonRest"];
}
function ll(n, e) {
  if (!qo(n).includes(e))
    throw new Error(`Recovery mode '${e}' is not available for '${n}'.`);
  return e === "nonRest" ? { kind: "nonRest", lastAction: !1 } : { kind: "normal", lastAction: e === "lastAction" };
}
function St(n, e) {
  return Number(n[e] ?? 0);
}
function Ye(n, e) {
  return String(n[e] ?? "");
}
function aa(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function Me(n) {
  const e = n instanceof Error ? n.message : String(n);
  ui.notifications.error(e);
}
async function Tn(n, e, t = game.i18n.localize("CYPHERV2.Actions.Apply")) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: e,
    rejectClose: !1,
    ok: { label: t }
  });
}
function li(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function cl(n, e, t) {
  const i = n.system.wounds[e].find((o) => o.id === t);
  if (!i) {
    Me(new Error(`Wound '${t}' was not found in ${e} Wounds.`));
    return;
  }
  const a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text" value="${li(i.label)}">
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}
        <textarea name="description">${li(i.description)}</textarea>
      </label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (a)
    try {
      await game.cypherv2.services.wounds.edit(n, e, t, {
        label: Ye(a, "label"),
        description: Ye(a, "description")
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Updated"));
    } catch (o) {
      Me(o);
    }
}
async function dl(n, e, t) {
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
    } catch (a) {
      Me(a);
    }
}
async function ul(n) {
  const e = await Tn(
    game.i18n.localize("CYPHERV2.Actions.ApplyWound"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}
        <select name="severity">
          ${re.map((t) => `<option value="${t}">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${t}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text">
      </label>
    </div>`
  );
  if (e)
    try {
      const t = Ye(e, "label"), i = await game.cypherv2.services.wounds.apply(
        n,
        Ye(e, "severity"),
        t ? { label: t } : {}
      ), a = i.applied ? `${i.appliedSeverity}${i.dead ? ` — ${game.i18n.localize("CYPHERV2.Wounds.Dead")}` : ""}` : game.i18n.localize("CYPHERV2.Wounds.NoFourthMajor");
      ui.notifications.info(a);
    } catch (t) {
      Me(t);
    }
}
async function ml(n) {
  const e = await Tn(
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
        Ye(e, "pool"),
        St(e, "damage")
      );
      ui.notifications.info(
        t.overflowSeverity ? `${t.pool}: ${t.value}; ${t.overflowSeverity} Wound` : `${t.pool}: ${t.value}`
      );
    } catch (t) {
      Me(t);
    }
}
async function oa(n, e) {
  const t = n.system.derived.recovery.availableTypes;
  if (t.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.NoneAvailable"));
    return;
  }
  if (e && !t.includes(e)) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
    return;
  }
  let i = e;
  if (!i) {
    const s = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Recovery.Choose") },
      content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Available")}</span>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Recovery.Choose")}
            <select name="type">${t.map((r) => `<option value="${r}">${game.i18n.localize(`CYPHERV2.Recovery.${r}`)}</option>`).join("")}</select>
          </label>
        </section>
      </div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Next") }
    });
    if (!s) return;
    if (i = Ye(s, "type"), !t.includes(i)) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
      return;
    }
  }
  const a = qo(i), o = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${game.i18n.localize(`CYPHERV2.Recovery.${i}`)}` },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
      <header class="cypherv2-dialog-heading">
        <span>${game.i18n.localize("CYPHERV2.Actions.Recovery")}</span>
        <strong>${game.i18n.localize(`CYPHERV2.Recovery.${i}`)}</strong>
      </header>
      <section class="cypherv2-dialog-section cypherv2-recovery-formula">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Roll")}</span>
        <strong class="cypherv2-dialog-value">${li(n.system.derived.recovery.formula)}</strong>
      </section>
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}</span>
        <div class="cypherv2-dialog-button-group recovery-mode-buttons" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}">
          ${a.map((s) => `<label class="cypherv2-dialog-toggle"><input name="mode" type="radio" value="${s}"${s === "normal" ? " checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Recovery.Kind.${s}`)}</span></label>`).join("")}
        </div>
      </section>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Recovery.Recover") }
  });
  if (o)
    try {
      const s = ll(i, Ye(o, "mode"));
      if (s.kind === "nonRest") {
        await game.cypherv2.services.recovery.completeNonRest(n, i), ui.notifications.info(game.i18n.localize("CYPHERV2.Recovery.NonRestCompleted"));
        return;
      }
      const r = await game.cypherv2.services.recovery.rollNormal(
        n,
        i,
        s.lastAction
      ), l = i === "1-hour" ? `<label>${game.i18n.localize("CYPHERV2.Rest.OneHourChoice")}
          <select name="oneHourChoice">
            <option value="remove-moderate">${game.i18n.localize("CYPHERV2.Rest.RemoveModerate")}</option>
            <option value="remove-minors">${game.i18n.localize("CYPHERV2.Rest.RemoveMinors")}</option>
          </select>
        </label>` : i === "10-hours" ? `<label><input name="exchange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.ExchangeMinor")}</label>
          <label><input name="majorSuccess" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.MajorTaskSuccess")}</label>` : i === "10-minutes" ? `<p>${game.i18n.localize("CYPHERV2.Recovery.TenMinuteBenefit")}</p>` : "", u = await Tn(
        `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${r.total}`,
        `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog cypherv2-recovery-allocation-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Result")}</span>
          <div class="cypherv2-dialog-summary-row"><span>${li(n.system.derived.recovery.formula)}</span><strong>${r.total}</strong></div>
          ${r.lastAction ? `<div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Recovery.Kind.lastAction")}</span><strong>+2</strong></div>` : ""}
        </section>
        <section class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Might")} <input name="might" type="number" value="0" min="0" max="${r.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Speed")} <input name="speed" type="number" value="0" min="0" max="${r.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Intellect")} <input name="intellect" type="number" value="0" min="0" max="${r.total}" step="1"></label>
        </section>
        ${l ? `<section class="cypherv2-dialog-section cypherv2-dialog-fields">${l}</section>` : ""}
      </div>`,
        game.i18n.localize("CYPHERV2.Recovery.Recover")
      );
      if (!u) return;
      const c = await game.cypherv2.services.recovery.completeNormal(
        n,
        r,
        {
          might: St(u, "might"),
          speed: St(u, "speed"),
          intellect: St(u, "intellect")
        },
        {
          oneHourChoice: Ye(u, "oneHourChoice"),
          removeMinorsInsteadOfOneModerate: aa(u, "exchange"),
          majorTaskSucceeded: aa(u, "majorSuccess")
        }
      ), p = r.total - c.recovery.unspent, f = c.rest?.result.removed.length ?? 0;
      ui.notifications.info(
        `${game.i18n.localize("CYPHERV2.Recovery.Restored")}: ${p}; ${game.i18n.localize("CYPHERV2.Rest.Removed")}: ${f}`
      );
    } catch (s) {
      Me(s);
    }
}
async function pl(n) {
  const e = game.cypherv2.services.rally, t = n.system.stats.might.value, i = n.system.derived.pools.might.max, a = e.costFor("minor"), o = e.costFor("moderate"), s = e.preview(n, "minor", a), r = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Actions.Rally") },
    content: fl(
      t,
      i,
      a,
      o,
      s.success ? s.mightValue : null
    ),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Rally") },
    render: (l, u) => hl(u.element, n)
  });
  if (r)
    try {
      const l = await game.cypherv2.services.rally.apply(
        n,
        Ye(r, "severity"),
        void 0,
        St(r, "cost")
      );
      if (!l.success) throw new Error(l.failure ?? "Rally failed.");
      ui.notifications.info(`${game.i18n.localize("CYPHERV2.Actions.Rally")}: -${l.cost} Might`);
    } catch (l) {
      Me(l);
    }
}
function fl(n, e, t = 2, i = 5, a = null) {
  const o = game.i18n.localize("CYPHERV2.Wounds.Severity.minor"), s = game.i18n.localize("CYPHERV2.Wounds.Severity.moderate");
  return `<div class="cypherv2 cypherv2-dialog cypherv2-rally-dialog" data-current-might="${n}" data-max-might="${e}">
    <header class="cypherv2-dialog-heading"><span>${game.i18n.localize("CYPHERV2.Actions.Rally")}</span><strong data-rally-heading>${o}</strong></header>
    <section class="cypherv2-dialog-section">
      <div class="cypherv2-dialog-button-group" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}">
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="minor" data-default-cost="${t}" checked><span>${o}</span></label>
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="moderate" data-default-cost="${i}"><span>${s}</span></label>
      </div>
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Rally.Cost")}
        <input name="cost" type="number" min="0" max="${xo}" step="1" value="${t}">
      </label>
    </section>
    <section class="cypherv2-dialog-section" aria-label="${game.i18n.localize("CYPHERV2.Roll.Summary")}">
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.Cost")}</span><strong><span data-rally-cost>${t}</span> Might</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.CurrentMight")}</span><strong>${n} / ${e}</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.AfterRally")}</span><strong><span data-rally-after>${a ?? "—"}</span> / ${e}</strong></div>
      <p class="cypherv2-dialog-callout is-danger" data-rally-error ${a === null ? "" : "hidden"}>${game.i18n.localize("CYPHERV2.Rally.Unavailable")}</p>
    </section>
  </div>`;
}
function hl(n, e) {
  const t = n.querySelector('input[name="cost"]'), i = [...n.querySelectorAll('input[name="severity"]')], a = n.querySelector("[data-rally-cost]"), o = n.querySelector("[data-rally-after]"), s = n.querySelector("[data-rally-heading]"), r = n.querySelector("[data-rally-error]"), l = n.querySelector('button[data-action="ok"]');
  if (!t) return;
  const u = () => {
    const c = Number(t.value), p = i.find((m) => m.checked)?.value, f = p ? game.cypherv2.services.rally.preview(e, p, c) : null;
    a && (a.textContent = Number.isInteger(c) ? String(c) : "—"), o && (o.textContent = f?.success ? String(f.mightValue) : "—"), r && (r.hidden = f?.success === !0, r.textContent = game.i18n.localize(f?.failure === "insufficient-might" ? "CYPHERV2.Rally.InsufficientMight" : f?.failure === "invalid-cost" ? "CYPHERV2.Rally.InvalidCost" : "CYPHERV2.Rally.NoWound")), l && (l.disabled = f?.success !== !0);
  };
  for (const c of i) c.addEventListener("change", () => {
    c.checked && (t.value = String(Number(c.dataset.defaultCost ?? 0)), s && (s.textContent = c.nextElementSibling?.textContent ?? c.value), u());
  });
  t.addEventListener("input", u), u();
}
async function gl(n, e) {
  const t = en(n.system, e), i = await foundry.applications.api.DialogV2.input({
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
  const a = Number(i.value);
  if (!Number.isInteger(a) || a < t.minimum) {
    Me(new Error(game.i18n.localize("CYPHERV2.Overrides.Invalid")));
    return;
  }
  await n.update({ [t.path]: a });
}
function yl(n) {
  const e = n?.token?.texture?.src;
  if (typeof e == "string" && e.trim()) return e;
  const t = n?.img;
  return typeof t == "string" ? t.trim() : "";
}
function be(n) {
  const e = yl(n), t = n?.system && typeof n.system == "object" ? n.system : null, i = t?.appearance && typeof t.appearance == "object" ? t.appearance : null, a = typeof i?.color == "string" ? i.color : "", o = Io(a), s = Ho(a), r = [
    ...o ? [`--cypherv2-chat-accent: ${o}`] : [],
    ...s ? [`--cypherv2-chat-tint: ${s}`] : []
  ].join("; ");
  return {
    ...e ? { actorImage: e } : {},
    ...r ? { chatCardStyle: r } : {}
  };
}
function bl(n, e = []) {
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
function wl(n) {
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
function $i(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return e.kind === "gm-intrusion" && typeof e.intrusionId == "string" && typeof e.sourceActorId == "string" && (e.mode === "targeted" || e.mode === "group" || e.mode === "free") && (e.status === "pending" || e.status === "resolving" || e.status === "resolved") && Array.isArray(e.recipients);
}
class vl {
  async publish(e, t, i = []) {
    const a = bl(e, i), o = await this.render(a, t);
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(
        t ? { actor: t } : void 0
      ),
      content: o,
      flags: { cypherv2: { gmIntrusion: a } }
    });
  }
  async update(e, t, i) {
    const a = await this.render(t, i);
    await e.update({ content: a, "flags.cypherv2.gmIntrusion": t });
  }
  async render(e, t) {
    return foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/gm-intrusion-card.hbs",
      {
        ...wl(e),
        ...be(t)
      }
    );
  }
}
const bt = "system." + S;
function Yt() {
  return [...game.users];
}
function Go() {
  return Yt().filter((n) => n.active);
}
function Wt() {
  return [...game.actors].filter((n) => n.type === "character").map((n) => n);
}
function Re(n) {
  const e = game.actors.get(n);
  return e?.type === "character" ? e : null;
}
function Vi() {
  return Go().filter((n) => n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function wt(n, e) {
  return Yt().filter((t) => !t.isGM && (!e || t.active)).filter((t) => n.testUserPermission(t, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).sort((t, i) => t.id.localeCompare(i.id));
}
function Yi(n) {
  const e = n.filter((t) => !t.isGM).sort((t, i) => t.id.localeCompare(i.id));
  return e.find((t) => t.active) ?? e[0] ?? null;
}
function _t(n, e) {
  const t = new Set(Yt().filter((a) => !a.isGM).map((a) => a.character?.id).filter((a) => typeof a == "string" && a.length > 0));
  return [...new Map(n.filter((a) => a.type === "character").map((a) => [a.id, a])).values()].filter((a) => a.id !== e).filter((a) => t.has(a.id)).map((a) => ({ actorId: a.id, actorName: a.name, actorImage: a.img ?? "" })).sort((a, o) => a.actorName.localeCompare(o.actorName));
}
function sa(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && typeof e.messageId == "string" && e.messageId.length > 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function Cl(n) {
  if (!n || typeof n != "object") return !1;
  const e = n;
  return typeof e.intrusionId == "string" && e.intrusionId.length > 0 && e.messageId === void 0 && typeof e.sourceActorId == "string" && e.sourceActorId.length > 0 && Number.isInteger(e.amount) && Number(e.amount) > 0 && (e.responderUserId === void 0 || typeof e.responderUserId == "string");
}
function El(n, e) {
  return JSON.stringify(n) === JSON.stringify(e);
}
class Rl {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Map();
  #a = !1;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(bt, (e) => {
      this.#d(e).catch((t) => {
        console.error(S + " | GM Intrusion socket error", t), game.user.isGM && ui.notifications.error(t instanceof Error ? t.message : String(t));
      });
    }), Hooks.on("renderChatMessageHTML", (e, t) => {
      this.#o(e, t);
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
    if (this.#a) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyCreating"));
    this.#a = !0;
    try {
      const t = e.actorIds.map(Re).filter((s) => s !== null), i = Ve();
      let a;
      if (e.mode === "group")
        a = await this.#e.createGroup(t, i.enabledRuleModuleIds ?? []);
      else {
        const s = t[0];
        if (!s) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.ChooseCharacter"));
        a = e.mode === "free" ? await this.#e.createFree(s, 0, i.enabledRuleModuleIds ?? []) : await this.#e.createTargeted(s, i.enabledRuleModuleIds ?? []);
      }
      const o = t[0];
      if (a.mode !== "targeted" || a.sharedXp <= 0 || !o)
        await this.#t.publish(a, o);
      else {
        const s = Yi(wt(o, !1)), r = _t(Wt(), o.id), l = await this.#t.publish(a, o, r), u = {
          intrusionId: a.id,
          messageId: l.id,
          sourceActorId: o.id,
          amount: a.sharedXp,
          ...s ? { responderUserId: s.id } : {}
        };
        await this.#p(u), await this.#l(u, !0);
      }
      return Hooks.callAll("cypherv2GMIntrusionCreated", a), a;
    } finally {
      this.#a = !1;
    }
  }
  async requestFreeFromNaturalResult(e, t) {
    if (!(!t.naturalEffects.some(
      (a) => a.status === "applied" && a.triggersGMIntrusion === !0
    ) || t.naturalRoll === null)) {
      if (this.#m()) {
        await this.#s(e.id, t.naturalRoll);
        return;
      }
      if (!Vi()) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoActiveGM"));
        return;
      }
      game.socket.emit(bt, { type: "create-free", actorId: e.id, naturalRoll: t.naturalRoll });
    }
  }
  async retryPendingDistributions() {
    if (this.#m())
      for (const e of this.#u()) await this.#l(e);
  }
  async requestDistribution(e, t) {
    const i = this.#b(e), a = Re(i.sourceActorId);
    if (!a || !this.#c(a, i))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
    if (this.#m()) {
      await this.#r(e, t, game.user.id);
      return;
    }
    if (!Vi()) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NoActiveGM"));
    const o = Qe();
    await new Promise((s, r) => {
      const l = setTimeout(() => {
        this.#n.delete(o), r(new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RequestTimeout")));
      }, 1e4);
      this.#n.set(o, { resolve: s, reject: r, timeout: l }), game.socket.emit(bt, {
        type: "distribution-choice",
        intrusionId: e,
        recipientActorId: t,
        requesterUserId: game.user.id,
        requestId: o
      });
    });
  }
  async #s(e, t) {
    const i = Re(e);
    if (!i) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
    const a = Ve(), o = await this.#e.createFree(i, t, a.enabledRuleModuleIds ?? []);
    Hooks.callAll("cypherv2GMIntrusionCreated", o);
  }
  #o(e, t) {
    const i = e.getFlag(S, "gmIntrusion");
    if (!$i(i)) return;
    const a = this.#u().find((r) => r.intrusionId === i.intrusionId), o = a ? Re(a.sourceActorId) : null, s = i.status === "pending" && (game.user.isGM || !!(a && o && this.#c(o, a)));
    for (const r of t.querySelectorAll("[data-action='assignSharedIntrusionXp']")) {
      if (!s) {
        r.remove();
        continue;
      }
      r.dataset.cypherv2IntrusionBound !== "true" && (r.dataset.cypherv2IntrusionBound = "true", r.addEventListener("click", (l) => {
        l.preventDefault(), l.stopPropagation();
        const u = r.dataset.recipientActorId;
        !u || r.disabled || (r.disabled = !0, this.requestDistribution(i.intrusionId, u).catch((c) => {
          r.disabled = !1, ui.notifications.error(c instanceof Error ? c.message : String(c));
        }));
      }));
    }
  }
  #c(e, t) {
    return game.user.isGM ? !0 : game.user.id === t.responderUserId && e.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  }
  async #l(e, t = !1) {
    const i = Re(e.sourceActorId), a = game.messages.get(e.messageId);
    if (!i || !a) {
      await this.#f(e.intrusionId);
      return;
    }
    let o = e.responderUserId ? Yt().find((l) => l.id === e.responderUserId) ?? null : null;
    (!o || !wt(i, !1).some((l) => l.id === o?.id)) && (o = Yi(wt(i, !1)), o && (e = { ...e, responderUserId: o.id }, await this.#p(e)));
    const s = a.getFlag(S, "gmIntrusion");
    if (!$i(s) || s.status !== "pending") return;
    const r = _t(Wt(), i.id);
    (t || !El(s.recipients, r)) && await this.#t.update(a, { ...s, recipients: r }, i);
  }
  async #r(e, t, i) {
    if (this.#i.has(e))
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    this.#i.add(e);
    let a = !1, o = null, s = null, r = null;
    try {
      const l = this.#b(e);
      r = Re(l.sourceActorId);
      const u = Re(t);
      if (s = game.messages.get(l.messageId) ?? null, !r || !u || !s)
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
      const c = s.getFlag(S, "gmIntrusion");
      if (!$i(c) || c.intrusionId !== e || c.status !== "pending")
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
      o = c;
      const p = Go().find((g) => g.id === i);
      if (!(p?.isGM === !0 || !!(p && p.id === l.responderUserId && wt(r, !0).some((g) => g.id === p.id)))) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
      const b = _t(Wt(), r.id).find((g) => g.actorId === u.id);
      if (!b) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable"));
      await this.#t.update(s, { ...c, status: "resolving" }, r), await this.#e.distributeSecondXp(r, u, l.amount), a = !0, await this.#f(e), await this.#t.update(s, {
        ...c,
        status: "resolved",
        recipients: [],
        resolvedRecipient: b
      }, r), Hooks.callAll("cypherv2GMIntrusionXPDistributed", e, r, u);
    } catch (l) {
      throw !a && o && s && r && await this.#t.update(s, o, r), l;
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
      if (e.type === "create-free") await this.#s(e.actorId, e.naturalRoll);
      else if (e.type === "distribution-choice")
        try {
          await this.#r(e.intrusionId, e.recipientActorId, e.requesterUserId), game.socket.emit(bt, {
            type: "distribution-result",
            requestId: e.requestId,
            recipientUserId: e.requesterUserId,
            success: !0
          });
        } catch (t) {
          throw game.socket.emit(bt, {
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
    const e = game.settings.get(S, N.pendingIntrusionXP);
    return Array.isArray(e) ? e.filter(sa).map((t) => ({
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
    const t = this.#u(), i = t.findIndex((a) => a.intrusionId === e.intrusionId);
    i < 0 ? t.push(e) : t[i] = e, await game.settings.set(S, N.pendingIntrusionXP, t);
  }
  async #f(e) {
    await game.settings.set(
      S,
      N.pendingIntrusionXP,
      this.#u().filter((t) => t.intrusionId !== e)
    );
  }
  async #y() {
    const e = game.settings.get(S, N.pendingIntrusionXP), t = [];
    for (const i of Array.isArray(e) ? e : []) {
      if (sa(i)) {
        Re(i.sourceActorId) && game.messages.get(i.messageId) && t.push({
          intrusionId: i.intrusionId,
          messageId: i.messageId,
          sourceActorId: i.sourceActorId,
          amount: i.amount,
          ...i.responderUserId ? { responderUserId: i.responderUserId } : {}
        });
        continue;
      }
      if (!Cl(i)) continue;
      const a = Re(i.sourceActorId), o = [...game.messages].find(
        (u) => u.getFlag(S, "gmIntrusionId") === i.intrusionId
      );
      if (!a || !o) continue;
      const s = i.responderUserId ? Yt().find((u) => u.id === i.responderUserId) : Yi(wt(a, !1)), r = this.#e.policy(Ve().enabledRuleModuleIds ?? []), l = {
        kind: "gm-intrusion",
        intrusionId: i.intrusionId,
        mode: "targeted",
        sourceActorId: a.id,
        sourceActorName: a.name,
        targetXp: r.targetedXpToTarget,
        sharedXp: i.amount,
        status: "pending",
        recipients: _t(Wt(), a.id)
      };
      await this.#t.update(o, l, a), t.push({
        intrusionId: i.intrusionId,
        messageId: o.id,
        sourceActorId: i.sourceActorId,
        amount: i.amount,
        ...s ? { responderUserId: s.id } : {}
      });
    }
    (!Array.isArray(e) || JSON.stringify(e) !== JSON.stringify(t)) && await game.settings.set(S, N.pendingIntrusionXP, t);
  }
  #m() {
    return game.user.isGM && Vi()?.id === game.user.id;
  }
}
let At = null;
function Pl(n, e) {
  return At = new Rl(n, e), At.initialize(), At;
}
function Nt() {
  if (!At) throw new Error("GM Intrusion controller is not ready.");
  return At;
}
async function zn(n, e) {
  await game.cypherv2.services.rollChat.publish(n, e, bi(), {
    showGmAudit: wi()
  }), await Nt().requestFreeFromNaturalResult(n, e.result);
}
function we(n, e) {
  if (!Number.isFinite(e)) throw new Error("Step modifier amount must be finite.");
  const t = Math.abs(Math.trunc(e));
  return t === 0 ? "0" : `${n === "ease" ? "+" : "-"}${t}`;
}
function kl(n) {
  if (!Number.isFinite(n)) throw new Error("Net step modifier must be finite.");
  return n === 0 ? "0" : we(n > 0 ? "ease" : "hinder", n);
}
const ra = /* @__PURE__ */ new Set([
  "manual.skill",
  "manual.other-ease",
  "manual.other-hindrance",
  "core.assets",
  "core.effort.paid",
  "core.effort.free"
]);
function Je(n) {
  return String(n).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function Nn(n) {
  return game.i18n.localize(n);
}
function Mn(n, e) {
  return e(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function la(n, e) {
  return e.context.difficulty.mode === "hidden" && n.id.startsWith("npc-modification.");
}
function ca(n, e) {
  return {
    id: n.id,
    label: e(n.label),
    modifier: we(n.direction, n.steps),
    direction: n.direction
  };
}
function Sl(n, e, t) {
  const i = n.breakdown.filter((c) => la(c, n)), a = n.breakdown.filter((c) => !la(c, n)), o = a.filter((c) => ra.has(c.id)).map((c) => ca(c, t)), s = a.filter((c) => !ra.has(c.id)).map((c) => ca(c, t)), r = n.context.difficulty.mode === "known", l = n.context.pool;
  if (l === null) throw new Error("Configured rolls require a Pool.");
  const u = e.system.stats[l].value;
  return {
    rollLabel: t(n.context.label),
    pool: l,
    poolLabel: Mn(l, t),
    modifiers: o,
    automaticModifiers: s,
    netModifier: i.length === 0 ? kl(n.netSteps) : null,
    hiddenModifierCount: i.length,
    difficultyMode: n.context.difficulty.mode,
    baseDifficulty: r ? n.context.difficulty.value : null,
    finalDifficulty: r ? n.finalDifficulty : null,
    targetNumber: r ? n.targetNumber : null,
    automaticSuccess: r && n.finalDifficulty === 0,
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
function da(n) {
  const e = {};
  for (const t of n.querySelectorAll("[name]"))
    e[t.name] = t instanceof HTMLInputElement && t.type === "checkbox" ? t.checked : t.value;
  return e;
}
function te(n, e) {
  return String(n[e] ?? "");
}
function U(n, e) {
  return Number(n[e] ?? 0);
}
function Al(n, e) {
  const t = n[e];
  return t === !0 || t === "true" || t === "on";
}
function Mt(n, e) {
  const t = te(n, "difficulty").trim();
  return t ? {
    mode: Al(n, "hidden") ? "hidden" : "known",
    value: Number(t)
  } : { mode: "unknown" };
}
function Ut(n) {
  const e = U(n, "situationalSteps");
  return te(n, "situationalDirection") === "hinder" ? { otherEase: 0, otherHindrance: e } : { otherEase: e, otherHindrance: 0 };
}
function ce(n, e = 0) {
  return Array.from({ length: n + 1 }, (t, i) => `<option value="${i}"${i === e ? " selected" : ""}>${i}</option>`).join("");
}
function Oo(n) {
  return ["might", "speed", "intellect"].map((e) => `<option value="${e}"${e === n ? " selected" : ""}>${Je(Mn(e, Nn))}</option>`).join("");
}
const Hl = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function at(n) {
  return Hl[n];
}
function Un(n = 0, e = "") {
  return _.map((t) => {
    const i = at(t), a = game.i18n.localize(`CYPHERV2.Skill.Ranks.${t}`), o = i === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : we(i > 0 ? "ease" : "hinder", i);
    return `<option value="${e}${i}"${n !== null && i === n ? " selected" : ""}>${Je(a)} · ${o}</option>`;
  }).join("");
}
function xt() {
  return `<div class="roll-dialog-inline-field roll-dialog-situational">
    <span class="roll-dialog-field-label">${game.i18n.localize("CYPHERV2.Roll.SituationalModifier")}</span>
    <select name="situationalDirection" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierDirection")}">
      <option value="ease">${game.i18n.localize("CYPHERV2.Roll.Ease")}</option>
      <option value="hinder">${game.i18n.localize("CYPHERV2.Roll.Hinder")}</option>
    </select>
    <input name="situationalSteps" type="number" value="0" min="0" max="10" step="1" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierSteps")}">
  </div>`;
}
function qt(n, e) {
  return `<div class="roll-dialog-inline-field roll-dialog-difficulty-field">
    <label>${game.i18n.localize("CYPHERV2.Roll.BaseDifficulty")}
      <input name="difficulty" type="number" min="0" max="${n}" step="1" placeholder="${game.i18n.localize("CYPHERV2.Roll.Optional")}">
    </label>
    ${e ? `<label class="roll-dialog-checkbox"><input name="hidden" type="checkbox"> ${game.i18n.localize("CYPHERV2.Roll.HiddenDifficulty")}</label>` : ""}
  </div>`;
}
function Gt(n) {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-dialog-fields cypherv2-roll-dialog">
    <div class="roll-dialog-layout">
      <section class="roll-dialog-settings" aria-labelledby="cypherv2-roll-settings-heading">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-settings-heading">${game.i18n.localize("CYPHERV2.Roll.Settings")}</span>
          <strong>${Je(n.identity)}</strong>
        </header>
        <div class="roll-dialog-settings-grid">${n.settings}</div>
      </section>
      <aside class="roll-dialog-summary" aria-labelledby="cypherv2-roll-summary-heading" aria-live="polite">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-summary-heading">${game.i18n.localize("CYPHERV2.Roll.Summary")}</span>
          <strong data-roll-summary="label">${Je(n.identity)}</strong>
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
function Z(n, e, t = "") {
  return `<div class="roll-summary-row ${t}"><span>${Je(n)}</span><strong>${Je(e)}</strong></div>`;
}
function ua(n) {
  return n.length === 0 ? `<p class="roll-summary-empty">${game.i18n.localize("CYPHERV2.Common.None")}</p>` : n.map((e) => Z(
    e.label,
    e.modifier,
    e.direction === "ease" ? "is-ease" : "is-hindrance"
  )).join("");
}
function Ue(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.innerHTML = t);
}
function Ct(n, e, t) {
  const i = n.querySelector(`[data-roll-summary="${e}"]`);
  i && (i.textContent = t);
}
function Il(n, e, t) {
  Ct(n, "label", e.rollLabel), Ct(n, "pool", e.poolLabel), Ue(n, "modifiers", ua(e.modifiers)), Ct(n, "net", e.netModifier ?? game.i18n.localize("CYPHERV2.Roll.HiddenValue"));
  const i = n.querySelector('[data-roll-summary-section="automatic"]');
  i && (i.hidden = e.automaticModifiers.length === 0), Ue(n, "automatic", ua(e.automaticModifiers));
  const a = n.querySelector('[data-roll-summary-section="effort"]');
  a && (a.hidden = e.totalEffortApplied === 0), Ue(n, "effort", [
    Z(
      game.i18n.localize("CYPHERV2.Roll.PaidAppliedEffort"),
      `${e.paidEffortApplied} / ${e.effortMaximum}`
    ),
    Z(game.i18n.localize("CYPHERV2.Roll.FreeAppliedEffort"), String(e.freeEffortApplied)),
    Z(
      game.i18n.localize("CYPHERV2.Roll.TotalAppliedEffort"),
      e.totalEffortMaximum === null ? `${e.totalEffortApplied} / ${game.i18n.localize("CYPHERV2.Genre.Unlimited")}` : `${e.totalEffortApplied} / ${e.totalEffortMaximum}`,
      e.totalEffortMaximum !== null && e.totalEffortApplied === e.totalEffortMaximum ? "is-total" : ""
    )
  ].join(""));
  const o = e.difficultyMode === "hidden" ? Z(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.HiddenValue")) : e.difficultyMode === "unknown" ? Z(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.NotProvided")) : [
    Z(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), String(e.baseDifficulty)),
    Z(
      game.i18n.localize("CYPHERV2.Roll.FinalDifficulty"),
      e.automaticSuccess ? game.i18n.localize("CYPHERV2.Roll.AutomaticSuccess") : String(e.finalDifficulty)
    ),
    Z(game.i18n.localize("CYPHERV2.Roll.TargetNumber"), String(e.targetNumber))
  ].join("");
  Ue(n, "difficulty", o);
  const s = n.querySelector('[data-roll-summary-section="attack"]');
  s && t !== void 0 && (s.hidden = !t, Ue(n, "attack", t));
  const r = [
    ...e.actionCost > 0 ? [Z(game.i18n.localize("CYPHERV2.Roll.ActionCost"), String(e.actionCost))] : [],
    ...e.effortCost > 0 ? [Z(game.i18n.localize("CYPHERV2.Roll.EffortCost"), String(e.effortCost))] : [],
    ...e.edgeApplied > 0 ? [Z(game.i18n.localize("CYPHERV2.Roll.EdgeApplied"), `-${e.edgeApplied}`)] : [],
    Z(game.i18n.localize("CYPHERV2.Roll.TotalCost"), `${e.totalCost} ${e.poolLabel}`, "is-total"),
    Z(game.i18n.localize("CYPHERV2.Roll.PoolAfterRoll"), `${e.poolValue} → ${e.poolAfter}`)
  ];
  Ue(n, "cost", r.join(""));
  const l = ["might", "speed", "intellect"].map((u) => {
    const c = e.pool === u ? e.poolAfter : null, p = e.pool === u ? e.poolValue : null, f = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}`], m = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Max`], b = n.dataset[`pool${u[0].toUpperCase()}${u.slice(1)}Edge`];
    return `<div class="roll-summary-pool${e.pool === u ? " is-selected" : ""}">
      <span>${Je(Mn(u, Nn))}</span>
      <strong>${p === null ? f : `${p} → ${c}`} / ${m}</strong>
      <small>${game.i18n.localize("CYPHERV2.Pools.Edge")} ${b}</small>
    </div>`;
  }).join("");
  Ue(n, "character", `${l}<div class="roll-summary-effort"><span>${game.i18n.localize("CYPHERV2.Character.Effort")}</span><strong>${e.effortUsed} / ${e.effortMaximum}</strong></div>`), Ct(n, "error", e.poolValue < e.totalCost ? game.i18n.localize("CYPHERV2.Roll.InsufficientPool") : "");
}
function Ot(n, e) {
  for (const i of ["might", "speed", "intellect"]) {
    const a = `pool${i[0].toUpperCase()}${i.slice(1)}`;
    n.dataset[a] = String(e.actor.system.stats[i].value), n.dataset[`${a}Max`] = String(e.actor.system.derived.pools[i].max), n.dataset[`${a}Edge`] = String(e.actor.system.derived.pools[i].edge);
  }
  const t = () => {
    try {
      const i = e.buildRequest(da(n)), a = game.cypherv2.services.rolls.preview(e.actor, i, e.policyRequest);
      Il(
        n,
        Sl(a, e.actor, Nn),
        e.attackSummary?.(da(n), a)
      );
    } catch (i) {
      Ct(n, "error", i instanceof Error ? i.message : String(i));
    }
  };
  return n.addEventListener("input", t), n.addEventListener("change", t), t(), t;
}
function ma(n) {
  return {
    label: "CYPHERV2.Roll.TaskRoll",
    pool: te(n, "pool"),
    difficulty: Mt(n),
    skillSteps: U(n, "skillSteps"),
    assets: U(n, "assets"),
    paidEffort: U(n, "paidEffort"),
    freeEffort: U(n, "freeEffort"),
    ...Ut(n),
    purpose: "task"
  };
}
function $l(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
async function Vl(n, e = "might") {
  const t = Ve(), i = game.cypherv2.rules.resolveDifficultyPolicy(
    t.base,
    t.enabledRuleModuleIds ?? []
  ), a = `
    ${qt(i.difficultyCeiling, Uo())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
      <select name="pool">${Oo(e)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}
      <select name="skillSteps">${Un()}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}
      <select name="assets">${ce(i.assetLimit)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}
      <select name="paidEffort">${ce(n.system.derived.effort.max)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}
      <input name="freeEffort" type="number" value="0" min="0" step="1">
    </label>
    ${xt()}`, o = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Roll.TaskRoll"), resizable: !0 },
    position: { width: 800 },
    content: Gt({
      identity: `${n.name} · ${game.i18n.localize("CYPHERV2.Roll.Task")}`,
      settings: a
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (s, r) => {
      Ot(r.element, {
        actor: n,
        policyRequest: t,
        buildRequest: ma
      });
    }
  });
  if (o)
    try {
      const s = await game.cypherv2.services.rolls.execute(
        n,
        ma(o),
        t
      );
      await zn(n, s);
    } catch (s) {
      $l(s);
    }
}
function Di(n, e) {
  return n === e ? " selected" : "";
}
function Yl(n, e) {
  const t = te(n, "skillRank");
  return _.includes(t) ? t : e;
}
function pa(n, e, t) {
  const i = te(e, "pool");
  return game.cypherv2.services.skills.buildRollRequest(n, {
    ...i === "might" || i === "speed" || i === "intellect" ? { pool: i } : {},
    rankOverride: Yl(e, n.system.rank),
    difficulty: Mt(e),
    assets: U(e, "assets"),
    paidEffort: U(e, "paidEffort"),
    freeEffort: U(e, "freeEffort"),
    ...Ut(e),
    enabledRuleModuleIds: t
  });
}
async function Dl(n, e) {
  const t = Ve(), i = t.enabledRuleModuleIds ?? [], a = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), o = game.cypherv2.services.skills.configuredPool(e) ?? "choose", s = `
    ${o === "choose" ? `<option value="" selected disabled>${game.i18n.localize("CYPHERV2.Skill.ChoosePool")}</option>` : ""}
    <option value="might"${Di(o, "might")}>${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
    <option value="speed"${Di(o, "speed")}>${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
    <option value="intellect"${Di(o, "intellect")}>${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>`, r = _.map((c) => `<option value="${c}"${c === e.system.rank ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${c}`)} · ${at(c) === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : at(c) > 0 ? `+${at(c)}` : at(c)}</option>`).join(""), l = `
    ${qt(a.difficultyCeiling, Uo())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${s}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillRank">${r}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ce(a.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ce(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${xt()}`, u = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Skill.Roll")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Gt({ identity: e.name, settings: l }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (c, p) => {
      Ot(p.element, {
        actor: n,
        policyRequest: t,
        buildRequest: (f) => pa(e, f, i)
      });
    }
  });
  if (u)
    try {
      const c = pa(e, u, i), p = await game.cypherv2.services.rolls.execute(n, c, t);
      await zn(n, p);
    } catch (c) {
      ui.notifications.error(c instanceof Error ? c.message : String(c));
    }
}
function ci(n) {
  const e = n.token, t = n.tokenId ?? e?.id, i = n.tokenUuid ?? e?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...t ? { tokenId: t } : {},
    ...i ? { tokenUuid: i } : {}
  };
}
function Dt(n, e) {
  return Object.assign(Object.create(n), {
    ...e.actorUuid ? { actorUuid: e.actorUuid } : {},
    ...e.tokenId ? { tokenId: e.tokenId } : {},
    ...e.tokenUuid ? { tokenUuid: e.tokenUuid } : {},
    update: n.update.bind(n),
    testUserPermission: n.testUserPermission.bind(n)
  });
}
function Bo(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "npc" ? null : Dt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function Lo(n) {
  const e = n.document ?? n, t = n.actor ?? e.actor ?? null;
  return !(t instanceof Actor) || t.type !== "character" ? null : Dt(t, {
    actorId: t.id,
    actorUuid: t.uuid,
    ...e.id ? { tokenId: e.id } : {},
    ...e.uuid ? { tokenUuid: e.uuid } : {}
  });
}
function an(n) {
  if (n.tokenId) {
    const e = canvas.tokens?.get(n.tokenId)?.actor;
    return e instanceof Actor ? e : null;
  }
  return n.tokenUuid ? null : game.actors.get(n.actorId) ?? null;
}
async function on(n) {
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
  return n.tokenId || n.tokenUuid ? null : an(n);
}
function Fl(n, e) {
  return String(n[e] ?? "");
}
function jo(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function Wo(n, e = "manual:0") {
  const t = e.startsWith("manual:") ? Number(e.slice(7)) : null;
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${Un(t, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...jo(n).map((i) => `<option value="${i.id}"${i.id === e ? " selected" : ""}>${i.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${i.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function _o(n, e) {
  return jo(n).find((t) => t.id === e);
}
function Ko(n) {
  const e = te(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function Tl(n, e) {
  const t = e === "dodge";
  return {
    pool: t ? "speed" : "might",
    armorDirection: t ? "hinder" : "ease",
    armorSteps: t ? n.system.derived.combat.armor.dodgeHindrance : n.system.derived.combat.armor.blockEase
  };
}
async function Xo(n) {
  if (!n.flatMap((a) => a.execution.result.naturalEffects).find((a) => a.status === "available")) return null;
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
  return i && Fl(i, "choice") === "damage" ? "damage" : "effect";
}
async function zl(n, e) {
  const t = Ve(), i = t.enabledRuleModuleIds ?? [], a = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), o = game.cypherv2.services.combat.policy(i), s = game.cypherv2.services.targets.nativeNpcTargets(), l = s.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${s.map((y) => y.name).join(", ")}</span><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : qt(a.difficultyCeiling, !0), u = game.cypherv2.services.combat.weaponAttackPool(e), c = `manual:${at(e.system.skillLevel ?? "untrained")}`, p = (y) => {
    const v = _o(n, te(y, "skillId"));
    return {
      pool: te(y, "pool"),
      targets: s,
      difficulty: Mt(y),
      ...v ? { skill: v } : {},
      skillSteps: Ko(y),
      assets: U(y, "assets"),
      paidEffort: U(y, "paidEffort"),
      damageEffort: U(y, "damageEffort"),
      freeDamageEffort: U(y, "freeDamageEffort"),
      freeEffort: U(y, "freeEffort"),
      ...Ut(y),
      extremeRange: te(y, "extremeRange") === "true" || y.extremeRange === !0 || y.extremeRange === "on",
      enabledRuleModuleIds: i
    };
  }, f = (y) => {
    const v = game.cypherv2.services.combat.buildWeaponAttackPlan(n, e, p(y)).requests[0];
    if (!v) throw new Error("Weapon attack preview did not produce a roll request.");
    return v;
  }, m = game.cypherv2.services.combat.weaponBaseDamage(e, o), b = `
    ${l}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${Oo(u)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${Wo(n, c)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ce(a.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ce(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${ce(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${xt()}
    ${e.system.attackType === "ranged" ? `<label class="roll-dialog-checkbox"><input name="extremeRange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</label>` : ""}`, g = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Combat.Attack")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Gt({ identity: e.name, settings: b, attackSummary: " " }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Combat.Attack") },
    render: (y, v) => {
      Ot(v.element, {
        actor: n,
        policyRequest: t,
        buildRequest: f,
        attackSummary: (k, P) => [
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${m}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${P.context.damageEffort ?? 0}</strong></div>`,
          ...(P.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${P.context.freeDamageEffort}</strong></div>`] : [],
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${P.damageEffortApplied}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${o.damageEffortBonus}</strong></div>`,
          ...e.system.rangeCategory !== "immediate" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${game.i18n.localize(`CYPHERV2.Combat.Range.${e.system.rangeCategory}`)}</strong></div>`] : [],
          ...te(k, "extremeRange") === "true" || k.extremeRange === !0 ? [`<div class="roll-summary-row is-hindrance"><span>${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</span><strong>-1</strong></div>`] : []
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
      const v = await Xo(y);
      v && (y = game.cypherv2.services.combat.chooseAttackOutcomes(
        y,
        v,
        i
      ));
      for (const P of y)
        await game.cypherv2.services.combatChat.publishWeaponAttack(
          n,
          P,
          bi(),
          wi()
        );
      const k = y[0];
      k && await Nt().requestFreeFromNaturalResult(n, k.execution.result);
    } catch (y) {
      ui.notifications.error(y instanceof Error ? y.message : String(y));
    }
}
async function sn(n, e, t) {
  if (e === "blockWithShield")
    try {
      const m = await game.cypherv2.services.shields.normalizeEquipped(n);
      if (!m || game.cypherv2.services.shields.isBroken(m))
        return ui.notifications.warn(game.i18n.localize("CYPHERV2.Shield.BlockUnavailable")), !1;
    } catch (m) {
      return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
    }
  const i = Ve(), a = i.enabledRuleModuleIds ?? [], o = game.cypherv2.rules.resolveDifficultyPolicy(i.base, a), s = t ? `<div class="roll-dialog-context"><strong>${t.source.name} → ${n.name}</strong><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>` : qt(o.difficultyCeiling, !0), r = game.cypherv2.services.combat.applicableDefenseSkills(
    n,
    e,
    a
  )[0], l = Tl(n, e), u = (m) => {
    const b = _o(n, te(m, "skillId"));
    return {
      ...b ? { skill: b } : {},
      skillSteps: Ko(m),
      assets: U(m, "assets"),
      paidEffort: U(m, "paidEffort"),
      freeEffort: U(m, "freeEffort"),
      ...Ut(m),
      enabledRuleModuleIds: a
    };
  }, c = (m) => t ? game.cypherv2.services.combat.buildDefenseAgainstNpcRequest(
    n,
    t.source,
    e,
    u(m)
  ) : game.cypherv2.services.combat.buildDefenseRequest(n, e, {
    ...u(m),
    difficulty: Mt(m)
  }), p = `
    ${s}
    <div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${l.pool === "speed" ? "Speed" : "Might"}`)}</span></div>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${Wo(n, r?.id)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ce(o.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ce(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${xt()}`, f = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`), resizable: !0 },
    position: { width: 800 },
    content: Gt({
      identity: game.i18n.localize(`CYPHERV2.Combat.Defense.${e}`),
      settings: p
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (m, b) => {
      Ot(b.element, { actor: n, policyRequest: i, buildRequest: c });
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
      a
    ) : null) ?? {
      recipient: "none",
      severity: "none"
    };
    return await game.cypherv2.services.combatChat.publishDefense(
      n,
      b,
      y,
      t?.source ?? null,
      bi(),
      wi()
    ), await Nt().requestFreeFromNaturalResult(n, b.result), !0;
  } catch (m) {
    return ui.notifications.error(m instanceof Error ? m.message : String(m)), !1;
  }
}
async function Nl(n) {
  if (!game.user.isGM) return;
  const e = [...game.user.targets ?? []].map((i) => Lo(i)).filter((i) => i !== null).map((i) => i);
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
async function di(n) {
  try {
    const e = await game.cypherv2.services.depletion.roll(n);
    await game.cypherv2.services.depletionChat.publish(n, e);
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
const fa = 2, ha = 1e3;
function Ft(n) {
  const e = String(n.die).trim().match(/^d(\d+)$/i), t = Number(e?.[1]);
  if (!Number.isInteger(t) || t < fa || t > ha)
    throw new Error(`Depletion die must have ${fa} to ${ha} sides.`);
  return t;
}
function Ml(n) {
  return `1d${Ft(n)}`;
}
function Fi(n) {
  const e = Ft(n), t = Number(n.threshold);
  if (!Number.isInteger(t) || t < 1 || t > e)
    throw new Error(`Depletion threshold must be between 1 and ${e}.`);
  return `${Jo(t)} in 1d${e}`;
}
function Jo(n) {
  return n === 1 ? "1" : `1-${n}`;
}
function Ul(n) {
  const e = [...n.querySelectorAll(
    ".cypherv2-sheet.cypherv2-character > .tab[data-tab]"
  )], t = e.find((a) => a.classList.contains("active")), i = [...n.querySelectorAll(
    "details[data-persistent-disclosure]"
  )];
  return {
    activeTab: t?.dataset.tab ?? "skills",
    tabScroll: Object.fromEntries(e.map((a) => [a.dataset.tab ?? "", a.scrollTop])),
    disclosures: Object.fromEntries(i.map((a) => [
      a.dataset.persistentDisclosure ?? "",
      a.open
    ]))
  };
}
function xl(n, e) {
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
function ql(n) {
  return n.replace(/[&<>'"]/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[e]);
}
async function Qo(n, e) {
  const t = n.system.graph.nodes.find((s) => s.id === e);
  if (!t) throw new Error(`Focus node '${e}' was not found.`);
  if (t.abilityUuid)
    try {
      const s = await fromUuid(t.abilityUuid);
      if (s?.sheet) {
        await s.sheet.render(!0);
        return;
      }
    } catch {
    }
  const i = t.abilitySnapshot.name || t.id, a = ql(i), o = t.abilitySnapshot.description || game.i18n.localize("CYPHERV2.Focus.MissingAbility");
  await foundry.applications.api.DialogV2.input({
    window: { title: i },
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-focus-snapshot"><h3>${a}</h3><div>${o}</div></div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Close") }
  });
}
function ga(n, e) {
  return {
    left: n.left - e.left,
    top: n.top - e.top,
    width: n.width,
    height: n.height
  };
}
function Gl(n, e) {
  const t = {
    x: n.left + n.width / 2,
    y: n.top + n.height / 2
  }, i = {
    x: e.left + e.width / 2,
    y: e.top + e.height / 2
  }, a = i.x - t.x, o = i.y - t.y;
  if (a === 0 && o === 0) return {
    x1: t.x,
    y1: t.y,
    x2: i.x,
    y2: i.y
  };
  const s = (u) => Math.min(
    a === 0 ? Number.POSITIVE_INFINITY : u.width / 2 / Math.abs(a),
    o === 0 ? Number.POSITIVE_INFINITY : u.height / 2 / Math.abs(o)
  ), r = s(n), l = s(e);
  return {
    x1: t.x + a * r,
    y1: t.y + o * r,
    x2: i.x - a * l,
    y2: i.y - o * l
  };
}
function Ol(n) {
  const e = n.querySelector(".focus-tree-canvas"), t = e?.querySelector(".focus-tree-connections");
  if (!e || !t) return;
  const i = e.getBoundingClientRect(), a = i.width, o = i.height;
  if (a <= 0 || o <= 0) return;
  t.setAttribute("width", String(a)), t.setAttribute("height", String(o)), t.setAttribute("viewBox", `0 0 ${a} ${o}`);
  const s = /* @__PURE__ */ new Map();
  for (const r of e.querySelectorAll(".focus-tree-node[data-node-id]")) {
    const l = r.dataset.nodeId;
    l && s.set(l, r);
  }
  for (const r of t.querySelectorAll("line[data-from][data-to]")) {
    const l = s.get(r.dataset.from ?? ""), u = s.get(r.dataset.to ?? "");
    if (!l || !u) continue;
    const c = Gl(
      ga(l.getBoundingClientRect(), i),
      ga(u.getBoundingClientRect(), i)
    );
    r.setAttribute("x1", String(c.x1)), r.setAttribute("y1", String(c.y1)), r.setAttribute("x2", String(c.x2)), r.setAttribute("y2", String(c.y2));
  }
}
class Zo {
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
    for (const e of this.#i) Ol(e);
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
function Bl(n, e, t, i = 8) {
  const a = n.right + i, o = a + e.width <= t.width - i ? a : n.left - e.width - i;
  return {
    left: Math.max(i, Math.min(o, t.width - e.width - i)),
    top: Math.max(i, Math.min(n.top, t.height - e.height - i))
  };
}
class es {
  #e = null;
  #t = null;
  #i = null;
  bind(e) {
    this.disconnect();
    const t = new AbortController();
    this.#e = t;
    const i = (o) => {
      const s = o.target;
      if (!(s instanceof Element)) return;
      const r = s.closest("[data-cypherv2-tooltip]");
      !r || !e.contains(r) || this.#n(r);
    }, a = (o) => {
      if (!(o instanceof PointerEvent) || !this.#i) return;
      const s = o.relatedTarget;
      s instanceof Node && this.#i.contains(s) || this.hide();
    };
    e.addEventListener("pointerover", i, { signal: t.signal }), e.addEventListener("pointerout", a, { signal: t.signal }), e.addEventListener("focusin", i, { signal: t.signal }), e.addEventListener("focusout", () => this.hide(), { signal: t.signal }), e.addEventListener("scroll", () => this.hide(), { capture: !0, signal: t.signal }), e.addEventListener("click", () => this.hide(), { signal: t.signal }), e.ownerDocument.addEventListener("visibilitychange", () => this.hide(), {
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
    const a = e.getBoundingClientRect(), o = i.getBoundingClientRect(), s = e.ownerDocument.defaultView, r = Bl(a, o, {
      width: s?.innerWidth ?? e.ownerDocument.documentElement.clientWidth,
      height: s?.innerHeight ?? e.ownerDocument.documentElement.clientHeight
    });
    i.style.left = `${r.left}px`, i.style.top = `${r.top}px`, this.#i = e, this.#t = i;
  }
}
class dt extends Error {
  diagnostics;
  constructor(e) {
    super(e.map((t) => t.message).join("; ")), this.name = "FocusGraphValidationError", this.diagnostics = e;
  }
}
function Ll(n, e) {
  const t = /* @__PURE__ */ new Map();
  for (const r of e) t.set(r, []);
  for (const r of n.connections)
    r.from !== r.to && t.get(r.from)?.push(r.to);
  const i = /* @__PURE__ */ new Map(), a = [], o = /* @__PURE__ */ new Set(), s = (r) => {
    const l = i.get(r);
    if (l !== void 0) return a.length - l > 2;
    if (o.has(r)) return !1;
    i.set(r, a.length), a.push(r);
    for (const u of t.get(r) ?? []) if (s(u)) return !0;
    return a.pop(), i.delete(r), o.add(r), !1;
  };
  return [...e].some((r) => s(r));
}
function rn(n) {
  const e = [];
  (!Number.isInteger(n.version) || n.version < 1) && e.push({ severity: "error", code: "invalid-version", message: "Focus graph version must be at least 1." });
  const t = /* @__PURE__ */ new Set();
  for (const o of n.nodes) {
    if (!o.id.trim()) {
      e.push({ severity: "error", code: "blank-node-id", message: "Focus node IDs cannot be blank." });
      continue;
    }
    t.has(o.id) && e.push({ severity: "error", code: "duplicate-node-id", nodeId: o.id, message: `Duplicate Focus node ID '${o.id}'.` }), t.add(o.id), (!Number.isInteger(o.tier) || o.tier < 1 || o.tier > 6) && e.push({ severity: "error", code: "invalid-tier", nodeId: o.id, message: `Focus node '${o.id}' must use a Tier from 1 to 6.` });
    for (const [s, r] of Object.entries(o.position ?? {}))
      r !== null && !Number.isFinite(r) && e.push({ severity: "error", code: "invalid-position", nodeId: o.id, message: `Focus node '${o.id}' has an invalid ${s} position.` });
  }
  const i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set();
  for (const o of n.connections) {
    (!o.id.trim() || i.has(o.id)) && e.push({ severity: "error", code: "duplicate-connection-id", connectionId: o.id, message: `Duplicate or blank Focus connection ID '${o.id}'.` }), i.add(o.id);
    const s = `${o.from}\0${o.to}`;
    a.has(s) && e.push({ severity: "error", code: "duplicate-connection", connectionId: o.id, message: `Duplicate Focus connection '${o.from}' -> '${o.to}'.` }), a.add(s), (!t.has(o.from) || !t.has(o.to)) && e.push({ severity: "error", code: "missing-connection-node", connectionId: o.id, message: `Focus connection '${o.id}' references a missing node.` }), o.from === o.to && e.push({ severity: "error", code: "self-connection", connectionId: o.id, message: `Focus connection '${o.id}' cannot target itself.` });
  }
  return !e.some((o) => o.severity === "error") && Ll(n, t) && e.push({
    severity: "warning",
    code: "directed-cycle",
    message: "Focus graph contains a directed cycle; evaluation remains direct and deterministic."
  }), e;
}
function jl(n) {
  const e = rn(n), t = e.filter((i) => i.severity === "error");
  if (t.length > 0) throw new dt(t);
  return e;
}
class xn {
  evaluate(e, t) {
    if (!Number.isInteger(t.tier) || t.tier < 1)
      throw new Error("Character Tier must be an integer of at least 1.");
    const i = [...jl(e)], a = new Set(e.nodes.map((c) => c.id)), o = new Set(t.ownedNodeIds);
    for (const c of o)
      a.has(c) || i.push({
        severity: "warning",
        code: "unknown-owned-node",
        nodeId: c,
        message: `Focus progression references unknown node '${c}'.`
      });
    const s = /* @__PURE__ */ new Map();
    for (const c of e.nodes) s.set(c.id, []);
    for (const c of e.connections)
      s.get(c.to).push(c.from);
    const r = new Set(e.nodes.filter((c) => c.tier === 1 && o.has(c.id)).map((c) => c.id));
    let l = !0;
    for (; l; ) {
      l = !1;
      for (const c of e.connections)
        r.has(c.from) && o.has(c.to) && !r.has(c.to) && (r.add(c.to), l = !0);
    }
    for (const c of e.nodes)
      c.tier > 1 && o.has(c.id) && !r.has(c.id) && i.push({
        severity: "warning",
        code: "invalid-owned-progression",
        nodeId: c.id,
        message: `Owned node '${c.abilitySnapshot.name || c.id}' is no longer connected to an owned Tier 1 path.`
      });
    const u = e.nodes.map((c) => {
      const p = [...new Set((s.get(c.id) ?? []).filter((f) => r.has(f)))].sort((f, m) => f.localeCompare(m));
      return o.has(c.id) ? {
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
      ownedNodeIds: [...o].sort((c, p) => c.localeCompare(p)),
      nodes: u,
      diagnostics: i
    };
  }
  evaluateProgress(e, t, i) {
    return this.evaluate(e, { tier: t, ownedNodeIds: i.ownedNodeIds });
  }
  evaluateCharacterFocus(e, t, i) {
    const a = t.focusProgress.find((o) => o.focusUuid === i);
    return this.evaluate(e, {
      tier: t.tier,
      ownedNodeIds: a?.ownedNodeIds ?? []
    });
  }
  invalidOwnedNodeIds(e, t, i) {
    return this.evaluate(e, { tier: t, ownedNodeIds: i }).diagnostics.filter((a) => a.code === "invalid-owned-progression" && a.nodeId).map((a) => a.nodeId);
  }
}
class Te extends Error {
  constructor() {
    super("Grant conflict resolution was cancelled."), this.name = "GrantConflictCancelledError";
  }
}
function ts(n, e) {
  return `${n}:${String(e ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")}`;
}
function ye(n, e, t = "") {
  return { type: n, contentUuid: t, contentKey: ts(n, e) };
}
function Wl(n) {
  if (n.type !== "ability" && n.type !== "skill") return null;
  const e = n.system.grantedBy ?? {};
  return {
    type: n.type,
    contentUuid: String(e.contentUuid ?? ""),
    contentKey: String(e.contentKey || ts(n.type, n.name))
  };
}
function _l(n, e) {
  return n.type !== e.type ? !1 : n.contentUuid && e.contentUuid ? n.contentUuid === e.contentUuid : n.contentKey === e.contentKey;
}
function is(n, e) {
  return !!vi(n, e);
}
function vi(n, e) {
  return [...n].find((t) => {
    const i = Wl(t);
    return i ? _l(i, e) : !1;
  }) ?? null;
}
class ne extends Error {
  code;
  dependentNodeIds;
  constructor(e, t, i = []) {
    super(t), this.name = "FocusAcquisitionError", this.code = e, this.dependentNodeIds = i;
  }
}
const Kl = async (n) => {
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
function Kt(n, e) {
  return n.focusUuid === e.uuid || n.focusUuid === e.id;
}
function ya(n, e, t) {
  return n.type === "ability" && n.system.sourceFocusUuid === e && n.system.sourceNodeId === t;
}
function Ti(n, e) {
  const t = `${n}\0${e}`;
  let i = 2166136261, a = 2654435769;
  for (let o = 0; o < t.length; o += 1) {
    const s = t.charCodeAt(o);
    i = Math.imul(i ^ s, 16777619) >>> 0, a = Math.imul(a ^ s + o, 2246822507) >>> 0;
  }
  return `${i.toString(16).padStart(8, "0")}${a.toString(16).padStart(8, "0")}`;
}
class Xl {
  #e;
  #t;
  #i;
  #n = /* @__PURE__ */ new Map();
  constructor(e = new xn(), t = Kl, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  missingOwnedNodeIds(e, t, i) {
    const a = [...e.items];
    return new Set(i.ownedNodeIds.filter((o) => !a.some((s) => ya(s, t.uuid, o))));
  }
  async acquire(e, t, i, a) {
    return this.#v(this.#w(e), () => this.#a(e, t, i, !1, !0, a));
  }
  /** Character-facing permissive acquisition. Pending choices remain untouched. */
  async acquireManual(e, t, i, a) {
    return this.#v(this.#w(e), () => this.#a(e, t, i, !1, !1, a));
  }
  /** Explicit GM-only sheet action; callers must enforce GM authorization. */
  async acquireWithGmOverride(e, t, i) {
    return this.#v(this.#w(e), () => this.#a(e, t, i, !0, !1));
  }
  /** GM repair/import action. It intentionally bypasses both eligibility and choices. */
  async markOwnedWithGmOverride(e, t, i) {
    return this.#v(this.#w(e), () => this.#s(e, t, i));
  }
  async undo(e, t, i, a = {}) {
    return this.#v(this.#w(e), () => this.#o(e, t, i, a));
  }
  hasEmbeddedAbility(e, t, i) {
    return !!this.#d(e, t, i);
  }
  async restoreAbility(e, t, i) {
    return this.#v(this.#w(e), () => this.#l(e, t, i));
  }
  async #a(e, t, i, a, o, s) {
    this.#m(e);
    const r = this.#y(t, i), l = this.#f(e, t);
    if (l.ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let u;
    try {
      u = this.#e.evaluateProgress(t.system.graph, q(e.system), l).nodes.find((y) => y.node.id === i);
    } catch (y) {
      if (!(y instanceof dt)) throw y;
    }
    const c = e.system.advancement.pendingFocusChoices.find((y) => y.focusUuid === "" || y.focusUuid === t.uuid || y.focusUuid === t.id), p = o && !a && u?.state === "available" && !!c;
    let f = !1, m = !1, b = null;
    if (!this.#d(e, t.uuid, i)) {
      const y = await this.#r(t, r);
      if (!this.#d(e, t.uuid, i)) {
        const v = this.#b(e, t, r, y);
        if (v) {
          if (!s)
            throw new ne(
              "duplicate-grant",
              `Focus node '${i}' grants an Ability already present on this Character; choose a replacement with the GM.`
            );
          const k = await s(v);
          if (k.action === "cancel") throw new Te();
          if (k.action !== "gmOverride")
            throw new ne(
              "duplicate-grant",
              "A Focus node cannot be replaced by an arbitrary Ability. Choose another valid node or use an explicit GM Override."
            );
          m = !0;
        } else
          b = await this.#p(e, t, i, y), f = !!b;
      }
    }
    if (!this.#f(e, t).ownedNodeIds.includes(i)) {
      const y = e.system.focusProgress.map((v) => Kt(v, t) ? {
        ...v,
        ownedNodeIds: [...v.ownedNodeIds, i],
        acquisitions: [
          ...v.acquisitions ?? [],
          this.#u(
            i,
            a || m ? "gmOverride" : p ? "choice" : "manualOverride",
            p ? c : null
          )
        ]
      } : { ...v, ownedNodeIds: [...v.ownedNodeIds], acquisitions: [...v.acquisitions ?? []] });
      try {
        await e.update({
          "system.focusProgress": y,
          ...p && !m && c ? {
            "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((v) => v.id !== c.id)
          } : {}
        });
      } catch (v) {
        throw b?.delete && await b.delete(), v;
      }
    }
    return { status: "acquired", abilityCreated: f };
  }
  async #s(e, t, i) {
    this.#m(e);
    const a = this.#y(t, i);
    if (this.#f(e, t).ownedNodeIds.includes(i))
      return { status: "already-owned", abilityCreated: !1 };
    let s = null;
    if (!this.#d(e, t.uuid, i)) {
      const l = await this.#r(t, a);
      this.#d(e, t.uuid, i) || (s = await this.#p(e, t, i, l));
    }
    const r = e.system.focusProgress.map((l) => Kt(l, t) ? {
      ...l,
      ownedNodeIds: [...l.ownedNodeIds, i],
      acquisitions: [
        ...l.acquisitions ?? [],
        this.#u(i, "gmManual", null)
      ]
    } : { ...l, ownedNodeIds: [...l.ownedNodeIds], acquisitions: [...l.acquisitions ?? []] });
    try {
      await e.update({ "system.focusProgress": r });
    } catch (l) {
      throw s?.delete && await s.delete(), l;
    }
    return { status: "acquired", abilityCreated: !!s };
  }
  async #o(e, t, i, a) {
    this.#m(e), this.#y(t, i);
    const o = this.#f(e, t);
    if (!o.ownedNodeIds.includes(i))
      throw new ne("undo-not-owned", `Focus node '${i}' is not owned.`);
    const s = o.ownedNodeIds.filter((g) => g !== i), r = new Set(this.#c(
      t,
      q(e.system),
      o.ownedNodeIds
    )), l = this.#c(t, q(e.system), s), u = l.filter((g) => !r.has(g));
    if (u.length > 0 && !a.force)
      throw new ne(
        "undo-dependent-nodes",
        `Undo would invalidate acquired descendant nodes: ${u.join(", ")}.`,
        u
      );
    const c = (o.acquisitions ?? []).find((g) => g.nodeId === i), p = c && c.choiceSource !== "none" && c.choiceId ? {
      id: c.choiceId,
      source: c.choiceSource,
      grantTier: c.choiceGrantTier,
      focusUuid: c.choiceFocusUuid
    } : null, f = e.system.focusProgress.map((g) => Kt(g, t) ? {
      ...g,
      ownedNodeIds: s,
      acquisitions: (g.acquisitions ?? []).filter((y) => y.nodeId !== i)
    } : { ...g, ownedNodeIds: [...g.ownedNodeIds], acquisitions: [...g.acquisitions ?? []] }), m = p && !e.system.advancement.pendingFocusChoices.some((g) => g.id === p.id) ? [...e.system.advancement.pendingFocusChoices, p] : [...e.system.advancement.pendingFocusChoices];
    await e.update({
      "system.focusProgress": f,
      "system.advancement.pendingFocusChoices": m
    });
    let b = !1;
    if (a.deleteAbility) {
      const g = this.#d(e, t.uuid, i);
      g?.delete && (await g.delete(), b = !0);
    }
    return { choiceRestored: p, abilityDeleted: b, invalidOwnedNodeIds: l };
  }
  #c(e, t, i) {
    try {
      return this.#e.invalidOwnedNodeIds(e.system.graph, t, i);
    } catch (a) {
      if (a instanceof dt) return [];
      throw a;
    }
  }
  async #l(e, t, i) {
    this.#m(e);
    const a = this.#y(t, i);
    if (!this.#f(e, t).ownedNodeIds.includes(i))
      throw new ne(
        "restore-not-owned",
        `Focus node '${i}' is not owned and cannot be restored.`
      );
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const s = await this.#r(t, a);
    if (this.#d(e, t.uuid, i))
      return { status: "already-present", abilityCreated: !1 };
    const r = !!await this.#p(e, t, i, s);
    return {
      status: r ? "restored" : "already-present",
      abilityCreated: r
    };
  }
  async #r(e, t) {
    const i = await this.#t(t.abilityUuid);
    if (i?.type === "ability" && i.name.trim()) {
      const o = i.toObject?.() ?? {}, s = o.system && typeof o.system == "object" ? o.system : i.system;
      return {
        _id: Ti(e.uuid, t.id),
        name: i.name,
        type: "ability",
        ...typeof i.img == "string" ? { img: i.img } : {},
        system: {
          ...structuredClone(s),
          sourceFocusUuid: e.uuid,
          sourceNodeId: t.id,
          grantedBy: { kind: "focus", sourceUuid: e.uuid, instanceId: e.uuid, grantId: t.id, status: "active", contentUuid: t.abilityUuid, contentKey: `ability:${i.name.trim().toLocaleLowerCase()}` }
        }
      };
    }
    const a = t.abilitySnapshot.name.trim();
    if (!a)
      throw new ne(
        "ability-data-unavailable",
        `Focus node '${t.id}' has neither a valid source Ability nor a usable snapshot.`
      );
    return {
      _id: Ti(e.uuid, t.id),
      name: a,
      type: "ability",
      system: {
        tier: t.tier,
        description: t.abilitySnapshot.description ?? "",
        sourceFocusUuid: e.uuid,
        sourceNodeId: t.id,
        grantedBy: { kind: "focus", sourceUuid: e.uuid, instanceId: e.uuid, grantId: t.id, status: "active", contentUuid: t.abilityUuid, contentKey: `ability:${a.toLocaleLowerCase()}` }
      }
    };
  }
  #d(e, t, i) {
    return [...e.items].find((a) => ya(a, t, i)) ?? null;
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
  #b(e, t, i, a) {
    const s = (a.system ?? {}).grantedBy ?? {}, r = ye("ability", String(a.name ?? i.abilitySnapshot.name), String(s.contentUuid ?? i.abilityUuid)), l = vi(e.items, r);
    if (!l) return null;
    const c = (l.system ?? {}).grantedBy ?? {}, p = ye("ability", l.name ?? "", String(c.contentUuid ?? ""));
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
        id: Ti(t.uuid, i.id),
        name: String(a.name ?? i.abilitySnapshot.name),
        type: "ability",
        rank: "",
        contentUuid: r.contentUuid,
        contentKey: r.contentKey
      },
      suggestions: [],
      allowCustom: !1,
      allowSuppress: !1,
      allowGmOverride: !0,
      context: "focus"
    };
  }
  async #p(e, t, i, a) {
    const s = (a.system ?? {}).grantedBy ?? {};
    if (is(e.items, {
      type: "ability",
      contentUuid: String(s.contentUuid ?? ""),
      contentKey: String(s.contentKey ?? `ability:${String(a.name ?? "").trim().toLocaleLowerCase()}`)
    }))
      throw new ne(
        "duplicate-grant",
        `Focus node '${i}' grants an Ability already present on this Character; choose a replacement with the GM.`
      );
    try {
      return (await e.createEmbeddedDocuments("Item", [a], { keepId: !0 }))[0] ?? null;
    } catch (r) {
      if (this.#d(e, t.uuid, i)) return null;
      throw r;
    }
  }
  #f(e, t) {
    const i = e.system.focusProgress.filter((a) => Kt(a, t));
    if (i.length === 0)
      throw new ne(
        "progress-missing",
        `Character has no progression entry for Focus '${t.uuid}'.`
      );
    if (i.length > 1)
      throw new ne(
        "progress-duplicated",
        `Character has duplicate progression entries for Focus '${t.uuid}'.`
      );
    return i[0];
  }
  #y(e, t) {
    const i = e.system.graph.nodes.find((a) => a.id === t);
    if (!i)
      throw new ne("node-not-found", `Focus node '${t}' was not found.`);
    return i;
  }
  #m(e) {
    if (e.type !== "character")
      throw new ne("not-character", "Focus acquisition requires a Character.");
  }
  #w(e) {
    return e.uuid;
  }
  async #v(e, t) {
    const a = (this.#n.get(e) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#n.set(e, a);
    try {
      return await a;
    } finally {
      this.#n.get(e) === a && this.#n.delete(e);
    }
  }
}
class L extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "AdvancementError";
  }
  code;
}
const Jl = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
}, Ql = () => globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function Zl(n) {
  return n.system.category === "attack" || n.system.category === "defense" || n.system.contexts.some((e) => e === "attack" || e.startsWith("attack.") || e === "defense" || e.startsWith("defense."));
}
function ec(n) {
  return n === "inability" ? "untrained" : n === "untrained" ? "trained" : n === "trained" ? "specialized" : null;
}
function ba(n) {
  return [...new Set(n)];
}
class tc {
  #e;
  #t;
  #i;
  #n;
  #a = /* @__PURE__ */ new Map();
  constructor(e, t = Ql, i = Date.now, a = Jl) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = a;
  }
  policy(e = []) {
    return this.#e.resolveAdvancementPolicy(Co, e);
  }
  view(e, t = []) {
    const i = this.policy(t), a = e.system.advancement.purchases, o = a.length >= i.purchasesPerTier;
    return {
      policy: i,
      purchasedCount: a.length,
      remainingCount: Math.max(0, i.purchasesPerTier - a.length),
      canAdvanceTier: a.length === i.purchasesPerTier,
      options: En.map((s) => {
        const r = a.some((u) => u.kind === s), l = s === "extraEffort" ? this.#r(e) < i.effortMaximum : !0;
        return { kind: s, purchased: r, available: !o && !r && l };
      }),
      other: {
        purchased: a.some((s) => s.kind === "other"),
        available: !o && !a.some((s) => s.kind === "other")
      }
    };
  }
  progressionGuidance(e, t = []) {
    const i = q(e.system);
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
      t.add(q(e.system)), await e.update({
        "system.advancement.guidanceCompletedTiers": [...t].sort((i, a) => i - a)
      });
    });
  }
  async resetProgressionGuidance(e) {
    return this.#u(e, async () => {
      this.#l(e), await e.update({
        "system.advancement.guidanceCompletedTiers": (e.system.advancement.guidanceCompletedTiers ?? []).filter((t) => t !== q(e.system))
      });
    });
  }
  skillTrainingOptions(e, t = []) {
    const i = this.policy(t);
    return [...e.items].filter((a) => a.type === "skill" && _.includes(a.system.rank)).map((a) => {
      const o = ec(a.system.rank), s = o === "trained" ? i.attackDefenseTrainingTier : o === "specialized" ? i.attackDefenseSpecializationTier : 0, r = !!(o && Zl(a) && q(e.system) < s);
      return {
        id: a.id,
        name: a.name,
        currentRank: a.system.rank,
        nextRank: o,
        eligible: !!(o && !r),
        reason: o ? r ? "tier" : "eligible" : "maximum",
        abilityLinked: !!a.system.acquisition?.grantedByUuid
      };
    }).sort((a, o) => a.name.localeCompare(o.name));
  }
  async purchase(e, t, i = []) {
    return this.#u(e, () => this.#s(e, t, i, !1));
  }
  /** Explicit integration point for GM tooling; Core slot and benefit validation still applies. */
  async purchaseWithGmOverride(e, t, i = []) {
    return this.#u(e, () => this.#s(e, t, i, !0));
  }
  async advanceTier(e, t = []) {
    return this.#u(e, async () => {
      this.#l(e);
      const i = this.policy(t);
      if (e.system.advancement.purchases.length !== i.purchasesPerTier)
        throw new L("tier-not-ready", "Four Advancements are required before advancing Tier.");
      const a = Lt(e.system, "tier", 1), o = a.value, s = {
        id: this.#t(),
        source: "newTier",
        grantTier: o,
        focusUuid: ""
      }, r = i.genreChoiceForTier(o) ? {
        id: this.#t(),
        source: "newTier",
        grantTier: o
      } : null;
      return await e.update({
        [a.path]: o,
        "system.advancement.cycle": e.system.advancement.cycle + 1,
        "system.advancement.purchases": [],
        "system.advancement.pendingFocusChoices": [
          ...e.system.advancement.pendingFocusChoices,
          s
        ],
        ...r ? {
          "system.advancement.pendingGenreChoices": [
            ...e.system.advancement.pendingGenreChoices,
            r
          ]
        } : {}
      }), { tier: o, focusChoice: s, genreChoice: r };
    });
  }
  async #s(e, t, i, a) {
    this.#l(e);
    const o = this.policy(i), s = e.system.advancement.purchases;
    if (s.length >= o.purchasesPerTier)
      throw new L("cycle-complete", "This advancement cycle is complete.");
    if (t.kind === "other") {
      if (s.some((g) => g.kind === "other"))
        throw new L("other-already-purchased", "Other Advancement is unique per cycle.");
    } else if (s.some((g) => g.kind === t.kind))
      throw new L("already-purchased", "That Advancement was already purchased this cycle.");
    const r = a ? 0 : o.xpCost;
    if (e.system.xp < r)
      throw new L("insufficient-xp", "This Character does not have enough XP.");
    const l = q(e.system), u = o.resourcePointsForTier(l);
    if (!Number.isInteger(u) || u < 0)
      throw new Error("Advancement policy Resource Points must be a non-negative integer.");
    const c = {};
    let p = null, f = null, m;
    if (t.kind === "increaseCapabilities") {
      const g = Object.values(t.allocation);
      if (g.some((y) => !Number.isInteger(y) || y < 0) || g.reduce((y, v) => y + v, 0) !== o.capabilityPoints)
        throw new L("invalid-allocation", "Pool allocation must distribute exactly four points.");
      for (const y of ["might", "speed", "intellect"]) {
        const v = t.allocation[y], k = Lt(
          e.system,
          `${y}Max`,
          v
        );
        c[k.path] = k.value;
        const P = k.overrideActive ? k.value : e.system.derived.pools[y].max + v;
        c[`system.stats.${y}.value`] = Math.min(
          e.system.stats[y].value + v,
          P
        );
      }
    } else if (t.kind === "moveTowardPerfection") {
      const g = Lt(
        e.system,
        `${t.pool}Edge`,
        1
      );
      c[g.path] = g.value;
    } else if (t.kind === "extraEffort") {
      if (this.#r(e) >= o.effortMaximum)
        throw new L("effort-maximum", "Core Effort is already at its maximum.");
      const g = Lt(e.system, "effort", 1);
      c[g.path] = g.value;
    } else if (t.kind === "skillTraining")
      if (t.mode === "improve") {
        const g = this.skillTrainingOptions(e, i).find((v) => v.id === t.skillId), y = [...e.items].find((v) => v.id === t.skillId && v.type === "skill");
        if (!g || !y) throw new L("skill-not-found", "Skill Item not found.");
        if (g.reason === "maximum" || !g.nextRank)
          throw new L("skill-maximum", "This Skill cannot be improved by Core Advancement.");
        if (g.reason === "tier")
          throw new L("skill-tier", "Attack and defense training is not available at this Tier.");
        p = { skill: y, rank: y.system.rank }, m = g.nextRank;
      } else {
        const g = await this.#o(e, t, o);
        if (f = (await e.createEmbeddedDocuments("Item", [g]))[0] ?? null, !f) throw new Error("Foundry did not create the learned Skill Item.");
        m = "trained";
      }
    else
      this.#c(e, t.otherKind, o, c);
    const b = {
      id: this.#t(),
      kind: t.kind,
      otherKind: t.kind === "other" ? t.otherKind : "none",
      tier: l,
      xpCost: r,
      resourcePointsGranted: u,
      timestamp: this.#i()
    };
    Object.assign(c, {
      "system.xp": e.system.xp - r,
      "system.resourcePoints": e.system.resourcePoints + u,
      "system.advancement.purchases": [...s, b]
    }), p && m && await p.skill.update({ "system.rank": m });
    try {
      await e.update(c);
    } catch (g) {
      throw p && await p.skill.update({ "system.rank": p.rank }), f?.delete && await f.delete(), g;
    }
    return { ...m ? { skillRank: m } : {}, record: b, resourcePointsGranted: u };
  }
  async #o(e, t, i) {
    const a = t.sourceUuid ? await this.#n(t.sourceUuid) : null;
    if (t.sourceUuid && !a)
      throw new L("skill-not-found", "The selected Skill source is unavailable.");
    const o = a?.name.trim() || t.customName?.trim() || "";
    if (!o) throw new L("skill-not-found", "A new custom Skill requires a name.");
    if ([...e.items].some((c) => c.type === "skill" && (c.name.trim().toLocaleLowerCase() === o.toLocaleLowerCase() || !!(a?.uuid && c.system.acquisition?.grantedByUuid === a.uuid))))
      throw new L("duplicate-skill", "This Character already owns that Skill.");
    const r = a?.system.category ?? t.customCategory ?? "general", l = a?.system.contexts ?? (r === "general" ? [] : [r]), u = r === "attack" || r === "defense" || l.some((c) => c === "attack" || c.startsWith("attack.") || c === "defense" || c.startsWith("defense."));
    if (u && q(e.system) < i.attackDefenseTrainingTier)
      throw new L("skill-tier", "Attack and defense training is not available at this Tier.");
    return {
      name: o,
      type: "skill",
      system: {
        ...a ? structuredClone(a.system) : {},
        rank: "trained",
        category: r,
        contexts: l,
        acquisition: {
          ...a?.system.acquisition ?? {},
          minimumTier: u ? i.attackDefenseTrainingTier : 1,
          grantedByUuid: a?.uuid ?? "",
          notes: ""
        }
      }
    };
  }
  #c(e, t, i, a) {
    if (t === "recovery")
      a["system.recovery.bonus"] = e.system.recovery.bonus + i.recoveryBonus;
    else if (t === "focus") {
      const o = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: q(e.system),
        focusUuid: ""
      };
      a["system.advancement.pendingFocusChoices"] = [
        ...e.system.advancement.pendingFocusChoices,
        o
      ];
    } else if (t === "armor")
      a["system.proficiencies.armorCategories"] = ba([
        ...e.system.proficiencies.armorCategories,
        ...Fe
      ]);
    else if (t === "weapons")
      a["system.proficiencies.weaponCategories"] = ba([
        ...e.system.proficiencies.weaponCategories,
        ...De
      ]);
    else {
      if (q(e.system) < 3)
        throw new L("genre-tier", "Genre Advancement requires Tier 3 or higher.");
      const o = {
        id: this.#t(),
        source: "otherAdvancement",
        grantTier: q(e.system)
      };
      a["system.advancement.pendingGenreChoices"] = [
        ...e.system.advancement.pendingGenreChoices,
        o
      ];
    }
  }
  #l(e) {
    if (e.type !== "character")
      throw new L("not-character", "Advancement requires a Character.");
  }
  #r(e) {
    return e.system.derived.effort?.max ?? nt(e.system.stats.effortBase, e.system.overrides?.effort);
  }
  #d(e) {
    return e.uuid ?? e.id;
  }
  async #u(e, t) {
    const i = this.#d(e), o = (this.#a.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#a.set(i, o);
    try {
      return await o;
    } finally {
      this.#a.get(i) === o && this.#a.delete(i);
    }
  }
}
function Xt(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
const ic = {
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
function xe(n, e) {
  return String(n[e] ?? "");
}
function zi(n, e) {
  return Number(n[e] ?? 0);
}
function nc() {
  return ["might", "speed", "intellect"].map((n) => `<option value="${n}">${game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`)}</option>`).join("");
}
async function et(n, e) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Advancement.Purchase") }
  });
}
function ns(n) {
  n instanceof L ? ui.notifications.error(game.i18n.localize(ic[n.code])) : (console.error(n), ui.notifications.error(game.i18n.localize("CYPHERV2.Advancement.Errors.Unexpected")));
}
async function ac(n, e) {
  const t = game.i18n.localize(`CYPHERV2.Advancement.Option.${e}`);
  if (e === "increaseCapabilities") {
    const i = await et(t, `
      <p>${game.i18n.localize("CYPHERV2.Advancement.CapabilitiesPrompt")}</p>
      <label>${game.i18n.localize("CYPHERV2.Pools.Might")}<input name="might" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Speed")}<input name="speed" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")}<input name="intellect" type="number" min="0" max="4" value="0"></label>`);
    return i ? { kind: e, allocation: {
      might: zi(i, "might"),
      speed: zi(i, "speed"),
      intellect: zi(i, "intellect")
    } } : null;
  }
  if (e === "moveTowardPerfection") {
    const i = await et(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChoosePool")}<select name="pool">${nc()}</select></label>`);
    return i ? { kind: e, pool: xe(i, "pool") } : null;
  }
  if (e === "skillTraining") {
    const i = await et(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.SkillMode")}<select name="mode">
      <option value="learn">${game.i18n.localize("CYPHERV2.Advancement.LearnNewSkill")}</option>
      <option value="improve">${game.i18n.localize("CYPHERV2.Advancement.ImproveExistingSkill")}</option>
    </select></label>`);
    if (!i) return null;
    if (xe(i, "mode") === "learn") {
      const r = [...game.items].filter((c) => c.type === "skill").sort((c, p) => c.name.localeCompare(p.name)), l = await et(t, `
        <label>${game.i18n.localize("CYPHERV2.Advancement.SkillSource")}<select name="sourceUuid">
          <option value="custom">${game.i18n.localize("CYPHERV2.Advancement.CustomSkill")}</option>
          ${r.map((c) => `<option value="${Xt(c.uuid)}">${Xt(c.name)}</option>`).join("")}
        </select></label>
        <label>${game.i18n.localize("CYPHERV2.Advancement.CustomSkillName")}<input name="customName" type="text"></label>
        <label>${game.i18n.localize("CYPHERV2.Skill.Category")}<select name="customCategory">
          <option value="general">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.general")}</option>
          <option value="attack">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.attack")}</option>
          <option value="defense">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.defense")}</option>
        </select></label>`);
      if (!l) return null;
      const u = xe(l, "sourceUuid");
      return u === "custom" ? {
        kind: e,
        mode: "learn",
        customName: xe(l, "customName"),
        customCategory: xe(l, "customCategory")
      } : { kind: e, mode: "learn", sourceUuid: u };
    }
    const o = game.cypherv2.services.advancement.skillTrainingOptions(
      n,
      Ke()
    ).filter((r) => r.eligible);
    if (o.length === 0)
      return ui.notifications.warn(game.i18n.localize("CYPHERV2.Advancement.NoEligibleSkills")), null;
    const s = await et(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChooseSkill")}<select name="skillId">${o.map((r) => `<option value="${Xt(r.id)}">${Xt(r.name)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${r.currentRank}`)} → ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${r.nextRank}`)}</option>`).join("")}</select></label>`);
    return s ? { kind: e, mode: "improve", skillId: xe(s, "skillId") } : null;
  }
  if (e === "other") {
    const i = wo.filter((o) => o !== "genre" || q(n.system) >= 3), a = await et(t, `<label>${game.i18n.localize("CYPHERV2.Advancement.OtherType")}<select name="otherKind">${i.map((o) => `<option value="${o}">${game.i18n.localize(`CYPHERV2.Advancement.Other.${o}`)}</option>`).join("")}</select></label>`);
    return a ? { kind: e, otherKind: xe(a, "otherKind") } : null;
  }
  return { kind: e };
}
async function oc(n, e) {
  const t = await ac(n, e);
  if (t)
    try {
      const i = await game.cypherv2.services.advancement.purchase(
        n,
        t,
        Ke()
      );
      ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.PurchasedNotice", {
        resourcePoints: i.resourcePointsGranted
      }));
    } catch (i) {
      ns(i);
    }
}
async function sc(n) {
  try {
    const e = await game.cypherv2.services.advancement.advanceTier(
      n,
      Ke()
    );
    ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.TierAdvancedNotice", { tier: e.tier }));
  } catch (e) {
    ns(e);
  }
}
class He extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusAssociationError";
  }
  code;
}
const rc = () => globalThis.crypto?.randomUUID?.() ?? `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`;
class lc {
  #e;
  #t;
  #i = /* @__PURE__ */ new Map();
  constructor(e = rc, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async attach(e, t, i) {
    return this.#o(e, async () => {
      if (this.#n(e, t), e.system.focusProgress.some((l) => this.#a(l, t)))
        throw new He("duplicate", "This Focus is already attached.");
      if (i === "creation") {
        if (q(e.system) !== 1)
          throw new He("creation-tier", "A creation Focus requires a Tier 1 Character.");
        if (e.system.focusProgress.some((l) => l.provenance === "creation"))
          throw new He("creation-focus-exists", "This Character already has a creation Focus.");
      }
      const a = e.system.advancement.initializedFocusUuids.includes(t.uuid), o = {
        focusUuid: t.uuid,
        ownedNodeIds: [],
        acquisitions: [],
        provenance: i,
        initialChoicesGranted: !a,
        attachedAt: this.#t()
      }, s = i === "creation" ? "characterCreation" : "additionalFocus", r = a ? [] : Array.from({ length: 2 }, () => ({
        id: this.#e(),
        source: s,
        grantTier: 1,
        focusUuid: t.uuid
      }));
      return await e.update({
        "system.focusProgress": [...e.system.focusProgress, o],
        "system.advancement.pendingFocusChoices": [
          ...e.system.advancement.pendingFocusChoices,
          ...r
        ],
        "system.advancement.initializedFocusUuids": a ? [...e.system.advancement.initializedFocusUuids] : [...e.system.advancement.initializedFocusUuids, t.uuid]
      }), { progress: o, choicesGranted: r };
    });
  }
  async remove(e, t) {
    return this.#o(e, async () => {
      if (e.type !== "character")
        throw new He("not-character", "Focus association requires a Character.");
      const i = e.system.focusProgress.find((o) => o.focusUuid === t);
      if (!i) throw new He("progress-missing", "Focus progression was not found.");
      const a = e.system.advancement.pendingFocusChoices.filter((o) => o.focusUuid === t).map((o) => o.id);
      return await e.update({
        "system.focusProgress": e.system.focusProgress.filter((o) => o !== i),
        "system.advancement.pendingFocusChoices": e.system.advancement.pendingFocusChoices.filter((o) => o.focusUuid !== t)
      }), { progress: i, removedPendingChoiceIds: a };
    });
  }
  #n(e, t) {
    if (e.type !== "character")
      throw new He("not-character", "Focus association requires a Character.");
    if (t.type !== "focus" || !t.uuid)
      throw new He("not-focus", "Only a Focus Item can be attached.");
  }
  #a(e, t) {
    return e.focusUuid === t.uuid || e.focusUuid === t.id;
  }
  #s(e) {
    return e.uuid ?? e.id;
  }
  async #o(e, t) {
    const i = this.#s(e), o = (this.#i.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#i.set(i, o);
    try {
      return await o;
    } finally {
      this.#i.get(i) === o && this.#i.delete(i);
    }
  }
}
function Ni(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function as(n) {
  const e = n instanceof He ? `CYPHERV2.Focus.Association.Errors.${n.code}` : "CYPHERV2.Focus.Errors.Unexpected";
  n instanceof He || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function wa(n, e) {
  let t = e;
  if (!t) {
    const o = [...game.items].filter((r) => r.type === "focus").sort((r, l) => r.name.localeCompare(l.name));
    if (o.length === 0) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Association.NoWorldFoci"));
      return;
    }
    const s = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Add") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Focus.Association.Focus")}
        <select name="focusUuid">${o.map((r) => `<option value="${Ni(r.uuid)}">${Ni(r.name)}</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Focus.Association.Add") }
    });
    if (!s) return;
    t = await fromUuid(String(s.focusUuid ?? "")) ?? void 0;
  }
  if (!t) return;
  const i = q(n.system) === 1 && !n.system.focusProgress.some((o) => o.provenance === "creation"), a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Focus.Association.Add") },
    content: `<div class="cypherv2-dialog-fields">
      <p><strong>${Ni(t.name)}</strong></p>
      <label>${game.i18n.localize("CYPHERV2.Focus.Association.Provenance")}
        <select name="provenance">
          ${i ? `<option value="creation">${game.i18n.localize("CYPHERV2.Focus.Association.Creation")}</option>` : ""}
          <option value="additional">${game.i18n.localize("CYPHERV2.Focus.Association.Additional")}</option>
        </select>
      </label>
    </div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Focus.Association.Add") }
  });
  if (a)
    try {
      const o = await game.cypherv2.services.focusAssociations.attach(
        n,
        t,
        String(a.provenance)
      );
      ui.notifications.info(game.i18n.localize(
        o.choicesGranted.length > 0 ? "CYPHERV2.Focus.Association.Added" : "CYPHERV2.Focus.Association.Reattached"
      ));
    } catch (o) {
      as(o);
    }
}
async function cc(n, e) {
  const t = n.system.focusProgress.find((o) => o.focusUuid === e);
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
    } catch (o) {
      as(o);
    }
}
class ae extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "CharacterInitializationError";
  }
  code;
}
const dc = async (n) => {
  try {
    const e = await fromUuid(n);
    if (!e || typeof e != "object" || !("type" in e)) return null;
    const t = e;
    return t.type === "skill" ? t : null;
  } catch {
    return null;
  }
};
function va(n) {
  return n.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
class uc {
  #e;
  #t;
  constructor(e = dc, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  async setup(e, t) {
    this.#n(e);
    const i = Object.values(t.pools);
    if (i.some((p) => !Number.isInteger(p) || p < 0) || i.reduce((p, f) => p + f, 0) !== 6)
      throw new ae("invalid-pools", "Core Setup must distribute exactly six Pool points.");
    const a = t.skills.filter((p) => p.rank === "trained"), o = t.skills.filter((p) => p.rank === "inability");
    if (!(a.length === 2 && o.length === 0 || a.length === 3 && o.length === 1))
      throw new ae(
        "invalid-skills",
        "Core Setup requires two trained Skills, or three trained Skills and one different Inability."
      );
    const r = await Promise.all(t.skills.map((p) => this.#i(p))), l = new Set([...e.items].filter((p) => p.type === "skill").map((p) => va(p.name))), u = /* @__PURE__ */ new Set();
    for (const p of r) {
      const f = va(String(p.name));
      if (!f || l.has(f) || u.has(f))
        throw new ae("duplicate-skill", "Starting Skills must all be different.");
      u.add(f);
    }
    const c = await e.createEmbeddedDocuments("Item", r);
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
      const a = await this.#e(e.sourceUuid);
      if (!a)
        throw new ae("skill-source-missing", "A selected Skill source is unavailable.");
      return {
        name: a.name,
        type: "skill",
        system: {
          ...structuredClone(a.system),
          rank: e.rank,
          acquisition: {
            ...a.system.acquisition ?? {},
            grantedByUuid: a.uuid
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
function Mi(n, e) {
  return Number(n[e] ?? 0);
}
function Ca(n, e) {
  return String(n[e] ?? "").trim();
}
function ln(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function mc() {
  return [
    `<option value="custom">${game.i18n.localize("CYPHERV2.Creation.CustomSkill")}</option>`,
    ...[...game.items].filter((n) => n.type === "skill").sort((n, e) => n.name.localeCompare(e.name)).map((n) => `<option value="${ln(n.uuid)}">${ln(n.name)}</option>`)
  ].join("");
}
function Jt(n, e) {
  return `<fieldset><legend>${e}</legend>
    <label>${game.i18n.localize("CYPHERV2.Creation.SkillSource")}<select name="source${n}">${mc()}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Creation.CustomSkillName")}<input name="name${n}" type="text"></label>
  </fieldset>`;
}
function Qt(n, e, t) {
  const i = Ca(n, `source${e}`);
  return i === "custom" ? { customName: Ca(n, `name${e}`), category: "general", rank: t } : { sourceUuid: i, rank: t };
}
async function Ui(n, e, t) {
  return foundry.applications.api.DialogV2.input({
    window: { title: n },
    content: `<div class="cypherv2-dialog-fields">${e}</div>`,
    rejectClose: !1,
    render: t ? (i, a) => t(a.element) : void 0,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Apply") }
  });
}
function pc(n) {
  const e = [...n.querySelectorAll(
    'input[name="might"], input[name="speed"], input[name="intellect"]'
  )], t = n.querySelector("[data-core-points-remaining]"), i = n.querySelector('button[data-action="ok"]'), a = () => {
    const o = e.map((l) => Number(l.value)), s = o.every((l) => Number.isInteger(l) && l >= 0 && l <= 6), r = 6 - o.reduce((l, u) => l + u, 0);
    t && (t.value = String(r)), i && (i.disabled = !s || r !== 0);
  };
  e.forEach((o) => o.addEventListener("input", a)), a();
}
function cn(n) {
  const e = n instanceof ae ? `CYPHERV2.Creation.Errors.${n.code}` : "CYPHERV2.Creation.Errors.Unexpected";
  n instanceof ae || console.error(n), ui.notifications.error(game.i18n.localize(e));
}
async function fc(n) {
  const e = await Ui(
    game.i18n.localize("CYPHERV2.Creation.StepPools"),
    `<p>${game.i18n.localize("CYPHERV2.Creation.PoolsPrompt")}</p>
     <label>${game.i18n.localize("CYPHERV2.Pools.Might")} 8 + <input name="might" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Speed")} 8 + <input name="speed" type="number" min="0" max="6" value="0"></label>
     <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")} 8 + <input name="intellect" type="number" min="0" max="6" value="0"></label>
     <p>${game.i18n.localize("CYPHERV2.Creation.PointsRemaining")}: <output data-core-points-remaining>6</output> / 6</p>`,
    pc
  );
  if (!e) return;
  const t = { might: Mi(e, "might"), speed: Mi(e, "speed"), intellect: Mi(e, "intellect") };
  if (Object.values(t).reduce((u, c) => u + c, 0) !== 6 || Object.values(t).some((u) => !Number.isInteger(u) || u < 0)) {
    cn(new ae("invalid-pools", "Invalid Pool allocation."));
    return;
  }
  const i = await Ui(
    game.i18n.localize("CYPHERV2.Creation.StepSkills"),
    Jt(1, game.i18n.localize("CYPHERV2.Creation.SkillOne")) + Jt(2, game.i18n.localize("CYPHERV2.Creation.SkillTwo"))
  );
  if (!i) return;
  const a = [Qt(i, 1, "trained"), Qt(i, 2, "trained")];
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.OptionalThird") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Creation.OptionalThirdPrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.AddThird") },
    no: { label: game.i18n.localize("CYPHERV2.Creation.KeepTwo") }
  })) {
    const u = await Ui(
      game.i18n.localize("CYPHERV2.Creation.OptionalThird"),
      Jt(3, game.i18n.localize("CYPHERV2.Creation.SkillThree")) + Jt(4, game.i18n.localize("CYPHERV2.Creation.Inability"))
    );
    if (!u) return;
    a.push(Qt(u, 3, "trained"), Qt(u, 4, "inability"));
  }
  const s = a.map((u) => u.customName || [...game.items].find((c) => c.uuid === u.sourceUuid)?.name || game.i18n.localize("CYPHERV2.Creation.UnknownSkill"));
  if (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Creation.StepReview") },
    content: `<div class="cypherv2-dialog-fields">
      <p>${game.i18n.localize("CYPHERV2.Pools.Might")} ${8 + t.might} · ${game.i18n.localize("CYPHERV2.Pools.Speed")} ${8 + t.speed} · ${game.i18n.localize("CYPHERV2.Pools.Intellect")} ${8 + t.intellect}</p>
      <ul>${s.map((u, c) => `<li>${ln(u)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${a[c].rank}`)}</li>`).join("")}</ul>
    </div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Creation.Finalize") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const l = { pools: t, skills: a };
  try {
    await game.cypherv2.services.characterInitialization.setup(n, l), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize("CYPHERV2.Creation.Completed"));
  } catch (u) {
    cn(u);
  }
}
async function Ea(n, e) {
  try {
    await game.cypherv2.services.characterInitialization.markInitialized(n, e), await n.sheet?.render({ force: !0 }), ui.notifications.info(game.i18n.localize(
      e === "skipped" ? "CYPHERV2.Creation.Skipped" : "CYPHERV2.Creation.Marked"
    ));
  } catch (t) {
    cn(t);
  }
}
function Zt(n, e) {
  return e.map((t) => n.system.graph.nodes.find((i) => i.id === t)?.abilitySnapshot.name || t).join(", ");
}
async function hc(n, e, t) {
  return game.cypherv2.services.focusAcquisition.hasEmbeddedAbility(n, e.uuid, t) ? !!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoDeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.UndoDeletePrompt")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoDeleteAbility") },
    no: { label: game.i18n.localize("CYPHERV2.Focus.UndoKeepAbility") }
  }) : !1;
}
async function Ra(n, e, t, i = !1) {
  const a = e.system.graph.nodes.find((r) => r.id === t);
  if (!a || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.UndoConfirm", { name: a.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.UndoAcquisition") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })) return;
  const s = await hc(n, e, t);
  try {
    const r = await game.cypherv2.services.focusAcquisition.undo(
      n,
      e,
      t,
      { deleteAbility: s, force: i }
    );
    ui.notifications.info(game.i18n.localize(r.choiceRestored ? "CYPHERV2.Focus.UndoChoiceRestored" : "CYPHERV2.Focus.UndoCompleted")), r.invalidOwnedNodeIds.length > 0 && ui.notifications.warn(game.i18n.format("CYPHERV2.Focus.ProgressionEdit.InvalidWarning", {
      nodes: Zt(e, r.invalidOwnedNodeIds)
    }));
  } catch (r) {
    if (r instanceof ne && r.code === "undo-dependent-nodes") {
      if (!game.user.isGM) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Focus.Errors.UndoDependencies", {
          nodes: Zt(e, r.dependentNodeIds)
        }));
        return;
      }
      if (await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.ForceUndo") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.ForceUndoWarning", {
          nodes: Zt(e, r.dependentNodeIds)
        })}</p></div>`,
        yes: { label: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.ForceUndo") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) {
        const u = await game.cypherv2.services.focusAcquisition.undo(
          n,
          e,
          t,
          { deleteAbility: s, force: !0 }
        );
        ui.notifications.warn(game.i18n.format("CYPHERV2.Focus.ProgressionEdit.InvalidWarning", {
          nodes: Zt(e, u.invalidOwnedNodeIds)
        }));
      }
      return;
    }
    console.error(r), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
  }
}
async function gc(n, e, t) {
  if (!game.user.isGM) return;
  const i = e.system.graph.nodes.find((o) => o.id === t);
  !i || !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.ProgressionEdit.MarkOwnedConfirm", { name: i.abilitySnapshot.name })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkOwned") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (await game.cypherv2.services.focusAcquisition.markOwnedWithGmOverride(n, e, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.ProgressionEdit.MarkedOwned")));
}
function ge(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Pa(n) {
  return n ? game.i18n.localize(`CYPHERV2.Skill.Ranks.${n}`) : "";
}
function yc(n) {
  const e = n.toObject();
  return {
    name: n.name,
    ...e.img ? { img: e.img } : {},
    system: structuredClone(e.system ?? {})
  };
}
async function ka(n, e, t) {
  const i = e ? await fromUuid(e) : null;
  return !(i instanceof Item) || i.type !== n.type ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.InvalidReplacement")), null) : {
    action: "replace",
    selectionKind: t,
    replacement: {
      id: i.uuid,
      type: n.type,
      name: i.name,
      itemUuid: i.uuid,
      snapshot: yc(i),
      reason: game.i18n.localize(t === "compendium" ? "CYPHERV2.GrantConflict.CompendiumItem" : "CYPHERV2.GrantConflict.WorldItem"),
      reasonSourceUuid: i.uuid
    }
  };
}
async function gt(n) {
  const e = [...game.items].filter((u) => u.type === n.type).filter((u) => u.uuid !== n.existing.contentUuid && u.uuid !== n.proposed.contentUuid).sort((u, c) => u.name.localeCompare(c.name)), t = n.suggestions.length ? n.suggestions.map((u) => `
      <label class="grant-conflict-option">
        <input type="radio" name="resolution" value="suggestion:${ge(u.id)}">
        <span><strong>${ge(u.name)}</strong><small>${ge(u.reason)}</small></span>
      </label>`).join("") : `<p class="empty-list">${game.i18n.localize("CYPHERV2.GrantConflict.NoSuggestions")}</p>`, i = game.i18n.localize(n.type === "skill" ? "CYPHERV2.GrantConflict.Skill" : "CYPHERV2.GrantConflict.Ability"), a = n.existing.rank ? ` — ${ge(Pa(n.existing.rank))}` : "", o = n.proposed.rank ? ` — ${ge(Pa(n.proposed.rank))}` : "", s = game.user.isGM ? `
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="world"><span>${game.i18n.localize("CYPHERV2.GrantConflict.WorldItem")}</span></label>
      <select name="worldUuid">${e.map((u) => `<option value="${ge(u.uuid)}">${ge(u.name)}</option>`).join("")}</select>
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="uuid"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CompendiumUuid")}</span></label>
      <input name="documentUuid" type="text" placeholder="Compendium.world.pack.Item.id">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.GmExternalOnly")}</p>`, r = n.context === "package" ? `<fieldset><legend>${game.i18n.format("CYPHERV2.GrantConflict.ChooseAnother", { type: i })}</legend>
      ${s}
      ${n.allowCustom ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="custom"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill")}</span></label><input name="customName" type="text" placeholder="${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkillName")}">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.NoCustomAbility")}</p>`}
    </fieldset>` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.FocusRestriction")}</p>`, l = `<div class="cypherv2 cypherv2-dialog grant-conflict-dialog">
    <div class="grant-conflict-comparison">
      <p><span>${game.i18n.localize("CYPHERV2.GrantConflict.AlreadyHave")}</span><strong>${ge(n.existing.name)}${a}</strong></p>
      <p><span>${game.i18n.format("CYPHERV2.GrantConflict.WouldGrant", { source: ge(n.packageName) })}</span><strong>${ge(n.proposed.name)}${o}</strong></p>
    </div>
    <fieldset><legend>${game.i18n.localize("CYPHERV2.GrantConflict.Suggested")}</legend>${t}</fieldset>
    ${r}
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
      const p = await ka(n, String(u.worldUuid ?? ""), "world");
      if (p) return p;
    }
    if (c === "uuid") {
      const p = String(u.documentUuid ?? "").trim(), f = await ka(n, p, p.startsWith("Compendium.") ? "compendium" : "world");
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
function tt(n) {
  return n.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}
function bc(n, e) {
  const t = n.genre === "custom" ? String(n.customGenreId ?? "") : String(n.genre ?? "");
  if (!t || t === "none") return null;
  const i = [...e].sort((a, o) => a.uuid.localeCompare(o.uuid));
  return i.find((a) => a.uuid === t) ?? i.find((a) => tt(a.system.legacyKey) === tt(t)) ?? i.find((a) => tt(String(a.system.slug ?? "")) === tt(t)) ?? i.find((a) => tt(a.name) === tt(t)) ?? null;
}
async function os(n, e, t) {
  if (n.genre === "custom" && n.customGenreId) {
    const i = await t(n.customGenreId);
    if (i?.type === "genre") return i;
  }
  return bc(n, e);
}
class Et extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreAssociationError";
  }
  code;
}
class z extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "GenreChoiceError";
  }
  code;
}
function wc() {
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
function Sa(n) {
  return structuredClone(n);
}
class vc {
  #e;
  #t;
  #i;
  #n;
  #a = /* @__PURE__ */ new Map();
  constructor(e = async (o) => await fromUuid(o), t = async (o) => await fromUuid(o), i = () => globalThis.crypto?.randomUUID?.() ?? `genre-${Date.now()}-${Math.random()}`, a = Date.now) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = a;
  }
  async attach(e, t, i = "manual") {
    return this.#r(e, async () => {
      if (this.#l(e), t.type !== "genre" || !t.uuid)
        throw new Et("not-genre", "Only a Genre Item can be attached.");
      if (e.system.genre.sourceUuid === t.uuid)
        throw new Et("duplicate", "This Genre is already attached.");
      const a = {
        sourceUuid: t.uuid,
        instanceId: this.#i(),
        provenance: i,
        attachedAt: this.#n()
      };
      return await e.update({ "system.genre": a }), a;
    });
  }
  async remove(e) {
    return this.#r(e, async () => {
      this.#l(e);
      const t = Sa(e.system.genre);
      if (!t.sourceUuid) throw new Et("missing", "No Genre is attached.");
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
    return t.system.abilityCatalog.filter((a) => a.minimumTier <= q(e.system) && a.minimumTier <= i.grantTier);
  }
  manualCatalog(e, t) {
    return t.system.abilityCatalog.map((i) => ({
      id: i.id,
      name: i.snapshot.name || i.id,
      minimumTier: i.minimumTier,
      normallyAvailable: i.minimumTier <= q(e.system),
      owned: !!this.#o(e, t, e.system.genre, i, "active")
    })).sort((i, a) => i.minimumTier - a.minimumTier || i.name.localeCompare(a.name));
  }
  async acquireManual(e, t, i) {
    return this.#r(e, async () => {
      this.#l(e);
      const a = e.system.genre;
      if (!a.sourceUuid) throw new z("genre-required", "Attach a Genre before acquiring an Ability.");
      const o = await this.#e(a.sourceUuid);
      if (!o || o.type !== "genre") throw new z("genre-unavailable", "The active Genre source is unavailable.");
      const s = o.system.abilityCatalog.find((m) => m.id === t);
      if (!s) throw new z("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (this.#o(e, o, a, s, "active")) return { entry: s, abilityCreated: !1, conflictOverridden: !1 };
      const l = this.#o(e, o, a, s, "retained");
      if (l?.update)
        return await l.update({ "system.grantedBy.status": "active" }), { entry: s, abilityCreated: !1, conflictOverridden: !1 };
      const u = await this.#s(o, a, s), c = this.#c(e, o, s, u);
      let p = !1;
      if (c) {
        if (!i) throw new z("duplicate-grant", "This Ability is already present on the Character.");
        const m = await i(c);
        if (m.action === "cancel") throw new Te();
        if (m.action !== "gmOverride")
          throw new z("duplicate-grant", "A Genre acquisition must use an Ability from its Genre catalog.");
        p = !0;
      }
      const f = c ? void 0 : (await e.createEmbeddedDocuments("Item", [u]))[0];
      return { entry: s, abilityCreated: !!f, conflictOverridden: p };
    });
  }
  async undoManual(e, t, i) {
    return this.#r(e, async () => {
      this.#l(e);
      const a = e.system.genre;
      if (!a.sourceUuid) throw new z("genre-required", "No active Genre is attached.");
      const o = await this.#e(a.sourceUuid);
      if (!o || o.type !== "genre") throw new z("genre-unavailable", "The active Genre source is unavailable.");
      const s = o.system.abilityCatalog.find((l) => l.id === t);
      if (!s) throw new z("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      const r = this.#o(e, o, a, s, "active");
      if (!r) throw new z("entry-missing", "This Genre Ability is not currently owned.");
      if (i) {
        if (!r.delete) throw new z("ability-unavailable", "The embedded Genre Ability cannot be deleted.");
        return await r.delete(), { abilityDeleted: !0, abilityRetained: !1 };
      }
      if (!r.update) throw new z("ability-unavailable", "The embedded Genre Ability cannot be retained.");
      return await r.update({ "system.grantedBy.status": "retained" }), { abilityDeleted: !1, abilityRetained: !0 };
    });
  }
  async acquire(e, t, i, a) {
    return this.#r(e, async () => {
      this.#l(e);
      const o = e.system.genre;
      if (!o.sourceUuid) throw new z("genre-required", "Attach a Genre before spending this choice.");
      const s = await this.#e(o.sourceUuid);
      if (!s || s.type !== "genre") throw new z("genre-unavailable", "The active Genre source is unavailable.");
      const r = e.system.advancement.pendingGenreChoices.find((m) => m.id === t);
      if (!r) throw new z("choice-missing", "The pending Genre Choice no longer exists.");
      const l = s.system.abilityCatalog.find((m) => m.id === i);
      if (!l) throw new z("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (!this.eligibleEntries(e, s, r).some((m) => m.id === l.id))
        throw new z("entry-ineligible", "This Genre Ability is not eligible for the selected choice.");
      const u = await this.#s(s, o, l), c = this.#c(e, s, l, u);
      let p = !1;
      if (c) {
        if (!a) throw new z("duplicate-grant", "This Ability is already present on the Character.");
        const m = await a(c);
        if (m.action === "cancel") throw new Te();
        if (m.action !== "gmOverride")
          throw new z("duplicate-grant", "A Genre choice must grant an Ability from its Genre catalog.");
        p = !0;
      }
      let f;
      c || (f = (await e.createEmbeddedDocuments("Item", [u]))[0]);
      try {
        await e.update({
          "system.advancement.pendingGenreChoices": e.system.advancement.pendingGenreChoices.filter((m) => m.id !== r.id)
        });
      } catch (m) {
        throw await f?.delete?.(), m;
      }
      return { entry: l, abilityCreated: !!f, conflictOverridden: p };
    });
  }
  async #s(e, t, i) {
    const a = i.abilityUuid ? await this.#t(i.abilityUuid) : null, o = a?.type === "ability" ? a : null, s = i.snapshot;
    if (!o && (!s.name || !s.system))
      throw new z("ability-unavailable", "The Genre Ability source and snapshot are unavailable.");
    const r = o?.name ?? s.name, l = o?.img ?? s.img ?? "", u = o?.system ?? s.system, c = ye("ability", r, i.abilityUuid || o?.uuid || ""), p = {
      kind: "genre",
      sourceUuid: e.uuid,
      instanceId: t.instanceId,
      grantId: i.id,
      status: "active",
      contentUuid: c.contentUuid,
      contentKey: c.contentKey,
      replacement: wc()
    };
    return { name: r, img: l, type: "ability", system: { ...Sa(u), grantedBy: p } };
  }
  #o(e, t, i, a, o) {
    return [...e.items].find((s) => {
      if (s.type !== "ability") return !1;
      const r = s.system.grantedBy ?? {};
      return r.kind === "genre" && r.sourceUuid === t.uuid && r.instanceId === i.instanceId && r.grantId === a.id && r.status === o;
    }) ?? null;
  }
  #c(e, t, i, a) {
    const s = a.system.grantedBy, r = ye("ability", String(a.name), s.contentUuid), l = vi(e.items, r);
    if (!l) return null;
    const u = l.system.grantedBy ?? {}, c = ye("ability", l.name, String(u.contentUuid ?? "")), p = (f, m, b) => ({
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
      proposed: p({ name: String(a.name) }, i.id, r),
      suggestions: [],
      allowCustom: !1,
      allowSuppress: !1,
      allowGmOverride: !0,
      context: "genre"
    };
  }
  #l(e) {
    if (e.type !== "character") throw new Et("not-character", "Genre association requires a Character.");
  }
  async #r(e, t) {
    const i = e.uuid ?? e.id, o = (this.#a.get(i) ?? Promise.resolve()).catch(() => {
    }).then(t);
    this.#a.set(i, o);
    try {
      return await o;
    } finally {
      this.#a.get(i) === o && this.#a.delete(i);
    }
  }
}
function Ie(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Ci(n) {
  if (n instanceof Te) return;
  console.error(n);
  const e = n instanceof Et ? `CYPHERV2.Genre.Errors.${n.code}` : n instanceof z ? `CYPHERV2.Genre.Errors.${n.code}` : "CYPHERV2.Genre.Errors.unexpected";
  ui.notifications.error(game.i18n.localize(e));
}
async function dn(n, e, t = "manual") {
  let i = e;
  if (!i) {
    const a = [...game.items].filter((s) => s.type === "genre").sort((s, r) => s.name.localeCompare(r.name));
    if (!a.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldGenres"));
      return;
    }
    const o = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Add") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Label")}<select name="uuid">${a.map((s) => `<option value="${Ie(s.uuid)}">${Ie(s.name)}</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!o) return;
    i = await fromUuid(String(o.uuid ?? "")) ?? void 0;
  }
  if (i && !(n.system.genre.sourceUuid && n.system.genre.sourceUuid !== i.uuid && !await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Genre.Replace") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.ReplaceConfirm")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  })))
    try {
      await game.cypherv2.services.genres.attach(n, i, t), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Attached"));
    } catch (a) {
      Ci(a);
    }
}
async function Cc(n) {
  if (await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Genre.Remove") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.RemoveConfirm")}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Remove") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }))
    try {
      await game.cypherv2.services.genres.remove(n), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Removed"));
    } catch (t) {
      Ci(t);
    }
}
async function Ec(n, e) {
  try {
    const t = await game.cypherv2.services.genres.active(n);
    if (!t) throw new z("genre-required", "Attach a Genre first.");
    const i = n.system.advancement.pendingGenreChoices.find((s) => s.id === e);
    if (!i) throw new z("choice-missing", "Choice not found.");
    const a = game.cypherv2.services.genres.eligibleEntries(n, t, i);
    if (!a.length) throw new z("entry-ineligible", "No eligible Genre Ability is available.");
    const o = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.ChooseAbility") },
      content: `<div class="cypherv2-dialog-fields"><p><strong>${Ie(t.name)}</strong></p><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}<select name="entryId">${a.map((s) => `<option value="${Ie(s.id)}">${Ie(s.snapshot.name)} (${game.i18n.localize("CYPHERV2.Focus.Tier")} ${s.minimumTier})</option>`).join("")}</select></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Genre.Acquire") }
    });
    if (!o) return;
    await game.cypherv2.services.genres.acquire(
      n,
      i.id,
      String(o.entryId ?? ""),
      gt
    ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
  } catch (t) {
    Ci(t);
  }
}
async function Rc(n) {
  try {
    const e = await game.cypherv2.services.genres.active(n);
    if (!e) throw new z("genre-required", "Attach a Genre first.");
    const t = game.cypherv2.services.genres.manualCatalog(n, e);
    if (!t.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoCatalogAbilities"));
      return;
    }
    const i = `<div class="cypherv2 genre-ability-browser">
      <p class="genre-browser-source"><strong>${Ie(e.name)}</strong></p>
      <div class="genre-browser-list">${t.map((u, c) => `
        <label class="genre-browser-entry${u.owned ? " is-owned" : ""}${u.normallyAvailable ? "" : " is-future"}">
          <input type="radio" name="entryId" value="${Ie(u.id)}"${c === 0 ? " checked" : ""}>
          <span><strong>${Ie(u.name)}</strong><small>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")} ${u.minimumTier}</small></span>
          <em>${game.i18n.localize(u.owned ? "CYPHERV2.Genre.Browser.Owned" : u.normallyAvailable ? "CYPHERV2.Genre.Browser.Available" : "CYPHERV2.Genre.Browser.HigherTier")}</em>
        </label>`).join("")}</div>
      <p class="hint">${game.i18n.localize("CYPHERV2.Genre.Browser.GuidanceOnly")}</p>
    </div>`, a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.AddAbilities") },
      content: i,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Confirm") }
    });
    if (!a) return;
    const o = String(a.entryId ?? ""), s = t.find((u) => u.id === o);
    if (!s) return;
    if (!s.owned) {
      await game.cypherv2.services.genres.acquireManual(
        n,
        o,
        gt
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
      return;
    }
    if (!await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Browser.Undo") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.Browser.UndoConfirm", { name: Ie(s.name) })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Genre.Browser.Undo") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })) return;
    const l = !!await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.Browser.DeletePrompt")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteAbility") },
      no: { label: game.i18n.localize("CYPHERV2.Genre.Browser.KeepAbility") }
    });
    await game.cypherv2.services.genres.undoManual(n, o, l), ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Browser.UndoCompleted"));
  } catch (e) {
    Ci(e);
  }
}
function Ht(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Pc(n, e, t) {
  return n.includes(e) ? n.filter((i) => i !== e) : n.length >= t ? [...n] : [...n, e];
}
function kc() {
  let n = !1;
  return () => n ? !1 : (n = !0, !0);
}
function Sc(n, e) {
  return n.map((t, i) => `<button type="button" class="package-choice-option"${e ? ` data-action="package-choice-${i}"` : ""} data-package-choice-option data-option-id="${Ht(t.id)}" aria-pressed="false"><i class="fa-solid fa-check package-choice-check" aria-hidden="true"></i><span>${Ht(t.label)}</span></button>`).join("");
}
async function qn(n) {
  const e = n.options.filter((l, u, c) => l.id && c.findIndex((p) => p.id === l.id) === u);
  if (!Number.isInteger(n.choose) || n.choose < 1 || n.choose > e.length) return null;
  const t = n.choose === 1, i = kc();
  let a = [];
  const o = `<div class="cypherv2 cypherv2-dialog package-choice-dialog ${t ? "package-choice-single" : "package-choice-multiple"}" data-package-choice-required="${n.choose}">
    <header class="cypherv2-dialog-heading package-choice-heading"><strong>${Ht(n.title)}</strong></header>
    <p class="cypherv2-dialog-help package-choice-prompt">${Ht(n.prompt)}</p>
    <div class="package-choice-options" role="group" aria-label="${Ht(n.ariaLabel)}">${Sc(e, t)}</div>
    ${t ? "" : `<div class="package-choice-selection-status" aria-live="polite"><span data-package-choice-count>0 / ${n.choose} ${game.i18n.localize("CYPHERV2.Packages.Selected")}</span></div>`}
  </div>`, s = t ? e.map((l, u) => ({
    action: `package-choice-${u}`,
    label: l.label,
    callback: () => i() ? [l.id] : []
  })) : [{
    action: "confirm-package-choice",
    label: game.i18n.localize("CYPHERV2.Actions.Confirm"),
    icon: "fa-solid fa-check",
    disabled: !0,
    callback: () => i() ? [...a] : []
  }], r = await foundry.applications.api.DialogV2.wait({
    window: { title: n.title },
    position: { width: 430 },
    content: o,
    buttons: s,
    close: () => null,
    render: t ? void 0 : (l, u) => {
      const c = [...u.element.querySelectorAll("button[data-package-choice-option]")], p = u.element.querySelector('button[data-action="confirm-package-choice"]'), f = u.element.querySelector("[data-package-choice-count]"), m = () => {
        for (const b of c) {
          const g = a.includes(b.dataset.optionId ?? "");
          b.classList.toggle("is-selected", g), b.setAttribute("aria-pressed", String(g));
        }
        p && (p.disabled = a.length !== n.choose), f && (f.textContent = game.i18n.format("CYPHERV2.Packages.SelectionCount", {
          selected: a.length,
          required: n.choose
        }));
      };
      for (const b of c)
        b.addEventListener("click", () => {
          a = Pc(a, b.dataset.optionId ?? "", n.choose), m();
        });
      m();
    }
  });
  return Array.isArray(r) && r.length === n.choose ? r : null;
}
function ut(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function Ei(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
async function Gn(n) {
  const e = [...game.items].filter((i) => i.type === n).sort((i, a) => i.name.localeCompare(a.name));
  if (!e.length)
    return ui.notifications.warn(game.i18n.localize(`CYPHERV2.Packages.NoWorld${n === "characterType" ? "Types" : n === "descriptor" ? "Descriptors" : "Species"}`)), null;
  const t = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n === "characterType" ? "CYPHERV2.Packages.AddType" : n === "descriptor" ? "CYPHERV2.Packages.AddDescriptor" : "CYPHERV2.Packages.AddSpecies") },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}
      <select name="uuid">${e.map((i) => `<option value="${ut(i.uuid)}">${ut(i.name)}</option>`).join("")}</select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
  });
  return t ? await fromUuid(String(t.uuid ?? "")) : null;
}
async function On(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Packages.Remove") },
    content: `<div class="cypherv2-dialog-fields"><p>${game.i18n.format("CYPHERV2.Packages.RemoveConfirm", { name: ut(n) })}</p>
      <label>${game.i18n.localize("CYPHERV2.Packages.GrantedItems")}
        <select name="mode"><option value="delete">${game.i18n.localize("CYPHERV2.Packages.RemoveWithGrants")}</option><option value="keep">${game.i18n.localize("CYPHERV2.Packages.KeepGrants")}</option></select>
      </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Packages.Remove") }
  });
  return e && (e.mode === "delete" || e.mode === "keep") ? e.mode : null;
}
function Ri(n) {
  console.error(n), ui.notifications.error(n instanceof Error ? n.message : String(n));
}
function ss(n) {
  return n.map((e) => ({
    id: e,
    label: game.i18n.localize(`CYPHERV2.Pools.${e[0].toUpperCase()}${e.slice(1)}`)
  }));
}
async function rs(n) {
  const t = (await qn({
    title: n,
    prompt: game.i18n.format("CYPHERV2.Packages.ChooseOne", {
      label: game.i18n.localize("CYPHERV2.Packages.EdgeChoice")
    }),
    ariaLabel: game.i18n.localize("CYPHERV2.Packages.EdgeChoice"),
    choose: 1,
    options: ss(I)
  }))?.[0];
  return I.includes(t) ? t : null;
}
async function Aa(n, e) {
  const t = e ?? await Gn("characterType");
  if (!t) return;
  const i = Ei(n).find((c) => c.type === "characterType");
  let a, o;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Packages.ReplaceType") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Packages.ReplaceTypeConfirm", { name: ut(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (a = i.id, o = await On(i.name) ?? void 0, !o)))
    return;
  const s = t.system;
  let r;
  if (s.edgeGrant.mode === "choice" && (r = await rs(t.name) ?? void 0, !r))
    return;
  const l = await lt(t.name, s.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (l === null) return;
  const u = await lt(t.name, s.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (u !== null)
    try {
      await game.cypherv2.services.characterPackages.attachType(n, t, {
        conflictResolver: gt,
        skillChoices: l,
        abilityChoices: u,
        ...r ? { edgePool: r } : {},
        ...a ? { replaceItemId: a } : {},
        ...o ? { replaceGrantedItemsMode: o } : {}
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.TypeAttached"));
      const c = n;
      if (!c.system.genre.sourceUuid) {
        const p = [...game.items].filter((m) => m.type === "genre"), f = await os(
          s,
          p,
          async (m) => await fromUuid(m)
        );
        f && await foundry.applications.api.DialogV2.confirm({
          window: { title: game.i18n.localize("CYPHERV2.Genre.TypeSuggestion") },
          content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.TypeSuggestionPrompt", { genre: ut(f.name) })}</p></div>`,
          yes: { label: game.i18n.localize("CYPHERV2.Genre.AttachSuggestion") },
          no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
        }) && await dn(c, f, "typeSuggestion");
      }
    } catch (c) {
      c instanceof Te || Ri(c);
    }
}
async function Ha(n, e) {
  const t = e ?? await Gn("descriptor");
  if (!t) return;
  const i = Ei(n).some((l) => l.type === "descriptor" && l.system.instance.role === "primary"), a = await foundry.applications.api.DialogV2.input({
    window: { title: t.name },
    content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.DescriptorRole")}
      <select name="role">${i ? "" : `<option value="primary">${game.i18n.localize("CYPHERV2.Packages.Role.primary")}</option>`}<option value="additional">${game.i18n.localize("CYPHERV2.Packages.Role.additional")}</option><option value="custom">${game.i18n.localize("CYPHERV2.Packages.Role.custom")}</option></select>
    </label></div>`,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Next") }
  });
  if (!a) return;
  const o = t.system, s = await ls(t.name, o.poolBonusChoiceGroups ?? []);
  if (s === null) return;
  const r = await lt(
    t.name,
    o.choiceGroups ?? [],
    game.i18n.localize("CYPHERV2.Packages.SkillChoice")
  );
  if (r !== null)
    try {
      await game.cypherv2.services.characterPackages.attachDescriptor(n, t, {
        role: String(a.role),
        poolChoices: s,
        skillChoices: r,
        conflictResolver: gt
      }), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.DescriptorAttached"));
    } catch (l) {
      l instanceof Te || Ri(l);
    }
}
async function ls(n, e) {
  const t = {};
  for (const i of e) {
    const a = [...new Set(i.pools)].filter((s) => I.includes(s));
    if (i.choose < 1 || i.choose > a.length)
      return ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null;
    const o = await qn({
      title: n,
      prompt: i.choose === 1 ? game.i18n.localize("CYPHERV2.Packages.ChooseOnePool") : game.i18n.format("CYPHERV2.Packages.ChooseManyPools", { count: i.choose }),
      ariaLabel: game.i18n.localize("CYPHERV2.Packages.AllowedPools"),
      choose: i.choose,
      options: ss(a)
    });
    if (!o) return null;
    t[i.id] = o.filter((s) => I.includes(s));
  }
  return t;
}
async function lt(n, e, t) {
  const i = {};
  for (const a of e) {
    const o = a.rank ? game.i18n.format("CYPHERV2.Packages.ChooseSkills", {
      count: a.choose,
      rank: game.i18n.localize(`CYPHERV2.Skill.Ranks.${a.rank}`)
    }) : game.i18n.format(
      a.choose === 1 ? "CYPHERV2.Packages.ChooseOne" : "CYPHERV2.Packages.ChooseMany",
      { count: a.choose, label: t }
    ), s = await qn({
      title: n,
      prompt: o,
      ariaLabel: t,
      choose: a.choose,
      options: a.options.map((r) => ({
        id: r.id,
        label: r.snapshot?.name || r.customName || r.id
      }))
    });
    if (!s) return null;
    i[a.id] = s;
  }
  return i;
}
async function Ia(n, e) {
  const t = e ?? await Gn("species");
  if (!t) return;
  const i = Ei(n).find((f) => f.type === "species");
  let a, o;
  if (i && (!await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Species.Replace") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Species.ReplaceConfirm", { name: ut(i.name) })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Packages.Replace") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) || (a = i.id, o = await On(i.name) ?? void 0, !o)))
    return;
  const s = t.system;
  let r;
  if (s.edgeGrant.mode === "choice" && (r = await rs(t.name) ?? void 0, !r))
    return;
  const l = await lt(t.name, s.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
  if (l === null) return;
  const u = await lt(t.name, s.abilityChoiceGroups ?? [], game.i18n.localize("CYPHERV2.Species.AbilityChoice"));
  if (u === null) return;
  const c = {}, p = {};
  for (const f of s.descriptorGrants ?? []) {
    const m = f.descriptorUuid ? await fromUuid(f.descriptorUuid) : null, b = m?.system ?? f.snapshot.system, g = await ls(
      f.snapshot.name || m?.name || t.name,
      b.poolBonusChoiceGroups ?? []
    );
    if (g === null) return;
    const y = await lt(f.snapshot.name || m?.name || t.name, b.choiceGroups ?? [], game.i18n.localize("CYPHERV2.Packages.SkillChoice"));
    if (y === null) return;
    c[f.id] = y, p[f.id] = g;
  }
  try {
    await game.cypherv2.services.characterPackages.attachSpecies(n, t, {
      ...r ? { edgePool: r } : {},
      skillChoices: l,
      abilityChoices: u,
      descriptorSkillChoices: c,
      descriptorPoolChoices: p,
      conflictResolver: gt,
      ...a ? { replaceItemId: a } : {},
      ...o ? { replaceGrantedItemsMode: o } : {}
    }), ui.notifications.info(game.i18n.localize("CYPHERV2.Species.Attached"));
  } catch (f) {
    f instanceof Te || Ri(f);
  }
}
async function Ac(n, e) {
  const t = Ei(n).find((a) => a.id === e);
  if (!t) return;
  const i = await On(t.name);
  if (i)
    try {
      await game.cypherv2.services.characterPackages.remove(n, e, i), ui.notifications.info(game.i18n.localize("CYPHERV2.Packages.Removed"));
    } catch (a) {
      Ri(a);
    }
}
function cs(n) {
  return [...n.items].filter((e) => e instanceof Item && e.type === "skill").map((e) => e).sort((e, t) => e.name.localeCompare(t.name));
}
function Hc() {
  return [...game.user.targets ?? []].flatMap((n) => {
    const e = Bo(n);
    if (e) return [e];
    const t = Lo(n);
    return t ? [t] : [];
  });
}
function $a(n, e) {
  const t = Ne(n);
  if (t.length === 1) {
    const a = t[0];
    return `<input type="hidden" name="pool" value="${a}"><div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${a[0].toUpperCase()}${a.slice(1)}`)}</span></div>`;
  }
  if (!e && t.length === 0) return "";
  const i = t.length > 1 ? t : Sr;
  return `<label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${i.map((a) => `<option value="${a}">${game.i18n.localize(`CYPHERV2.Pools.${a[0].toUpperCase()}${a.slice(1)}`)}</option>`).join("")}</select></label>`;
}
function Ic(n) {
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${Un(0, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...cs(n).map((e) => `<option value="${e.id}">${e.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${e.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}
function $c(n, e) {
  const t = te(e, "skillId");
  return cs(n).find((i) => i.id === t);
}
function Vc(n) {
  const e = te(n, "skillId");
  return e.startsWith("manual:") ? Number(e.slice(7)) : 0;
}
function Va(n) {
  const e = te(n, "pool");
  return e === "might" || e === "speed" || e === "intellect" ? e : void 0;
}
async function Yc(n, e) {
  if (!game.cypherv2.services.abilities.canUse(e)) return;
  const t = Ve(), i = t.enabledRuleModuleIds ?? [], a = game.cypherv2.rules.resolveDifficultyPolicy(t.base, i), o = e.system.targetMode === "none" ? [] : Hc(), s = o.filter((g) => g.type === "npc"), r = e.system.roll !== "none", l = e.system.targetMode === "none" ? "" : `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${o.length ? o.map((g) => g.name).join(", ") : game.i18n.localize("CYPHERV2.Common.None")}</span></div>`;
  if (!r) {
    const g = await foundry.applications.api.DialogV2.input({
      window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}` },
      content: `<div class="cypherv2 cypherv2-dialog-fields"><p><strong>${e.name}</strong></p>${l}${$a(e, !1)}</div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Ability.Use") }
    });
    if (!g) return;
    try {
      const y = Va(g), v = await game.cypherv2.services.abilities.executeNoRoll(n, e, {
        ...y ? { pool: y } : {},
        targets: o,
        enabledRuleModuleIds: i
      });
      await game.cypherv2.services.abilityChat.publishNoRoll(n, v);
    } catch (y) {
      ui.notifications.error(y instanceof Error ? y.message : String(y));
    }
    return;
  }
  const u = s.length > 0 ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</strong><span>${game.i18n.localize("CYPHERV2.Roll.HiddenValue")}</span></div>` : qt(a.difficultyCeiling, !0), c = (g) => {
    const y = $c(n, g), v = Va(g);
    return {
      ...v ? { pool: v } : {},
      targets: o,
      difficulty: Mt(g),
      ...y ? { skill: y } : {},
      skillSteps: Vc(g),
      assets: U(g, "assets"),
      paidEffort: U(g, "paidEffort"),
      damageEffort: U(g, "damageEffort"),
      freeDamageEffort: U(g, "freeDamageEffort"),
      freeEffort: U(g, "freeEffort"),
      ...Ut(g),
      enabledRuleModuleIds: i
    };
  }, p = (g) => {
    const y = game.cypherv2.services.abilities.buildRollPlan(n, e, c(g)).requests[0];
    if (!y) throw new Error("Ability preview did not produce a roll request.");
    return y;
  }, f = `
    ${l}
    ${u}
    ${$a(e, !0)}
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${Ic(n)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${ce(a.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${ce(n.system.derived.effort.max)}</select></label>
    ${e.system.roll === "attack" ? `<label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${ce(n.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>` : ""}
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${xt()}`, m = game.cypherv2.services.combat.policy(i), b = await foundry.applications.api.DialogV2.input({
    window: { title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${e.name}`, resizable: !0 },
    position: { width: 800 },
    content: Gt({
      identity: e.name,
      settings: f,
      ...e.system.roll === "attack" ? { attackSummary: " " } : {}
    }),
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Roll.Roll") },
    render: (g, y) => {
      Ot(y.element, {
        actor: n,
        policyRequest: t,
        buildRequest: p,
        ...e.system.roll === "attack" ? {
          attackSummary: (v, k) => [
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${e.system.damage}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${k.context.damageEffort ?? 0}</strong></div>`,
            ...(k.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${k.context.freeDamageEffort}</strong></div>`] : [],
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${k.damageEffortApplied}</strong></div>`,
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
        const v = await Xo(g);
        v && (g = game.cypherv2.services.abilities.chooseAttackOutcomes(g, v));
      }
      for (const v of g)
        await game.cypherv2.services.abilityChat.publishRoll(
          n,
          v,
          bi(),
          wi()
        );
      const y = g[0];
      y && await Nt().requestFreeFromNaturalResult(n, y.execution.result);
    } catch (g) {
      ui.notifications.error(g instanceof Error ? g.message : String(g));
    }
}
function Dc(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function Fc(n) {
  const e = String(n.pool ?? "");
  return e === "might" || e === "speed" || e === "intellect" ? e : null;
}
async function Tc(n, e) {
  const t = Ne(e);
  if (e.system.cost.amount <= 0 || t.length === 0)
    throw new Error(game.i18n.localize("CYPHERV2.Ability.Payment.NoCost"));
  let i = t.length === 1 ? t[0] : null;
  if (!i) {
    const s = t.map(
      (l) => game.cypherv2.services.abilities.previewPayment(n, e, l)
    ).map((l, u) => `
      <label class="ability-payment-choice">
        <input type="radio" name="pool" value="${l.pool}" ${u === 0 ? "checked" : ""}>
        <strong>${Dc(l.pool)}</strong>
        <span>${game.i18n.localize("CYPHERV2.Ability.Payment.Current")}: ${l.currentBefore}</span>
        <span>${game.i18n.localize("CYPHERV2.Pools.Edge")}: ${l.edge}</span>
        <span>${game.i18n.localize("CYPHERV2.Ability.Payment.Pay")}: ${l.costPaid}</span>
      </label>`).join(""), r = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.format("CYPHERV2.Ability.Payment.Title", { name: e.name }) },
      content: `<div class="cypherv2 cypherv2-dialog ability-payment-dialog"><p>${game.i18n.localize("CYPHERV2.Ability.Cost")}: <strong>${e.system.cost.amount}</strong></p><div class="ability-payment-choices">${s}</div><p class="ability-payment-whole-cost">${game.i18n.localize("CYPHERV2.Ability.Payment.WholeCost")}</p></div>`,
      rejectClose: !1,
      ok: { label: game.i18n.localize("CYPHERV2.Ability.Payment.Pay") }
    });
    if (!r) return;
    if (i = Fc(r), !i || !t.includes(i)) throw new Error("Invalid Ability payment Pool.");
  }
  const a = await game.cypherv2.services.abilities.payCost(n, e, i);
  await game.cypherv2.services.abilityChat.publishPayment(n, a);
}
const zc = {
  descriptor: { accepts: "descriptor", placeholder: "[DESCRIPTOR]" },
  species: { accepts: "species", placeholder: "[SPECIES]" },
  type: { accepts: "characterType", placeholder: "[TYPE]" },
  focus: { accepts: "focus", placeholder: "[FOCUS]" }
}, Nc = {
  "one-action": "CYPHERV2.Hud.Recovery.Action",
  "10-minutes": "CYPHERV2.Hud.Recovery.TenMinutes",
  "1-hour": "CYPHERV2.Hud.Recovery.OneHour",
  "10-hours": "CYPHERV2.Hud.Recovery.TenHours"
};
function vt(n, e) {
  const t = zc[n];
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
const Ya = {
  primary: 0,
  additional: 1,
  custom: 1,
  speciesGranted: 2
};
function xi(n) {
  return n.instanceId || n.id || n.uuid || `${n.role ?? "custom"}:${n.name.trim().toLocaleLowerCase("en-US")}`;
}
function Mc(n = []) {
  const e = /* @__PURE__ */ new Map();
  for (const t of n) {
    const i = xi(t);
    e.has(i) || e.set(i, t);
  }
  return [...e.values()].sort((t, i) => Ya[t.role ?? "custom"] - Ya[i.role ?? "custom"] || (t.attachedAt ?? 0) - (i.attachedAt ?? 0) || t.name.localeCompare(i.name, "en-US") || xi(t).localeCompare(xi(i), "en-US"));
}
function Uc(n) {
  const e = n.trim().replace(/^[^a-z]+/i, "").toLocaleLowerCase("en-US");
  return /^(honest|honor|hour|heir)/.test(e) ? "AN" : /^(one|once|euro|user|use|uni(?:t|v|q))/.test(e) ? "A" : /^[aeiou]/.test(e) ? "AN" : "A";
}
function xc(n = {}) {
  const e = Mc(n.descriptors), t = e.map((u) => vt("descriptor", u));
  e.some((u) => u.role === "primary") || t.unshift(vt("descriptor"));
  const i = n.species ? vt("species", n.species) : null, a = vt("type", n.type), o = vt("focus", n.focus), s = Uc(t[0].displayName), l = [t.map((u) => u.displayName).join(" AND "), i?.displayName, a.displayName].filter(Boolean).join(" ");
  return {
    article: s,
    descriptors: t,
    species: i,
    type: a,
    focus: o,
    sentence: `I AM ${s} ${l} WHO ${o.displayName}`
  };
}
function qc(n, e) {
  const t = Math.max(0, Math.trunc(e)), i = Math.max(0, Math.min(t, Math.trunc(n)));
  return Array.from({ length: t }, (a, o) => ({
    index: o,
    filled: o < i,
    targetCount: o + 1 === i ? i - 1 : o + 1
  }));
}
function ai(n, e) {
  return ["minor", "moderate", "major"].map((t) => ({
    severity: t,
    count: n[t],
    capacity: e[t],
    pips: qc(n[t], e[t])
  }));
}
function Gc(n) {
  return Tt.map((e) => {
    const t = n[kt[e]];
    return { type: e, used: t, available: !t, shortLabel: Nc[e] };
  });
}
function ds(n, e) {
  const t = Number.isFinite(e) ? Math.max(0, e) : 0, i = Number.isFinite(n) ? Math.max(0, Math.min(t, n)) : 0, a = t > 0 ? i / t : 0;
  return { current: i, max: t, ratio: a, percent: a * 100 };
}
const Oc = ["name", "rank"], Da = {
  expert: 0,
  specialized: 1,
  trained: 2,
  untrained: 3,
  inability: 4
};
function Bc(n) {
  return Oc.includes(n);
}
function Lc(n, e) {
  return [...n].sort((t, i) => (e === "rank" ? Da[t.rank] - Da[i.rank] : 0) || t.name.localeCompare(i.name, "en-US"));
}
function jc(n) {
  const e = n.system.grantedBy;
  return !e || e.status === "retained" ? !0 : !e.sourceUuid && !e.instanceId && !e.grantId;
}
function Fa(n) {
  const e = Ne(n), t = Number.isInteger(n.system.cost.amount) && n.system.cost.amount > 0 ? n.system.cost.amount : 0;
  return {
    archived: n.system.archived === !0,
    cost: { amount: t, pools: e, payable: t > 0 && e.length > 0 },
    description: n.system.description.trim(),
    canDelete: jc(n)
  };
}
function Wc(n) {
  const e = new Intl.Collator("en-US", { sensitivity: "base", numeric: !0 });
  return n.map((t, i) => ({ ability: t, index: i })).sort((t, i) => +(t.ability.system.archived === !0) - +(i.ability.system.archived === !0) || e.compare(t.ability.name, i.ability.name) || t.index - i.index).map(({ ability: t }) => t);
}
class _c {
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
function Pi(n) {
  return String(n.level ?? "1").trim() || "1";
}
function mi(n) {
  return !/^\d+$/.test(Pi(n));
}
function un(n) {
  return n.depleted !== !0;
}
function us(n) {
  return bn.includes(n) ? n : "subtle";
}
function ms(n) {
  return wn.includes(n) ? n : "low";
}
function Bn(n) {
  const e = Number(n.level);
  return n.levelOverride === !0 && Number.isInteger(e) && e >= 1 ? e : us(n.manifestation) === "manifest" ? 6 : 4;
}
const mn = ["equipment", "cypher", "artifact"];
function Ta(n, e) {
  const t = Number(n);
  return Number.isInteger(t) && t >= 0 ? t : e;
}
function oi(n) {
  return mn.includes(n);
}
function Kc(n) {
  if (!oi(n.type)) return null;
  const e = n.system.depletion && typeof n.system.depletion == "object" ? n.system.depletion : null;
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    level: n.type === "cypher" ? Bn(n.system) : n.type === "artifact" ? Pi(n.system) : null,
    levelRollable: n.type === "artifact" && mi(n.system),
    power: n.type === "cypher" ? ms(n.system.power) : null,
    quantity: n.type === "equipment" ? Ta(n.system.quantity, 1) : null,
    equipped: n.type === "equipment" && typeof n.system.equipped == "boolean" ? n.system.equipped : null,
    description: typeof n.system.description == "string" ? n.system.description.trim() : "",
    depleted: n.type === "artifact" && n.system.depleted === !0,
    usable: n.type !== "artifact" || un(n.system),
    depletion: n.type === "artifact" && e ? {
      enabled: !!e.enabled,
      formula: String(e.formula || `1${String(e.die ?? "d6")}`),
      threshold: Ta(e.threshold, 1)
    } : null
  };
}
class za {
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
function pn(n) {
  const e = n.track, t = n.severity, i = n.count, a = i === void 0 || i.trim() === "" ? Number.NaN : Number(i);
  if (e !== "character" && e !== "shield" || !re.includes(t) || !Number.isInteger(a) || a < 0) throw new Error("Invalid Wound count action data.");
  if (e === "shield") {
    const o = n.shieldId?.trim();
    if (!o) throw new Error("Invalid Wound count action data.");
    return { track: e, shieldId: o, severity: t, count: a };
  }
  return { track: e, severity: t, count: a };
}
function Xc(n) {
  const e = n.family, t = n.category;
  if (e !== "weapon" && e !== "armor") throw new Error("Invalid familiarity action data.");
  if (!t || !(e === "weapon" ? De : Fe).includes(t)) throw new Error("Invalid familiarity action data.");
  return { family: e, category: t };
}
function Jc(n, e) {
  const t = /* @__PURE__ */ new Set([...De, ...Fe]), i = new Set(n.filter((a) => t.has(a)));
  return i.has(e) ? i.delete(e) : i.add(e), [...i];
}
async function Qc(n, e, t) {
  const i = e === "weapon" ? "weaponCategories" : "armorCategories", a = Jc(n.system.proficiencies[i], t);
  return await n.update({ [`system.proficiencies.${i}`]: a }), a;
}
const ei = "system." + S;
function ps() {
  return [...game.users];
}
function Na() {
  return ps().filter((n) => n.active && n.isGM).sort((n, e) => n.id.localeCompare(e.id))[0] ?? null;
}
function Ma(n, e) {
  return e.isGM || n.testUserPermission(e, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function Zc(n) {
  return [...game.messages].some((e) => {
    const t = e.getFlag(S, "playerIntrusion");
    return !!(t && typeof t == "object" && t.requestId === n);
  });
}
class ed {
  #e;
  #t;
  #i = /* @__PURE__ */ new Set();
  #n = /* @__PURE__ */ new Set();
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  initialize() {
    game.socket.on(ei, (e) => {
      this.#s(e);
    });
  }
  async activate(e) {
    if (!Ma(e, game.user))
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
      const i = Qe(), a = Na();
      return a && a.id !== game.user.id ? game.socket.emit(ei, {
        type: "player-intrusion-request",
        requestId: i,
        actorUuid: e.uuid,
        requesterUserId: game.user.id
      }) : await this.#a(i, e.uuid, game.user.id), !0;
    } finally {
      this.#i.delete(e.uuid);
    }
  }
  async #a(e, t, i) {
    if (!(this.#n.has(e) || Zc(e))) {
      this.#n.add(e);
      try {
        const o = await fromUuid(t);
        if (!o || o.type !== "character" || o.uuid !== t)
          throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.CharacterMissing"));
        const s = ps().find((l) => l.id === i && l.active);
        if (!s || !Ma(o, s))
          throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.NotAuthorized"));
        const r = await this.#e.spend(o, e);
        await this.#t.publish(r, o), Hooks.callAll("cypherv2PlayerIntrusionCreated", r, o);
      } finally {
        this.#n.delete(e);
      }
    }
  }
  async #s(e) {
    if (!e || typeof e != "object") return;
    const t = e.type;
    if (t !== "player-intrusion-request" && t !== "player-intrusion-result") return;
    const i = e;
    if (i.type === "player-intrusion-result") {
      i.recipientUserId === game.user.id && !i.success && i.error && ui.notifications.error(i.error);
      return;
    }
    const a = Na();
    if (!(!game.user.isGM || a?.id !== game.user.id))
      try {
        await this.#a(i.requestId, i.actorUuid, i.requesterUserId), game.socket.emit(ei, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !0
        });
      } catch (o) {
        game.socket.emit(ei, {
          type: "player-intrusion-result",
          requestId: i.requestId,
          recipientUserId: i.requesterUserId,
          success: !1,
          error: o instanceof Error ? o.message : String(o)
        });
      }
  }
}
let It = null;
function td(n, e) {
  return It = new ed(n, e), It.initialize(), It;
}
function id() {
  if (!It) throw new Error("Player Intrusion controller is not ready.");
  return It;
}
const qi = "is-quick-roll-pulse";
function nd(n) {
  n.classList.remove(qi), n.offsetWidth, n.classList.add(qi), n.addEventListener("animationend", () => {
    n.classList.remove(qi);
  }, { once: !0 });
}
const ad = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);
function Ua(n) {
  const e = n.dataset.severity, t = n.dataset.woundId;
  if (!re.includes(e) || !t)
    throw new Error("Invalid Wound action data.");
  return { severity: e, woundId: t };
}
function T(n) {
  const e = n.dataset.itemId;
  if (!e) throw new Error("Missing Item ID.");
  return e;
}
function od(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function qe(n) {
  const e = n.dataset.focusUuid, t = n.dataset.nodeId;
  if (!e || !t) throw new Error("Missing Focus node action data.");
  return { focusUuid: e, nodeId: t };
}
const sd = {
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
async function Pe(n, e) {
  try {
    const i = await fromUuid(e);
    if (i?.type === "focus") return i;
  } catch {
  }
  const t = n.items.get(e);
  return t?.type === "focus" ? t : null;
}
const xa = /* @__PURE__ */ new Set([
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
class R extends ad {
  #e = new Zo();
  #t = new es();
  #i = null;
  #n = !1;
  #a = "name";
  #s = new _c();
  #o = new za();
  #c = new za();
  #l = null;
  #r = null;
  #d = "skills";
  static DEFAULT_OPTIONS = {
    ...Vn,
    classes: ["cypherv2", "sheet", "actor", "character-sheet"],
    actions: Dn({
      applyWound: R.#K,
      setCharacterWoundCount: R.#X,
      setShieldWoundCount: R.#J,
      toggleFamiliarity: R.#Q,
      editWound: R.#Z,
      deleteWound: R.#ee,
      poolDamage: R.#te,
      recovery: R.#ie,
      recoveryType: R.#ne,
      resetRecoveries: R.#ae,
      rally: R.#oe,
      editCharacterOverride: R.#re,
      clearCharacterOverride: R.#le,
      rollPool: R.#ce,
      inspectHeaderFocus: R.#ue,
      createSkill: R.#me,
      setSkillSort: R.#pe,
      rollSkill: R.#S,
      configureSkillRoll: R.#g,
      editSkill: R.#fe,
      deleteSkill: R.#H,
      resetHeaderAppearance: R.#A,
      createWeapon: R.#C,
      createArmor: R.#I,
      createShield: R.#$,
      attackWeapon: R.#R,
      toggleCombatDetails: R.#he,
      rollCombatDepletion: R.#P,
      reloadWeapon: R.#V,
      toggleShieldEquipped: R.#ge,
      toggleArmorEquipped: R.#E,
      editCombatItem: R.#h,
      deleteCombatItem: R.#be,
      block: R.#we,
      dodge: R.#ve,
      openFocusNode: R.#Ce,
      acquireFocusNode: R.#Ee,
      gmAcquireFocusNode: R.#Re,
      purchaseAdvancement: R.#Pe,
      advanceTier: R.#ke,
      completeProgressionGuidance: R.#Se,
      resetProgressionGuidance: R.#Ae,
      addFocus: R.#He,
      removeFocus: R.#Ie,
      toggleGmProgressionEdit: R.#$e,
      undoFocusAcquisition: R.#Ve,
      gmMarkFocusOwned: R.#Ye,
      gmRemoveFocusOwned: R.#De,
      beginCoreSetup: R.#Fe,
      skipCoreSetup: R.#Te,
      markCoreInitialized: R.#ze,
      restoreFocusAbility: R.#Ne,
      addType: R.#b,
      addDescriptor: R.#p,
      addSpecies: R.#f,
      addGenre: R.#y,
      inspectGenre: R.#m,
      removeGenre: R.#w,
      acquireGenreAbility: R.#v,
      browseGenreAbilities: R.#Y,
      inspectPackage: R.#D,
      removePackage: R.#F,
      inspectGrantedItem: R.#T,
      createAbility: R.#N,
      useAbility: R.#z,
      payAbilityCost: R.#x,
      toggleAbilityArchived: R.#q,
      toggleAbilityDetails: R.#M,
      inspectAbility: R.#U,
      deleteAbility: R.#G,
      sendItemToChat: R.#_,
      createInventoryItem: R.#O,
      openInventoryItem: R.#B,
      deleteInventoryItem: R.#L,
      toggleInventoryDetails: R.#k,
      rollInventoryDepletion: R.#j,
      rollArtifactLevel: R.#W,
      playerIntrusion: R.#se
    }, xa),
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
    if (await super._onRender(e, t), Fn(this.element, this.isEditable, xa), this.#r) {
      this.#d = this.#r.activeTab;
      const i = this.changeTab;
      typeof i == "function" && i.call(this, this.#d, "primary"), xl(this.element, this.#r), this.#r = null;
    }
    this.#e.bind(this.element), this.#t.bind(this.element), this.#de(), this.#u();
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
    for (const a of t)
      a.addEventListener("keydown", (o) => {
        o.target !== a || o.key !== "Enter" && o.key !== " " || (o.preventDefault(), a.click());
      }, { signal: i.signal });
    if (this.isEditable)
      for (const a of e)
        a.addEventListener("change", async (o) => {
          o.stopPropagation();
          const s = a.dataset.itemId, r = s ? this.actor.items.get(s) : null, l = Number(a.value);
          if (!r || r.type !== "equipment" || !Number.isInteger(l) || l < 0) {
            await this.render({ force: !0 });
            return;
          }
          await r.update({ "system.quantity": l });
        }, { signal: i.signal });
  }
  _canDragDrop(e) {
    return this.isEditable;
  }
  async _onDropDocument(e, t) {
    if (!this.isEditable) return null;
    const i = t, o = (e.target instanceof Element ? e.target.closest("[data-hud-drop]") : null)?.dataset.hudDrop;
    return o && i?.type !== o ? (ui.notifications.warn(game.i18n.localize("CYPHERV2.Hud.InvalidIdentityDrop")), null) : i?.type === "focus" ? (await wa(this.actor, i), i) : i?.type === "characterType" ? (await Aa(this.actor, i), i) : i?.type === "descriptor" ? (await Ha(this.actor, i), i) : i?.type === "species" ? (await Ia(this.actor, i), i) : i?.type === "genre" ? (await dn(this.actor, i), i) : super._onDropDocument(e, t);
  }
  static async #b() {
    await Aa(this.actor);
  }
  static async #p() {
    await Ha(this.actor);
  }
  static async #f() {
    await Ia(this.actor);
  }
  static async #y() {
    await dn(this.actor);
  }
  static async #m() {
    await (await game.cypherv2.services.genres.active(this.actor))?.sheet?.render(!0);
  }
  static async #w() {
    await Cc(this.actor);
  }
  static async #v(e, t) {
    const i = t.dataset.choiceId;
    i && await Ec(this.actor, i);
  }
  static async #Y() {
    await Rc(this.actor), await this.render({ force: !0 });
  }
  static async #D(e, t) {
    const i = this.actor.items.get(T(t));
    i?.type !== "characterType" && i?.type !== "descriptor" && i?.type !== "species" || await i.sheet?.render(!0);
  }
  static async #F(e, t) {
    await Ac(this.actor, T(t));
  }
  static async #T(e, t) {
    await this.actor.items.get(T(t))?.sheet?.render(!0);
  }
  static async #z(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await Yc(
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
    const i = T(t), a = this.#s.toggle(i), o = t.closest(".compact-ability");
    if (!o) return;
    o.classList.toggle("is-expanded", a);
    const s = o.querySelector(".compact-ability-details");
    s && (s.hidden = !a);
    for (const r of o.querySelectorAll("[data-action='toggleAbilityDetails']"))
      r.setAttribute("aria-expanded", String(a));
  }
  static async #U(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    await i.sheet?.render(!0);
  }
  static async #x(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    try {
      await Tc(
        this.actor,
        i
      );
    } catch (a) {
      ui.notifications.error(a instanceof Error ? a.message : String(a));
    }
  }
  static async #q(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    const a = i.system.archived === !0;
    await i.update({ "system.archived": !a });
  }
  static async #G(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "ability") throw new Error("Ability Item not found.");
    if (!Fa(i).canDelete) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Ability.DeleteGranted"));
      return;
    }
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Ability.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Ability.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#s.remove(i.id), await i.delete());
  }
  static async #O(e, t) {
    const i = t.dataset.itemType;
    if (!oi(i)) throw new Error("Invalid Inventory Item type.");
    await (await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize(`CYPHERV2.Inventory.New.${i}`),
      type: i
    }]))[0]?.sheet?.render(!0);
  }
  static async #B(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || !oi(i.type)) throw new Error("Inventory Item not found.");
    await i.sheet?.render(!0);
  }
  static #k(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = T(t), a = this.#o.toggle(i), o = t.closest(".compact-inventory-item");
    if (!o) return;
    o.classList.toggle("is-expanded", a);
    const s = o.querySelector(".compact-inventory-details");
    s && (s.hidden = !a), t.setAttribute("aria-expanded", String(a));
  }
  static async #L(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || !oi(i.type)) throw new Error("Inventory Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Inventory.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Inventory.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#o.remove(i.id), await i.delete());
  }
  static async #j(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    await di(i);
  }
  static async #W(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "artifact") throw new Error("Artifact Item not found.");
    try {
      const a = await game.cypherv2.services.artifacts.rollLevel(i);
      await game.cypherv2.services.itemChat.publishArtifactLevelRoll(i, a);
    } catch (a) {
      ui.notifications.error(a instanceof Error ? a.message : String(a));
    }
  }
  static async #_(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || !["ability", "weapon", "shield", "armor", ...mn].includes(i.type))
      throw new Error("Chat Item not found.");
    await game.cypherv2.services.itemChat.publish(i);
  }
  static async #K() {
    await ul(this.actor);
  }
  static async #X(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = pn(t.dataset);
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
    const i = pn(t.dataset);
    if (i.track !== "shield") throw new Error("Invalid Shield Wound count action data.");
    const a = this.actor.items.get(i.shieldId);
    if (!a || a.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setCount(
      a,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #Q(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || !game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const { family: i, category: a } = Xc(t.dataset);
    await Qc(this.actor, i, a), await this.render({ force: !0 });
  }
  static async #Z(e, t) {
    const { severity: i, woundId: a } = Ua(t);
    await cl(this.actor, i, a);
  }
  static async #ee(e, t) {
    const { severity: i, woundId: a } = Ua(t);
    await dl(this.actor, i, a);
  }
  static async #te() {
    await ml(this.actor);
  }
  static async #ie() {
    await oa(this.actor);
  }
  static async #ne(e, t) {
    const i = t.dataset.recoveryType;
    !i || !Tt.includes(i) || await oa(this.actor, i);
  }
  static async #ae() {
    !game.user.isGM || !await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Hud.ResetRecoveriesConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) || (await this.actor.update({ "system.recovery.used": Zi(!1) }), ui.notifications.info(game.i18n.localize("CYPHERV2.Hud.RecoveriesReset")));
  }
  static async #oe(e) {
    e?.stopPropagation(), await pl(this.actor);
  }
  static async #se(e, t) {
    e.preventDefault(), e.stopPropagation(), t instanceof HTMLButtonElement && (t.disabled = !0);
    try {
      await id().activate(
        this.actor
      );
    } catch (i) {
      ui.notifications.error(i instanceof Error ? i.message : String(i));
    } finally {
      t instanceof HTMLButtonElement && this.actor.system.xp >= 1 && (t.disabled = !1);
    }
  }
  static async #re(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    !i || !ki.includes(i) || await gl(this.actor, i);
  }
  static async #le(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.dataset.overrideKey;
    if (!i || !ki.includes(i)) return;
    const a = en(
      this.actor.system,
      i
    );
    await this.actor.update({ [a.path]: null });
  }
  static async #ce(e, t) {
    if (e.target instanceof Element && e.target.closest("input, button, select, textarea, a")) return;
    const i = t.dataset.pool;
    !i || !I.includes(i) || await Vl(this.actor, i);
  }
  #de() {
    this.#i?.abort(), this.#i = new AbortController();
    const { signal: e } = this.#i;
    for (const i of this.element.querySelectorAll(".character-hud-pool[data-action='rollPool']"))
      i.addEventListener("keydown", (a) => {
        a.target !== i || a.key !== "Enter" && a.key !== " " || (a.preventDefault(), i.click());
      }, { signal: e });
    const t = this.element.querySelector("input[data-header-color]");
    t && this.isEditable && t.addEventListener("change", async (i) => {
      i.stopPropagation(), await this.actor.update({ "system.appearance.color": t.value });
    }, { signal: e });
  }
  static async #ue(e, t) {
    const i = t.dataset.focusUuid;
    if (!i) return;
    await (await Pe(this.actor, i))?.sheet?.render(!0);
  }
  static async #me() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Skill.New"),
      type: "skill"
    }]);
  }
  static #pe(e, t) {
    const i = t.dataset.sortMode;
    !Bc(i) || i === this.#a || (this.#a = i, this.render({ force: !0 }));
  }
  static async #S(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    nd(t);
    try {
      const a = Ke(), o = game.cypherv2.services.skills.buildQuickRollRequest(
        i,
        { enabledRuleModuleIds: a }
      ), s = await game.cypherv2.services.rolls.execute(
        this.actor,
        o,
        Ve()
      );
      await zn(this.actor, s);
    } catch (a) {
      ui.notifications.error(a instanceof Error ? a.message : String(a));
    }
  }
  static async #g(e, t) {
    e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await Dl(
      this.actor,
      i
    );
  }
  static async #A(e) {
    e.preventDefault(), e.stopPropagation(), await this.actor.update({
      "system.appearance.backgroundMode": "theme",
      "system.appearance.customImage": "",
      "system.appearance.color": ""
    });
  }
  static async #fe(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await i.sheet?.render(!0);
  }
  static async #H(e, t) {
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "skill") throw new Error("Skill Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Skill.DeleteTitle") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Skill.DeleteConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && await i.delete();
  }
  static async #C() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Weapon.New"), type: "weapon" }]);
  }
  static async #I() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: game.i18n.localize("CYPHERV2.Combat.Armor.New"), type: "armor" }]);
  }
  static async #$() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Shield.New"),
      type: "shield"
    }]);
  }
  static async #R(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    if (!game.cypherv2.services.weapons.ammunition(i).canAttack) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.Weapon.InsufficientAmmo"));
      return;
    }
    await zl(
      this.actor,
      i
    );
  }
  static #he(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = T(t), a = this.#c.toggle(i), o = t.closest(".compact-combat-item");
    if (!o) return;
    o.classList.toggle("is-expanded", a);
    const s = o.querySelector(".compact-combat-details");
    s && (s.hidden = !a), t.setAttribute("aria-expanded", String(a));
  }
  static async #P(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || !["weapon", "shield", "armor"].includes(i.type))
      throw new Error("Combat Item not found.");
    await di(i);
  }
  static async #V(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "weapon") throw new Error("Weapon Item not found.");
    await game.cypherv2.services.weapons.reload(i);
  }
  static async #ge(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setEquipped(
      this.actor,
      i,
      !i.system.equipped
    );
  }
  static async #E(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable) return;
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "armor") throw new Error("Armor Item not found.");
    await i.update({ "system.equipped": !i.system.equipped });
  }
  static async #h(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await i.sheet?.render(!0);
  }
  static async #be(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this.actor.items.get(T(t));
    if (!i || i.type !== "weapon" && i.type !== "armor" && i.type !== "shield")
      throw new Error("Combat Item not found.");
    await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Combat.DeleteItem") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.DeleteItemConfirm", { name: i.name })}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    }) && (this.#c.remove(i.id), await i.delete());
  }
  static async #we() {
    await sn(this.actor, "block");
  }
  static async #ve() {
    await sn(this.actor, "dodge");
  }
  static async #Ce(e, t) {
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    if (!o) throw new Error("Focus Item not found.");
    await Qo(o, a);
  }
  static async #Ee(e, t) {
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    if (!o) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const s = await game.cypherv2.services.focusAcquisition.acquireManual(
        this.actor,
        o,
        a,
        gt
      );
      ui.notifications.info(game.i18n.localize(
        s.status === "acquired" ? "CYPHERV2.Focus.Acquired" : "CYPHERV2.Focus.AlreadyOwned"
      )), s.status === "acquired" && await this.actor.sheet?.render(!0);
    } catch (s) {
      R.#ye(s);
    }
  }
  static async #Re(e, t) {
    if (!game.user.isGM) return;
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    if (!(!o || !await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire") },
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.GmOverrideConfirm")}</p></div>`,
      yes: { label: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire") },
      no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
    })))
      try {
        await game.cypherv2.services.focusAcquisition.acquireWithGmOverride(
          this.actor,
          o,
          a
        ), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Acquired")), await this.actor.sheet?.render(!0);
      } catch (r) {
        R.#ye(r);
      }
  }
  static async #Pe(e, t) {
    const i = t.dataset.kind;
    i !== "other" && !En.includes(i) || await oc(
      this.actor,
      i
    );
  }
  static async #ke() {
    await sc(this.actor);
  }
  static async #Se() {
    await game.cypherv2.services.advancement.completeProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #Ae() {
    await game.cypherv2.services.advancement.resetProgressionGuidance(
      this.actor
    ), await this.render({ force: !0 });
  }
  static async #He() {
    await wa(this.actor);
  }
  static async #Ie(e, t) {
    const i = t.dataset.focusUuid;
    i && await cc(this.actor, i);
  }
  static async #$e() {
    game.user.isGM && (this.#n = !this.#n, await this.render({ force: !0 }));
  }
  static async #Ve(e, t) {
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    o && (await Ra(
      this.actor,
      o,
      a
    ), await this.render({ force: !0 }));
  }
  static async #Ye(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    o && (await gc(
      this.actor,
      o,
      a
    ), await this.render({ force: !0 }));
  }
  static async #De(e, t) {
    if (!game.user.isGM || !this.#n) return;
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    o && (await Ra(
      this.actor,
      o,
      a
    ), await this.render({ force: !0 }));
  }
  static async #Fe() {
    await fc(this.actor);
  }
  static async #Te() {
    game.user.isGM && await Ea(this.actor, "skipped");
  }
  static async #ze() {
    game.user.isGM && await Ea(this.actor, "manual");
  }
  static async #Ne(e, t) {
    const { focusUuid: i, nodeId: a } = qe(t), o = await Pe(this.actor, i);
    if (!o) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const s = await game.cypherv2.services.focusAcquisition.restoreAbility(
        this.actor,
        o,
        a
      );
      ui.notifications.info(game.i18n.localize(
        s.status === "restored" ? "CYPHERV2.Focus.AbilityRestored" : "CYPHERV2.Focus.AbilityAlreadyPresent"
      )), s.status === "restored" && await this.actor.sheet?.render(!0);
    } catch (s) {
      R.#ye(s);
    }
  }
  static #ye(e) {
    if (!(e instanceof Te)) {
      if (e instanceof ne) {
        ui.notifications.error(game.i18n.localize(sd[e.code]));
        return;
      }
      console.error(e), ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
    }
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#r = Ul(this.element), this.#d = this.#r.activeTab);
    const t = await super._prepareContext(e), i = Lc([...this.actor.items].filter((h) => h.type === "skill").map((h) => {
      const C = h, F = game.cypherv2.services.skills.configuredPool(C);
      return {
        id: C.id,
        name: C.name,
        rank: C.system.rank,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${C.system.rank}`),
        poolLabel: F ? game.i18n.localize(`CYPHERV2.Pools.${F[0].toUpperCase()}${F.slice(1)}`) : game.i18n.localize("CYPHERV2.Skill.ChoosePool")
      };
    }), this.#a), a = Wc([...this.actor.items].filter((h) => h.type === "ability").map((h) => h));
    this.#s.retain(a.map((h) => h.id));
    const o = await Promise.all(a.map(async (h, C) => {
      const F = h, M = Fa(h), fe = this.#s.isExpanded(h.id), Ce = To(
        M.cost.amount,
        M.cost.pools,
        od,
        {
          pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
          middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
          final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
        }
      ), Ze = M.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        M.description,
        { async: !0, relativeTo: F }
      ) : "";
      return {
        id: h.id,
        name: h.name,
        archived: M.archived,
        startsArchivedGroup: M.archived && (C === 0 || a[C - 1].system.archived !== !0),
        canPay: this.isEditable && M.cost.payable,
        canDelete: this.isEditable && M.canDelete,
        expanded: fe,
        costLabel: Ce,
        enrichedDescription: Ze,
        hasDescription: !!M.description
      };
    })), s = this.actor, r = [...this.actor.items].filter((h) => h.type === "weapon" || h.type === "shield" || h.type === "armor");
    r.filter((h) => h.type === "shield" && !!h.system.equipped).length > 1 && this.isEditable && await game.cypherv2.services.shields.normalizeEquipped(
      s
    ), this.#c.retain(r.map((h) => h.id));
    const u = async (h, C) => C ? foundry.applications.ux.TextEditor.implementation.enrichHTML(C, { async: !0, relativeTo: h }) : "", c = (await Promise.all(r.filter((h) => h.type === "weapon").map(async (h) => {
      const C = h, F = C.system.description.trim();
      return {
        id: C.id,
        name: C.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${C.system.category}`),
        attackType: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${C.system.attackType}`),
        range: game.i18n.localize(`CYPHERV2.Combat.Range.${C.system.rangeCategory}`),
        damage: game.cypherv2.services.combat.weaponBaseDamage(C),
        depletionEnabled: C.system.depletion.enabled,
        depletionLabel: C.system.depletion.enabled ? Fi(C.system.depletion) : "",
        ammoEnabled: C.system.ammo.enabled,
        ammoLabel: C.system.ammo.enabled ? `${C.system.ammo.value} / ${C.system.ammo.max}` : "",
        canAttack: game.cypherv2.services.weapons.ammunition(C).canAttack,
        depleted: !!C.system.depleted,
        freelyUsed: game.cypherv2.services.combat.weaponFreelyUsed(s, C),
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), p = (await Promise.all(r.filter((h) => h.type === "armor").map(async (h) => {
      const C = h, F = C.system.description.trim(), M = C.system.depletion;
      return {
        id: C.id,
        name: C.name,
        category: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${C.system.category}`),
        equipped: C.system.equipped,
        freelyUsed: game.cypherv2.services.combat.armorFreelyUsed(s, C),
        depletionEnabled: !!M?.enabled,
        depletionLabel: M?.enabled ? Fi(M) : "",
        depleted: !!C.system.depleted,
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), f = (await Promise.all(r.filter((h) => h.type === "shield").map(async (h) => {
      const C = h, F = C.system.description.trim(), M = C.system.depletion, fe = ai({
        minor: C.system.wounds.minor.length,
        moderate: C.system.wounds.moderate.length,
        major: C.system.wounds.major.length
      }, C.system.derived.capacities).map((Ce) => ({
        ...Ce,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${Ce.severity}`),
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${Ce.severity}`)
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
        depletionEnabled: !!M?.enabled,
        depletionLabel: M?.enabled ? Fi(M) : "",
        depleted: !!C.system.depleted,
        expanded: this.#c.isExpanded(C.id),
        hasDescription: !!F,
        enrichedDescription: await u(h, F)
      };
    }))).sort((h, C) => h.name.localeCompare(C.name)), m = f.filter((h) => h.equipped).length > 1, b = this.actor.system, g = [], y = [], v = [];
    for (const h of b.focusProgress ?? []) {
      const C = await Pe(this.actor, h.focusUuid);
      if (!C || C.type !== "focus") {
        y.push(h.focusUuid);
        continue;
      }
      v.push({
        uuid: h.focusUuid,
        name: C.name,
        provenance: h.provenance ?? "additional"
      });
      const F = await game.cypherv2.services.focusTrees.prepare(C, {
        characterTier: q(this.actor.system),
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
    const k = game.cypherv2.services.advancement.view(
      this.actor,
      Ke()
    ), P = game.cypherv2.services.advancement.progressionGuidance(
      this.actor,
      Ke()
    ), A = [...this.actor.items].filter((h) => h.type === "characterType").map((h) => ({ id: h.id, name: h.name })), $ = [...this.actor.items].filter((h) => h.type === "species").map((h) => ({ id: h.id, name: h.name })), D = [...this.actor.items].filter((h) => h.type === "descriptor").map((h) => {
      const C = h.system.instance, F = C?.role ?? "custom";
      return {
        id: h.id,
        name: h.name,
        role: F,
        instanceId: C?.instanceId ?? h.id,
        attachedAt: C?.attachedAt ?? 0,
        roleLabel: game.i18n.localize(`CYPHERV2.Packages.Role.${F}`)
      };
    }), K = new Map([...this.actor.items].filter((h) => h.type === "characterType" || h.type === "descriptor" || h.type === "species").map((h) => [h.system.instance?.instanceId ?? "", h.name])), de = [...this.actor.items].filter((h) => {
      const C = h.system.grantedBy;
      return C?.instanceId && (C.kind === "type" || C.kind === "descriptor" || C.kind === "species");
    }).map((h) => {
      const C = h.system.grantedBy;
      return {
        id: h.id,
        name: h.name,
        type: h.type,
        sourceName: K.get(C.instanceId) ?? game.i18n.localize("CYPHERV2.Packages.Retained"),
        grantId: C.grantId,
        status: C.status,
        replacementLabel: C.replacement?.active ? `${C.replacement.originalName} → ${C.replacement.replacementName}` : ""
      };
    }), H = this.actor.system, j = await game.cypherv2.services.genres.active(
      this.actor
    ), ve = j ? {
      attached: !0,
      available: !0,
      name: j.name,
      uuid: j.uuid,
      img: j.img,
      provenance: H.genre.provenance,
      totalEffortCapMode: j.system.options.totalEffortCapMode,
      totalEffortCapLabel: game.i18n.localize(
        `CYPHERV2.Genre.EffortCap.${j.system.options.totalEffortCapMode}`
      )
    } : {
      attached: !!H.genre.sourceUuid,
      available: !1,
      name: H.genre.sourceUuid,
      uuid: H.genre.sourceUuid,
      img: "",
      provenance: H.genre.provenance,
      totalEffortCapMode: "core",
      totalEffortCapLabel: game.i18n.localize("CYPHERV2.Genre.EffortCap.core")
    }, V = [...this.actor.items].filter((h) => mn.includes(h.type)).sort((h, C) => h.name.localeCompare(C.name, "en-US"));
    this.#o.retain(V.map((h) => h.id));
    const x = (await Promise.all(V.map(async (h) => {
      const C = Kc(h);
      if (!C) return null;
      const F = this.#o.isExpanded(h.id), M = C.description ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        C.description,
        { async: !0, relativeTo: h }
      ) : "";
      return {
        ...C,
        expanded: F,
        hasDescription: !!C.description,
        enrichedDescription: M,
        depletionLabel: C.depletion?.enabled ? C.depletion.formula : "",
        powerLabel: C.power ? game.i18n.localize(`CYPHERV2.Cypher.Power.${C.power}`) : "",
        canRollLevel: C.levelRollable && C.usable,
        canRollDepletion: !!(C.depletion?.enabled && C.usable)
      };
    }))).filter((h) => h !== null), ie = {
      cypherLimit: H.derived.cypherLimit.max,
      equipment: x.filter((h) => h.type === "equipment"),
      cyphers: x.filter((h) => h.type === "cypher"),
      artifacts: x.filter((h) => h.type === "artifact")
    }, ue = v.find((h) => h.provenance === "creation") ?? v[0], O = xc({
      descriptors: D,
      ...$[0] ? { species: { id: $[0].id, name: $[0].name } } : {},
      ...A[0] ? { type: { id: A[0].id, name: A[0].name } } : {},
      ...ue ? { focus: { uuid: ue.uuid, name: ue.name } } : {}
    }), ze = {
      ...O,
      descriptors: O.descriptors.map((h) => ({
        ...h,
        displayName: h.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Descriptor") : h.displayName
      })),
      type: {
        ...O.type,
        displayName: O.type.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Type") : O.type.displayName
      },
      focus: {
        ...O.focus,
        displayName: O.focus.missing ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Focus") : O.focus.displayName
      }
    }, pe = ai({
      minor: H.wounds.minor.length,
      moderate: H.wounds.moderate.length,
      major: H.wounds.major.length
    }, H.derived.wounds.capacities).map((h) => ({
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
    })), w = f.filter((h) => h.equipped), X = w.find((h) => !h.broken) ?? w[0], Wn = X ? {
      ...X,
      tracks: ai({
        minor: X.minor,
        moderate: X.moderate,
        major: X.major
      }, X.capacities).map((h) => ({
        ...h,
        itemId: X.id,
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${h.severity}`),
        pips: h.pips.map((C) => ({
          ...C,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetShieldWoundCount", {
            shield: X.name,
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
            count: C.targetCount
          })
        })),
        tooltip: game.i18n.format("CYPHERV2.Hud.ShieldWoundTooltip", {
          shield: X.name,
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${h.severity}`),
          count: h.count,
          capacity: h.capacity
        })
      }))
    } : null, Is = pe.map((h, C) => ({
      character: h,
      shield: Wn?.tracks[C] ?? null
    })), $s = {
      appearance: dr(H.appearance, this.actor.img),
      identity: ze,
      stats: {
        tier: H.derived.tier.value,
        effort: H.derived.effort.max,
        xp: H.xp,
        resourcePoints: H.resourcePoints
      },
      playerIntrusion: {
        visible: this.isEditable,
        canUse: this.isEditable && game.cypherv2.services.playerIntrusions.canUse(
          this.actor
        ),
        tooltip: game.i18n.localize(H.xp >= 1 ? "CYPHERV2.Intrusion.Player.Tooltip" : "CYPHERV2.Intrusion.Player.RequiresTooltip")
      },
      pools: I.map((h) => ({
        key: h,
        isMight: h === "might",
        canRally: h === "might" && game.cypherv2.services.rally.canApply(this.actor),
        label: game.i18n.localize(`CYPHERV2.Pools.${h[0].toUpperCase()}${h.slice(1)}`),
        value: H.stats[h].value,
        max: H.derived.pools[h].max,
        edge: H.derived.pools[h].edge,
        gauge: ds(H.stats[h].value, H.derived.pools[h].max)
      })),
      wounds: {
        tracks: pe,
        rows: Is,
        hindrance: H.derived.wounds.hindrance,
        hindranceModifier: we("hinder", H.derived.wounds.hindrance),
        dead: H.derived.wounds.dead
      },
      recoveries: Gc(H.recovery.used).map((h) => ({
        ...h,
        label: game.i18n.localize(`CYPHERV2.Recovery.${h.type}`)
      })),
      recoveryFormulaLabel: H.derived.recovery.formula,
      canResetRecoveries: game.user.isGM,
      shield: Wn
    }, Vs = (h, C) => [
      ...this.actor.items
    ].filter((F) => F.type !== "characterType" && F.type !== "species" ? !1 : F.system[h === "weapon" ? "weaponUse" : "armorUse"]?.[C] === !0).map((F) => F.name), _n = (h, C, F, M) => C.map((fe) => {
      const Ce = Vs(h, fe), Ze = F.includes(fe), Bt = Ce.length > 0, zs = M.includes(fe), Ns = Ze && Bt ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityManualAndGranted", { sources: Ce.join(", ") }) : Ze ? game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityManual") : Bt ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityGranted", { sources: Ce.join(", ") }) : game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityAbsent");
      return {
        family: h,
        category: fe,
        label: game.i18n.localize(`CYPHERV2.Combat.${h === "weapon" ? "Weapon" : "Armor"}.Category.${fe}`),
        manual: Ze,
        packageGranted: Bt,
        effective: zs,
        canToggle: this.isEditable && (Ze || !Bt),
        sourceHint: Ns
      };
    }), Ys = {
      weapons: _n(
        "weapon",
        De,
        H.proficiencies.weaponCategories,
        H.derived.packages.weaponCategories
      ),
      armor: _n(
        "armor",
        Fe,
        H.proficiencies.armorCategories,
        H.derived.packages.armorCategories
      )
    }, Ds = {
      tier: "CYPHERV2.Character.Tier",
      effort: "CYPHERV2.Character.Effort",
      mightMax: "CYPHERV2.Overrides.MightMax",
      mightEdge: "CYPHERV2.Overrides.MightEdge",
      speedMax: "CYPHERV2.Overrides.SpeedMax",
      speedEdge: "CYPHERV2.Overrides.SpeedEdge",
      intellectMax: "CYPHERV2.Overrides.IntellectMax",
      intellectEdge: "CYPHERV2.Overrides.IntellectEdge"
    }, Fs = ki.map((h) => {
      const C = en(H, h);
      return { ...C, label: game.i18n.localize(Ds[h]), hasOverride: C.override !== null };
    }), Kn = [game.i18n.localize(P.focusAbilityCount === 2 ? "CYPHERV2.Advancement.Guidance.TwoFocusAbilities" : "CYPHERV2.Advancement.Guidance.FocusAbility")];
    P.includesGenreAbility && Kn.push(game.i18n.localize("CYPHERV2.Advancement.Guidance.GenreAbility"));
    const Xn = typeof this.actor._source?.system?.notes == "string" ? this.actor._source.system.notes : "", Ts = Xn ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(Xn, {
      async: !0,
      relativeTo: this.actor
    }) : "";
    return {
      ...t,
      actor: this.actor,
      system: this.actor.system,
      systemFields: Yn(this.actor),
      editable: this.isEditable,
      enriched: { notes: Ts },
      familiarities: Ys,
      characterOverrides: Fs,
      genre: ve,
      woundHindranceModifier: we("hinder", H.derived.wounds.hindrance),
      header: $s,
      skillItems: i,
      skillSort: {
        mode: this.#a,
        nameActive: this.#a === "name",
        rankActive: this.#a === "rank"
      },
      abilityItems: o,
      inventory: ie,
      weaponItems: c,
      armorItems: p,
      shieldItems: f,
      multipleShieldsEquipped: m,
      focusTrees: g,
      missingFoci: y,
      advancement: {
        ...k,
        options: k.options.map((h) => ({
          ...h,
          label: `CYPHERV2.Advancement.Option.${h.kind}`,
          shortLabel: `CYPHERV2.Advancement.Short.${h.kind}`,
          xpCost: k.policy.xpCost
        })),
        other: {
          ...k.other,
          label: "CYPHERV2.Advancement.OtherAdvancement",
          shortLabel: "CYPHERV2.Advancement.Short.other",
          xpCost: k.policy.xpCost
        },
        purchases: b.advancement.purchases.map((h) => ({
          ...h,
          label: h.kind === "other" ? `CYPHERV2.Advancement.Other.${h.otherKind}` : `CYPHERV2.Advancement.Option.${h.kind}`
        })),
        guidance: {
          ...P,
          title: game.i18n.format("CYPHERV2.Advancement.Guidance.Title", { tier: P.tier }),
          reminder: Kn.join(" · ")
        }
      },
      isGM: game.user.isGM,
      gmProgressionEdit: game.user.isGM && this.#n,
      typeItems: A,
      speciesItems: $,
      descriptorItems: D,
      primaryDescriptorItems: D.filter((h) => h.role === "primary"),
      additionalDescriptorItems: D.filter((h) => h.role === "additional" || h.role === "custom"),
      speciesDescriptorItems: D.filter((h) => h.role === "speciesGranted"),
      packageGrantedItems: de,
      coreCreation: this.actor.system.creation,
      activeArmorCategoryLabel: game.i18n.localize(
        `CYPHERV2.Combat.Armor.Category.${s.system.derived.combat.armor.category}`
      ),
      recoveryAvailableLabels: this.actor.system.derived.recovery.availableTypes.map((h) => game.i18n.localize(`CYPHERV2.Recovery.${h}`)).join(", "),
      phase: "0.1.0"
    };
  }
}
class me extends Error {
  constructor(e, t) {
    super(t), this.code = e, this.name = "FocusTreeEditorError";
  }
  code;
}
class rd {
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
      throw new me("node-not-selected", "Select a Focus node before connecting.");
    return this.#t = this.#e, this.#t;
  }
  connectionTo(e) {
    if (!this.#t)
      throw new me("node-not-selected", "No source node is selected for the connection.");
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
function ld() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "") ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function ke(n) {
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
function qa(n) {
  const e = n._source?.system?.description ?? n.system?.description;
  return {
    name: n.name,
    description: typeof e == "string" ? e : ""
  };
}
function Ga(n) {
  if (n.type !== "ability")
    throw new me("not-ability", "Only Ability Items can be added to a Focus Tree.");
  if (!n.uuid.trim())
    throw new me("ability-uuid-missing", "The Ability must have a resolvable UUID.");
}
function Oa(n) {
  if (!Number.isInteger(n) || n < 1 || n > 6)
    throw new me("invalid-tier", "Focus node Tier must be an integer from 1 to 6.");
}
function Ba(n, e) {
  return n.nodes.filter((t) => t.tier === e).sort((t, i) => {
    const a = t.position.x ?? Number.MAX_SAFE_INTEGER, o = i.position.x ?? Number.MAX_SAFE_INTEGER;
    return a - o || t.id.localeCompare(i.id);
  });
}
class cd {
  #e;
  #t;
  #i;
  #n = !1;
  constructor(e, t = ld) {
    this.#e = t, this.#t = ke(e), this.#i = ke(e);
  }
  get graph() {
    return ke(this.#i);
  }
  get dirty() {
    return this.#n;
  }
  diagnostics() {
    return rn(this.#i);
  }
  addAbility(e, t = 1) {
    Ga(e), Oa(t);
    const a = Ba(this.#i, t).reduce((s, r) => Math.max(s, r.position.x ?? -1), -1), o = {
      id: this.#o("node", new Set(this.#i.nodes.map((s) => s.id))),
      abilityUuid: e.uuid,
      abilitySnapshot: qa(e),
      tier: t,
      position: { x: a + 1, y: null }
    };
    return this.#i = { ...this.#i, nodes: [...this.#i.nodes, o] }, this.#n = !0, ke({ ...this.#i, nodes: [o] }).nodes[0];
  }
  setTier(e, t) {
    return Oa(t), this.#s(e, (i) => ({ ...i, tier: t }));
  }
  moveNode(e, t) {
    const i = this.#a(e), a = Ba(this.#i, i.tier), o = a.findIndex((f) => f.id === e), s = t === "left" ? o - 1 : o + 1;
    if (s < 0 || s >= a.length) return ke({
      version: this.#i.version,
      nodes: [i],
      connections: []
    }).nodes[0];
    const r = a[s], l = a[t === "left" ? s - 1 : s + 1], u = r.position.x ?? s, c = l?.position.x, p = t === "left" ? c == null ? u - 1 : (c + u) / 2 : c == null ? u + 1 : (u + c) / 2;
    return this.#s(e, (f) => ({
      ...f,
      position: { ...f.position, x: p }
    }));
  }
  deleteNode(e) {
    const t = this.#a(e), i = this.#i.connections.filter((o) => o.from !== e && o.to !== e), a = this.#i.connections.length - i.length;
    return this.#i = {
      ...this.#i,
      nodes: this.#i.nodes.filter((o) => o.id !== e),
      connections: i
    }, this.#n = !0, { node: t, removedConnections: a };
  }
  connect(e, t) {
    if (this.#a(e), this.#a(t), e === t)
      throw new me("self-connection", "A Focus node cannot connect to itself.");
    if (this.#i.connections.some((a) => a.from === e && a.to === t))
      throw new me(
        "duplicate-connection",
        `Focus connection '${e}' -> '${t}' already exists.`
      );
    const i = {
      id: this.#o(
        "connection",
        new Set(this.#i.connections.map((a) => a.id))
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
      throw new me(
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
    Ga(t);
    const i = this.#a(e);
    if (t.uuid !== i.abilityUuid)
      throw new me(
        "ability-source-mismatch",
        "The refreshed Ability does not match the node source UUID."
      );
    return this.#s(e, (a) => ({
      ...a,
      abilitySnapshot: qa(t)
    }));
  }
  cancel() {
    return this.#i = ke(this.#t), this.#n = !1, this.graph;
  }
  async save(e) {
    const t = rn(this.#i), i = t.filter((o) => o.severity === "error");
    if (i.length > 0) throw new dt(i);
    const a = this.graph;
    return await e(a), this.#t = ke(a), this.#i = ke(a), this.#n = !1, { graph: a, diagnostics: t };
  }
  #a(e) {
    const t = this.#i.nodes.find((i) => i.id === e);
    if (!t)
      throw new me("node-not-found", `Focus node '${e}' was not found.`);
    return t;
  }
  #s(e, t) {
    const i = this.#a(e), a = t(i);
    return this.#i = {
      ...this.#i,
      nodes: this.#i.nodes.map((o) => o.id === e ? a : o)
    }, this.#n = !0, ke({ version: this.#i.version, nodes: [a], connections: [] }).nodes[0];
  }
  #o(e, t) {
    for (let i = 0; i < 100; i += 1) {
      const a = this.#e().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24), o = `${e}-${a}`;
      if (a && !t.has(o)) return o;
    }
    throw new me(
      "unique-id-unavailable",
      `Unable to generate a unique ${e} ID.`
    );
  }
}
function dd(n) {
  const e = n.querySelector(".cypherv2-sheet.cypherv2-item"), t = n.querySelector(".window-content"), i = [...n.querySelectorAll(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )].map((a) => {
    const o = a.querySelector(".focus-tree-scroll");
    return {
      focusUuid: a.dataset.focusUuid ?? "",
      left: o?.scrollLeft ?? 0,
      top: o?.scrollTop ?? 0
    };
  });
  return {
    vertical: e?.scrollTop ?? 0,
    windowVertical: t?.scrollTop ?? 0,
    trees: i
  };
}
function ud(n, e) {
  const t = n.querySelector(".cypherv2-sheet.cypherv2-item");
  t && (t.scrollTop = e.vertical);
  const i = n.querySelector(".window-content");
  i && (i.scrollTop = e.windowVertical);
  const a = [...n.querySelectorAll(
    ".cypherv2-focus-tree-section[data-focus-uuid]"
  )];
  for (const o of e.trees) {
    const r = a.find((l) => l.dataset.focusUuid === o.focusUuid)?.querySelector(".focus-tree-scroll");
    r && (r.scrollLeft = o.left, r.scrollTop = o.top);
  }
}
class md extends Error {
  constructor(e) {
    super("Only one Shield may be equipped at a time."), this.shieldIds = e, this.name = "MultipleEquippedShieldsError";
  }
  shieldIds;
}
class fs extends Error {
  constructor(e, t, i) {
    super(`Shield ${e} capacity cannot be lower than its current Wound count (${i}).`), this.severity = e, this.requested = t, this.current = i, this.name = "ShieldCapacityBelowWoundsError";
  }
  severity;
  requested;
  current;
}
class hs {
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
    if (t.length > 1) throw new md(t.map((i) => i.id));
    return t[0] ?? null;
  }
  async normalizeEquipped(e) {
    const t = this.shields(e).filter((o) => o.system.equipped);
    if (t.length <= 1) return t[0] ?? null;
    const [i, ...a] = [...t].sort((o, s) => Number(this.isBroken(o)) - Number(this.isBroken(s)) || o.name.localeCompare(s.name) || o.id.localeCompare(s.id));
    return await Promise.all(a.map((o) => o.update(
      { "system.equipped": !1 },
      { cypherv2ShieldEquipmentSync: !0 }
    ))), i ?? null;
  }
  async setEquipped(e, t, i) {
    if (!this.shields(e).some((a) => a.id === t.id))
      throw new Error("Shield does not belong to this Character.");
    return i ? (await t.update({ "system.equipped": !0 }, { cypherv2ShieldEquipmentSync: !0 }), await Promise.all(this.shields(e).filter((a) => a.id !== t.id && a.system.equipped).map((a) => a.update(
      { "system.equipped": !1 },
      { cypherv2ShieldEquipmentSync: !0 }
    ))), t) : (await t.update({ "system.equipped": !1 }, { cypherv2ShieldEquipmentSync: !0 }), null);
  }
  isBroken(e) {
    return e.system.wounds.major.length >= this.capacities(e).major;
  }
  capacities(e) {
    return e.system.derived?.capacities ?? e.system.woundCapacities ?? Le;
  }
  async setCapacity(e, t, i) {
    if (!Number.isInteger(i) || i < 0)
      throw new RangeError("Shield Wound capacity must be a non-negative whole number.");
    const a = e.system.wounds[t].length;
    if (i < a) throw new fs(t, i, a);
    await e.update({ [`system.woundCapacities.${t}`]: i });
  }
  canAbsorb(e) {
    const t = this.equipped(e);
    return !!(t && !this.isBroken(t));
  }
  async apply(e, t, i, a = {}) {
    const o = this.equipped(e);
    if (!o || o.id !== t.id) throw new Error("The Shield is not the equipped Shield.");
    return this.applyResolved(e, t, i, a);
  }
  /** Apply a deferred consequence to the exact Shield captured when the defense resolved. */
  async applyResolved(e, t, i, a = {}) {
    if (!this.shields(e).some((u) => u.id === t.id))
      throw new Error("Shield does not belong to this Character.");
    if (this.isBroken(t)) throw new Error("A Broken Shield cannot absorb another Wound.");
    const o = this.capacities(t), s = await this.#e.applyTrack(t, i, o, {
      ...a,
      label: a.label ?? `${i[0].toUpperCase()}${i.slice(1)} Shield Wound`,
      sourceUuid: a.sourceUuid ?? "cypherv2.shield"
    }), { dead: r, ...l } = s;
    return {
      ...l,
      shield: t,
      broken: s.wounds.major.length >= o.major
    };
  }
  async edit(e, t, i, a) {
    return this.#e.editTrack(e, t, i, a);
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
    const a = await this.#e.deleteTrack(e, t, i);
    return { ...a, broken: a.wounds.major.length >= this.capacities(e).major };
  }
}
function La(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
async function pd(n, e, t) {
  const i = n.system.wounds[e].find((o) => o.id === t);
  if (!i) throw new Error(`Shield Wound '${t}' was not found.`);
  const a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.EditTitle") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}<input name="label" type="text" value="${La(i.label)}"></label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}<textarea name="description">${La(i.description)}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  a && await game.cypherv2.services.shields.edit(n, e, t, {
    label: String(a.label ?? ""),
    description: String(a.description ?? "")
  });
}
async function fd(n, e, t) {
  await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Wounds.DeleteTitle") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Wounds.DeleteConfirm")}</p></div>`,
    rejectClose: !1,
    modal: !0,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) && await game.cypherv2.services.shields.delete(n, e, t);
}
function hd(n) {
  const e = n.roll === "attack", t = n.roll === "task", i = n.roll === "defense", a = t || i || n.rollModifier !== 0, o = e || n.attackModifier !== 0, s = e || n.damage !== 0, r = e || n.woundSeverity !== "none", l = e || n.range.trim() !== "", u = e || n.targetMode !== "none";
  return {
    showIgnoresEdge: n.cost.amount > 0 && !!n.cost.allowedPools?.length || n.cost.ignoresEdge,
    showRollModifier: a,
    rollModifierLabel: t ? "task" : i ? "defense" : "general",
    showAttackModifier: o,
    showDamage: s,
    showWoundSeverity: r,
    showRange: l,
    showTargetMode: u,
    hasConditionalFields: a || o || s || r || l || u
  };
}
function gd(n) {
  return n.defaultPool !== "choose" || n.category !== "general" || n.contexts.length > 0 || n.initiative;
}
function yd(n) {
  const e = n.querySelector("[data-item-sheet-scroll]"), t = n.querySelector("[data-item-focus-key]:focus"), i = t?.dataset.itemFocusKey;
  if (!t || !i) return { scrollTop: e?.scrollTop ?? 0 };
  let a = null, o = null, s = null;
  try {
    a = t.selectionStart, o = t.selectionEnd, s = t.selectionDirection;
  } catch {
  }
  return {
    scrollTop: e?.scrollTop ?? 0,
    focusedInput: {
      key: i,
      ...a === null ? {} : { selectionStart: a },
      ...o === null ? {} : { selectionEnd: o },
      ...s === null ? {} : { selectionDirection: s }
    }
  };
}
function bd(n, e) {
  const t = n.querySelector("[data-item-sheet-scroll]");
  if (t && (t.scrollTop = e.scrollTop), !e.focusedInput) return;
  const i = [...n.querySelectorAll("[data-item-focus-key]")].find((r) => r.dataset.itemFocusKey === e.focusedInput?.key);
  if (!i) return;
  i.focus({ preventScroll: !0 });
  const { selectionStart: a, selectionEnd: o, selectionDirection: s } = e.focusedInput;
  if (!(a === void 0 || o === void 0))
    try {
      i.setSelectionRange(a, o, s);
    } catch {
    }
}
function Se(n) {
  return n.replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[e]);
}
function J(n) {
  ui.notifications.error(n instanceof Error ? n.message : String(n));
}
const wd = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
), ja = /* @__PURE__ */ new Set([
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
class Y extends wd {
  #e = new Zo();
  #t = new rd();
  #i = new es();
  #n = null;
  #a = null;
  #s = null;
  #o = null;
  #c = null;
  #l = null;
  #r = /* @__PURE__ */ new Set();
  #d = /* @__PURE__ */ new Set();
  #u = null;
  #b = null;
  #p = null;
  #f = null;
  static #y(e) {
    const t = e.dataset.severity, i = e.dataset.woundId;
    if (!re.includes(t) || !i)
      throw new Error("Invalid Shield Wound action data.");
    return { severity: t, woundId: i };
  }
  static async #m(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !this.isEditable || this.item.actor && !game.user.isGM && !this.item.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const i = pn(t.dataset);
    if (i.track !== "shield" || i.shieldId !== this.item.id)
      throw new Error("Invalid Shield Wound count action data.");
    await game.cypherv2.services.shields.setCount(
      this.item,
      i.severity,
      i.count
    ), await this.render({ force: !0 });
  }
  static async #w(e, t) {
    const i = Y.#y(t);
    await pd(this.item, i.severity, i.woundId);
  }
  static async #v(e, t) {
    const i = Y.#y(t);
    await fd(this.item, i.severity, i.woundId);
  }
  static async #Y() {
    !this.isEditable || this.item.type !== "weapon" || (await game.cypherv2.services.weapons.reload(this.item), await this.render({ force: !0 }));
  }
  static DEFAULT_OPTIONS = {
    ...Vn,
    classes: ["cypherv2", "sheet", "item", "item-sheet"],
    actions: Dn({
      rollDepletion: Y.#Q,
      reloadWeapon: Y.#Y,
      openFocusNode: Y.#Z,
      editFocusTree: Y.#ee,
      addFocusAbility: Y.#te,
      saveFocusTree: Y.#ie,
      cancelFocusTree: Y.#ne,
      selectFocusEditorNode: Y.#ae,
      moveFocusNode: Y.#oe,
      setFocusNodeTier: Y.#se,
      startFocusConnection: Y.#re,
      completeFocusConnection: Y.#le,
      cancelFocusConnection: Y.#ce,
      deleteFocusConnection: Y.#de,
      clearFocusConnections: Y.#ue,
      refreshFocusSnapshot: Y.#me,
      deleteFocusNode: Y.#pe,
      addPackageGrant: Y.#U,
      addChoiceGroup: Y.#B,
      addChoiceOption: Y.#_,
      inspectPackageGrant: Y.#K,
      refreshPackageGrant: Y.#X,
      removePackageGrant: Y.#J,
      addPoolBonusChoiceGroup: Y.#L,
      editPoolBonusChoiceGroup: Y.#j,
      removePoolBonusChoiceGroup: Y.#W,
      setShieldWoundCount: Y.#m,
      editShieldWound: Y.#w,
      deleteShieldWound: Y.#v,
      addGenreAbility: Y.#x,
      inspectGenreAbility: Y.#q,
      refreshGenreAbility: Y.#G,
      removeGenreAbility: Y.#O
    }, ja),
    position: { width: 620, height: 680 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/item/item-sheet.hbs" }
  };
  async _onRender(e, t) {
    if (await super._onRender(e, t), Fn(this.element, this.isEditable, ja), this.#l?.abort(), this.#l = null, this.#c && (ud(this.element, this.#c), this.#c = null), this.#u && (bd(this.element, this.#u), this.#u = null), this.#t.connectionSourceNodeId) {
      const i = new AbortController();
      this.#l = i, this.element.addEventListener("keydown", (a) => {
        a.key === "Escape" && (a.preventDefault(), a.stopPropagation(), this.#t.cancelConnection(), this.#h());
      }, { signal: i.signal }), this.element.querySelector(".focus-tree-node-editor")?.focus({ preventScroll: !0 });
    }
    this.#e.bind(this.element), this.#i.bind(this.element), this.#z(), this.#N(), this.#M(), this.#D(), this.#F(), this.#T();
  }
  _onClose(e) {
    this.#e.disconnect(), this.#i.disconnect(), this.#n?.abort(), this.#n = null, this.#a?.abort(), this.#a = null, this.#s?.abort(), this.#s = null, this.#b?.abort(), this.#b = null, this.#p?.abort(), this.#p = null, this.#f?.abort(), this.#f = null, this.#o?.cancel(), this.#o = null, this.#t.reset(), this.#c = null, this.#l?.abort(), this.#l = null, super._onClose(e);
  }
  #D() {
    this.#b?.abort();
    const e = new AbortController();
    this.#b = e;
    const t = [...this.element.querySelectorAll("details")];
    for (const [i, a] of t.entries()) {
      const o = a.dataset.persistentDisclosure ?? `item-details-${i}`;
      this.#r.has(o) ? a.open = !0 : this.#d.has(o) && (a.open = !1), a.addEventListener("toggle", () => {
        a.open ? (this.#r.add(o), this.#d.delete(o)) : (this.#r.delete(o), this.#d.add(o));
      }, { signal: e.signal });
    }
  }
  #F() {
    if (this.#p?.abort(), this.#p = null, !this.isEditable) return;
    const e = this.element.querySelector("[data-depletion-sides]"), t = this.element.querySelector("[data-depletion-threshold]");
    if (!e && !t || !["weapon", "shield", "armor"].includes(this.item.type)) return;
    const i = new AbortController();
    this.#p = i, e?.addEventListener("change", async () => {
      const a = Number(e.value), o = Number(this.item.system.depletion.threshold);
      if (!Number.isInteger(a) || a < 2 || a > 1e3 || o > a) {
        ui.notifications.error(game.i18n.localize("CYPHERV2.Depletion.InvalidDie")), await this.render({ force: !0 });
        return;
      }
      await this.item.update({ "system.depletion.die": `d${a}` });
    }, { signal: i.signal }), t?.addEventListener("change", async () => {
      const a = t.value.trim().match(/^1(?:-(\d+))?$/), o = Number(a?.[1] ?? (a ? 1 : Number.NaN)), s = Ft(this.item.system.depletion);
      if (!Number.isInteger(o) || o < 1 || o > s) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Depletion.InvalidThreshold", { sides: s })), await this.render({ force: !0 });
        return;
      }
      await this.item.update({ "system.depletion.threshold": o });
    }, { signal: i.signal });
  }
  #T() {
    if (this.#f?.abort(), this.#f = null, this.item.type !== "shield" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll("input[data-shield-capacity]")];
    if (!e.length) return;
    const t = new AbortController();
    this.#f = t;
    for (const i of e)
      i.addEventListener("change", async (a) => {
        a.preventDefault(), a.stopPropagation();
        const o = i.dataset.severity;
        if (re.includes(o))
          try {
            await game.cypherv2.services.shields.setCapacity(
              this.item,
              o,
              Number(i.value)
            );
          } catch (s) {
            s instanceof fs ? ui.notifications.warn(game.i18n.format("CYPHERV2.Shield.CapacityTooLow", {
              severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${s.severity}`),
              count: s.current
            })) : J(s), await this.render({ force: !0 });
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
      i.addEventListener("change", async (a) => {
        a.stopPropagation();
        const o = e.filter((s) => s.checked).map((s) => s.value).filter((s) => I.includes(s));
        try {
          await this.item.update({ "system.cost.allowedPools": o });
        } catch (s) {
          J(s), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #N() {
    if (this.#a?.abort(), this.#a = null, this.item.type !== "genre" || !this.isEditable) return;
    const e = [...this.element.querySelectorAll(
      "input[data-genre-minimum-tier]"
    )];
    if (!e.length) return;
    const t = new AbortController();
    this.#a = t;
    for (const i of e)
      i.addEventListener("change", async (a) => {
        a.preventDefault(), a.stopPropagation();
        const o = i.dataset.entryId ?? "", s = this.item.system.abilityCatalog;
        try {
          const r = Ur(s, o, Number(i.value));
          await this.item.update({ "system.abilityCatalog": r });
        } catch (r) {
          J(r), await this.render({ force: !0 });
        }
      }, { signal: t.signal });
  }
  #M() {
    if (this.#s?.abort(), this.#s = null, this.item.type !== "characterType") return;
    const e = this.element.querySelector("select[data-type-genre-select]"), t = this.element.querySelector("[data-type-custom-genre]");
    if (!e || !t) return;
    const i = new AbortController();
    this.#s = i;
    const a = () => {
      t.hidden = e.value !== "custom";
    };
    e.addEventListener("change", a, { signal: i.signal }), a();
  }
  _canDragDrop(e) {
    return this.item.type !== "focus" ? this.isEditable : !!(this.isEditable && game.user.isGM && this.#o);
  }
  async _onDropDocument(e, t) {
    if (!this.isEditable) return null;
    if (this.item.type === "genre" && t?.type === "ability")
      return await this.#$(t), t;
    if (this.item.type === "characterType" && ["ability", "skill"].includes(t?.type))
      return await this.#P(t, "fixed"), t;
    if (this.item.type === "descriptor" && t?.type === "skill")
      return await this.#P(t, "fixed"), t;
    if (this.item.type === "species" && ["ability", "skill", "descriptor"].includes(t?.type))
      return await this.#P(t, "fixed"), t;
    if (this.item.type !== "focus" || !this.#o)
      return super._onDropDocument(e, t);
    const i = e.target;
    if (i instanceof Element && !i.closest(".focus-item-tree"))
      return super._onDropDocument(e, t);
    try {
      return await this.#fe(t), t;
    } catch (a) {
      return J(a), null;
    }
  }
  static async #U(e, t) {
    const i = this.item.type === "characterType" ? t.dataset.grantTarget ?? "ability" : this.item.type === "descriptor" ? "skill" : t.dataset.grantTarget;
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species" || i !== "ability" && i !== "skill" && i !== "descriptor") return;
    const a = [...game.items].filter((r) => r.type === i).sort((r, l) => r.name.localeCompare(l.name)), o = i === "skill" ? `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>` : "";
    if (!a.length && i === "ability") {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.NoWorldAbilities"));
      return;
    }
    const s = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(i === "ability" ? "CYPHERV2.Packages.AddAbility" : i === "skill" ? "CYPHERV2.Packages.AddFixedSkill" : "CYPHERV2.Species.AddDescriptorGrant") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${o}${a.map((r) => `<option value="${Se(r.uuid)}">${Se(r.name)}</option>`).join("")}</select></label>${i === "skill" ? `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${_.map((r) => `<option value="${r}" ${r === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${r}`)}</option>`).join("")}</select></label>` : ""}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (s)
      if (s.uuid === "custom") {
        const r = String(s.customName ?? "").trim();
        if (!r) return;
        await this.#he(r, String(s.rank ?? "trained"));
      } else {
        const r = await fromUuid(String(s.uuid ?? ""));
        r && await this.#P(r, "fixed", String(s.rank ?? "trained"));
      }
  }
  static async #x() {
    if (this.item.type !== "genre") return;
    const e = [...game.items].filter((a) => a.type === "ability").sort((a, o) => a.name.localeCompare(o.name));
    if (!e.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldAbilities"));
      return;
    }
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Genre.AddAbility") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}
        <select name="uuid">${e.map((a) => `<option value="${Se(a.uuid)}">${Se(a.name)}</option>`).join("")}</select></label>
        <label>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")}<input name="minimumTier" type="number" min="${_e}" max="${Vt}" value="${_e}"></label></div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!t) return;
    const i = await fromUuid(String(t.uuid ?? ""));
    i && await this.#$(i, Number(t.minimumTier ?? 1));
  }
  static async #q(e, t) {
    const i = this.#I(t.dataset.entryId);
    if (!i) return;
    const a = i.abilityUuid ? await fromUuid(i.abilityUuid) : null;
    if (a) {
      await a.sheet?.render(!0);
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
    const i = this.#I(t.dataset.entryId);
    if (!i) return;
    const a = i.abilityUuid ? await fromUuid(i.abilityUuid) : null;
    if (!a) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    const o = this.item.system.abilityCatalog;
    await this.item.update({
      "system.abilityCatalog": xr(o, i.id, this.#C(a))
    });
  }
  static async #O(e, t) {
    const i = t.dataset.entryId;
    if (!i || this.item.type !== "genre") return;
    const a = this.item.system.abilityCatalog;
    await this.item.update({ "system.abilityCatalog": qr(a, i) });
  }
  static async #B(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = this.item.type !== "descriptor" && t.dataset.choiceKind === "ability", a = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.AddChoiceGroup") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="1"></label>${i ? "" : `<label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${_.map((s) => `<option value="${s}" ${s === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${s}`)}</option>`).join("")}</select></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!a) return;
    const o = this.item.system;
    if (i) {
      const s = { id: crypto.randomUUID(), choose: Math.max(1, Number(a.choose) || 1), options: [] };
      await this.item.update({ "system.abilityChoiceGroups": [...o.abilityChoiceGroups, s] });
    } else {
      const s = { id: crypto.randomUUID(), choose: Math.max(1, Number(a.choose) || 1), rank: String(a.rank), options: [] };
      await this.item.update({ "system.choiceGroups": [...o.choiceGroups, s] });
    }
  }
  async #k(e) {
    const t = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize(e ? "CYPHERV2.Packages.EditPoolBonusChoiceGroup" : "CYPHERV2.Packages.AddPoolBonusChoiceGroup") },
      content: `<div class="cypherv2 cypherv2-dialog package-pool-choice-authoring">
        <div class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.Amount")}<input name="amount" type="number" min="1" value="${e?.amount ?? 1}"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="${e?.choose ?? 1}"></label>
        </div>
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Packages.AllowedPools")}</span>
        <div class="package-pool-choice-options">
          ${I.map((s) => `<label class="cypherv2-dialog-toggle"><input name="pool_${s}" type="checkbox" ${e?.pools.includes(s) ? "checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Pools.${s[0].toUpperCase()}${s.slice(1)}`)}</span></label>`).join("")}
        </div>
      </div>`,
      ok: { label: game.i18n.localize(e ? "CYPHERV2.Actions.Save" : "CYPHERV2.Actions.Add") }
    });
    if (!t) return null;
    const i = Math.trunc(Number(t.amount)), a = Math.trunc(Number(t.choose)), o = I.filter((s) => !!t[`pool_${s}`]);
    return !Number.isInteger(i) || i < 1 || !Number.isInteger(a) || a < 1 || a > o.length ? (ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice")), null) : { amount: i, choose: a, pools: o };
  }
  static async #L() {
    if (this.item.type !== "descriptor") return;
    const e = await this.#k();
    if (!e) return;
    const t = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({ "system.poolBonusChoiceGroups": [...t, { id: crypto.randomUUID(), ...e }] });
  }
  static async #j(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [], a = i.find((s) => s.id === t.dataset.groupId);
    if (!a) return;
    const o = await this.#k(a);
    o && await this.item.update({
      "system.poolBonusChoiceGroups": i.map((s) => s.id === a.id ? { ...s, ...o } : s)
    });
  }
  static async #W(e, t) {
    if (this.item.type !== "descriptor") return;
    const i = this.item.system.poolBonusChoiceGroups ?? [];
    await this.item.update({
      "system.poolBonusChoiceGroups": i.filter((a) => a.id !== t.dataset.groupId)
    });
  }
  static async #_(e, t) {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const i = t.dataset.groupId, a = this.item.system, o = this.item.type !== "descriptor" && t.dataset.choiceKind === "ability";
    if (!(o ? a.abilityChoiceGroups.find((c) => c.id === i) : a.choiceGroups.find((c) => c.id === i))) return;
    const r = [...game.items].filter((c) => c.type === (o ? "ability" : "skill")).sort((c, p) => c.name.localeCompare(p.name)), l = await foundry.applications.api.DialogV2.input({
      window: { title: game.i18n.localize("CYPHERV2.Packages.AddSkillOption") },
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${o ? "" : `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>`}${r.map((c) => `<option value="${Se(c.uuid)}">${Se(c.name)}</option>`).join("")}</select></label>${o ? "" : `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label>`}</div>`,
      ok: { label: game.i18n.localize("CYPHERV2.Actions.Add") }
    });
    if (!l) return;
    const u = l.uuid === "custom" ? null : await fromUuid(String(l.uuid ?? ""));
    if (o) {
      if (!u) return;
      const c = { id: crypto.randomUUID(), abilityUuid: u.uuid, snapshot: this.#C(u) }, p = a.abilityChoiceGroups;
      await this.item.update({ "system.abilityChoiceGroups": p.map((f) => f.id === i ? { ...f, options: [...f.options, c] } : f) });
    } else {
      const c = this.#R(u, String(l.customName ?? ""));
      if (!c) return;
      await this.item.update({ "system.choiceGroups": a.choiceGroups.map((p) => p.id === i ? { ...p, options: [...p.options, c] } : p) });
    }
  }
  static async #K(e, t) {
    const i = this.#V(t);
    if (!i) return;
    const a = "abilityUuid" in i ? i.abilityUuid : "skillUuid" in i ? i.skillUuid : i.descriptorUuid, o = a ? await fromUuid(a) : null;
    if (o) {
      await o.sheet?.render(!0);
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
    const a = "abilityUuid" in i ? i.abilityUuid : "skillUuid" in i ? i.skillUuid : i.descriptorUuid, o = a ? await fromUuid(a) : null;
    if (!o) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    await this.#ge(t, { ...i, snapshot: this.#C(o) });
  }
  static async #J(e, t) {
    const i = t.dataset.grantKind, a = t.dataset.grantId;
    if (a) {
      if (i === "ability") {
        const o = this.item.system.abilityGrants;
        await this.item.update({ "system.abilityGrants": o.filter((s) => s.id !== a) });
      } else if (i === "skill") {
        const o = this.item.system.skillGrants;
        await this.item.update({ "system.skillGrants": o.filter((s) => s.id !== a) });
      } else if (i === "option") {
        const o = t.dataset.groupId, s = this.item.system.choiceGroups;
        await this.item.update({ "system.choiceGroups": s.map((r) => r.id === o ? { ...r, options: r.options.filter((l) => l.id !== a) } : r) });
      } else if (i === "group") {
        const o = this.item.system.choiceGroups;
        await this.item.update({ "system.choiceGroups": o.filter((s) => s.id !== a) });
      } else if (i === "abilityOption") {
        const o = t.dataset.groupId, s = this.item.system.abilityChoiceGroups;
        await this.item.update({ "system.abilityChoiceGroups": s.map((r) => r.id === o ? { ...r, options: r.options.filter((l) => l.id !== a) } : r) });
      } else if (i === "abilityGroup") {
        const o = this.item.system.abilityChoiceGroups;
        await this.item.update({ "system.abilityChoiceGroups": o.filter((s) => s.id !== a) });
      } else if (i === "descriptor") {
        const o = this.item.system.descriptorGrants;
        await this.item.update({ "system.descriptorGrants": o.filter((s) => s.id !== a) });
      }
    }
  }
  static async #Q() {
    await di(this.item);
  }
  static async #Z(e, t) {
    const i = t.dataset.nodeId;
    if (!i) throw new Error("Missing Focus node ID.");
    await Qo(this.#A(), i);
  }
  static async #ee() {
    try {
      this.#S(), this.#o = new cd(
        this.item.system.graph
      ), this.#t.reset(), await this.#h();
    } catch (e) {
      J(e);
    }
  }
  static async #te() {
    try {
      const e = this.#g(), t = [...game.items].filter((s) => s.type === "ability").sort((s, r) => s.name.localeCompare(r.name));
      if (t.length === 0) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Editor.NoWorldAbilities"));
        return;
      }
      const i = await foundry.applications.api.DialogV2.input({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") },
        content: `<div class="cypherv2-dialog-fields">
          <label>${game.i18n.localize("CYPHERV2.Focus.Editor.Ability")}
            <select name="abilityUuid">${t.map((s) => `<option value="${Se(s.uuid)}">${Se(s.name)}</option>`).join("")}</select>
          </label>
          ${this.#H()}
        </div>`,
        rejectClose: !1,
        ok: { label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility") }
      });
      if (!i) return;
      const a = await fromUuid(String(i.abilityUuid ?? ""));
      if (!a) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      const o = e.addAbility(
        a,
        Number(i.tier ?? 1)
      );
      this.#t.select(o.id), await this.#h();
    } catch (e) {
      J(e);
    }
  }
  static async #ie() {
    try {
      const e = this.#g(), t = e.diagnostics().filter((i) => i.severity === "warning");
      t.length > 0 && ui.notifications.warn(t.map((i) => i.message).join(`
`)), await e.save((i) => this.item.update({ "system.graph": i })), this.#o = null, this.#t.reset(), ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Editor.Saved")), await this.#h();
    } catch (e) {
      if (e instanceof dt) {
        ui.notifications.error(e.diagnostics.map((t) => t.message).join(`
`));
        return;
      }
      J(e);
    }
  }
  static async #ne() {
    this.#o?.cancel(), this.#o = null, this.#t.reset(), await this.#h();
  }
  static async #ae(e, t) {
    e.preventDefault(), e.stopPropagation(), this.#g(), this.#t.select(this.#E(t)), await this.#h();
  }
  static async #oe(e, t) {
    try {
      const i = t.dataset.direction;
      if (i !== "left" && i !== "right") throw new Error("Missing movement direction.");
      this.#g().moveNode(this.#E(t), i), await this.#h();
    } catch (i) {
      J(i);
    }
  }
  static async #se(e, t) {
    try {
      this.#g().setTier(this.#E(t), Number(t.dataset.tier)), await this.#h();
    } catch (i) {
      J(i);
    }
  }
  static async #re(e, t) {
    this.#g(), this.#t.startConnection(), await this.#h();
  }
  static async #le(e, t) {
    try {
      const i = this.#E(t), a = this.#t.connectionTo(i);
      this.#g().connect(a.from, a.to), this.#t.finishConnection(i), await this.#h();
    } catch (i) {
      J(i);
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
      J(i);
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
      J(e);
    }
  }
  static async #me(e, t) {
    try {
      const i = this.#E(t), a = this.#g().graph.nodes.find((s) => s.id === i);
      if (!a) throw new Error(`Focus node '${i}' was not found.`);
      const o = await fromUuid(a.abilityUuid);
      if (!o) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      this.#g().refreshSnapshot(i, o), await this.#h();
    } catch (i) {
      J(i);
    }
  }
  static async #pe(e, t) {
    try {
      const i = this.#E(t), a = this.#g().graph.nodes.find((s) => s.id === i);
      if (!a) throw new Error(`Focus node '${i}' was not found.`);
      if (!await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CYPHERV2.Focus.Editor.DeleteNode") },
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.Editor.DeleteNodeConfirm", {
          name: Se(a.abilitySnapshot.name || a.id)
        })}</p></div>`,
        rejectClose: !1,
        modal: !0,
        yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
        no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
      })) return;
      this.#g().deleteNode(i), this.#t.clearSelection(i), await this.#h();
    } catch (i) {
      J(i);
    }
  }
  #S() {
    if (this.item.type !== "focus" || !game.user.isGM || !this.isEditable)
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.GmOnly"));
  }
  #g() {
    if (this.#S(), !this.#o) throw new Error("Focus Tree editing is not active.");
    return this.#o;
  }
  #A() {
    const e = this.#o?.graph ?? this.item.system.graph;
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
    const a = t.addAbility(e, Number(i.tier ?? 1));
    this.#t.select(a.id), await this.#h();
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
  #I(e) {
    return !e || this.item.type !== "genre" ? null : this.item.system.abilityCatalog.find((t) => t.id === e) ?? null;
  }
  async #$(e, t = 1) {
    if (this.item.type !== "genre" || e.type !== "ability")
      throw new Error(game.i18n.localize("CYPHERV2.Genre.DropAbilityOnly"));
    const i = this.item.system;
    if (i.abilityCatalog.some((o) => o.abilityUuid === e.uuid)) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.DuplicateAbility"));
      return;
    }
    const a = {
      id: crypto.randomUUID(),
      abilityUuid: e.uuid,
      minimumTier: zo(t),
      snapshot: this.#C(e)
    };
    await this.item.update({ "system.abilityCatalog": [...i.abilityCatalog, a] });
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
    const i = this.item.system, a = this.#R(null, e);
    if (!a) return;
    const o = { ...a, rank: t };
    await this.item.update({ "system.skillGrants": [...i.skillGrants, o] });
  }
  async #P(e, t, i = "trained") {
    if (this.item.type === "characterType" && e.type === "ability") {
      const a = this.item.system, o = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#C(e) };
      await this.item.update({ "system.abilityGrants": [...a.abilityGrants, o] });
      return;
    }
    if (this.item.type === "characterType" && e.type === "skill") {
      const a = this.item.system, o = this.#R(e);
      if (!o) return;
      await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...o, rank: i }] });
      return;
    }
    if (this.item.type === "descriptor" && e.type === "skill") {
      const a = this.item.system, o = this.#R(e);
      if (!o) return;
      await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...o, rank: i }] });
      return;
    }
    if (this.item.type === "species") {
      const a = this.item.system;
      if (e.type === "ability") {
        const o = { id: crypto.randomUUID(), abilityUuid: e.uuid, snapshot: this.#C(e) };
        await this.item.update({ "system.abilityGrants": [...a.abilityGrants, o] });
        return;
      }
      if (e.type === "skill") {
        const o = this.#R(e);
        if (!o) return;
        await this.item.update({ "system.skillGrants": [...a.skillGrants, { ...o, rank: i }] });
        return;
      }
      if (e.type === "descriptor") {
        const o = { id: crypto.randomUUID(), descriptorUuid: e.uuid, snapshot: this.#C(e) };
        await this.item.update({ "system.descriptorGrants": [...a.descriptorGrants, o] });
        return;
      }
    }
    throw new Error(game.i18n.localize("CYPHERV2.Packages.InvalidDrop"));
  }
  #V(e) {
    const t = e.dataset.grantKind, i = e.dataset.grantId;
    if (!i) return null;
    if (t === "ability") return this.item.system.abilityGrants.find((o) => o.id === i) ?? null;
    const a = this.item.system;
    return t === "skill" ? a.skillGrants.find((o) => o.id === i) ?? null : t === "option" ? a.choiceGroups.find((o) => o.id === e.dataset.groupId)?.options.find((o) => o.id === i) ?? null : t === "abilityOption" ? this.item.system.abilityChoiceGroups.find((o) => o.id === e.dataset.groupId)?.options.find((o) => o.id === i) ?? null : t === "descriptor" ? this.item.system.descriptorGrants.find((o) => o.id === i) ?? null : null;
  }
  async #ge(e, t) {
    const i = e.dataset.grantKind, a = e.dataset.grantId;
    if (i === "ability") {
      const o = this.item.system.abilityGrants;
      await this.item.update({ "system.abilityGrants": o.map((s) => s.id === a ? t : s) });
    } else if (i === "skill") {
      const o = this.item.system.skillGrants;
      await this.item.update({ "system.skillGrants": o.map((s) => s.id === a ? t : s) });
    } else if (i === "option") {
      const o = e.dataset.groupId, s = this.item.system.choiceGroups;
      await this.item.update({ "system.choiceGroups": s.map((r) => r.id === o ? { ...r, options: r.options.map((l) => l.id === a ? t : l) } : r) });
    } else if (i === "abilityOption") {
      const o = e.dataset.groupId, s = this.item.system.abilityChoiceGroups;
      await this.item.update({ "system.abilityChoiceGroups": s.map((r) => r.id === o ? { ...r, options: r.options.map((l) => l.id === a ? t : l) } : r) });
    } else if (i === "descriptor") {
      const o = this.item.system.descriptorGrants;
      await this.item.update({ "system.descriptorGrants": o.map((s) => s.id === a ? t : s) });
    }
  }
  #E(e) {
    const t = e.dataset.nodeId;
    if (!t) throw new Error("Missing Focus node ID.");
    return t;
  }
  async #h() {
    this.#c = dd(this.element), await this.render({ force: !0 });
  }
  async _prepareContext(e) {
    this.element?.isConnected && (this.#u = yd(this.element));
    const t = await super._prepareContext(e), i = this.item.system, a = this.item.type === "skill", o = this.item.type === "ability", s = this.item.type === "weapon", r = this.item.type === "armor", l = this.item.type === "shield", u = this.item.type === "equipment", c = this.item.type === "cypher", p = this.item.type === "artifact", f = this.item.type === "focus", m = this.item.type === "genre", b = this.item.type === "characterType", g = this.item.type === "descriptor", y = this.item.type === "species", v = ["ability", "focus", "genre", "skill", "weapon", "armor", "shield", "equipment", "cypher", "artifact", "characterType", "descriptor", "species"].includes(this.item.type), k = typeof this.item._source?.system?.description == "string" ? this.item._source.system.description : "", P = v ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(k, {
      async: !0,
      relativeTo: this.item
    }) : "", A = b ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.backgroundOptions ?? ""), { async: !0, relativeTo: this.item }) : "", $ = b ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.equipmentNotes ?? ""), { async: !0, relativeTo: this.item }) : "", D = String(i.rank ?? "untrained"), K = String(i.defaultPool ?? "choose"), de = Array.isArray(i.contexts) ? i.contexts : [], H = o ? Ne(this.item) : [], j = o ? hd(i) : null, ve = j ? {
      ...j,
      rollModifierLabel: game.i18n.localize(
        j.rollModifierLabel === "task" ? "CYPHERV2.Ability.TaskModifier" : j.rollModifierLabel === "defense" ? "CYPHERV2.Ability.DefenseModifier" : "CYPHERV2.Ability.RollModifier"
      )
    } : null, V = a && gd({
      defaultPool: K,
      category: String(i.category ?? "general"),
      contexts: de,
      initiative: !!i.initiative
    }), x = i.grantedBy, ie = !!(x?.sourceUuid || x?.instanceId || x?.grantId), ue = f ? this.#A() : null, O = ue?.system.graph, ze = O?.nodes.find((w) => w.id === this.#t.selectedNodeId), pe = new Map(O?.nodes.map((w) => [
      w.id,
      w.abilitySnapshot.name || w.id
    ]) ?? []);
    return {
      ...t,
      item: this.item,
      system: this.item.system,
      systemFields: Yn(this.item),
      enriched: { description: P, backgroundOptions: A, equipmentNotes: $ },
      usesRichDescription: v,
      isSkill: a,
      isAbility: o,
      isWeapon: s,
      isArmor: r,
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
      isCompactRuleItem: o || a || s || r || l || u || c || p || m || b || y,
      usesCleanItemHeader: o || a || s || r || l || u || c || p || f || m || g || b || y,
      hideNormalItemFooter: o || a || s || r || l || u || c || p || f || m || g || b || y,
      genreEffortCapOptions: m ? ["core", "unlimited"].map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Genre.EffortCap.${w}`),
        selected: i.options?.totalEffortCapMode === w
      })) : [],
      genreMinimumTierMin: _e,
      genreMinimumTierMax: Vt,
      abilityMechanics: ve,
      skillOptionalMechanics: V,
      hasGrantProvenance: ie,
      packagePoolOptions: ["none", ...I].map((w) => ({
        value: w,
        label: w === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${w[0].toUpperCase()}${w.slice(1)}`),
        selected: i.edgeGrant?.pool === w
      })),
      packageGenreOptions: ["none", "fantasy", "scienceFiction", "superhero", "custom"].map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Packages.Genre.${w}`),
        selected: i.genre === w
      })),
      edgeModeOptions: ["none", "fixed", "choice"].map((w) => ({
        value: w,
        label: game.i18n.localize(w === "none" ? "CYPHERV2.Common.None" : w === "fixed" ? "CYPHERV2.Packages.FixedPool" : "CYPHERV2.Packages.ChoicePool"),
        selected: i.edgeGrant?.mode === w
      })),
      descriptorSkillGrants: g ? i.skillGrants.map((w) => ({
        ...w,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`)
      })) : [],
      descriptorPoolBonusChoiceGroups: g ? (i.poolBonusChoiceGroups ?? []).map((w) => ({
        ...w,
        poolsLabel: w.pools.map((X) => game.i18n.localize(
          `CYPHERV2.Pools.${X[0].toUpperCase()}${X.slice(1)}`
        )).join(" · ")
      })) : [],
      descriptorChoiceGroups: g ? i.choiceGroups.map((w) => ({
        ...w,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`)
      })) : [],
      typeSkillGrants: b ? i.skillGrants.map((w) => ({
        ...w,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`)
      })) : [],
      typeSkillChoiceGroups: b ? i.choiceGroups.map((w) => ({
        ...w,
        rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`)
      })) : [],
      typeAbilityChoiceGroups: b ? i.abilityChoiceGroups : [],
      speciesSkillGrants: y ? i.skillGrants.map((w) => ({ ...w, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`) })) : [],
      speciesSkillChoiceGroups: y ? i.choiceGroups.map((w) => ({ ...w, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w.rank}`) })) : [],
      speciesAbilityChoiceGroups: y ? i.abilityChoiceGroups : [],
      canEditFocusTree: !!(f && game.user.isGM && this.isEditable && !this.#o),
      focusTreeEditing: !!this.#o,
      focusEditor: this.#o ? {
        dirty: this.#o.dirty,
        tierOptions: [1, 2, 3, 4, 5, 6],
        connecting: !!this.#t.connectionSourceNodeId,
        connectionSourceName: this.#t.connectionSourceNodeId ? pe.get(this.#t.connectionSourceNodeId) : "",
        selectedNode: ze ? {
          ...ze,
          canMoveLeft: !0,
          canMoveRight: !0
        } : null,
        connections: O?.connections.map((w) => ({
          ...w,
          fromName: pe.get(w.from) ?? w.from,
          toName: pe.get(w.to) ?? w.to
        })) ?? []
      } : null,
      focusTrees: f ? [await game.cypherv2.services.focusTrees.prepare(ue, this.#o ? {
        editor: {
          selectedNodeId: this.#t.selectedNodeId,
          connectionSourceNodeId: this.#t.connectionSourceNodeId
        }
      } : {})] : [],
      isHeavyWeapon: s && i.category === "heavy",
      abilityActivationOptions: o ? po.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Ability.Activation.${w}`),
        selected: i.activation === w
      })) : [],
      abilityAllowedPoolOptions: o ? I.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Pools.${w[0].toUpperCase()}${w.slice(1)}`),
        selected: H.includes(w)
      })) : [],
      abilityRollOptions: o ? fo.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Ability.Roll.${w}`),
        selected: i.roll === w
      })) : [],
      abilityWoundOptions: o ? ["none", ...re].map((w) => ({
        value: w,
        label: game.i18n.localize(w === "none" ? "CYPHERV2.Common.None" : `CYPHERV2.Wounds.Severity.${w}`),
        selected: i.woundSeverity === w
      })) : [],
      abilityTargetOptions: o ? ho.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Ability.TargetMode.${w}`),
        selected: i.targetMode === w
      })) : [],
      cypherManifestationOptions: c ? bn.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${w}`),
        selected: i.manifestation === w
      })) : [],
      cypherPowerOptions: c ? wn.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Cypher.Power.${w}`),
        selected: i.power === w
      })) : [],
      cypherEffectiveLevel: c ? Bn(i) : 0,
      artifactLevelRollable: p ? mi(i) : !1,
      skillRankOptions: a ? _.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w}`),
        selected: w === D
      })) : [],
      skillPoolOptions: a ? [
        { value: "choose", label: game.i18n.localize("CYPHERV2.Skill.ChoosePool"), selected: K === "choose" },
        ...I.map((w) => ({
          value: w,
          label: game.i18n.localize(`CYPHERV2.Pools.${w[0].toUpperCase()}${w.slice(1)}`),
          selected: w === K
        }))
      ] : [],
      skillContextOptions: a ? [
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
      ].map((w) => ({
        value: w,
        label: game.i18n.localize(
          w === "attack" ? "CYPHERV2.Combat.Context.AnyAttack" : w === "defense" ? "CYPHERV2.Combat.Context.AnyDefense" : `CYPHERV2.Combat.Context.${w}`
        ),
        selected: de.includes(w)
      })) : [],
      weaponCategoryOptions: s ? De.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${w}`),
        selected: i.category === w
      })) : [],
      weaponDefaultPoolOptions: s ? ["none", ...I].map((w) => ({
        value: w,
        label: w === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${w[0].toUpperCase()}${w.slice(1)}`),
        selected: i.defaultPool === w
      })) : [],
      weaponAttackTypeOptions: s ? uo.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${w}`),
        selected: i.attackType === w
      })) : [],
      rangeOptions: s ? Qi.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Combat.Range.${w}`),
        selected: i.rangeCategory === w
      })) : [],
      weaponAttackModifierOptions: s ? [-2, -1, 0, 1, 2].map((w) => ({
        value: w,
        label: w > 0 ? `+${w}` : String(w),
        selected: i.attackModifier === w
      })) : [],
      weaponSkillLevelOptions: s ? _.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${w}`),
        selected: i.skillLevel === w
      })) : [],
      combatResourcesExpanded: (s || r || l) && this.#r.has("combat-resources"),
      advancedExpanded: this.#r.has("advanced"),
      shieldWoundsExpanded: l && this.#r.has("shield-wounds"),
      combatDepletionSides: s || r || l ? Ft(i.depletion ?? { die: "d6" }) : 0,
      combatDepletionThreshold: s || r || l ? Jo(Number(i.depletion?.threshold ?? 1)) : "",
      depletionDieOptions: s || p ? Us.map((w) => ({
        value: w,
        label: `1 in 1${w}`,
        selected: i.depletion?.die === w
      })) : [],
      armorCategoryOptions: r ? Fe.map((w) => ({
        value: w,
        label: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${w}`),
        selected: i.category === w
      })) : [],
      shieldWoundTracks: l ? ai({
        minor: i.wounds.minor.length,
        moderate: i.wounds.moderate.length,
        major: i.wounds.major.length
      }, i.derived.capacities).map((w) => ({
        ...w,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${w.severity}`),
        pips: w.pips.map((X) => ({
          ...X,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${w.severity}`),
            count: X.targetCount
          })
        }))
      })) : []
    };
  }
}
function Ge(n, e) {
  return String(n[e] ?? "");
}
function ti(n) {
  return n.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
async function gs(n) {
  const e = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize(n ? "CYPHERV2.Combat.Modification.Edit" : "CYPHERV2.Combat.Modification.Create") },
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Common.Name")} <input name="label" type="text" value="${ti(n?.label ?? "")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Contexts")} <input name="contexts" type="text" value="${ti(n?.contexts.join(", ") ?? "defense.speed")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.ModeLabel")}
        <select name="mode">
          ${["levelOverride", "levelDelta", "ease", "hinder"].map((a) => `<option value="${a}"${n?.mode === a ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${a}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Value")} <input name="value" type="number" step="1" value="${n?.value ?? 0}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Predicate")} <textarea name="predicate">${ti(JSON.stringify(n?.predicate ?? {}))}</textarea></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Visibility")}
        <select name="visibility"><option value="gm">${game.i18n.localize("CYPHERV2.Combat.Modification.Gm")}</option><option value="public"${n?.visibility === "public" ? " selected" : ""}>${game.i18n.localize("CYPHERV2.Combat.Modification.Public")}</option></select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Common.Description")} <textarea name="description">${ti(n?.description ?? "")}</textarea></label>
    </div>`,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Actions.Save") }
  });
  if (!e) return null;
  const t = JSON.parse(Ge(e, "predicate") || "{}");
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("NPC modification predicate must be a JSON object.");
  const i = Ge(e, "mode");
  return {
    id: n?.id ?? Qe(),
    label: Ge(e, "label"),
    contexts: Ge(e, "contexts").split(",").map((a) => a.trim()).filter(Boolean),
    mode: i,
    value: Number(Ge(e, "value")),
    visibility: Ge(e, "visibility") === "public" ? "public" : "gm",
    predicate: t,
    description: Ge(e, "description")
  };
}
async function vd(n) {
  try {
    const e = await gs();
    if (!e) return;
    await n.update({ "system.modifications": [...n.system.modifications, e] });
  } catch (e) {
    ui.notifications.error(e instanceof Error ? e.message : String(e));
  }
}
async function Cd(n, e) {
  try {
    const t = n.system.modifications.find((a) => a.id === e);
    if (!t) throw new Error(`NPC modification '${e}' was not found.`);
    const i = await gs(t);
    if (!i) return;
    await n.update({
      "system.modifications": n.system.modifications.map((a) => a.id === e ? i : a)
    });
  } catch (t) {
    ui.notifications.error(t instanceof Error ? t.message : String(t));
  }
}
async function Ed(n, e) {
  const t = n.system.modifications.find((a) => a.id === e);
  if (!t) throw new Error(`NPC modification '${e}' was not found.`);
  await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CYPHERV2.Combat.Modification.Delete") },
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.Modification.DeleteConfirm", { name: t.label })}</p></div>`,
    yes: { label: game.i18n.localize("CYPHERV2.Actions.Delete") },
    no: { label: game.i18n.localize("CYPHERV2.Actions.Cancel") }
  }) && await n.update({
    "system.modifications": n.system.modifications.filter((a) => a.id !== e)
  });
}
function Rd(n) {
  const e = typeof n == "number" ? n : typeof n == "string" && n.trim() !== "" ? Number(n) : Number.NaN;
  return Number.isInteger(e) && e >= 0 ? e * 3 : null;
}
function Pd(n, e) {
  const t = ds(n, e), i = t.ratio > 0.5 ? "healthy" : t.ratio > 0.25 ? "intermediate" : "low";
  return { ...t, state: i };
}
const kd = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
), Wa = /* @__PURE__ */ new Set([
  "requestDefense",
  "createModification",
  "editModification",
  "deleteModification"
]);
class ot extends kd {
  static DEFAULT_OPTIONS = {
    ...Vn,
    classes: ["cypherv2", "sheet", "actor", "npc-sheet"],
    actions: Dn({
      requestDefense: ot.#e,
      createModification: ot.#t,
      editModification: ot.#i,
      deleteModification: ot.#n
    }, Wa),
    position: { width: 680, height: 700 },
    window: { resizable: !0 }
  };
  static PARTS = {
    main: { template: "systems/cypherv2/templates/actor/npc-sheet.hbs" }
  };
  static async #e() {
    await Nl(this.actor);
  }
  static async #t() {
    await vd(this.actor);
  }
  static async #i(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await Cd(this.actor, i);
  }
  static async #n(e, t) {
    const i = t.dataset.modificationId;
    if (!i) throw new Error("Missing NPC modification ID.");
    await Ed(this.actor, i);
  }
  async _onRender(e, t) {
    await super._onRender(e, t), Fn(this.element, this.isEditable, Wa);
  }
  _onClose(e) {
    super._onClose(e);
  }
  async _prepareContext(e) {
    const t = await super._prepareContext(e), i = this.actor.system, a = this.actor._source?.system, o = typeof a?.notes == "string" ? a.notes : "", s = o ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(o, {
      async: !0,
      relativeTo: this.actor
    }) : "";
    return {
      ...t,
      actor: this.actor,
      system: this.actor.system,
      systemFields: Yn(this.actor),
      editable: this.isEditable,
      isGM: game.user.isGM,
      enriched: { notes: s },
      targetNumber: Rd(i.level) ?? "—",
      healthGauge: Pd(
        i.health.value,
        i.health.max ?? i.health.baseMax
      ),
      woundSeverityOptions: ["minor", "moderate", "major"].map((r) => ({
        value: r,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${r}`),
        selected: i.damage.woundSeverity === r
      })),
      modifications: i.modifications.map((r) => ({
        ...r,
        contextsLabel: r.contexts.join(", "),
        modeLabel: game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${r.mode}`)
      }))
    };
  }
}
function Sd() {
  const { DocumentSheetConfig: n } = foundry.applications.apps;
  n.registerSheet(foundry.documents.Actor, S, R, {
    types: ["character"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Character"
  }), n.registerSheet(foundry.documents.Actor, S, ot, {
    types: ["npc"],
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Npc"
  }), n.registerSheet(foundry.documents.Item, S, Y, {
    makeDefault: !0,
    label: "CYPHERV2.Sheets.Item"
  });
}
function W(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function ys(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function Ad(n) {
  const e = W(n, "Paid Effort");
  return e === 0 ? 0 : 3 + (e - 1) * 2;
}
function fn(n, e, t, i = !1) {
  const a = W(n, "Action cost"), o = W(e, "Effort cost"), s = a + o, r = o + (i ? 0 : a), l = Math.min(r, Math.max(0, Math.trunc(t)));
  return {
    actionCostBeforeEdge: a,
    effortCostBeforeEdge: o,
    totalCostBeforeEdge: s,
    edgeApplied: l,
    poolCost: Math.max(0, s - l)
  };
}
function bs(n) {
  if (W(n, "Natural d20 result", 1), n > 20) throw new Error("Natural d20 result cannot exceed 20.");
  return [1, 17, 18, 19, 20].includes(n) ? [`natural-${n}`] : [];
}
function Hd(n) {
  return bs(n), Math.floor(n / 3);
}
function Gi(n, e, t, i, a) {
  return { id: n, label: e, direction: t, steps: i, source: a };
}
function Id(n) {
  const e = W(n.limits.difficultyCeiling, "Difficulty ceiling"), t = W(n.limits.assetLimit, "Asset limit"), i = W(n.limits.paidEffortMaximum, "Maximum Effort"), a = W(n.assets, "Assets"), o = W(n.paidEffort, "Paid Effort"), s = W(n.damageEffort ?? 0, "Damage Effort"), r = W(n.freeDamageEffort ?? 0, "Free Damage Effort"), l = W(n.freeEffort, "Free Effort"), u = n.limits.totalEffortMaximum === null ? null : W(n.limits.totalEffortMaximum, "Maximum total Effort");
  if (W(n.poolValue, "Pool value"), a > t) throw new Error(`Assets cannot exceed the current limit of ${t}.`);
  const c = s + r, p = o + c + l, f = o + s, m = l + r;
  if (u !== null && p > u)
    throw new Error(`Maximum total Effort: ${u}.`);
  if (f > i)
    throw new Error(`Paid Effort cannot exceed the Character maximum of ${i}.`);
  const b = [];
  a > 0 && b.push(Gi(
    "core.assets",
    "CYPHERV2.Roll.Breakdown.Assets",
    "ease",
    a,
    "asset"
  )), o > 0 && b.push(Gi(
    "core.effort.paid",
    "CYPHERV2.Roll.Breakdown.PaidEffort",
    "ease",
    o,
    "effort"
  )), l > 0 && b.push(Gi(
    "core.effort.free",
    "CYPHERV2.Roll.Breakdown.FreeEffort",
    "ease",
    l,
    "free-effort"
  ));
  for (const $ of n.contributions)
    W($.steps, `Steps for '${$.id}'`), $.steps > 0 && b.push({ ...$ });
  const g = b.filter(($) => $.direction === "ease").reduce(($, D) => $ + D.steps, 0), y = b.filter(($) => $.direction === "hinder").reduce(($, D) => $ + D.steps, 0), v = g - y, k = fn(
    n.actionCost ?? 0,
    Ad(f),
    n.edge,
    n.actionCostIgnoresEdge ?? !1
  );
  let P = null, A = null;
  if (n.difficulty.mode !== "unknown") {
    const $ = W(n.difficulty.value, "Difficulty");
    if ($ > e)
      throw new Error(`Difficulty cannot exceed the current ceiling of ${e}.`);
    P = ys($ - v, 0, e), A = P * 3;
  }
  return {
    context: n,
    breakdown: b,
    totalEase: g,
    totalHindrance: y,
    netSteps: v,
    damageEffortApplied: c,
    totalEffortApplied: p,
    paidEffortApplied: f,
    freeEffortApplied: m,
    totalEffortMaximum: u,
    ...k,
    finalDifficulty: P,
    targetNumber: A
  };
}
function $d(n, e) {
  if (n.finalDifficulty === 0) return ws(n);
  const t = bs(e), i = n.targetNumber === null ? null : e >= n.targetNumber, a = Hd(e), o = ys(
    a + n.netSteps,
    0,
    n.context.limits.difficultyCeiling
  );
  return {
    prepared: n,
    naturalRoll: e,
    naturalDifficulty: a,
    automaticSuccess: !1,
    naturalMarkers: t,
    naturalEffects: [],
    success: i,
    beatsDifficulty: o,
    poolCostPaid: n.poolCost,
    poolCostRefunded: 0
  };
}
function ws(n) {
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
function Oi(n) {
  return n === null ? "unresolved" : n ? "applied" : "inapplicable";
}
function Vd(n, e = 1) {
  const t = n.naturalRoll;
  if (t === null) return [];
  const i = { sourceId: "cypherv2.core", naturalRoll: t }, a = ht(e);
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
  const o = t <= a ? [{
    id: `core.horror-mode.natural-${t}.intrusion`,
    sourceId: "cypherv2.horror-mode",
    naturalRoll: t,
    kind: "gm-intrusion",
    status: "applied",
    label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion",
    triggersGMIntrusion: !0,
    intrusionProvenance: "horror-mode",
    horrorIntrusionRange: a
  }] : [];
  if (t === 17 || t === 18) {
    const s = n.prepared.context.purpose === "damage";
    return [...o, {
      ...i,
      id: `core.natural-${t}.damage`,
      kind: "damage-bonus",
      status: s ? Oi(n.success) : "inapplicable",
      label: `CYPHERV2.Roll.NaturalEffects.Damage${t}`,
      damageBonus: t === 17 ? 1 : 2
    }];
  }
  if (t === 19) {
    const s = Oi(n.success);
    if (n.prepared.context.purpose === "damage") {
      const r = s === "applied" ? "available" : s;
      return [...o, {
        ...i,
        id: "core.natural-19.damage",
        kind: "damage-bonus",
        status: r,
        label: "CYPHERV2.Roll.NaturalEffects.Damage19",
        damageBonus: 3,
        choiceGroup: "core.natural-19.choice"
      }, {
        ...i,
        id: "core.natural-19.minor",
        kind: "minor-effect",
        status: r,
        label: "CYPHERV2.Roll.NaturalEffects.Minor",
        choiceGroup: "core.natural-19.choice"
      }];
    }
    return [...o, {
      ...i,
      id: "core.natural-19.minor",
      kind: "minor-effect",
      status: s,
      label: "CYPHERV2.Roll.NaturalEffects.Minor"
    }];
  }
  if (t === 20) {
    const s = Oi(n.success), r = n.prepared.context.purpose === "damage" ? [{
      ...i,
      id: "core.natural-20.damage",
      kind: "damage-bonus",
      status: s === "applied" ? "available" : s,
      label: "CYPHERV2.Roll.NaturalEffects.Damage20",
      damageBonus: 4,
      choiceGroup: "core.natural-20.choice"
    }, {
      ...i,
      id: "core.natural-20.major",
      kind: "major-effect",
      status: s === "applied" ? "available" : s,
      label: "CYPHERV2.Roll.NaturalEffects.Major",
      choiceGroup: "core.natural-20.choice"
    }] : [{
      ...i,
      id: "core.natural-20.major",
      kind: "major-effect",
      status: s,
      label: "CYPHERV2.Roll.NaturalEffects.Major"
    }];
    return n.prepared.poolCost > 0 && r.push({
      ...i,
      id: "core.natural-20.refund",
      kind: "pool-cost-refund",
      status: "applied",
      label: "CYPHERV2.Roll.NaturalEffects.Refund",
      refundsPoolCost: !0
    }), [...o, ...r];
  }
  return o;
}
const Oe = {
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
function Yd(n) {
  n.register(Oe), n.registerDifficultyPolicy(Oe.id, (e) => ({
    ...e,
    assetLimit: 2
  })), n.registerSkillRankRule(Oe.id, Td), n.registerNaturalResultRule(Oe.id, (e, t) => [
    ...t,
    ...Vd(e, e.prepared.context.horrorIntrusionRange)
  ]), n.registerGMIntrusionPolicy(Oe.id, (e) => ({
    ...e,
    targetedXpToTarget: 1,
    targetedXpToShare: 1,
    groupXpPerTarget: 1,
    freeXp: 0
  })), n.registerCombatPolicy(Oe.id, () => Dd), n.registerAdvancementPolicy(Oe.id, () => Co);
}
const Dd = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
}), Fd = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});
function Td(n, e) {
  const t = Fd[n];
  return t === 0 ? null : {
    id: `core.skill.${e.id}.rank`,
    label: `CYPHERV2.Skill.Ranks.${n}`,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: "skill",
    sourceId: e.id
  };
}
class zd {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Map();
  #i = /* @__PURE__ */ new Map();
  #n = /* @__PURE__ */ new Map();
  #a = /* @__PURE__ */ new Map();
  #s = /* @__PURE__ */ new Map();
  #o = /* @__PURE__ */ new Map();
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
    const t = this.active(e), i = new Set(t.map((o) => o.id)), a = [];
    for (const o of t) {
      for (const s of o.dependencies ?? [])
        i.has(s) || a.push({
          severity: "error",
          moduleId: o.id,
          message: `Missing active dependency '${s}'.`
        });
      for (const s of o.conflicts ?? [])
        i.has(s) && a.push({
          severity: "error",
          moduleId: o.id,
          message: `Conflicts with active module '${s}'.`
        });
    }
    return a;
  }
  registerDifficultyPolicy(e, t) {
    this.#r(e, "difficultyPolicies");
    const i = this.#t.get(e) ?? [];
    i.push(t), this.#t.set(e, i);
  }
  resolveDifficultyPolicy(e, t = []) {
    let i = { ...e };
    for (const a of this.active(t))
      for (const o of this.#t.get(a.id) ?? [])
        i = { ...o(Object.freeze({ ...i })) };
    if (!Number.isInteger(i.difficultyCeiling) || i.difficultyCeiling < 0)
      throw new Error("Difficulty policies must provide a non-negative integer ceiling.");
    if (!Number.isInteger(i.assetLimit) || i.assetLimit < 0)
      throw new Error("Difficulty policies must provide a non-negative integer Asset limit.");
    return Object.freeze(i);
  }
  registerRollContextEnricher(e, t) {
    this.#r(e, "rollModifiers");
    const i = this.#i.get(e) ?? [];
    i.push(t), this.#i.set(e, i);
  }
  enrichRollContext(e, t = []) {
    let i = e;
    for (const a of this.active(t))
      for (const o of this.#i.get(a.id) ?? [])
        i = o(Object.freeze(i));
    return i;
  }
  registerSkillRankRule(e, t) {
    this.#r(e, "skillRules");
    const i = this.#n.get(e) ?? [];
    i.push(t), this.#n.set(e, i);
  }
  resolveSkillRankContribution(e, t, i = []) {
    let a = null;
    for (const o of this.active(i))
      for (const s of this.#n.get(o.id) ?? [])
        a = s(e, t) ?? a;
    return a;
  }
  registerNaturalResultRule(e, t) {
    this.#r(e, "naturalResultRules");
    const i = this.#a.get(e) ?? [];
    i.push(t), this.#a.set(e, i);
  }
  resolveNaturalEffects(e, t = []) {
    let i = [];
    for (const a of this.active(t))
      for (const o of this.#a.get(a.id) ?? [])
        i = o(Object.freeze(e), Object.freeze([...i]));
    return Object.freeze([...i]);
  }
  registerGMIntrusionPolicy(e, t) {
    this.#r(e, "gmIntrusionRules");
    const i = this.#s.get(e) ?? [];
    i.push(t), this.#s.set(e, i);
  }
  resolveGMIntrusionPolicy(e, t = []) {
    let i = { ...e };
    for (const a of this.active(t))
      for (const o of this.#s.get(a.id) ?? [])
        i = { ...o(Object.freeze({ ...i })) };
    return Object.freeze(i);
  }
  registerCombatPolicy(e, t) {
    this.#r(e, "combatRules");
    const i = this.#o.get(e) ?? [];
    i.push(t), this.#o.set(e, i);
  }
  resolveCombatPolicy(e, t = []) {
    let i = { ...e };
    for (const a of this.active(t))
      for (const o of this.#o.get(a.id) ?? [])
        i = { ...o(Object.freeze({ ...i })) };
    return Object.freeze(i);
  }
  registerTargetResolutionRule(e, t) {
    this.#r(e, "targetRules");
    const i = this.#c.get(e) ?? [];
    i.push(t), this.#c.set(e, i);
  }
  enrichTargetResolution(e, t, i, a = []) {
    let o = e;
    for (const s of this.active(a))
      for (const r of this.#c.get(s.id) ?? [])
        o = r(Object.freeze(o), Object.freeze(t), Object.freeze(i));
    return Object.freeze(o);
  }
  registerAdvancementPolicy(e, t) {
    this.#r(e, "advancementRules");
    const i = this.#l.get(e) ?? [];
    i.push(t), this.#l.set(e, i);
  }
  resolveAdvancementPolicy(e, t = []) {
    let i = { ...e };
    for (const a of this.active(t))
      for (const o of this.#l.get(a.id) ?? [])
        i = { ...o(Object.freeze({ ...i })) };
    for (const [a, o] of Object.entries({
      xpCost: i.xpCost,
      purchasesPerTier: i.purchasesPerTier,
      capabilityPoints: i.capabilityPoints,
      effortMaximum: i.effortMaximum,
      recoveryBonus: i.recoveryBonus,
      attackDefenseTrainingTier: i.attackDefenseTrainingTier,
      attackDefenseSpecializationTier: i.attackDefenseSpecializationTier
    }))
      if (!Number.isInteger(o) || o < 0)
        throw new Error(`Advancement policy '${a}' must be a non-negative integer.`);
    return Object.freeze(i);
  }
  #r(e, t) {
    const i = this.#e.get(e);
    if (!i) throw new Error(`Rule module '${e}' must be registered before its behaviors.`);
    if (!i.extensionPoints?.includes(t))
      throw new Error(`Rule module '${e}' does not declare '${t}'.`);
  }
}
async function Nd() {
  const n = await new Roll("1d6").evaluate();
  return Number(n.total);
}
function ii(n, e, t, i) {
  if (!Number.isInteger(n) || n < e || n > t)
    throw new Error(`${i} must be an integer from ${e} to ${t}.`);
  return n;
}
class Md {
  #e;
  #t;
  #i;
  constructor(e = Nd, t = Qe, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  calculateRoll(e, t, i, a = !1, o = 0) {
    ii(i, 1, 6, "Recovery die"), ii(t, 1, Number.MAX_SAFE_INTEGER, "Tier"), ii(o, 0, Number.MAX_SAFE_INTEGER, "Recovery bonus");
    const s = o + (e === "one-action" && a ? 2 : 0);
    return { type: e, dieResult: i, tier: t, bonus: s, total: i + t + s, lastAction: a };
  }
  availableTypes(e) {
    return go(e);
  }
  isAvailable(e, t) {
    return !e[kt[t]];
  }
  async roll(e, t, i = !1) {
    if ($e(e), !this.isAvailable(e.system.recovery.used, t))
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    return this.calculateRoll(
      t,
      q(e.system),
      await this.#e(),
      i,
      e.system.derived.recovery.bonus
    );
  }
  distribute(e, t, i) {
    const a = I.reduce((r, l) => r + ii(i[l], 0, Number.MAX_SAFE_INTEGER, `${l} allocation`), 0);
    if (a > t.total) throw new Error("Recovery allocations exceed the Recovery result.");
    const o = {}, s = {};
    for (const r of I) {
      const l = e.system.stats[r].value, u = e.system.derived.pools[r].max, c = Math.max(0, u - l);
      if (i[r] > c)
        throw new Error(`${r} allocation exceeds the Pool's missing points.`);
      s[r] = i[r], o[r] = l + s[r];
    }
    return {
      roll: t,
      requested: { ...i },
      restored: s,
      values: o,
      unspent: t.total - a
    };
  }
  prepareNormal(e, t, i) {
    if ($e(e), !this.isAvailable(e.system.recovery.used, t.type))
      throw new Error(`The '${t.type}' Core Recovery has already been used today.`);
    const a = this.distribute(e, t, i), o = t.type === "10-hours" ? Zi(!1) : { ...e.system.recovery.used, [kt[t.type]]: !0 }, s = {
      id: this.#t(),
      kind: "normal",
      type: t.type,
      rolled: !0,
      dieResult: t.dieResult,
      tier: t.tier,
      bonus: t.bonus,
      total: t.total,
      might: a.restored.might,
      speed: a.restored.speed,
      intellect: a.restored.intellect,
      timestamp: this.#i()
    };
    return { ...a, kind: "normal", used: o, historyEntry: s };
  }
  prepareNonRest(e, t) {
    if ($e(e), !this.isAvailable(e.system.recovery.used, t))
      throw new Error(`The '${t}' Core Recovery has already been used today.`);
    const i = t === "10-hours" ? Zi(!1) : { ...e.system.recovery.used, [kt[t]]: !0 }, a = { might: 0, speed: 0, intellect: 0 }, o = {
      id: this.#t(),
      kind: "nonRest",
      type: t,
      rolled: !1,
      dieResult: 0,
      tier: q(e.system),
      bonus: 0,
      total: 0,
      ...a,
      timestamp: this.#i()
    };
    return {
      kind: "nonRest",
      roll: null,
      requested: { ...a },
      restored: { ...a },
      values: {
        might: e.system.stats.might.value,
        speed: e.system.stats.speed.value,
        intellect: e.system.stats.intellect.value
      },
      unspent: 0,
      used: i,
      historyEntry: o
    };
  }
}
const Ud = {
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
function xd(n) {
  return n === "one-action" ? null : n;
}
function _a(n, e) {
  const t = [n === "normal" ? "recovery" : "non-rest-recovery"];
  return e !== "one-action" && t.push("10-minute-or-longer"), (e === "1-hour" || e === "10-hours") && t.push("1-hour-or-longer"), e === "10-hours" && t.push("10-hour"), t;
}
class qd {
  #e;
  #t;
  #i;
  constructor(e, t, i = Ud) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async rollNormal(e, t, i = !1) {
    return this.#e.roll(e, t, i);
  }
  async completeNormal(e, t, i, a = {}) {
    $e(e);
    const o = xd(t.type), s = o ? this.#t.prepare(e, o, a) : null, r = this.#e.prepareNormal(e, t, i), l = {
      kind: "normal",
      type: t.type,
      recovery: r,
      rest: s,
      durationTriggers: _a("normal", t.type)
    };
    await this.#i.beforeComplete(l);
    const u = {
      "system.stats.might.value": r.values.might,
      "system.stats.speed.value": r.values.speed,
      "system.stats.intellect.value": r.values.intellect
    };
    return s && (u["system.wounds"] = s.result.wounds, u["system.rest.lastType"] = s.result.type, u["system.rest.history"] = [...e.system.rest.history, s.historyEntry]), u["system.recovery.used"] = r.used, u["system.recovery.history"] = [...e.system.recovery.history, r.historyEntry], await e.update(u), await this.#i.processDurations(l), await this.#i.afterComplete(l), await this.#i.refresh(l), l;
  }
  async completeNonRest(e, t) {
    $e(e);
    const i = this.#e.prepareNonRest(e, t), a = {
      kind: "nonRest",
      type: t,
      recovery: i,
      rest: null,
      durationTriggers: _a("nonRest", t)
    };
    return await this.#i.beforeComplete(a), await e.update({
      "system.recovery.used": i.used,
      "system.recovery.history": [...e.system.recovery.history, i.historyEntry]
    }), await this.#i.processDurations(a), await this.#i.afterComplete(a), await this.#i.refresh(a), a;
  }
}
class Gd {
  #e;
  #t;
  constructor(e = Qe, t = Date.now) {
    this.#e = e, this.#t = t;
  }
  rest(e, t, i = {}) {
    const a = it(e), o = [];
    let s = "";
    if (t === "10-minutes")
      o.push(...a.minor), a.minor = [], s = "remove-minors";
    else if (t === "1-hour")
      if (s = i.oneHourChoice ?? "remove-moderate", s === "remove-minors")
        o.push(...a.minor), a.minor = [];
      else {
        const r = a.moderate.pop();
        r && o.push(r);
      }
    else if (t === "10-hours") {
      const r = i.removeMinorsInsteadOfOneModerate === !0 && a.minor.length > 0 && a.moderate.length > 0;
      if (s = r ? "remove-minors-instead-of-one-moderate" : "remove-all-moderate", r ? (o.push(...a.minor), a.minor = [], o.push(...a.moderate.slice(1)), a.moderate = a.moderate.slice(0, 1)) : (o.push(...a.moderate), a.moderate = []), i.majorTaskSucceeded === !0) {
        const l = a.major.pop();
        l && o.push(l);
      }
    }
    return {
      type: t,
      wounds: a,
      removed: o,
      choice: s,
      majorTaskSucceeded: i.majorTaskSucceeded === !0
    };
  }
  prepare(e, t, i = {}) {
    $e(e);
    const a = this.rest(e.system.wounds, t, i);
    return {
      result: a,
      historyEntry: {
        id: this.#e(),
        type: t,
        choice: a.choice,
        majorTaskSucceeded: a.majorTaskSucceeded,
        removedWoundIds: a.removed.map((o) => o.id),
        timestamp: this.#t()
      }
    };
  }
  async apply(e, t, i = {}) {
    const { result: a, historyEntry: o } = this.prepare(e, t, i);
    return await e.update({
      "system.wounds": a.wounds,
      "system.rest.lastType": t,
      "system.rest.history": [...e.system.rest.history, o]
    }), a;
  }
}
const Ka = { minor: 3, moderate: 3, major: 3 };
function Rt(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function Od(n) {
  return Rt(n, "Pool damage overflow"), n === 0 ? null : n <= 4 ? "minor" : n <= 8 ? "moderate" : "major";
}
class Bd {
  #e;
  constructor(e = Qe) {
    this.#e = e;
  }
  applyWound(e, t, i = Ka, a = {}) {
    const o = it(e), s = {
      id: a.id ?? this.#e(),
      label: a.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
      description: a.description ?? "",
      sourceUuid: a.sourceUuid ?? "cypherv2.core",
      treated: a.treated ?? !1
    }, r = re.indexOf(t);
    if (r < 0) throw new Error(`Unsupported Wound severity '${t}'.`);
    for (let l = r; l < re.length; l += 1) {
      const u = re[l];
      if (!(o[u].length >= i[u]))
        return o[u].push(s), {
          wounds: o,
          requestedSeverity: t,
          appliedSeverity: u,
          overflowSteps: l - r,
          record: s,
          applied: !0,
          dead: o.major.length >= i.major
        };
    }
    return {
      wounds: o,
      requestedSeverity: t,
      appliedSeverity: null,
      overflowSteps: re.length - r,
      record: null,
      applied: !1,
      dead: o.major.length >= i.major
    };
  }
  removeOne(e, t, i) {
    const a = it(e), o = i ? a[t].findIndex((r) => r.id === i) : a[t].length - 1;
    if (o < 0) return { wounds: a, removed: null };
    const [s] = a[t].splice(o, 1);
    return { wounds: a, removed: s ?? null };
  }
  updateWound(e, t, i, a) {
    if (typeof a.label != "string" || typeof a.description != "string")
      throw new Error("Wound label and description must be strings.");
    const o = it(e), s = o[t].findIndex((u) => u.id === i);
    if (s < 0) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    const l = { ...o[t][s], label: a.label, description: a.description };
    return o[t][s] = l, { wounds: o, updated: l };
  }
  removeAll(e, t) {
    const i = it(e), a = i[t];
    return i[t] = [], { wounds: i, removed: a };
  }
  setWoundCount(e, t, i, a, o = {}) {
    const s = Rt(i, "Wound count"), r = Rt(a, "Wound capacity");
    if (s > r) throw new Error("Wound count cannot exceed its capacity.");
    const l = it(e), u = l[t], c = u.length, p = s < c ? u.splice(s) : [], f = [];
    for (; u.length < s; ) {
      const m = {
        id: this.#e(),
        label: o.label ?? `${t[0]?.toUpperCase()}${t.slice(1)} Wound`,
        description: o.description ?? "",
        sourceUuid: o.sourceUuid ?? "cypherv2.manual",
        treated: o.treated ?? !1
      };
      u.push(m), f.push(m);
    }
    return { wounds: l, severity: t, previousCount: c, count: s, added: f, removed: p };
  }
  applyPoolDamage(e, t, i, a, o = Ka, s = {}) {
    const r = Rt(i, "Pool value"), l = Rt(a, "Pool damage"), u = Math.min(r, l), c = r - u, p = l - u, f = Od(p), m = f ? this.applyWound(e, f, o, {
      ...s,
      label: s.label ?? `${t} Pool overflow`
    }) : null;
    return {
      pool: t,
      damage: l,
      previousValue: r,
      value: c,
      absorbed: u,
      overflow: p,
      overflowSeverity: f,
      wound: m
    };
  }
  async apply(e, t, i = {}) {
    return ee(e), this.applyTrack(e, t, e.system.derived.wounds.capacities, i);
  }
  async applyTrack(e, t, i, a = {}) {
    const o = this.applyWound(e.system.wounds, t, i, a);
    return o.applied && await e.update({ "system.wounds": o.wounds }), o;
  }
  async edit(e, t, i, a) {
    return ee(e), this.editTrack(e, t, i, a);
  }
  async editTrack(e, t, i, a) {
    const o = this.updateWound(e.system.wounds, t, i, a);
    return await e.update({ "system.wounds": o.wounds }), o;
  }
  async setCount(e, t, i, a = {}) {
    return ee(e), this.setTrackCount(
      e,
      t,
      i,
      e.system.derived.wounds.capacities[t],
      a
    );
  }
  async setTrackCount(e, t, i, a, o = {}) {
    const s = this.setWoundCount(e.system.wounds, t, i, a, o);
    return s.count !== s.previousCount && await e.update({ "system.wounds": s.wounds }), s;
  }
  async delete(e, t, i) {
    return ee(e), this.deleteTrack(e, t, i);
  }
  async deleteTrack(e, t, i) {
    const a = this.removeOne(e.system.wounds, t, i);
    if (!a.removed) throw new Error(`Wound '${i}' was not found in ${t} Wounds.`);
    return await e.update({ "system.wounds": a.wounds }), { wounds: a.wounds, removed: a.removed };
  }
  async damagePool(e, t, i, a = {}) {
    ee(e);
    const o = this.applyPoolDamage(
      e.system.wounds,
      t,
      e.system.stats[t].value,
      i,
      e.system.derived.wounds.capacities,
      a
    ), s = { [`system.stats.${t}.value`]: o.value };
    return o.wound?.applied && (s["system.wounds"] = o.wound.wounds), await e.update(s), o;
  }
}
function Ld(n, e) {
  return n.naturalEffects.filter((t) => t.status !== "inapplicable").map((t) => ({
    kind: t.kind,
    label: e(t.label),
    status: e(`CYPHERV2.Roll.NaturalEffects.Status.${t.status}`),
    isIntrusion: t.kind === "gm-intrusion",
    ...t.damageBonus === void 0 ? {} : { damageBonus: t.damageBonus }
  }));
}
function jd(n, e) {
  const t = n.naturalEffects.filter((l) => l.status !== "inapplicable");
  if (t.some((l) => l.kind === "gm-intrusion"))
    return { label: e("CYPHERV2.Roll.NaturalEffects.GMIntrusion") };
  const i = t.find((l) => l.kind === "damage-bonus"), a = i?.damageBonus === void 0 ? void 0 : `+${i.damageBonus} ${e("CYPHERV2.Roll.NaturalEffects.Damage")}`, o = t.some((l) => l.kind === "minor-effect") || n.naturalRoll === 19 && i !== void 0, s = t.some((l) => l.kind === "major-effect") || n.naturalRoll === 20 && i !== void 0;
  if (o)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.MinorEffect"),
      ...a ? { damage: a } : {}
    };
  if (s)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.MajorEffect"),
      ...a ? { damage: a } : {}
    };
  if (i)
    return {
      label: e("CYPHERV2.Roll.SpecialRoll.DamageBonus"),
      ...a ? { damage: a } : {}
    };
  const r = t[0];
  return r ? { label: e(r.label) } : null;
}
function Xa(n, e, t) {
  return `${we(e, n)} ${t(e === "ease" ? n === 1 ? "CYPHERV2.Roll.EaseStep" : "CYPHERV2.Roll.EaseSteps" : n === 1 ? "CYPHERV2.Roll.HindranceStep" : "CYPHERV2.Roll.HindranceSteps")}`;
}
function Wd(n, e) {
  return n.breakdown.map((t) => ({
    label: e(t.label),
    value: we(t.direction, t.steps)
  }));
}
function _d(n, e) {
  return n.breakdown.length === 0 && n.totalEase === 0 && n.totalHindrance === 0 ? [] : [{
    label: e("CYPHERV2.Roll.TotalEase"),
    value: n.totalEase === 0 ? 0 : we("ease", n.totalEase)
  }, {
    label: e("CYPHERV2.Roll.TotalHindrance"),
    value: n.totalHindrance === 0 ? 0 : we("hinder", n.totalHindrance)
  }];
}
function Kd(n, e) {
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
function Xd(n, e) {
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
function Jd(n, e) {
  const t = n.naturalEffects.find((i) => i.kind === "gm-intrusion" && i.status === "applied" && i.intrusionProvenance === "horror-mode" && i.horrorIntrusionRange !== void 0);
  return t?.horrorIntrusionRange === void 0 ? [] : [{
    label: e("CYPHERV2.Horror.Title"),
    value: `1–${t.horrorIntrusionRange}`
  }];
}
function vs(n, e) {
  const t = n.prepared, i = t.context.pool ? `${t.context.pool[0].toUpperCase()}${t.context.pool.slice(1)}` : null, a = Ld(n, e), o = a.filter((r) => !r.isIntrusion), s = [
    ...t.totalEase > 0 ? [Xa(t.totalEase, "ease", e)] : [],
    ...t.totalHindrance > 0 ? [Xa(t.totalHindrance, "hinder", e)] : []
  ].join(" · ");
  return {
    actorName: t.context.actor.name,
    rollLabel: e(t.context.label),
    ...i ? { poolLabel: e(`CYPHERV2.Pools.${i}`) } : {},
    naturalRoll: n.naturalRoll,
    naturalDifficulty: n.naturalDifficulty,
    showNaturalRoll: n.naturalRoll !== null,
    showNaturalDifficulty: n.naturalDifficulty !== null,
    breakdown: t.breakdown.map((r) => ({
      label: e(r.label),
      direction: e(
        r.direction === "ease" ? "CYPHERV2.Roll.Ease" : "CYPHERV2.Roll.Hinder"
      ),
      steps: r.steps,
      isEase: r.direction === "ease",
      modifier: we(r.direction, r.steps)
    })),
    modifierDetails: Wd(t, e),
    modifierTotalDetails: _d(t, e),
    effortDetails: Kd(n, e),
    costDetails: Xd(n, e),
    stepSummary: s,
    showStepSummary: s.length > 0,
    paidEffort: t.context.paidEffort,
    damageEffort: t.damageEffortApplied,
    freeEffort: t.context.freeEffort,
    poolCost: n.poolCostPaid,
    poolCostRefunded: n.poolCostRefunded,
    actionCost: t.actionCostBeforeEdge,
    totalEase: t.totalEase,
    totalHindrance: t.totalHindrance,
    netSteps: t.netSteps,
    naturalEffects: a,
    specialRoll: jd(n, e),
    hasNaturalResult: n.naturalMarkers.length > 0,
    hasNaturalEffectDisclosure: o.length > 0,
    gmIntrusion: a.some((r) => r.isIntrusion),
    hasExceptionalResult: a.length > 0,
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
function Qd(n, e) {
  return n ? { outcome: e("CYPHERV2.Roll.Success"), outcomeIcon: "✓", outcomeClass: "success" } : { outcome: e("CYPHERV2.Roll.Failure"), outcomeIcon: "✕", outcomeClass: "failure" };
}
function hn(n, e, t = !0) {
  return n.automaticSuccess && t ? { outcome: e("CYPHERV2.Roll.AutomaticSuccess"), outcomeIcon: "✓", outcomeClass: "success" } : Qd(n.success === !0, e);
}
function Zd(n, e, t = (i) => i) {
  const i = vs(n, t), a = n.beatsDifficulty === null ? {} : {
    beatsDifficulty: n.beatsDifficulty,
    showBeatsDifficulty: !0
  }, o = Jd(n, t), s = n.prepared.context.difficulty;
  if (s.mode === "unknown")
    return {
      ...i,
      ...a,
      presentation: "unknown",
      resolutionDetails: o,
      hasDetails: o.length > 0 || i.modifierDetails.length > 0 || i.modifierTotalDetails.length > 0 || i.effortDetails.length > 0 || i.costDetails.length > 0
    };
  if (s.mode === "known") {
    const r = [{
      label: t("CYPHERV2.Roll.Difficulty"),
      value: n.prepared.finalDifficulty ?? 0
    }, {
      label: t("CYPHERV2.Roll.TargetNumber"),
      value: n.prepared.targetNumber ?? 0
    }, ...o];
    return {
      ...i,
      ...a,
      presentation: "known",
      ...hn(n, t),
      finalDifficulty: n.prepared.finalDifficulty ?? 0,
      targetNumber: n.prepared.targetNumber ?? 0,
      showKnownDifficulty: !0,
      resolutionDetails: r,
      hasDetails: !0
    };
  }
  return {
    ...i,
    ...a,
    presentation: "concealed",
    ...hn(n, t, !1),
    resolutionDetails: o,
    hasDetails: o.length > 0 || i.modifierDetails.length > 0 || i.modifierTotalDetails.length > 0 || i.effortDetails.length > 0 || i.costDetails.length > 0
  };
}
function eu(n, e = (t) => t) {
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
function tu(n, e = (t) => t) {
  const t = n.prepared.context.difficulty;
  if (t.mode !== "hidden") throw new Error("Only hidden-difficulty rolls require an audit card.");
  return {
    ...vs(n, e),
    originalDifficulty: t.value,
    finalDifficulty: n.prepared.finalDifficulty ?? 0,
    targetNumber: n.prepared.targetNumber ?? 0,
    ...hn(n, e)
  };
}
class iu {
  async publish(e, t, i, a = {}) {
    const o = (b) => game.i18n.localize(b), s = Zd(t.result, i, o), r = eu(a.combat, o), l = {
      ...s,
      ...r,
      hasDetails: s.hasDetails || r.damageDetails.length > 0 || r.damageTotalDetails.length > 0,
      ...be(e),
      ...a.combat?.woundSeverity === void 0 ? {} : {
        combatWoundSeverity: o(`CYPHERV2.Wounds.Severity.${a.combat.woundSeverity}`)
      },
      ...a.combat?.shieldTransfer === void 0 ? {} : {
        shieldTransfer: !0,
        shieldName: a.combat.shieldTransfer.shieldName,
        shieldSeverity: o(`CYPHERV2.Wounds.Severity.${a.combat.shieldTransfer.severity}`)
      },
      ...a.combat?.action ? {
        combatAction: !0,
        combatActionLabel: o(
          a.combat.action.kind === "npcDamage" ? "CYPHERV2.Combat.ApplyDamage" : a.combat.action.kind === "shieldWound" ? "CYPHERV2.Combat.ApplyWoundToShield" : "CYPHERV2.Combat.ApplyWound"
        )
      } : {}
    }, u = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-card.hbs",
      l
    ), c = {
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: u
    };
    if (a.combat?.action && (c.flags = { cypherv2: { combatAction: a.combat.action } }), t.chatRoll !== void 0 && (c.rolls = [t.chatRoll]), await ChatMessage.create(c), t.result.prepared.context.difficulty.mode !== "hidden") return;
    const p = tu(t.result, o);
    if (Hooks.callAll("cypherv2HiddenRollAudit", p, e, t), a.showGmAudit !== !0) return;
    const f = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-audit-card.hbs",
      {
        ...p,
        ...r,
        ...be(e)
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
const nu = async () => {
  const n = await new Roll("1d20").evaluate();
  if (n.total === null) throw new Error("The d20 roll did not produce a total.");
  return { naturalRoll: n.total, chatRoll: n };
}, au = (n) => {
  const e = n.system.genre.sourceUuid;
  if (!e || typeof fromUuidSync != "function") return "core";
  const t = fromUuidSync(e);
  return t?.type === "genre" ? t.system.options.totalEffortCapMode : "core";
}, ou = () => nn();
function Ja(n, e) {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function Bi(n, e, t, i) {
  if (!Number.isInteger(t)) throw new Error(`${e} steps must be an integer.`);
  return t === 0 ? null : {
    id: n,
    label: e,
    direction: t > 0 ? "ease" : "hinder",
    steps: Math.abs(t),
    source: i
  };
}
class su {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t = nu, i = au, a = ou) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = a;
  }
  preview(e, t, i) {
    ee(e), Ja(t.otherEase, "Other Ease"), Ja(t.otherHindrance, "Other Hindrance");
    const a = [], o = Bi(
      "manual.skill",
      "CYPHERV2.Roll.Breakdown.Skill",
      t.skillSteps,
      "skill"
    );
    o && a.push(o);
    const s = Bi(
      "manual.other-ease",
      "CYPHERV2.Roll.Breakdown.OtherEase",
      t.otherEase,
      "other"
    );
    s && a.push(s);
    const r = Bi(
      "manual.other-hindrance",
      "CYPHERV2.Roll.Breakdown.OtherHindrance",
      -t.otherHindrance,
      "other"
    );
    r && a.push(r);
    const l = e.system.derived.wounds.hindrance;
    l > 0 && a.push({
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
        a.push({
          id: y.id,
          label: `CYPHERV2.Combat.Armor.Unfamiliar.${c?.category ?? "light"}`,
          direction: "hinder",
          steps: y.value,
          source: "other",
          sourceId: y.sourceId
        });
    if (a.push(...t.contributions ?? []), t.pool === null && (t.paidEffort > 0 || (t.damageEffort ?? 0) > 0 || (t.actionCost ?? 0) > 0))
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
        totalEffortMaximum: or(this.#i(e))
      },
      contributions: a,
      horrorIntrusionRange: ht(this.#n()),
      tags: u,
      ...t.target ? { target: t.target } : {},
      ...t.purpose ? { purpose: t.purpose } : {},
      ...t.origin ? { origin: t.origin } : {}
    }, g = this.#e.enrichRollContext(b, f);
    return Id(g);
  }
  async execute(e, t, i) {
    const [a] = await this.executeBatch(e, [t], i);
    if (!a) throw new Error("Roll execution did not produce a result.");
    return a;
  }
  async executeBatch(e, t, i) {
    if (t.length === 0) return [];
    const a = t.map((m) => this.preview(e, m, i)), o = a[0];
    if (a.some((m) => m.context.pool !== o.context.pool || m.poolCost !== o.poolCost))
      throw new Error("Batch rolls must use one Pool and one shared action cost.");
    const s = o.context.pool, r = s === null ? 0 : e.system.stats[s].value;
    if (r < o.poolCost)
      throw new Error(
        `${s ?? "No Pool"} has ${r} points but this action costs ${o.poolCost}.`
      );
    o.poolCost > 0 && s !== null && await e.update({ [`system.stats.${s}.value`]: r - o.poolCost });
    const u = a.some((m) => m.finalDifficulty !== 0) ? await this.#t() : null, c = a.map((m) => {
      const b = m.finalDifficulty === 0 ? ws(m) : $d(m, u.naturalRoll), g = this.#e.resolveNaturalEffects(
        b,
        i.enabledRuleModuleIds ?? []
      );
      return { ...b, naturalEffects: g };
    }), p = c.some((m) => m.naturalEffects.some(
      (b) => b.status === "applied" && b.refundsPoolCost === !0
    )) ? o.poolCost : 0;
    p > 0 && s !== null && await e.update({ [`system.stats.${s}.value`]: r });
    let f = !1;
    return c.map((m) => {
      const b = {
        ...m,
        poolCostPaid: o.poolCost - p,
        poolCostRefunded: p
      };
      return u?.chatRoll === void 0 || m.automaticSuccess || f ? { result: b } : (f = !0, { result: b, chatRoll: u.chatRoll });
    });
  }
}
function ru(n) {
  return I.includes(n);
}
class lu {
  #e;
  constructor(e) {
    this.#e = e;
  }
  configuredPool(e) {
    if (!co.includes(e.system.defaultPool))
      throw new Error(`Unknown Skill default Pool '${e.system.defaultPool}'.`);
    return ru(e.system.defaultPool) ? e.system.defaultPool : null;
  }
  rankContribution(e, t = []) {
    if (e.type !== "skill") throw new Error("Skill contributions require a Skill Item.");
    if (!_.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    return this.#e.resolveSkillRankContribution(
      e.system.rank,
      { id: e.id, name: e.name },
      t
    );
  }
  buildRollRequest(e, t) {
    if (e.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!_.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
    const i = t.pool ?? this.configuredPool(e);
    if (!i) throw new Error("Choose a Pool for this Skill roll.");
    const a = t.rankOverride ? { ...e, system: { ...e.system, rank: t.rankOverride } } : e;
    if (!_.includes(a.system.rank))
      throw new Error(`Unknown Skill rank '${a.system.rank}'.`);
    const o = this.rankContribution(a, t.enabledRuleModuleIds ?? []);
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
        ...o ? [o] : [],
        ...t.contributions ?? []
      ],
      purpose: "task",
      origin: {
        kind: "skill",
        itemId: e.id,
        name: e.name,
        rank: a.system.rank
      }
    };
  }
  buildQuickRollRequest(e, t = {}) {
    if (e.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!_.includes(e.system.rank)) throw new Error(`Unknown Skill rank '${e.system.rank}'.`);
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
const cu = Object.freeze({
  targetedXpToTarget: 0,
  targetedXpToShare: 0,
  groupXpPerTarget: 0,
  freeXp: 0
});
function du(n) {
  return {
    actorId: n.id,
    actorName: n.name,
    ...n.img ? { actorImage: n.img } : {}
  };
}
class uu {
  #e;
  #t;
  constructor(e, t = Qe) {
    this.#e = e, this.#t = t;
  }
  policy(e = []) {
    return this.#e.resolveGMIntrusionPolicy(cu, e);
  }
  async createTargeted(e, t = []) {
    ee(e);
    const i = this.policy(t);
    return await this.#i(e, i.targetedXpToTarget), this.#n(
      "targeted",
      [e],
      i.targetedXpToTarget,
      i.targetedXpToShare
    );
  }
  async createGroup(e, t = []) {
    const i = [...new Map(e.map((o) => [o.id, o])).values()];
    if (i.length === 0) throw new Error("Choose at least one Character for a Group Intrusion.");
    i.forEach(ee);
    const a = this.policy(t);
    return await Promise.all(i.map((o) => this.#i(o, a.groupXpPerTarget))), this.#n(
      "group",
      i,
      a.groupXpPerTarget,
      0
    );
  }
  async createFreeFromNaturalResult(e, t, i = []) {
    return !t.naturalEffects.some(
      (o) => o.status === "applied" && o.triggersGMIntrusion === !0
    ) || t.naturalRoll === null ? null : this.createFree(e, t.naturalRoll, i);
  }
  async createFree(e, t = 0, i = []) {
    ee(e);
    const a = this.policy(i);
    return await this.#i(e, a.freeXp), this.#n(
      "free",
      [e],
      a.freeXp,
      0,
      t
    );
  }
  async distributeSecondXp(e, t, i) {
    if (ee(e), ee(t), t.id === e.id)
      throw new Error("The targeted Character cannot receive their own shared XP.");
    await this.#i(t, i);
  }
  async #i(e, t) {
    if (!Number.isInteger(t) || t < 0) throw new Error("GM Intrusion XP must be non-negative.");
    t > 0 && await e.update({ "system.xp": e.system.xp + t });
  }
  #n(e, t, i, a, o = 0) {
    return {
      id: this.#t(),
      mode: e,
      targets: t.map(du),
      targetXp: i,
      sharedXp: a,
      naturalRoll: o
    };
  }
}
function mt(n) {
  const e = n.tokenId ?? n.token?.id, t = n.tokenUuid ?? n.token?.uuid;
  return {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...e ? { tokenId: e } : {},
    ...t ? { tokenUuid: t } : {}
  };
}
const Qa = [
  "none",
  "minor",
  "moderate",
  "major"
];
function mu(n, e) {
  const t = Qa.indexOf(n);
  return Qa[Math.max(0, t - Math.max(0, Math.trunc(e)))] ?? "none";
}
function si(n, e, t) {
  if (!Number.isInteger(n) || t !== void 0 && n < t)
    throw new Error(`${e} must be an integer${t === void 0 ? "" : ` of at least ${t}`}.`);
  return n;
}
function pu(n, e) {
  return n.contexts.every((t) => e.tags.includes(t));
}
function fu(n, e) {
  for (const [t, i] of Object.entries(n)) {
    if (t === "tagsAll") {
      if (!Array.isArray(i) || !i.every((o) => typeof o == "string" && e.tags.includes(o))) return !1;
      continue;
    }
    if (t === "tagsAny") {
      if (!Array.isArray(i) || !i.some((o) => typeof o == "string" && e.tags.includes(o))) return !1;
      continue;
    }
    const a = t === "pool" ? e.pool : t === "attackType" ? e.attackType : t === "weaponCategory" ? e.weaponCategory : t === "defenseType" ? e.defenseType : void 0;
    if (a === void 0) return !1;
    if (Array.isArray(i)) {
      if (!i.includes(a)) return !1;
    } else if (i !== a) return !1;
  }
  return !0;
}
function Za(n) {
  return n.contexts.length + Object.keys(n.predicate).length;
}
function hu(n) {
  return si(n.value, `NPC modification '${n.id}'`, 0), {
    id: `npc-modification.${n.id}`,
    label: "CYPHERV2.Combat.TargetModification",
    direction: n.mode === "ease" ? "ease" : "hinder",
    steps: n.value,
    source: "other",
    sourceId: n.id
  };
}
class gu {
  #e;
  constructor(e) {
    this.#e = e;
  }
  resolve(e, t, i = []) {
    if (e.type !== "npc") throw new Error("Combat targets must be NPC Actors.");
    const a = si(e.system.level, "NPC Level", 0), o = e.system.modifications.map((c, p) => ({ modification: c, index: p })).filter(({ modification: c }) => pu(c, t) && fu(c.predicate, t)), s = o.filter(({ modification: c }) => c.mode === "levelOverride").sort((c, p) => Za(p.modification) - Za(c.modification) || p.index - c.index)[0]?.modification;
    let r = s ? si(s.value, `NPC modification '${s.id}'`, 0) : a;
    const l = s ? [s.id] : [];
    for (const { modification: c } of o)
      c.mode === "levelDelta" && (r += si(c.value, `NPC modification '${c.id}'`), l.push(c.id));
    r = Math.max(0, r);
    const u = o.map(({ modification: c }) => c).filter((c) => c.mode === "ease" || c.mode === "hinder").map((c) => (l.push(c.id), hu(c)));
    return this.#e.enrichTargetResolution({
      targetId: e.id,
      targetIdentity: mt(e),
      targetName: e.name,
      baseLevel: a,
      difficulty: r,
      contributions: u,
      appliedModificationIds: l
    }, e, t, i);
  }
  nativeNpcTargets() {
    return [...game.user.targets ?? []].map((e) => Bo(e)).filter((e) => e !== null);
  }
}
class yu {
  async npcDamage() {
  }
  async characterWound() {
  }
}
async function bu(n) {
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
class wu {
  async #e(e, t, i) {
    const a = await bu(e);
    a && await canvas.interface.createScrollingText(a.center, t, {
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
  async shieldWound(e, t, i, a) {
    const o = a ? game.i18n.format("CYPHERV2.Shield.Feedback.Broken", { shield: t }) : game.i18n.format("CYPHERV2.Shield.Feedback.Wound", {
      shield: t,
      severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${i}`)
    });
    await this.#e(e, o, a ? "#ff5c5c" : "#7dcfff");
  }
}
class vu {
  async syncNpcDead() {
  }
}
class Cu {
  async syncNpcDead(e, t) {
    const i = ci(e);
    let a = null;
    if (i.tokenUuid)
      try {
        a = (await fromUuid(i.tokenUuid))?.actor ?? null;
      } catch {
        a = null;
      }
    !a && i.tokenId && (a = canvas.tokens?.get(i.tokenId)?.actor ?? null), !(!a && (i.tokenId || i.tokenUuid)) && (a || (a = e), typeof a.toggleStatusEffect == "function" && await a.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED ?? "dead", {
      active: t
    }));
  }
}
function Eu(n) {
  if ("system.health.value" in n) return !0;
  const e = n.system;
  if (!e || typeof e != "object") return !1;
  const t = e.health;
  return !!(t && typeof t == "object" && "value" in t);
}
function Ru(n) {
  Hooks.on("updateActor", (e, t, i = {}) => {
    if (i.cypherv2SkipDeadStatusSync === !0 || e.type !== "npc" || !Eu(t)) return;
    const a = Number(e.system.health?.value);
    Number.isFinite(a) && n.syncNpcDead(e, a <= 0);
  });
}
function Li(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative whole number.`);
  return n;
}
class Cs {
  ammunition(e) {
    const t = e.system.ammo.enabled, i = Li(e.system.ammo.value, "Current ammunition"), a = Li(e.system.ammo.max, "Maximum ammunition"), o = Li(e.system.ammo.perAttack, "Ammunition per attack");
    return { tracked: t, current: i, maximum: a, perAttack: o, canAttack: !t || i >= o };
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
const Pu = Object.freeze({
  weaponDamage: Object.freeze({ light: 2, medium: 4, heavy: 6 }),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({ light: 1, medium: 2, heavy: 3 }),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
});
function ji(n, e) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${e} must be a non-negative integer.`);
  return n;
}
function eo(n, e, t) {
  return {
    id: n.id,
    label: t,
    direction: e,
    steps: n.value,
    source: "other",
    sourceId: n.sourceId
  };
}
function $t(n) {
  return n.naturalEffects.filter((e) => e.kind === "damage-bonus" && e.status === "applied").reduce((e, t) => e + (t.damageBonus ?? 0), 0);
}
function Es(n, e) {
  return n.naturalEffects.filter((i) => i.status === "available").length === 0 ? n : {
    ...n,
    naturalEffects: n.naturalEffects.map((i) => {
      if (i.status !== "available") return i;
      const a = e === "damage" && i.kind === "damage-bonus", o = e === "effect" && (i.kind === "minor-effect" || i.kind === "major-effect");
      return { ...i, status: a || o ? "applied" : "inapplicable" };
    })
  };
}
class ku {
  #e;
  #t;
  #i;
  #n;
  #a;
  #s;
  #o;
  #c;
  #l;
  constructor(e, t, i, a, o, s = new yu(), r = new vu(), l = new hs(o), u = new Cs()) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = a, this.#a = o, this.#s = s, this.#o = r, this.#c = l, this.#l = u;
  }
  policy(e = []) {
    return this.#e.resolveCombatPolicy(Pu, e);
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
    const a = this.policy(i);
    return this.weaponFreelyUsed(e, t) || a.unfamiliarWeaponHindrance <= 0 ? null : {
      id: `weapon.${t.id}.unfamiliar`,
      label: `CYPHERV2.Combat.Weapon.Unfamiliar.${t.system.category}`,
      direction: "hinder",
      steps: a.unfamiliarWeaponHindrance,
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
    const a = i.enabledRuleModuleIds ?? [], o = this.policy(a), s = this.weaponFreelyUsed(e, t), r = this.weaponAttackPool(t, i.pool), l = {
      tags: [
        "attack",
        "attack.weapon",
        `attack.${t.system.attackType}`,
        `weapon.${t.system.category}`,
        "defense.speed"
      ],
      pool: r,
      attackType: t.system.attackType,
      weaponCategory: t.system.category
    }, u = i.targets ?? [], c = u.map((A) => this.#n.resolve(A, l, a)), p = u.length > 0 ? u : [null], f = c.length > 0 ? c : [null], m = [];
    t.system.category === "light" && o.lightWeaponEase > 0 && m.push({
      id: `weapon.${t.id}.light`,
      label: "CYPHERV2.Combat.Weapon.LightEase",
      direction: "ease",
      steps: o.lightWeaponEase,
      source: "other",
      sourceId: t.id
    });
    const b = this.weaponFamiliarityContribution(e, t, a);
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
    const g = i.skill ? this.#i.rankContribution(i.skill, a) : null;
    g && m.push(g);
    const y = o.weaponDamage[t.system.category], v = t.system.bonusDamage, k = this.weaponBaseDamage(t, o), P = f.map((A, $) => ({
      label: t.name,
      pool: r,
      difficulty: A ? { mode: "hidden", value: A.difficulty } : i.difficulty ?? { mode: "unknown" },
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
        ...A?.contributions ?? [],
        ...i.contributions ?? []
      ].map((D) => [D.id, D])).values()],
      purpose: "damage",
      tags: [
        ...l.tags,
        ...r === "speed" ? ["speed-task"] : [],
        ...i.extremeRange ? ["range.extreme"] : []
      ],
      origin: {
        kind: "weapon",
        itemId: t.id,
        name: t.name,
        category: t.system.category,
        attackType: t.system.attackType,
        baseDamage: k
      },
      ...p[$] ? {
        target: {
          ...mt(p[$]),
          name: p[$].name,
          type: "npc"
        }
      } : {}
    }));
    return {
      weapon: t,
      categoryDamage: y,
      weaponBonusDamage: v,
      baseDamage: k,
      freelyUsed: s,
      requests: P,
      targets: p,
      targetResolutions: f,
      policy: o
    };
  }
  async executeWeaponAttack(e, t, i, a) {
    this.#l.assertCanAttack(t);
    const o = this.buildWeaponAttackPlan(e, t, i), s = await this.#t.executeBatch(e, o.requests, a), r = s.length > 0 ? await this.#r(t) : void 0;
    return s.map((l, u) => {
      const c = l.result.prepared.damageEffortApplied * o.policy.damageEffortBonus, p = $t(l.result), f = o.baseDamage + c + p, m = o.targets[u] ?? null, b = m?.system.armorBase ?? 0;
      return {
        target: m,
        targetResolution: o.targetResolutions[u] ?? null,
        execution: l,
        grossDamage: f,
        categoryDamage: o.categoryDamage,
        weaponBonusDamage: o.weaponBonusDamage,
        effortDamage: c,
        naturalDamage: p,
        armor: b,
        netDamage: Math.max(0, f - b),
        ...u === 0 && r ? { weaponUse: r } : {}
      };
    });
  }
  async #r(e) {
    const t = await this.#l.consumeAttack(e);
    return t ? { ammo: t } : {};
  }
  chooseAttackOutcomes(e, t, i = []) {
    const a = this.policy(i);
    return e.map((o) => {
      const s = Es(o.execution.result, t), r = s.prepared.context.origin;
      if (r?.kind !== "weapon") return o;
      const l = r.baseDamage + s.prepared.damageEffortApplied * a.damageEffortBonus + $t(s), u = s.prepared.damageEffortApplied * a.damageEffortBonus, c = $t(s);
      return {
        ...o,
        execution: { ...o.execution, result: s },
        grossDamage: l,
        effortDamage: u,
        naturalDamage: c,
        netDamage: Math.max(0, l - o.armor)
      };
    });
  }
  buildDefenseRequest(e, t, i) {
    if (!mo.includes(t)) throw new Error(`Unknown defense '${t}'.`);
    const a = i.enabledRuleModuleIds ?? [], o = t === "dodge" ? "speed" : "might", s = e.system.derived.combat.armor, r = t === "dodge" ? s.dodgeContributions.map((u) => eo(u, "hinder", "CYPHERV2.Combat.Armor.DodgeHindrance")) : s.blockContributions.map((u) => eo(u, "ease", "CYPHERV2.Combat.Armor.BlockEase")), l = i.skill ? this.#i.rankContribution(i.skill, a) : null;
    return {
      label: t === "dodge" ? "CYPHERV2.Combat.Defense.DodgeRoll" : t === "blockWithShield" ? "CYPHERV2.Combat.Defense.BlockWithShieldRoll" : "CYPHERV2.Combat.Defense.BlockRoll",
      pool: o,
      difficulty: i.difficulty,
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: 0,
      freeEffort: i.freeEffort ?? 0,
      otherEase: i.otherEase ?? 0,
      otherHindrance: i.otherHindrance ?? 0,
      contributions: [
        ...r,
        ...l ? [l] : [],
        ...i.contributions ?? []
      ],
      purpose: "task",
      tags: [
        "defense",
        ...t === "blockWithShield" ? ["defense.block"] : [],
        `defense.${t}`,
        ...o === "speed" ? ["speed-task"] : []
      ],
      origin: {
        kind: "defense",
        defenseType: t,
        ...i.source ? { sourceActorId: i.source.id, sourceName: i.source.name } : {}
      }
    };
  }
  buildDefenseAgainstNpcRequest(e, t, i, a = {}) {
    const o = {
      tags: ["attack", "npc-attack", `requested-defense.${i}`],
      defenseType: i
    }, s = this.#n.resolve(t, o, a.enabledRuleModuleIds ?? []);
    return this.buildDefenseRequest(e, i, {
      ...a,
      difficulty: { mode: "hidden", value: s.difficulty },
      source: { id: t.id, name: t.name },
      contributions: [...s.contributions, ...a.contributions ?? []]
    });
  }
  woundAfterDefense(e, t, i, a = []) {
    return e.success !== !0 ? i : t === "dodge" || t === "blockWithShield" ? "none" : mu(i, this.policy(a).blockSeverityReduction);
  }
  async resolveDefenseWound(e, t, i, a, o, s = []) {
    if (i !== "blockWithShield" || t.success !== !0) {
      const l = this.woundAfterDefense(t, i, a, s);
      return {
        recipient: l === "none" ? "none" : "character",
        severity: l
      };
    }
    const r = await this.#c.normalizeEquipped(e);
    if (!r || this.#c.isBroken(r))
      throw new Error("Block With Shield requires one equipped, functional Shield.");
    return {
      recipient: "shield",
      severity: a,
      shieldId: r.id,
      shieldName: r.name
    };
  }
  async transferWoundToShield(e, t, i, a) {
    const o = await this.#c.applyResolved(e, t, i, {
      ...a ? { label: `${a.name} attack` } : {},
      sourceUuid: a ? `Actor.${a.id}` : "cypherv2.combat"
    });
    return o.appliedSeverity && await this.#s.shieldWound?.(
      e,
      t.name,
      o.appliedSeverity,
      o.broken
    ), o;
  }
  /** Commit a previously resolved Shield consequence from an authorized Chat action. */
  async applyShieldWound(e, t, i, a) {
    return this.transferWoundToShield(e, t, i, a);
  }
  async applyNpcDamage(e, t) {
    if (e.type !== "npc") throw new Error("NPC damage requires an NPC target.");
    const i = ji(t, "Damage"), a = ji(e.system.armorBase, "NPC Armor"), o = ji(e.system.health.value, "NPC Health"), s = Math.max(0, i - a), r = Math.max(0, o - s);
    await e.update(
      { "system.health.value": r },
      { cypherv2SkipDeadStatusSync: !0 }
    );
    const l = {
      requestedDamage: i,
      armor: a,
      appliedDamage: s,
      previousHealth: o,
      health: r,
      dead: r === 0
    };
    return await this.#o.syncNpcDead(e, l.dead), await this.#s.npcDamage(e, l), l;
  }
  async applyCharacterWound(e, t, i) {
    const a = await this.#a.apply(e, t, {
      ...i ? { label: `${i.name} attack` } : {},
      sourceUuid: i ? `Actor.${i.id}` : "cypherv2.combat"
    });
    return a.appliedSeverity && await this.#s.characterWound(e, a.appliedSeverity), a;
  }
  #d(e, t, i) {
    return [...e.items].filter((a) => {
      if (!a || typeof a != "object") return !1;
      const o = a;
      if (o.type !== "skill" || !o.system) return !1;
      const s = o.system.contexts ?? [], r = o.system.category ?? "";
      return s.some((l) => t.includes(l)) || t.includes(r);
    }).sort((a, o) => {
      const s = this.#i.rankContribution(a, i), r = this.#i.rankContribution(o, i), l = (u) => u ? u.steps * (u.direction === "ease" ? 1 : -1) : 0;
      return l(r) - l(s) || a.name.localeCompare(o.name);
    });
  }
}
function pi(n) {
  return {
    targetActorId: n.actorId,
    ...n.actorUuid ? { targetActorUuid: n.actorUuid } : {},
    ...n.tokenId ? { targetTokenId: n.tokenId } : {},
    ...n.tokenUuid ? { targetTokenUuid: n.tokenUuid } : {}
  };
}
class Su {
  #e;
  #t;
  constructor(e, t) {
    this.#e = e, this.#t = t;
  }
  async publishWeaponAttack(e, t, i, a = !1) {
    const o = t.execution.result.success === !0, r = {
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
      ...o && t.target ? {
        action: {
          kind: "npcDamage",
          ...pi(mt(t.target)),
          requestedDamage: t.grossDamage,
          applied: !1
        }
      } : {}
    };
    await this.#e.publish(e, t.execution, i, { combat: r, showGmAudit: a });
  }
  async publishDefense(e, t, i, a, o, s = !1) {
    const r = i.recipient === "character" ? i.severity : "none", l = pi(ci(e)), u = a ? { sourceActorId: a.id, sourceName: a.name } : {}, c = {
      ...r === "none" ? {} : {
        woundSeverity: r,
        action: {
          kind: "characterWound",
          ...l,
          severity: r,
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
    await this.#e.publish(e, t, o, { combat: c, showGmAudit: s });
  }
  async createDefenseRequest(e, t, i, a) {
    const o = mt(e), s = ci(t), r = [...a];
    if (this.#t && r.includes("block") && !r.includes("blockWithShield")) {
      const c = await this.#t.normalizeEquipped(t);
      c && !this.#t.isBroken(c) && r.push("blockWithShield");
    }
    const l = {
      kind: "defenseRequest",
      sourceActorId: e.id,
      ...o.actorUuid ? { sourceActorUuid: o.actorUuid } : {},
      ...o.tokenId ? { sourceTokenId: o.tokenId } : {},
      ...o.tokenUuid ? { sourceTokenUuid: o.tokenUuid } : {},
      sourceName: e.name,
      targetActorId: t.id,
      ...s.actorUuid ? { targetActorUuid: s.actorUuid } : {},
      ...s.tokenId ? { targetTokenId: s.tokenId } : {},
      ...s.tokenUuid ? { targetTokenUuid: s.tokenUuid } : {},
      targetName: t.name,
      woundSeverity: i,
      allowedDefenses: r,
      resolved: !1
    }, u = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/defense-request-card.hbs",
      {
        sourceName: e.name,
        ...be(e),
        targetName: t.name,
        woundSeverity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${i}`),
        allowBlock: r.includes("block"),
        allowBlockWithShield: r.includes("blockWithShield"),
        allowDodge: r.includes("dodge")
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: e }),
      content: u,
      flags: { cypherv2: { defenseRequest: l } }
    });
  }
}
const Au = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The depletion roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class Hu {
  #e;
  constructor(e = Au) {
    this.#e = e;
  }
  async roll(e) {
    const t = e.system.depletion;
    if (!t.enabled) throw new Error("Depletion is not enabled for this Item.");
    const i = ["artifact", "weapon", "shield", "armor"].includes(e.type);
    if (i && e.system.depleted)
      throw new Error(`This ${e.name} is already depleted.`);
    const o = ["weapon", "shield", "armor"].includes(e.type) ? "" : t.formula?.trim() ?? "";
    if (Ft(t), !Number.isInteger(t.threshold) || t.threshold < 1)
      throw new Error("Depletion threshold must be a positive whole number.");
    const s = o || Ml(t), r = Number(s.match(/^1d(\d+)$/i)?.[1]);
    if (r > 0 && t.threshold > r)
      throw new Error(`Depletion threshold must be between 1 and ${r}.`);
    const l = await this.#e(s), u = {
      itemId: e.id,
      itemName: e.name,
      formula: s,
      total: l.total,
      threshold: t.threshold,
      depleted: l.total <= t.threshold,
      ...l.chatRoll === void 0 ? {} : { chatRoll: l.chatRoll }
    };
    return u.depleted && i && e.update && await e.update({ "system.depleted": !0 }), u;
  }
}
class Iu {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/depletion-card.hbs",
      {
        itemName: t.itemName,
        ...be(e.actor),
        formula: t.formula,
        total: t.total,
        depleted: t.depleted,
        outcome: game.i18n.localize(
          t.depleted ? "CYPHERV2.Depletion.Depleted" : "CYPHERV2.Depletion.NotDepleted"
        )
      }
    ), a = {
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: i
    };
    t.chatRoll !== void 0 && (a.rolls = [t.chatRoll]), await ChatMessage.create(a);
  }
}
const to = 124, $u = 58, io = 108, Vu = 10, Yu = async (n) => {
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
}, Du = async (n, e) => typeof foundry > "u" || !foundry.applications?.ux?.TextEditor?.implementation ? n : foundry.applications.ux.TextEditor.implementation.enrichHTML(n, e ? { async: !0, relativeTo: e } : { async: !0 });
function Fu(n) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map();
  for (const i of n) {
    const a = t.get(i.tier) ?? [];
    a.push(i), t.set(i.tier, a);
  }
  for (const i of t.values()) {
    const a = [...i].sort((o, s) => {
      const r = o.position?.x, l = s.position?.x;
      return r != null && l !== null && l !== void 0 ? r - l || o.id.localeCompare(s.id) : r != null ? -1 : l != null ? 1 : o.id.localeCompare(s.id);
    });
    a.forEach((o, s) => e.set(o.id, (s + 1) / (a.length + 1) * 100));
  }
  return e;
}
function Tu(n, e = 120) {
  const t = n.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
  return t.length <= e ? t : `${t.slice(0, Math.max(0, e - 1)).trimEnd()}…`;
}
class zu {
  #e;
  #t;
  #i;
  constructor(e = new xn(), t = Yu, i = Du) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async prepare(e, t = {}) {
    const i = t.characterTier ?? Number.MAX_SAFE_INTEGER, a = t.progress ?? { focusUuid: e.uuid, ownedNodeIds: [] }, o = t.missingOwnedNodeIds ?? /* @__PURE__ */ new Set();
    let s;
    try {
      s = this.#e.evaluateProgress(e.system.graph, i, a);
    } catch (m) {
      if (!(m instanceof dt)) throw m;
      if (t.progress) {
        const b = new Set(a.ownedNodeIds);
        s = {
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
    const r = Fu(s.nodes.map((m) => m.node)), l = t.editor ? 6 : Math.max(1, ...s.nodes.map((m) => m.node.tier)), u = /* @__PURE__ */ new Map();
    for (const m of s.nodes)
      u.set(m.node.tier, (u.get(m.node.tier) ?? 0) + 1);
    const c = Math.max(440, ...[...u.values()].map((m) => m * to + (m + 1) * Vu)), p = await Promise.all(s.nodes.map(async (m) => {
      const b = await this.#t(m.node.abilityUuid), g = m.state === "owned" && o.has(m.node.id), y = b?.description ?? m.node.abilitySnapshot.description ?? "", v = s.diagnostics.some((D) => D.code === "invalid-owned-progression" && D.nodeId === m.node.id || D.severity === "error" && (!D.nodeId || D.nodeId === m.node.id)), k = m.state !== "owned" && m.node.tier > i, P = m.state !== "owned" && m.reason === "no-owned-prerequisite", A = m.state !== "owned" && (m.state !== "available" || v), $ = t.editable && t.progress && !t.gmProgressionEdit ? m.state === "owned" ? "undoFocusAcquisition" : "acquireFocusNode" : "openFocusNode";
      return {
        id: m.node.id,
        abilityUuid: m.node.abilityUuid,
        abilityName: b?.name || m.node.abilitySnapshot.name || m.node.id,
        descriptionExcerpt: Tu(y),
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
        advisoryUnavailable: A,
        tierLocked: k,
        prerequisiteLocked: P,
        invalidProgression: v,
        canAcquire: !!(t.editable && t.progress && !t.gmProgressionEdit && m.state !== "owned"),
        canRestoreAbility: !!(t.editable && t.progress && g),
        canUndoAcquisition: !!(t.editable && t.progress && m.state === "owned" && !t.gmProgressionEdit),
        canGmMarkOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state !== "owned"),
        canGmRemoveOwned: !!(t.editable && t.progress && t.gmOverrideAllowed && t.gmProgressionEdit && m.state === "owned"),
        primaryAction: t.editor?.connectionSourceNodeId ? "completeFocusConnection" : t.editor ? "selectFocusEditorNode" : $,
        selected: t.editor?.selectedNodeId === m.node.id,
        connectionSource: t.editor?.connectionSourceNodeId === m.node.id,
        xPercent: r.get(m.node.id) ?? 50,
        width: to,
        height: $u
      };
    })), f = e.system.graph.connections.map(({ id: m, from: b, to: g }) => ({ id: m, from: b, to: g }));
    return {
      focusUuid: e.uuid,
      focusName: e.name,
      markerId: `focus-arrow-${e.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      mode: t.editor ? "editor" : t.progress ? "progression" : "focus",
      editor: !!t.editor,
      width: c,
      height: l * io,
      nodes: p,
      connections: f,
      tiers: Array.from({ length: l }, (m, b) => {
        const g = b + 1;
        return {
          tier: g,
          top: b * io,
          nodes: p.filter((y) => y.tier === g).sort((y, v) => y.xPercent - v.xPercent || y.id.localeCompare(v.id))
        };
      }),
      diagnostics: s.diagnostics,
      invalid: !1
    };
  }
}
function We(n) {
  return structuredClone(n);
}
function Be(n) {
  return new Set(n).size === n.length;
}
function Wi(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, img: n.img, type: e, system: We(n.system) };
}
function Nu(n, e) {
  return !n?.name || !n.system || typeof n.system != "object" ? null : { name: n.name, ...n.img ? { img: n.img } : {}, type: e, system: We(n.system) };
}
function no(n, e, t, i, a) {
  return {
    kind: n,
    sourceUuid: e,
    instanceId: t,
    grantId: i,
    status: "active",
    contentUuid: a.contentUuid,
    contentKey: a.contentKey,
    replacement: Ln()
  };
}
function Ln() {
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
function _i() {
  return {
    kind: "other",
    sourceUuid: "",
    instanceId: "",
    grantId: "",
    status: "active",
    contentUuid: "",
    contentKey: "",
    replacement: Ln()
  };
}
function Pt(n) {
  return { name: n.name, img: n.img, type: n.type, system: We(n.system) };
}
function Ki(n, e) {
  const t = Pt(n);
  return t.type = e, t;
}
function Ae(n) {
  return [...n.items].filter((e) => e.type === "characterType" || e.type === "descriptor" || e.type === "species");
}
function Mu(n, e) {
  return [...n.items].filter((t) => t.system.grantedBy?.instanceId === e);
}
function gn(n, e) {
  return Mu(n, e).flatMap((i) => {
    if (i.type !== "descriptor" && i.type !== "characterType" && i.type !== "species") return [i];
    const a = i.system.instance?.instanceId;
    return [i, ...a ? gn(n, a) : []];
  });
}
class Uu {
  #e;
  #t;
  #i;
  constructor(e = async (a) => await fromUuid(a), t = () => globalThis.crypto?.randomUUID?.() ?? `package-${Date.now()}-${Math.random()}`, i = Date.now) {
    this.#e = e, this.#t = t, this.#i = i;
  }
  async attachType(e, t, i = {}) {
    this.#m(e, t, "characterType");
    const a = i.replaceItemId ? Ae(e).find((y) => y.id === i.replaceItemId && y.type === "characterType") : void 0;
    if (Ae(e).some((y) => y.type === "characterType" && y.id !== a?.id))
      throw new Error("This Character already has an active Type.");
    const o = We(t.system), s = o.edgeGrant.mode === "choice" ? i.edgePool : o.edgeGrant.pool;
    if (o.edgeGrant.mode === "choice" && !s) throw new Error("This Type requires an Edge Pool choice.");
    const r = this.#p(o.choiceGroups ?? [], i.skillChoices ?? {}), l = this.#f(o.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), u = this.#t(), c = o.instance?.sourceUuid || t.uuid, p = (o.abilityChoiceGroups ?? []).flatMap((y) => y.options.filter((v) => l[y.id]?.includes(v.id)).map((v) => ({ ...v, id: `${y.id}:${v.id}` }))), f = [
      ...await this.#s([...o.abilityGrants ?? [], ...p], "type", c, u),
      ...await this.#o(o.skillGrants ?? [], "type", c, u),
      ...await this.#c(o.choiceGroups ?? [], r, "type", c, u)
    ], { grants: m, skippedGrantIds: b } = await this.#r(
      e,
      f,
      t,
      i.conflictResolver
    ), g = Pt(t);
    return g.system = {
      ...o,
      instance: {
        sourceUuid: c,
        instanceId: u,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: s ?? "none",
          poolChoices: [],
          skillChoices: Object.entries(r).map(([y, v]) => ({ groupId: y, optionIds: v })),
          abilityChoices: Object.entries(l).map(([y, v]) => ({ groupId: y, optionIds: v })),
          suppressedGrantIds: b
        },
        parent: _i()
      }
    }, this.#n(e, g, m, a, i.replaceGrantedItemsMode ?? "delete", b);
  }
  async attachDescriptor(e, t, i) {
    this.#m(e, t, "descriptor");
    const a = We(t.system), o = a.instance?.sourceUuid || t.uuid;
    if (Ae(e).some((m) => m.type === "descriptor" && m.system.instance.sourceUuid === o)) throw new Error("This Descriptor is already attached.");
    if (i.role === "primary" && Ae(e).some((m) => m.type === "descriptor" && m.system.instance.role === "primary")) throw new Error("This Character already has a primary Descriptor.");
    const s = this.#t(), r = this.#y(a.poolBonusChoiceGroups ?? [], i.poolChoices ?? {}), l = this.#p(a.choiceGroups ?? [], i.skillChoices ?? {}), u = [
      ...await this.#o(a.skillGrants ?? [], "descriptor", o, s),
      ...await this.#c(a.choiceGroups ?? [], l, "descriptor", o, s)
    ], { grants: c, skippedGrantIds: p } = await this.#r(
      e,
      u,
      t,
      i.conflictResolver
    ), f = Pt(t);
    return f.system = {
      ...a,
      instance: {
        sourceUuid: o,
        instanceId: s,
        role: i.role,
        attachedAt: this.#i(),
        selections: {
          edgePool: "none",
          poolChoices: Object.entries(r).map(([m, b]) => ({ groupId: m, pools: b })),
          skillChoices: Object.entries(l).map(([m, b]) => ({ groupId: m, optionIds: b })),
          abilityChoices: [],
          suppressedGrantIds: p
        },
        parent: i.parent ?? _i()
      }
    }, i.parent && (f.system.grantedBy = i.parent), this.#n(e, f, c, void 0, "delete", p);
  }
  async attachSpecies(e, t, i = {}) {
    this.#m(e, t, "species");
    const a = i.replaceItemId ? Ae(e).find((P) => P.id === i.replaceItemId && P.type === "species") : void 0;
    if (Ae(e).some((P) => P.type === "species" && P.id !== a?.id))
      throw new Error("This Character already has an active Species.");
    const o = We(t.system), s = o.edgeGrant.mode === "choice" ? i.edgePool : o.edgeGrant.pool;
    if (o.edgeGrant.mode === "choice" && !s) throw new Error("This Species requires an Edge Pool choice.");
    const r = this.#p(o.choiceGroups ?? [], i.skillChoices ?? {}), l = this.#f(o.abilityChoiceGroups ?? [], i.abilityChoices ?? {}), u = this.#t(), c = o.instance?.sourceUuid || t.uuid, p = (o.abilityChoiceGroups ?? []).flatMap((P) => P.options.filter((A) => l[P.id]?.includes(A.id)).map((A) => ({ ...A, id: `${P.id}:${A.id}` }))), f = [
      ...await this.#s([...o.abilityGrants ?? [], ...p], "species", c, u),
      ...await this.#o(o.skillGrants ?? [], "species", c, u),
      ...await this.#c(o.choiceGroups ?? [], r, "species", c, u)
    ], m = await this.#r(
      e,
      f,
      t,
      i.conflictResolver
    ), b = [...m.grants], g = [...m.skippedGrantIds], y = [...m.skippedGrantIds], v = new Set(Ae(e).filter((P) => P.type === "descriptor").map((P) => P.system.instance.sourceUuid || `snapshot:${P.name.trim().toLocaleLowerCase()}`));
    if (!Be((o.descriptorGrants ?? []).map((P) => P.id)))
      throw new Error("Species Descriptor grant IDs must be unique.");
    for (const P of o.descriptorGrants ?? []) {
      const A = P.descriptorUuid ? await this.#e(P.descriptorUuid) : null;
      if (A && A.type !== "descriptor") throw new Error("A Species Descriptor grant references a non-Descriptor Item.");
      const $ = A ? Pt(A) : Nu(P.snapshot, "descriptor");
      if (!$) throw new Error(`Descriptor grant '${P.id}' has neither a source nor a usable snapshot.`);
      const D = We($.system), K = D.instance?.sourceUuid || P.descriptorUuid, de = K || `snapshot:${String($.name).trim().toLocaleLowerCase()}`;
      if (v.has(de)) {
        g.push(P.id), y.push(P.id);
        continue;
      }
      v.add(de);
      const H = this.#t(), j = this.#y(
        D.poolBonusChoiceGroups ?? [],
        i.descriptorPoolChoices?.[P.id] ?? {}
      ), ve = this.#p(
        D.choiceGroups ?? [],
        i.descriptorSkillChoices?.[P.id] ?? {}
      ), V = [
        ...await this.#o(D.skillGrants ?? [], "descriptor", K, H),
        ...await this.#c(D.choiceGroups ?? [], ve, "descriptor", K, H)
      ], x = {
        id: String(A?.id ?? P.id),
        uuid: K,
        name: String($.name),
        type: "descriptor",
        ...$.img ? { img: String($.img) } : {},
        system: D
      }, ie = await this.#r(
        e,
        V,
        x,
        i.conflictResolver,
        b
      );
      y.push(...ie.skippedGrantIds);
      const ue = {
        contentUuid: K,
        contentKey: `descriptor:${String($.name).trim().toLocaleLowerCase()}`
      }, O = {
        kind: "species",
        sourceUuid: c,
        instanceId: u,
        grantId: P.id,
        status: "active",
        ...ue,
        replacement: Ln()
      };
      $.system = {
        ...D,
        grantedBy: O,
        instance: {
          sourceUuid: K,
          instanceId: H,
          role: "speciesGranted",
          attachedAt: this.#i(),
          selections: {
            edgePool: "none",
            poolChoices: Object.entries(j).map(([ze, pe]) => ({ groupId: ze, pools: pe })),
            skillChoices: Object.entries(ve).map(([ze, pe]) => ({ groupId: ze, optionIds: pe })),
            abilityChoices: [],
            suppressedGrantIds: ie.skippedGrantIds
          },
          parent: O
        }
      }, b.push($, ...ie.grants);
    }
    const k = Pt(t);
    return k.system = {
      ...o,
      instance: {
        sourceUuid: c,
        instanceId: u,
        role: "primary",
        attachedAt: this.#i(),
        selections: {
          edgePool: s ?? "none",
          poolChoices: [],
          skillChoices: Object.entries(r).map(([P, A]) => ({ groupId: P, optionIds: A })),
          abilityChoices: Object.entries(l).map(([P, A]) => ({ groupId: P, optionIds: A })),
          suppressedGrantIds: g
        },
        parent: _i()
      }
    }, this.#n(
      e,
      k,
      b,
      a,
      i.replaceGrantedItemsMode ?? "delete",
      y
    );
  }
  async remove(e, t, i) {
    const a = Ae(e).find((c) => c.id === t);
    if (!a) throw new Error("Character Package not found.");
    const o = a.system.instance.instanceId, s = gn(e, o), r = Object.fromEntries(I.map((c) => [c, e.system.derived.pools[c].max])), l = Hi(a), u = i === "delete" ? s.map((c) => c.id) : [];
    return i === "keep" && await Promise.all(s.map((c) => c.update({
      "system.grantedBy.status": "retained",
      ...c.type === "descriptor" || c.type === "characterType" || c.type === "species" ? { "system.instance.parent.status": "retained" } : {}
    }))), await e.deleteEmbeddedDocuments("Item", [a.id, ...u]), await this.#a(e, r, Object.fromEntries(I.map((c) => [c, r[c] - l[c]]))), {
      removedPackageId: a.id,
      deletedGrantedItemIds: u,
      retainedGrantedItemIds: i === "keep" ? s.map((c) => c.id) : []
    };
  }
  async #n(e, t, i, a, o = "delete", s = []) {
    const r = Object.fromEntries(I.map((f) => [f, e.system.derived.pools[f].max])), l = Hi(t), u = a ? Hi(a) : { might: 0, speed: 0, intellect: 0 }, c = await e.createEmbeddedDocuments("Item", [t, ...i]);
    try {
      if (a) {
        const m = gn(e, a.system.instance.instanceId);
        o === "keep" && await Promise.all(m.map((b) => b.update({
          "system.grantedBy.status": "retained",
          ...b.type === "descriptor" || b.type === "characterType" || b.type === "species" ? { "system.instance.parent.status": "retained" } : {}
        }))), await e.deleteEmbeddedDocuments("Item", [
          a.id,
          ...o === "delete" ? m.map((b) => b.id) : []
        ]);
      }
      const f = Object.fromEntries(I.map((m) => [m, r[m] + l[m] - u[m]]));
      await this.#a(e, r, f);
    } catch (f) {
      const m = c.map((b) => b.id).filter((b) => !!b);
      throw m.length && await e.deleteEmbeddedDocuments("Item", m), f;
    }
    const p = t.system.instance.instanceId;
    return { packageItem: c[0], grantedItems: c.slice(1), instanceId: p, skippedGrantIds: s };
  }
  async #a(e, t, i) {
    const a = {};
    for (const o of I)
      a[`system.stats.${o}.value`] = Ro(e.system.stats[o].value, t[o], Math.max(0, i[o]));
    await e.update(a);
  }
  async #s(e, t, i, a) {
    if (!Be(e.map((o) => o.id))) throw new Error("Type Ability grant IDs must be unique.");
    return Promise.all(e.map(async (o) => {
      const s = o.abilityUuid ? await this.#e(o.abilityUuid) : null;
      if (s && s.type !== "ability") throw new Error("An Ability grant references a non-Ability Item.");
      const r = s ? Ki(s, "ability") : Wi(o.snapshot, "ability");
      if (!r) throw new Error(`Ability grant '${o.id}' has neither a source nor a usable snapshot.`);
      const l = ye("ability", String(r.name ?? o.snapshot.name), o.abilityUuid);
      return r.system = { ...r.system, grantedBy: no(t, i, a, o.id, l) }, r;
    }));
  }
  async #o(e, t, i, a) {
    if (!Be(e.map((o) => o.id))) throw new Error("Descriptor Skill grant IDs must be unique.");
    return Promise.all(e.map((o) => this.#l(o, o.rank, t, i, a, o.id)));
  }
  async #c(e, t, i, a, o) {
    const s = [];
    for (const r of e)
      for (const l of t[r.id] ?? []) {
        const u = r.options.find((c) => c.id === l);
        s.push(await this.#l(u, r.rank, i, a, o, `${r.id}:${u.id}`));
      }
    return s;
  }
  async #l(e, t, i, a, o, s) {
    const r = e.skillUuid ? await this.#e(e.skillUuid) : null;
    if (r && r.type !== "skill") throw new Error("A Skill grant references a non-Skill Item.");
    const l = r ? Ki(r, "skill") : Wi(e.snapshot, "skill") ?? (e.customName ? { name: e.customName, type: "skill", system: {} } : null);
    if (!l) throw new Error(`Skill grant '${s}' has neither a source, custom name, nor usable snapshot.`);
    const u = ye("skill", String(l.name ?? e.customName), e.skillUuid);
    return l.system = { ...l.system, rank: t, grantedBy: no(i, a, o, s, u) }, l;
  }
  async #r(e, t, i, a, o = []) {
    const s = [], r = [], l = [...e.items], u = o.filter((c) => c.type === "ability" || c.type === "skill");
    for (const c of t) {
      let p = c;
      const f = p.type;
      if (f !== "ability" && f !== "skill") {
        s.push(p);
        continue;
      }
      for (; ; ) {
        const m = p.system.grantedBy ?? {}, b = { type: f, contentUuid: m.contentUuid, contentKey: m.contentKey }, g = [...l, ...u, ...s], y = vi(g, b);
        if (!y) {
          s.push(p);
          break;
        }
        if (!a) {
          r.push(m.grantId);
          break;
        }
        const v = {
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
        }, k = await a(v);
        if (k.action === "cancel") throw new Te();
        if (k.action === "suppress") {
          r.push(m.grantId);
          break;
        }
        if (k.action !== "replace")
          throw new Error("GM Override is not a valid Character Package grant resolution.");
        p = await this.#u(p, k.replacement, k.selectionKind);
      }
    }
    return { grants: s, skippedGrantIds: r };
  }
  #d(e, t) {
    const i = e, a = i.system ?? {}, o = a.grantedBy ?? {}, s = ye(t, String(i.name ?? ""), String(o.contentUuid ?? ""));
    return {
      id: String(i.id ?? i.uuid ?? s.contentKey),
      name: String(i.name ?? ""),
      type: t,
      rank: t === "skill" ? String(a.rank ?? "untrained") : "",
      contentUuid: String(o.contentUuid ?? s.contentUuid),
      contentKey: String(o.contentKey ?? s.contentKey)
    };
  }
  async #u(e, t, i) {
    const a = e.type;
    if (a !== "ability" && a !== "skill") throw new Error("Only Skill and Ability grants can be replaced.");
    if (t.type !== a) throw new Error("A grant replacement must use the same Item type.");
    const o = t.itemUuid ? await this.#e(t.itemUuid) : null;
    if (o && o.type !== a) throw new Error(`The selected replacement is not a ${a} Item.`);
    const s = o ? Ki(o, a) : Wi(t.snapshot, a) ?? (a === "skill" && t.custom ? { name: t.name, type: a, system: {} } : null);
    if (!s) throw new Error(`The selected ${a} replacement is unavailable and has no usable snapshot.`);
    const r = e.system, l = r.grantedBy ?? {}, u = l.replacement?.active ? l.replacement : {
      originalName: String(e.name ?? ""),
      originalContentUuid: l.contentUuid,
      originalContentKey: l.contentKey
    }, c = ye(a, String(s.name ?? t.name), t.itemUuid);
    return s.system = {
      ...s.system,
      ...a === "skill" ? { rank: r.rank } : {},
      grantedBy: {
        ...l,
        contentUuid: c.contentUuid,
        contentKey: c.contentKey,
        replacement: {
          active: !0,
          originalName: u.originalName,
          originalContentUuid: u.originalContentUuid,
          originalContentKey: u.originalContentKey,
          replacementName: String(s.name ?? t.name),
          replacementContentUuid: c.contentUuid,
          replacementContentKey: c.contentKey,
          selectionKind: i
        }
      }
    }, s;
  }
  #b(e, t, i, a) {
    const o = [], s = (c, p, f) => {
      const m = c.snapshot?.name || c.customName;
      m && o.push({
        id: `${f}:${c.id}`,
        type: i,
        name: m,
        itemUuid: c.itemUuid,
        snapshot: c.snapshot,
        reason: p,
        reasonSourceUuid: f,
        ...i === "skill" && !c.itemUuid ? { custom: !0 } : {}
      });
    }, r = (c, p, f) => {
      for (const m of c ?? []) s(m, p, f);
    }, l = (c, p = !1) => {
      const f = c.system, m = "instance" in f ? f.instance?.selections : void 0;
      if (i === "skill") {
        for (const b of f.skillGrants ?? [])
          c.uuid === t.uuid && b.id === a && r(b.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const b of f.choiceGroups ?? []) {
          const g = m?.skillChoices.find((v) => v.groupId === b.id)?.optionIds ?? [], y = a.startsWith(`${b.id}:`) ? a.slice(b.id.length + 1) : "";
          if (c.uuid === t.uuid && y)
            for (const v of b.options) v.id !== y && s({ id: v.id, itemUuid: v.skillUuid, customName: v.customName, snapshot: v.snapshot }, `${c.name} — Skill choice`, c.uuid);
          else if (!p)
            for (const v of b.options) g.includes(v.id) || s({ id: v.id, itemUuid: v.skillUuid, customName: v.customName, snapshot: v.snapshot }, `${c.name} — unused Skill choice`, c.uuid);
        }
      } else {
        for (const b of f.abilityGrants ?? [])
          c.uuid === t.uuid && b.id === a && r(b.alternatives, `${c.name} — declared alternative`, c.uuid);
        for (const b of f.abilityChoiceGroups ?? []) {
          const g = m?.abilityChoices.find((v) => v.groupId === b.id)?.optionIds ?? [], y = a.startsWith(`${b.id}:`) ? a.slice(b.id.length + 1) : "";
          if (c.uuid === t.uuid && y)
            for (const v of b.options) v.id !== y && s({ id: v.id, itemUuid: v.abilityUuid, customName: "", snapshot: v.snapshot }, `${c.name} — Ability choice`, c.uuid);
          else if (!p)
            for (const v of b.options) g.includes(v.id) || s({ id: v.id, itemUuid: v.abilityUuid, customName: "", snapshot: v.snapshot }, `${c.name} — unused Ability choice`, c.uuid);
        }
      }
    };
    l(t, !0);
    for (const c of Ae(e)) l(c);
    const u = /* @__PURE__ */ new Set();
    return o.filter((c) => {
      const p = ye(i, c.name, c.itemUuid), f = p.contentUuid || p.contentKey;
      return u.has(f) || is(e.items, p) ? !1 : (u.add(f), !0);
    });
  }
  #p(e, t) {
    const i = {};
    for (const a of e) {
      const o = t[a.id] ?? [];
      if (o.length !== a.choose || !Be(o) || o.some((s) => !a.options.some((r) => r.id === s)))
        throw new Error(`Descriptor choice '${a.id}' requires exactly ${a.choose} valid option(s).`);
      i[a.id] = [...o];
    }
    return i;
  }
  #f(e, t) {
    const i = {};
    for (const a of e) {
      const o = t[a.id] ?? [];
      if (o.length !== a.choose || !Be(o) || o.some((s) => !a.options.some((r) => r.id === s)))
        throw new Error(`Ability choice '${a.id}' requires exactly ${a.choose} valid option(s).`);
      i[a.id] = [...o];
    }
    return i;
  }
  #y(e, t) {
    if (!Be(e.map((a) => a.id)))
      throw new Error("Descriptor Pool bonus choice group IDs must be unique.");
    const i = {};
    for (const a of e) {
      const o = [...new Set(a.pools)].filter((r) => I.includes(r));
      if (o.length !== a.pools.length || !Number.isInteger(a.choose) || a.choose < 1 || a.choose > o.length || !Number.isInteger(a.amount) || a.amount < 1)
        throw new Error(`Descriptor Pool choice '${a.id}' is invalid.`);
      const s = t[a.id] ?? [];
      if (s.length !== a.choose || !Be(s) || s.some((r) => !o.includes(r)))
        throw new Error(`Descriptor Pool choice '${a.id}' requires exactly ${a.choose} valid Pool(s).`);
      i[a.id] = [...s];
    }
    return i;
  }
  #m(e, t, i) {
    if (e.type !== "character") throw new Error("Character Packages require a Character Actor.");
    if (t.type !== i) throw new Error(`Expected a ${i} Item.`);
  }
}
function ni(n, e, t = 0) {
  if (!Number.isInteger(n) || n < t)
    throw new Error(`${e} must be an integer of at least ${t}.`);
  return n;
}
function ao(n, e, t) {
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
function xu(n) {
  return n.type === "npc" ? mt(n) : {
    actorId: n.id,
    ...n.actorUuid ?? n.uuid ? { actorUuid: n.actorUuid ?? n.uuid } : {},
    ...n.tokenId ? { tokenId: n.tokenId } : {},
    ...n.tokenUuid ? { tokenUuid: n.tokenUuid } : {}
  };
}
class qu {
  #e;
  #t;
  #i;
  #n;
  constructor(e, t, i, a) {
    this.#e = e, this.#t = t, this.#i = i, this.#n = a;
  }
  canUse(e) {
    return e.type === "ability" && e.system.activation !== "passive";
  }
  pool(e, t) {
    const i = Ne(e);
    if (t && i.length > 0 && !i.includes(t))
      throw new Error(`${t} is not an allowed Pool for this Ability.`);
    return i.length === 1 ? i[0] : t ?? null;
  }
  previewPayment(e, t, i) {
    ee(e), this.#s(t);
    const a = Ne(t), o = ni(t.system.cost.amount, "Ability cost");
    if (o <= 0 || a.length === 0)
      throw new Error("This Ability has no payable Pool cost.");
    if (!a.includes(i)) throw new Error(`${i} is not an allowed Pool for this Ability.`);
    const s = ni(e.system.stats[i].value, `${i} Pool value`), r = Math.max(0, Math.trunc(e.system.derived.pools[i].edge)), l = fn(o, 0, r, t.system.cost.ignoresEdge), u = s - l.poolCost;
    return {
      ability: t,
      pool: i,
      listedCost: o,
      ignoresEdge: t.system.cost.ignoresEdge,
      edge: r,
      edgeApplied: l.edgeApplied,
      costPaid: l.poolCost,
      currentBefore: s,
      currentAfter: u,
      canPay: u >= 0
    };
  }
  async payCost(e, t, i) {
    const a = this.previewPayment(e, t, i);
    if (!a.canPay)
      throw new Error(`${i} has ${a.currentBefore} points but this Ability costs ${a.costPaid}.`);
    return a.costPaid > 0 && await e.update({ [`system.stats.${i}.value`]: a.currentAfter }), a;
  }
  async executeNoRoll(e, t, i = {}) {
    if (this.#s(t), !this.canUse(t)) throw new Error("Passive Abilities cannot be used.");
    if (t.system.roll !== "none") throw new Error("This Ability requires a roll.");
    const a = this.#a(t, i.targets ?? []), o = this.pool(t, i.pool), s = this.#o(t);
    if (s > 0 && !o) throw new Error("A Pool is required to pay this Ability cost.");
    if (!o) return { ability: t, actor: { id: e.id, name: e.name }, pool: null, costPaid: 0, edgeApplied: 0, targets: a };
    const r = e.system.stats[o].value, l = fn(
      s,
      0,
      e.system.derived.pools[o].edge,
      t.system.cost.ignoresEdge
    );
    if (r < l.poolCost)
      throw new Error(`${o} has ${r} points but this action costs ${l.poolCost}.`);
    return l.poolCost > 0 && await e.update({ [`system.stats.${o}.value`]: r - l.poolCost }), {
      ability: t,
      actor: { id: e.id, name: e.name },
      pool: o,
      costPaid: l.poolCost,
      edgeApplied: l.edgeApplied,
      targets: a
    };
  }
  buildRollPlan(e, t, i = {}) {
    if (this.#s(t), !this.canUse(t)) throw new Error("Passive Abilities cannot be used.");
    if (t.system.roll === "none") throw new Error("This Ability does not require a roll.");
    const a = this.pool(t, i.pool);
    if (!a) throw new Error("Choose a Pool for this Ability roll.");
    const o = i.enabledRuleModuleIds ?? [], s = this.#a(t, i.targets ?? []), r = s.length ? s : [null], l = [
      "ability",
      `ability.${t.system.roll}`,
      ...t.system.roll === "attack" ? ["attack", "attack.ability", "defense.speed"] : [],
      ...t.system.roll === "defense" ? ["defense"] : [],
      ...a === "speed" ? ["speed-task"] : []
    ], u = { tags: l, pool: a }, c = r.map((g) => g?.type === "npc" ? this.#i.resolve(g, u, o) : null), p = [], f = ao(t, t.system.rollModifier, "roll");
    if (f && p.push(f), t.system.roll === "attack") {
      const g = ao(t, t.system.attackModifier, "attack");
      g && p.push(g);
    }
    const m = i.skill ? this.#t.rankContribution(i.skill, o) : null;
    m && p.push(m);
    const b = r.map((g, y) => ({
      label: t.name,
      pool: a,
      difficulty: c[y] ? { mode: "hidden", value: c[y].difficulty } : i.difficulty ?? { mode: "unknown" },
      skillSteps: i.skillSteps ?? 0,
      assets: i.assets ?? 0,
      paidEffort: i.paidEffort ?? 0,
      damageEffort: t.system.roll === "attack" ? i.damageEffort ?? 0 : 0,
      freeDamageEffort: t.system.roll === "attack" ? i.freeDamageEffort ?? 0 : 0,
      freeEffort: i.freeEffort ?? 0,
      actionCost: this.#o(t),
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
        damage: ni(t.system.damage, "Ability damage"),
        woundSeverity: t.system.woundSeverity
      },
      ...g ? {
        target: {
          ...xu(g),
          name: g.name,
          type: g.type === "npc" ? "npc" : "character"
        }
      } : {}
    }));
    return { ability: t, pool: a, requests: b, targets: r, targetResolutions: c, damage: t.system.damage };
  }
  async executeRoll(e, t, i, a) {
    const o = this.buildRollPlan(e, t, i), s = await this.#e.executeBatch(e, o.requests, a), r = this.#n.policy(i.enabledRuleModuleIds ?? []).damageEffortBonus;
    return s.map((l, u) => {
      const c = t.system.roll === "attack" ? l.result.prepared.damageEffortApplied * r : 0, p = t.system.roll === "attack" ? $t(l.result) : 0;
      return {
        ability: t,
        target: o.targets[u] ?? null,
        targetResolution: o.targetResolutions[u] ?? null,
        execution: l,
        baseDamage: o.damage,
        effortDamage: c,
        naturalDamage: p,
        grossDamage: o.damage + c + p,
        woundSeverity: t.system.woundSeverity
      };
    });
  }
  chooseAttackOutcomes(e, t) {
    return e.map((i) => {
      if (i.ability.system.roll !== "attack") return i;
      const a = Es(i.execution.result, t), o = $t(a);
      return {
        ...i,
        execution: { ...i.execution, result: a },
        naturalDamage: o,
        grossDamage: i.baseDamage + i.effortDamage + o
      };
    });
  }
  #a(e, t) {
    if (e.system.targetMode === "none") return [];
    if (e.system.targetMode === "single" && t.length > 1)
      throw new Error("This Ability can target only one Character or NPC.");
    return t;
  }
  #s(e) {
    if (e.type !== "ability") throw new Error("Ability use requires an Ability Item.");
  }
  #o(e) {
    const t = ni(e.system.cost.amount, "Ability cost");
    return Ne(e).length > 0 ? t : 0;
  }
}
function oo(n) {
  return n.type === "npc" ? mt(n) : ci(n);
}
function so(n, e) {
  const t = n.target;
  return t ? t.type === "npc" && n.grossDamage > 0 ? {
    damage: n.grossDamage,
    action: {
      kind: "npcDamage",
      ...pi(oo(t)),
      requestedDamage: n.grossDamage,
      applied: !1
    }
  } : t.type === "character" && n.woundSeverity !== "none" ? {
    woundSeverity: n.woundSeverity,
    action: {
      kind: "characterWound",
      ...pi(oo(t)),
      severity: n.woundSeverity,
      sourceActorId: e,
      sourceName: n.ability.name,
      applied: !1
    }
  } : {} : {};
}
class Gu {
  #e;
  constructor(e) {
    this.#e = e;
  }
  async publishRoll(e, t, i, a = !1) {
    const o = t.execution.result.success === !0, s = t.execution.result.success !== !1, l = {
      ...o ? so(t, e.id) : {},
      ...s && t.ability.system.roll === "attack" ? {
        damage: t.grossDamage,
        damageBreakdown: [
          { label: "CYPHERV2.Ability.DamageBreakdown.Base", value: t.baseDamage },
          ...t.effortDamage ? [{ label: "CYPHERV2.Combat.DamageBreakdown.Effort", value: t.effortDamage, additive: !0 }] : [],
          ...t.naturalDamage ? [{ label: "CYPHERV2.Combat.DamageBreakdown.Natural", value: t.naturalDamage, additive: !0 }] : []
        ]
      } : {}
    };
    await this.#e.publish(e, t.execution, i, { combat: l, showGmAudit: a });
  }
  async publishNoRoll(e, t) {
    const i = t.targets.length ? t.targets : [null];
    for (const a of i) {
      const o = a ? so({
        ability: t.ability,
        target: a,
        grossDamage: t.ability.system.damage,
        woundSeverity: t.ability.system.woundSeverity
      }, e.id) : {}, s = o.action, r = await foundry.applications.handlebars.renderTemplate(
        "systems/cypherv2/templates/chat/ability-card.hbs",
        {
          abilityName: t.ability.name,
          actorName: e.name,
          ...be(e),
          activation: game.i18n.localize(`CYPHERV2.Ability.Activation.${t.ability.system.activation}`),
          poolLabel: t.pool ? game.i18n.localize(`CYPHERV2.Pools.${t.pool[0].toUpperCase()}${t.pool.slice(1)}`) : "",
          costPaid: t.costPaid,
          targetName: a?.name ?? "",
          damage: o.damage,
          woundSeverity: o.woundSeverity ? game.i18n.localize(`CYPHERV2.Wounds.Severity.${o.woundSeverity}`) : "",
          combatAction: !!s,
          combatActionLabel: s ? game.i18n.localize(s.kind === "npcDamage" ? "CYPHERV2.Combat.ApplyDamage" : "CYPHERV2.Combat.ApplyWound") : ""
        }
      ), l = {
        speaker: ChatMessage.getSpeaker({ actor: e }),
        content: r
      };
      s && (l.flags = { cypherv2: { combatAction: s } }), await ChatMessage.create(l);
    }
  }
  async publishPayment(e, t) {
    const i = game.i18n.localize(
      `CYPHERV2.Pools.${t.pool[0].toUpperCase()}${t.pool.slice(1)}`
    ), a = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/ability-payment-card.hbs",
      {
        abilityName: t.ability.name,
        actorName: e.name,
        ...be(e),
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
      content: a
    });
  }
}
const Ou = async (n) => {
  const e = await new Roll(n).evaluate();
  if (e.total === null) throw new Error("The Artifact level roll did not produce a total.");
  return { total: e.total, chatRoll: e };
};
class Bu {
  #e;
  constructor(e = Ou) {
    this.#e = e;
  }
  canRollLevel(e) {
    return un(e.system) && mi(e.system);
  }
  async rollLevel(e) {
    if (!un(e.system)) throw new Error("This Artifact is depleted.");
    if (!mi(e.system)) throw new Error("This Artifact has a fixed Level.");
    const t = Pi(e.system), i = await this.#e(t);
    return await e.update({ "system.level": String(i.total) }), {
      itemId: e.id,
      itemName: e.name,
      formula: t,
      total: i.total,
      ...i.chatRoll === void 0 ? {} : { chatRoll: i.chatRoll }
    };
  }
}
function Lu(n) {
  return game.i18n.localize(`CYPHERV2.Pools.${n[0].toUpperCase()}${n.slice(1)}`);
}
function ju(n) {
  const e = n._source?.system?.description;
  return typeof e == "string" ? e : "";
}
function Wu(n) {
  const e = n.system;
  if (n.type === "equipment")
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Quantity"), value: Number(e.quantity ?? 1) },
      ...Number(e.level) > 0 ? [{ label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Number(e.level) }] : [],
      ...e.equipped === !0 ? [{ label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize("CYPHERV2.Common.Yes") }] : []
    ];
  if (n.type === "cypher") {
    const t = us(e.manifestation), i = ms(e.power);
    return [
      { label: game.i18n.localize("CYPHERV2.Cypher.Manifestation.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${t}`) },
      ...String(e.form ?? "").trim() ? [{ label: game.i18n.localize("CYPHERV2.Cypher.Form"), value: String(e.form) }] : [],
      { label: game.i18n.localize("CYPHERV2.Cypher.Power.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Power.${i}`) },
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Bn(e) }
    ];
  }
  if (n.type === "artifact") {
    const t = e.depletion;
    return [
      { label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Pi(e) },
      ...t?.enabled === !0 ? [{
        label: game.i18n.localize("CYPHERV2.Inventory.Depletion"),
        value: String(t.formula || `1${String(t.die ?? "d6")}`)
      }] : [],
      ...e.depleted === !0 ? [{ label: game.i18n.localize("CYPHERV2.Artifact.Depleted"), value: game.i18n.localize("CYPHERV2.Common.Yes") }] : []
    ];
  }
  if (n.type === "weapon") {
    const t = String(e.category ?? "medium"), i = String(e.attackType ?? "melee"), a = String(e.rangeCategory ?? "immediate");
    return [
      { label: game.i18n.localize("CYPHERV2.Combat.Category"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${t}`) },
      { label: game.i18n.localize("CYPHERV2.Combat.Damage"), value: Number(e.baseDamage ?? 0) },
      { label: game.i18n.localize("CYPHERV2.Combat.Weapon.AttackType.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${i}`) },
      { label: game.i18n.localize("CYPHERV2.Combat.Range.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Range.${a}`) }
    ];
  }
  if (n.type === "shield") {
    const t = e.wounds, i = e.derived, a = i?.capacities, o = i?.broken === !0;
    return [
      { label: game.i18n.localize("CYPHERV2.Shield.Status"), value: game.i18n.localize(o ? "CYPHERV2.Shield.Broken" : "CYPHERV2.Shield.Functional") },
      { label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize(e.equipped === !0 ? "CYPHERV2.Common.Yes" : "CYPHERV2.Common.No") },
      { label: game.i18n.localize("CYPHERV2.Shield.WoundTrack"), value: ["minor", "moderate", "major"].map((s) => `${t?.[s]?.length ?? 0}/${a?.[s] ?? 0}`).join(" · ") }
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
    const t = n, i = Ne(t), a = To(t.system.cost.amount, i, Lu, {
      pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
      middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
      final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
    });
    return a ? [{ label: game.i18n.localize("CYPHERV2.Ability.Cost"), value: a }] : [];
  }
  return [];
}
function _u(n) {
  return Wu(n).filter(
    ({ label: e, value: t }) => e.trim().length > 0 && (typeof t == "number" || t.trim().length > 0)
  );
}
class Ku {
  async publish(e) {
    const t = e.system, i = ju(e), a = i ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(i, {
      async: !0,
      relativeTo: e
    }) : "", o = t.depletion, s = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-card.hbs",
      {
        itemName: e.name,
        ...be(e.actor),
        itemType: game.i18n.localize(`TYPES.Item.${e.type}`),
        properties: _u(e),
        enrichedDescription: a,
        hasDescription: !!i.trim(),
        canRollDepletion: e.type === "artifact" && o?.enabled === !0 && t.depleted !== !0,
        itemUuid: e.uuid,
        depleted: t.depleted === !0
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: s
    });
  }
  async publishArtifactLevelRoll(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-formula-roll-card.hbs",
      {
        itemName: t.itemName,
        ...be(e.actor),
        label: game.i18n.localize("CYPHERV2.Artifact.LevelRoll"),
        formula: t.formula,
        total: t.total
      }
    ), a = {
      speaker: ChatMessage.getSpeaker(e.actor ? { actor: e.actor } : void 0),
      content: i
    };
    t.chatRoll !== void 0 && (a.rolls = [t.chatRoll]), await ChatMessage.create(a);
  }
}
class Xu {
  canUse(e) {
    return e.type === "character" && e.system.xp >= 1;
  }
  async spend(e, t) {
    if (ee(e), !t) throw new Error("A Player Intrusion request ID is required.");
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
function Ju(n) {
  return { actorName: n.actorName, xpSpent: n.xpSpent };
}
class Qu {
  async publish(e, t) {
    const i = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/player-intrusion-card.hbs",
      {
        ...Ju(e),
        ...be(t)
      }
    );
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: t }),
      content: i,
      flags: { cypherv2: { playerIntrusion: e } }
    });
  }
}
function Zu(n) {
  const e = new Bd(), t = new Md(), i = new Gd(), a = new su(n), o = new lu(n), s = new gu(n), r = new iu(), l = new wu(), u = new Cu(), c = new hs(e), p = new Hu(), f = new Cs(), m = new xn(), b = new ku(
    n,
    a,
    o,
    s,
    e,
    l,
    u,
    c,
    f
  );
  return Object.freeze({
    wounds: e,
    recovery: new qd(t, i),
    rally: new rl(e),
    rolls: a,
    rollChat: r,
    skills: o,
    intrusions: new uu(n),
    intrusionChat: new vl(),
    playerIntrusions: new Xu(),
    playerIntrusionChat: new Qu(),
    targets: s,
    combat: b,
    combatChat: new Su(r, c),
    abilities: new qu(a, o, s, b),
    abilityChat: new Gu(r),
    shields: c,
    artifacts: new Bu(),
    itemChat: new Ku(),
    genres: new vc(),
    weapons: f,
    depletion: p,
    depletionChat: new Iu(),
    combatStatuses: u,
    focusEvaluator: m,
    focusTrees: new zu(m),
    focusAcquisition: new Xl(m),
    advancement: new tc(n),
    focusAssociations: new lc(),
    characterInitialization: new uc(),
    characterPackages: new Uu()
  });
}
const em = {
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
class tm {
  #e = /* @__PURE__ */ new Map();
  #t = /* @__PURE__ */ new Set();
  register(e) {
    const t = e.id.trim();
    if (!t) throw new Error("Theme IDs cannot be blank.");
    if (this.#e.has(t)) throw new Error(`Theme '${t}' is already registered.`);
    const i = Object.freeze({ ...e.properties });
    for (const o of Object.keys(i))
      if (!o.startsWith("--cypherv2-"))
        throw new Error(`Theme property '${o}' must use the --cypherv2- prefix.`);
    const a = Object.freeze({ ...e, id: t, properties: i });
    return this.#e.set(t, a), a;
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
    for (const a of this.#t) t.style.removeProperty(a);
    this.#t.clear();
    for (const [a, o] of Object.entries(i.properties))
      t.style.setProperty(a, o), this.#t.add(a);
    return t.dataset.cypherv2Theme = i.id, i;
  }
}
function ro(n) {
  return n.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function im(n) {
  return n === !0 || n === "true" || n === "on";
}
async function nm() {
  if (!game.user.isGM) throw new Error("Only a GM can initiate a GM Intrusion.");
  const n = [...game.actors].filter((r) => r.type === "character").sort((r, l) => r.name.localeCompare(l.name));
  if (n.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoCharacters"));
    return;
  }
  const e = n.map((r) => '<option value="' + r.id + '">' + ro(r.name) + "</option>").join(""), t = n.map((r) => '<label class="intrusion-character-choice"><input name="group-' + r.id + '" type="checkbox"> ' + ro(r.name) + "</label>").join(""), i = [
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
  ].join(""), a = await foundry.applications.api.DialogV2.input({
    window: { title: game.i18n.localize("CYPHERV2.Intrusion.ManualTitle") },
    content: i,
    rejectClose: !1,
    ok: { label: game.i18n.localize("CYPHERV2.Intrusion.Create") },
    render: (r, l) => {
      const u = l.element.querySelector('[name="mode"]'), c = l.element.querySelector('[data-intrusion-selection="single"]'), p = l.element.querySelector('[data-intrusion-selection="group"]'), f = () => {
        const m = u?.value === "group";
        c && (c.hidden = m), p && (p.hidden = !m);
      };
      u?.addEventListener("change", f), f();
    }
  });
  if (!a) return;
  const o = a.mode === "group" || a.mode === "free" ? a.mode : "targeted", s = o === "group" ? n.filter((r) => im(a["group-" + r.id])).map((r) => r.id) : [String(a.targetActorId ?? "")];
  try {
    await Nt().createManual({ mode: o, actorIds: s });
  } catch (r) {
    ui.notifications.error(r instanceof Error ? r.message : String(r));
  }
}
function Xi(n, e, t) {
  const i = t > Xe, a = n.querySelector("[data-horror-summary]"), o = n.querySelector("[data-horror-explanation]"), s = n.querySelector("[data-horror-value]");
  n.dataset.horrorBand = No(t), n.style.setProperty("--cypherv2-horror-fill", `${Mo(t)}%`), e.value = String(t), e.setAttribute("aria-valuetext", i ? `1–${t}` : "Natural 1"), s && (s.value = String(t)), a && (a.textContent = i ? game.i18n.format("CYPHERV2.Horror.RangeSummary", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalSummary")), o && (o.textContent = i ? game.i18n.format("CYPHERV2.Horror.Explanation", { range: t }) : game.i18n.localize("CYPHERV2.Horror.NormalExplanation"));
}
async function am() {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  const n = nn(), e = `<div class="cypherv2 cypherv2-dialog cypherv2-horror-dialog" data-horror-dialog data-horror-band="${No(n)}" style="--cypherv2-horror-fill: ${Mo(n)}%">
    <header class="cypherv2-dialog-heading">
      <span>${game.i18n.localize("CYPHERV2.Horror.Title")}</span>
      <strong data-horror-summary></strong>
    </header>
    <section class="cypherv2-dialog-section">
      <div class="horror-range-control">
        <input class="horror-range-input" id="cypherv2-horror-intrusion-range" name="horrorIntrusionRange" type="range" min="${Xe}" max="${zt}" step="1" value="${n}" aria-label="${game.i18n.localize("CYPHERV2.Horror.RangeLabel")}">
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
      const a = i.element.querySelector("[data-horror-dialog]"), o = a?.querySelector("[name='horrorIntrusionRange']");
      !a || !o || (Xi(a, o, n), o.addEventListener("input", () => {
        Xi(a, o, Number(o.value));
      }), o.addEventListener("change", () => {
        ol(Number(o.value)).catch((s) => {
          ui.notifications.error(s instanceof Error ? s.message : String(s)), Xi(a, o, nn());
        });
      }));
    }
  });
}
function om() {
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
        nm();
      }
    }, t.cypherv2HorrorMode = {
      name: "cypherv2HorrorMode",
      title: "CYPHERV2.Horror.SceneControl",
      icon: "fa-solid fa-skull",
      order: i + 1,
      button: !0,
      visible: game.user.isGM,
      onChange: () => {
        am();
      }
    };
  });
}
const Rs = `system.${S}`;
function fi(n) {
  return game.user.isGM || n.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function yn(n) {
  (n.tokenId || n.tokenUuid) && ui.notifications.error(game.i18n.localize("CYPHERV2.Combat.Errors.OriginalTokenMissing"));
}
function Ps(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function ks(n) {
  return {
    actorId: n.targetActorId,
    ...n.targetActorUuid ? { actorUuid: n.targetActorUuid } : {},
    ...n.targetTokenId ? { tokenId: n.targetTokenId } : {},
    ...n.targetTokenUuid ? { tokenUuid: n.targetTokenUuid } : {}
  };
}
function sm(n) {
  return {
    actorId: n.sourceActorId,
    ...n.sourceActorUuid ? { actorUuid: n.sourceActorUuid } : {},
    ...n.sourceTokenId ? { tokenId: n.sourceTokenId } : {},
    ...n.sourceTokenUuid ? { tokenUuid: n.sourceTokenUuid } : {}
  };
}
function Ss(n) {
  const e = n.getFlag(S, "combatAction");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "npcDamage" && t.kind !== "characterWound" && t.kind !== "shieldWound" || typeof t.targetActorId != "string" || typeof t.applied != "boolean" ? null : e;
}
function As(n) {
  const e = n.getFlag(S, "defenseRequest");
  if (!e || typeof e != "object") return null;
  const t = e;
  return t.kind !== "defenseRequest" || typeof t.sourceActorId != "string" || typeof t.targetActorId != "string" ? null : e;
}
async function rm(n, e) {
  const t = Ss(n);
  if (!t || t.applied) return;
  const i = Ps(t), a = await on(i);
  if (!a) {
    yn(i);
    return;
  }
  if (!fi(a)) return;
  const o = Dt(a, i);
  e.disabled = !0;
  try {
    if (t.kind === "npcDamage")
      await game.cypherv2.services.combat.applyNpcDamage(
        o,
        t.requestedDamage
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.DamageApplied"));
    else if (t.kind === "characterWound") {
      const s = t.sourceActorId ? { id: t.sourceActorId, name: t.sourceName ?? "NPC" } : void 0;
      await game.cypherv2.services.combat.applyCharacterWound(
        o,
        t.severity,
        s
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    } else {
      const s = a.items.get(t.shieldId);
      if (!s || s.type !== "shield") throw new Error("Resolved Shield Item not found.");
      const r = t.sourceActorId ? { id: t.sourceActorId, name: t.sourceName ?? "NPC" } : void 0;
      await game.cypherv2.services.combat.applyShieldWound(
        o,
        s,
        t.severity,
        r
      ), ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    }
    await n.setFlag(S, "combatAction", { ...t, applied: !0 }), e.textContent = game.i18n.localize("CYPHERV2.Combat.Applied");
  } catch (s) {
    e.disabled = !1, ui.notifications.error(s instanceof Error ? s.message : String(s));
  }
}
async function lm(n, e, t, i) {
  if (e.resolved || !e.allowedDefenses.includes(t)) return;
  const a = ks(e), o = sm(e), s = await on(a), r = await on(o);
  if (!s || !r) {
    s || yn(a), r || yn(o);
    return;
  }
  if (!fi(s)) return;
  if (i.disabled = !0, !await sn(
    Dt(s, a),
    t,
    {
      source: Dt(r, o),
      woundSeverity: e.woundSeverity
    }
  )) {
    i.disabled = !1;
    return;
  }
  game.socket.emit(Rs, { type: "resolveDefenseRequest", messageId: n.id }), game.user.isGM && await n.setFlag(S, "defenseRequest", { ...e, resolved: !0 });
}
function cm(n, e) {
  const t = Ss(n), i = e.querySelector("[data-action='applyCombatOutcome']");
  if (i) {
    const r = t ? an(Ps(t)) : null;
    !t || !r || !fi(r) ? i.remove() : t.applied ? (i.disabled = !0, i.textContent = game.i18n.localize("CYPHERV2.Combat.Applied")) : i.addEventListener("click", () => {
      rm(n, i);
    }, { once: !0 });
  }
  const a = As(n), o = [...e.querySelectorAll("[data-action='rollRequestedDefense']")];
  if (o.length === 0) return;
  const s = a ? an(ks(a)) : null;
  if (!a || !s || !fi(s) || a.resolved) {
    for (const r of o) r.remove();
    return;
  }
  for (const r of o) {
    const l = r.dataset.defense;
    if (!mo.includes(l)) {
      r.remove();
      continue;
    }
    r.addEventListener(
      "click",
      () => {
        lm(n, a, l, r);
      },
      { once: !0 }
    );
  }
}
function dm() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    cm(n, e);
  }), game.socket.on(Rs, (n) => {
    if (!game.user.isGM || n.type !== "resolveDefenseRequest") return;
    const e = game.messages.get(n.messageId);
    if (!e) return;
    const t = As(e);
    !t || t.resolved || e.setFlag(S, "defenseRequest", { ...t, resolved: !0 });
  });
}
function um(n) {
  return n.actor ? n.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) : game.user.isGM;
}
function mm() {
  Hooks.on("renderChatMessageHTML", (n, e) => {
    for (const t of e.querySelectorAll("[data-action='rollItemCardDepletion']"))
      t.addEventListener("click", async (i) => {
        i.preventDefault(), i.stopPropagation();
        const a = t.dataset.itemUuid, o = a ? await fromUuid(a) : null;
        if (!o || o.type !== "artifact" || !um(o)) {
          ui.notifications.warn(game.i18n.localize("CYPHERV2.Inventory.NotAuthorized"));
          return;
        }
        t.disabled = !0, await di(o), t.disabled = o.system.depleted === !0;
      });
  });
}
async function pm() {
  if (!game.user.isGM) return;
  const n = [...game.items].filter((e) => e.type === "genre");
  if (n.length)
    for (const e of game.actors)
      try {
        if (e.type !== "character") continue;
        const t = e, i = [...e.items].find((o) => o.type === "characterType");
        if (!i || t.system.genre.sourceUuid) continue;
        const a = await os(
          i.system,
          n,
          async (o) => await fromUuid(o)
        );
        if (!a) continue;
        await game.cypherv2.services.genres.attach(t, a, "migration");
      } catch (t) {
        console.warn("cypherv2 | Could not migrate a legacy Type Genre suggestion", e.uuid, t);
      }
}
class fm {
  #e = /* @__PURE__ */ new Set();
  constructor(e = []) {
    for (const t of e) this.#e.add(t.id);
  }
  mark(e, t) {
    const i = t.querySelector(".cypherv2-roll-card[data-cypherv2-entrance]");
    return !i || this.#e.has(e.id) ? !1 : (this.#e.add(e.id), i.classList.add("cypherv2-chat-card-enter"), !0);
  }
}
function hm() {
  const n = new fm(game.messages);
  return Hooks.on("renderChatMessageHTML", (e, t) => {
    n.mark(e, t);
  }), n;
}
const hi = "doneThisRound";
function Hs(n, e) {
  return !!(e && (n.isGM || e.testUserPermission(n, "OWNER")));
}
function gm(n, e) {
  return e > 0 && n?.getFlag(S, hi) === e;
}
async function ym(n, e, t) {
  if (!n.started) return { ok: !1, reason: "not-started" };
  if (!n.turns.length) return { ok: !1, reason: "empty" };
  const i = n.combatant;
  return n.turn === null || !i ? { ok: !1, reason: "no-current" } : i.id !== t ? { ok: !1, reason: "stale" } : Hs(e, i) ? (await i.setFlag(S, hi, n.round), await n.nextTurn(), { ok: !0 }) : { ok: !1, reason: "not-authorized" };
}
async function bm(n) {
  const e = Array.from(n.combatants).filter((t) => t.getFlag(S, hi) !== void 0).map((t) => ({
    _id: t.id,
    [`flags.${S}.-=${hi}`]: null
  }));
  e.length && await n.updateEmbeddedDocuments("Combatant", e, { turnEvents: !1 });
}
function wm(n, e, t, i) {
  if (!n.includes(e)) return [...n];
  const a = n.filter((s) => s !== e);
  if (!t) return [...a, e];
  const o = a.indexOf(t);
  return o < 0 ? [...n] : (a.splice(o + (i ? 1 : 0), 0, e), a);
}
function vm(n) {
  return n.map((e, t) => ({
    _id: e,
    initiative: (n.length - t) * 10
  }));
}
const Cm = foundry.applications.sidebar.tabs.CombatTracker, lo = "application/x-cypherv2-combatant";
function Ji(n) {
  return n?.dataset.combatantId ?? null;
}
class jn extends Cm {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-combat-tracker"],
    actions: {
      endCypherTurn: jn.#e
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
    const i = this.viewed, a = Ji(t.closest("[data-combatant-id]"));
    if (!i || !a) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.CombatTracker.Errors.NoCombat"));
      return;
    }
    t.setAttribute("disabled", "");
    try {
      const o = await ym(i, game.user, a);
      o.ok || ui.notifications.warn(game.i18n.localize(`CYPHERV2.CombatTracker.Errors.${o.reason}`));
    } finally {
      t.removeAttribute("disabled");
    }
  }
  async _prepareTrackerContext(e, t) {
    await super._prepareTrackerContext(e, t), e.manualOrderEditable = game.user.isGM;
    const i = this.viewed;
    for (const a of e.turns ?? []) {
      const o = i?.combatants.get(a.id);
      a.doneThisRound = gm(o, i?.round ?? 0), a.canEndTurn = !!(i?.started && a.active && !a.doneThisRound && Hs(game.user, o));
    }
  }
  async _onRender(e, t) {
    if (await super._onRender(e, t), !game.user.isGM) return;
    const i = this.element.querySelector(".combat-tracker");
    if (!(!i || i.dataset.cypherv2OrderBound === "true")) {
      i.dataset.cypherv2OrderBound = "true", i.addEventListener("dragover", this.#i), i.addEventListener("drop", this.#n.bind(this)), i.addEventListener("dragend", this.#a.bind(this));
      for (const a of i.querySelectorAll(".combatant[data-combatant-id]"))
        a.addEventListener("dragstart", this.#t.bind(this));
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
    const t = e.currentTarget?.closest("[data-combatant-id]") ?? null, i = Ji(t);
    i && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData(lo, i), e.dataTransfer.setData("text/plain", i), t?.classList.add("cypherv2-combatant-dragging"));
  }
  #i(e) {
    !game.user.isGM || !e.dataTransfer || (e.preventDefault(), e.dataTransfer.dropEffect = "move");
  }
  async #n(e) {
    if (e.preventDefault(), !game.user.isGM || !e.dataTransfer) return;
    const t = this.viewed, i = e.dataTransfer.getData(lo) || e.dataTransfer.getData("text/plain");
    if (!t || !i || !t.combatants.get(i)) return;
    const a = e.target?.closest(".combatant[data-combatant-id]") ?? null, o = Ji(a), s = a?.getBoundingClientRect(), r = !!(s && e.clientY > s.top + s.height / 2), l = t.turns.map((f) => f.id), u = wm(l, i, o, r);
    if (u.every((f, m) => f === l[m])) {
      this.#a();
      return;
    }
    const c = t.combatant?.id, p = c ? u.indexOf(c) : void 0;
    await t.updateEmbeddedDocuments(
      "Combatant",
      vm(u),
      {
        ...p === void 0 || p < 0 ? {} : { combatTurn: p },
        turnEvents: !1
      }
    ), this.#a();
  }
  #a() {
    this.element.querySelectorAll(".cypherv2-combatant-dragging").forEach((e) => {
      e.classList.remove("cypherv2-combatant-dragging");
    });
  }
}
function Em() {
  CONFIG.ui.combat = jn;
}
function Rm() {
  Hooks.on("updateCombat", (n, e) => {
    !("round" in e) || !game.user.isActiveGM || bm(n).catch((t) => {
      console.error("cypherv2 | Failed to reset Combat Tracker DONE states", t);
    });
  });
}
const Pm = CONFIG.ui.pause;
class km extends Pm {
  static DEFAULT_OPTIONS = {
    classes: ["cypherv2-game-pause"]
  };
  async _prepareContext(e) {
    return {
      ...await super._prepareContext(e),
      icon: In.gamePaused,
      spin: !1
    };
  }
}
function Sm() {
  CONFIG.ui.pause = km;
}
function Am() {
  CONFIG.Combat.fallbackTurnMarker = In.turnMarker;
}
const Hm = "--cypherv2-blank-canvas-background-image";
function Im(n) {
  return `url("${n.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f;]/g, "")}")`;
}
function $m(n = document.body, e = (t) => foundry.utils.getRoute(t)) {
  const t = $o(In.lobby, e);
  n.style.setProperty(Hm, Im(t));
}
Hooks.once("init", async () => {
  console.info(`${S} | Initializing`);
  const n = new zd();
  Yd(n);
  const e = new tm();
  e.register(em), game.cypherv2 = Gs(n, Zu(n), e), il(), Wr(), Sd(), Em(), Sm(), Am(), om(), Hooks.callAll("cypherv2.registerRules", n), Hooks.callAll("cypherv2.registerThemes", e), al(e), await foundry.applications.handlebars.loadTemplates([
    "systems/cypherv2/templates/focus/focus-tree.hbs"
  ]);
});
Hooks.once("ready", async () => {
  $m();
  const n = String(game.settings.get(S, N.theme));
  game.cypherv2.themes.apply(game.cypherv2.themes.has(n) ? n : "core"), Pl(
    game.cypherv2.services.intrusions,
    game.cypherv2.services.intrusionChat
  ), td(
    game.cypherv2.services.playerIntrusions,
    game.cypherv2.services.playerIntrusionChat
  ), dm(), mm(), hm(), Ru(game.cypherv2.services.combatStatuses), Rm(), await pm(), console.info(`${S} | Ready`);
});
//# sourceMappingURL=cypherv2.mjs.map
