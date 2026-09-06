import {RallyService} from "./rally-service";
import {RecoveryService} from "./recovery-service";
import {RecoveryWorkflowService} from "./recovery-workflow-service";
import {RestService} from "./rest-service";
import {WoundService} from "./wound-service";
import {RollChatService} from "./roll-chat-service";
import {RollService} from "./roll-service";
import {SkillService} from "./skill-service";
import {GMIntrusionService} from "./gm-intrusion-service";
import {GMIntrusionChatService} from "./gm-intrusion-chat-service";
import type {RuleRegistry} from "../rules/rule-registry";
import {TargetResolver} from "./target-resolver";
import {CombatService} from "./combat-service";
import {CombatChatService} from "./combat-chat-service";
import {TokenCombatFeedbackService} from "./combat-feedback-service";
import {DepletionService} from "./depletion-service";
import {DepletionChatService} from "./depletion-chat-service";
import {FoundryCombatStatusService} from "./combat-status-service";
import {FocusEvaluator} from "../focus/focus-evaluator";
import {FocusTreeRenderer} from "../focus/focus-tree-renderer";
import {FocusAcquisitionService} from "./focus-acquisition-service";
import {AdvancementService} from "./advancement-service";
import {FocusAssociationService} from "./focus-association-service";
import {CharacterInitializationService} from "./character-initialization-service";
import {CharacterPackageService} from "./character-package-service";
import {AbilityService} from "./ability-service";
import {AbilityChatService} from "./ability-chat-service";
import {ShieldService} from "./shield-service";
import {ArtifactService} from "./artifact-service";
import {ItemChatService} from "./item-chat-service";
import {GenreService} from "./genre-service";
import {WeaponService} from "./weapon-service";
import {PlayerIntrusionService} from "./player-intrusion-service";
import {PlayerIntrusionChatService} from "./player-intrusion-chat-service";

export interface CoreServices {
  readonly wounds: WoundService;
  readonly recovery: RecoveryWorkflowService;
  readonly rally: RallyService;
  readonly rolls: RollService;
  readonly rollChat: RollChatService;
  readonly skills: SkillService;
  readonly intrusions: GMIntrusionService;
  readonly intrusionChat: GMIntrusionChatService;
  readonly playerIntrusions: PlayerIntrusionService;
  readonly playerIntrusionChat: PlayerIntrusionChatService;
  readonly targets: TargetResolver;
  readonly combat: CombatService;
  readonly combatChat: CombatChatService;
  readonly depletion: DepletionService;
  readonly depletionChat: DepletionChatService;
  readonly combatStatuses: FoundryCombatStatusService;
  readonly focusEvaluator: FocusEvaluator;
  readonly focusTrees: FocusTreeRenderer;
  readonly focusAcquisition: FocusAcquisitionService;
  readonly advancement: AdvancementService;
  readonly focusAssociations: FocusAssociationService;
  readonly characterInitialization: CharacterInitializationService;
  readonly characterPackages: CharacterPackageService;
  readonly abilities: AbilityService;
  readonly abilityChat: AbilityChatService;
  readonly shields: ShieldService;
  readonly artifacts: ArtifactService;
  readonly itemChat: ItemChatService;
  readonly genres: GenreService;
  readonly weapons: WeaponService;
}

export function createCoreServices(rules: RuleRegistry): CoreServices {
  const wounds = new WoundService();
  const recovery = new RecoveryService();
  const rest = new RestService();
  const rolls = new RollService(rules);
  const skills = new SkillService(rules);
  const targets = new TargetResolver(rules);
  const rollChat = new RollChatService();
  const combatFeedback = new TokenCombatFeedbackService();
  const combatStatuses = new FoundryCombatStatusService();
  const shields = new ShieldService(wounds);
  const depletion = new DepletionService();
  const weapons = new WeaponService();
  const focusEvaluator = new FocusEvaluator();
  const combat = new CombatService(
    rules,
    rolls,
    skills,
    targets,
    wounds,
    combatFeedback,
    combatStatuses,
    shields,
    weapons
  );
  return Object.freeze({
    wounds,
    recovery: new RecoveryWorkflowService(recovery, rest),
    rally: new RallyService(wounds),
    rolls,
    rollChat,
    skills,
    intrusions: new GMIntrusionService(rules),
    intrusionChat: new GMIntrusionChatService(),
    playerIntrusions: new PlayerIntrusionService(),
    playerIntrusionChat: new PlayerIntrusionChatService(),
    targets,
    combat,
    combatChat: new CombatChatService(rollChat, shields),
    abilities: new AbilityService(rolls, skills, targets, combat),
    abilityChat: new AbilityChatService(rollChat),
    shields,
    artifacts: new ArtifactService(),
    itemChat: new ItemChatService(),
    genres: new GenreService(),
    weapons,
    depletion,
    depletionChat: new DepletionChatService(),
    combatStatuses,
    focusEvaluator,
    focusTrees: new FocusTreeRenderer(focusEvaluator),
    focusAcquisition: new FocusAcquisitionService(focusEvaluator),
    advancement: new AdvancementService(rules),
    focusAssociations: new FocusAssociationService(),
    characterInitialization: new CharacterInitializationService(),
    characterPackages: new CharacterPackageService()
  });
}

export {RallyService} from "./rally-service";
export {RecoveryService} from "./recovery-service";
export {RecoveryWorkflowService} from "./recovery-workflow-service";
export {RestService} from "./rest-service";
export {WoundService} from "./wound-service";
export {RollChatService} from "./roll-chat-service";
export {RollService} from "./roll-service";
export {SkillService} from "./skill-service";
export {GMIntrusionService} from "./gm-intrusion-service";
export {GMIntrusionChatService} from "./gm-intrusion-chat-service";
export {PlayerIntrusionService} from "./player-intrusion-service";
export {PlayerIntrusionChatService} from "./player-intrusion-chat-service";
export {TargetResolver} from "./target-resolver";
export {CombatService} from "./combat-service";
export {CombatChatService} from "./combat-chat-service";
export {TokenCombatFeedbackService} from "./combat-feedback-service";
export {DepletionService} from "./depletion-service";
export {DepletionChatService} from "./depletion-chat-service";
export {
  FoundryCombatStatusService,
  initializeNpcDeadStatusSynchronization
} from "./combat-status-service";
export {FocusEvaluator} from "../focus/focus-evaluator";
export {FocusTreeRenderer} from "../focus/focus-tree-renderer";
export {FocusAcquisitionService} from "./focus-acquisition-service";
export {AdvancementService} from "./advancement-service";
export {FocusAssociationService} from "./focus-association-service";
export {CharacterInitializationService} from "./character-initialization-service";
export {CharacterPackageService} from "./character-package-service";
export {AbilityService} from "./ability-service";
export {AbilityChatService} from "./ability-chat-service";
export {ShieldService} from "./shield-service";
export {ArtifactService} from "./artifact-service";
export {ItemChatService} from "./item-chat-service";
export {GenreService} from "./genre-service";
export {WeaponService} from "./weapon-service";
