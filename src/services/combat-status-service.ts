import type {CombatTargetDocumentIdentity} from "../combat/combat-types";
import {targetIdentityFromDocument} from "../combat/combat-targets";

export interface NpcStatusTarget extends CombatTargetDocumentIdentity {
  readonly id: string;
  readonly uuid?: string;
  readonly token?: {readonly id: string; readonly uuid: string};
  toggleStatusEffect?(
    statusId: string,
    options: {active: boolean; overlay?: boolean}
  ): Promise<unknown>;
}

export interface CombatStatusService {
  syncNpcDead(target: NpcStatusTarget, dead: boolean): Promise<void>;
}

export class NoopCombatStatusService implements CombatStatusService {
  async syncNpcDead(): Promise<void> {}
}

export class FoundryCombatStatusService implements CombatStatusService {
  async syncNpcDead(target: NpcStatusTarget, dead: boolean): Promise<void> {
    const identity = targetIdentityFromDocument(target);
    let actor: Actor | NpcStatusTarget | null = null;

    if (identity.tokenUuid) {
      try {
        const token = await fromUuid(identity.tokenUuid) as {readonly actor?: Actor | null} | null;
        actor = token?.actor ?? null;
      } catch {
        actor = null;
      }
    }
    if (!actor && identity.tokenId) actor = canvas.tokens?.get(identity.tokenId)?.actor ?? null;
    if (!actor && (identity.tokenId || identity.tokenUuid)) return;
    if (!actor) actor = target;
    if (typeof actor.toggleStatusEffect !== "function") return;

    await actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED ?? "dead", {
      active: dead
    });
  }
}

function healthValueChanged(changes: Record<string, unknown>): boolean {
  if ("system.health.value" in changes) return true;
  const system = changes.system;
  if (!system || typeof system !== "object") return false;
  const health = (system as Record<string, unknown>).health;
  return Boolean(health && typeof health === "object" && "value" in health);
}

export function initializeNpcDeadStatusSynchronization(service: CombatStatusService): void {
  Hooks.on("updateActor", (
    actor: Actor,
    changes: Record<string, unknown>,
    options: Record<string, unknown> = {}
  ) => {
    if (options.cypherv2SkipDeadStatusSync === true) return;
    if (actor.type !== "npc" || !healthValueChanged(changes)) return;
    const health = Number((actor.system.health as {value?: unknown} | undefined)?.value);
    if (!Number.isFinite(health)) return;
    void service.syncNpcDead(actor as unknown as NpcStatusTarget, health <= 0);
  });
}
