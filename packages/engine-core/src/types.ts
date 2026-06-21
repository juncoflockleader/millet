export type Id = string;
export type Version = string;

export interface BundleRef {
  id: Id;
  version: Version;
  contentHash: string;
}

export interface ContentLock {
  gameDefinition: BundleRef;
  cardCatalog?: BundleRef;
  behaviorLibrary?: BundleRef;
  assetBundle?: BundleRef;
  localizationBundle?: BundleRef;
}

export type MatchStatus = "setup" | "active" | "paused" | "completed" | "aborted";

export type PlayerStatus =
  | "alive"
  | "dying"
  | "dead"
  | "conceded"
  | "disconnected"
  | "spectating"
  | "eliminated";

export interface ResourceState {
  current: number;
  max?: number;
}

export interface PlayerState {
  id: Id;
  userId: Id;
  seatId: Id;
  controllerId: Id;
  status: PlayerStatus;
  roleRef?: Id;
  characterRef?: Id;
  heroRef?: Id;
  teamId?: Id;
  factionId?: Id;
  resources: Record<string, ResourceState>;
}

export interface SeatState {
  id: Id;
  index: number;
  playerId?: Id;
}

export type Visibility =
  | { kind: "public" }
  | { kind: "owner" }
  | { kind: "controller" }
  | { kind: "seat"; seatIds: Id[] }
  | { kind: "player"; playerIds: Id[] }
  | { kind: "team"; teamIds: Id[] }
  | { kind: "admin" }
  | { kind: "hidden" };

export type ZoneOrdering = "ordered" | "unordered" | "hidden_ordered";

export interface ZoneState {
  id: Id;
  ownerId?: Id;
  zoneType: string;
  visibility: Visibility;
  ordering: ZoneOrdering;
  objectIds: Id[];
  capacity?: number;
}

export interface GameObjectState {
  id: Id;
  templateId?: Id;
  objectType: string;
  ownerId?: Id;
  controllerId?: Id;
  creatorId?: Id;
  zoneId: Id;
  position: number;
  visibility: Visibility;
  stats: Record<string, number>;
  counters: Record<string, number>;
  tags: string[];
  keywords: string[];
  attachments: Id[];
  modifiers: Id[];
  exhausted?: boolean;
  createdAtSequence: number;
  lastChangedAtSequence: number;
}

export interface TurnState {
  turnNumber: number;
  roundNumber: number;
  activePlayerId?: Id;
  phaseId?: Id;
  priorityPlayerId?: Id;
}

export interface PromptState {
  id: Id;
  status: "open" | "answered" | "expired" | "cancelled";
  responderIds: Id[];
  currentResponderId?: Id;
  answeredResponderIds?: Id[];
  passedResponderIds?: Id[];
  promptType: string;
  responseMode?: "single" | "all_in_order" | "any_until_success" | "priority_loop";
  payload?: unknown;
  answer?: unknown;
  responses?: Record<Id, unknown>;
  openedAtSequence: number;
}

export interface TriggerState {
  id: Id;
  sourceObjectId?: Id;
  controllerId?: Id;
  behaviorId: Id;
  eventType: string;
  timing: "after";
  priority: number;
  once?: boolean;
  firedCount: number;
}

export interface OutcomeState {
  id: Id;
  status: "pending" | "completed";
  results: OutcomeResult[];
}

export interface OutcomeResult {
  playerId: Id;
  status: "won" | "lost" | "draw" | "no_contest" | "pending";
  reason: string;
  faction?: Id;
}

export interface RuntimeCounters {
  objectSequence: number;
  transactionSequence: number;
}

export interface MatchState {
  matchId: Id;
  gameDefinitionId: Id;
  gameDefinitionVersion: Version;
  contentLock?: ContentLock;
  seed: string;
  rngCursor: number;
  status: MatchStatus;
  players: Record<Id, PlayerState>;
  seats: SeatState[];
  objects: Record<Id, GameObjectState>;
  zones: Record<Id, ZoneState>;
  turn: TurnState;
  prompts: Record<Id, PromptState>;
  triggers: TriggerState[];
  outcomes: OutcomeState[];
  counters: RuntimeCounters;
  lastSequence: number;
}

export interface EventVisibility {
  default: Visibility;
  overrides?: Record<Id, Visibility>;
}

export interface EventCause {
  commandId?: Id;
  eventId?: Id;
  behaviorId?: Id;
}

export interface MatchEvent<TPayload = unknown> {
  id: Id;
  matchId: Id;
  sequence: number;
  transactionId: Id;
  type: string;
  payload: TPayload;
  visibility: EventVisibility;
  causedBy?: EventCause;
  stateHashAfter?: string;
}

export interface MatchCommand<TPayload = unknown> {
  id: Id;
  matchId: Id;
  playerId?: Id;
  type: string;
  payload: TPayload;
}

export interface MatchInitializedPayload {
  matchId: Id;
  gameDefinitionId: Id;
  gameDefinitionVersion: Version;
  seed: string;
  contentLock?: ContentLock;
}

export interface PlayerSeatedPayload {
  player: PlayerState;
  seat: SeatState;
}

export interface ZoneCreatedPayload {
  zone: ZoneState;
}

export interface ObjectCreatedPayload {
  object: GameObjectState;
}

export interface ObjectPlayedPayload {
  objectId: Id;
  fromZoneId?: Id;
  toZoneId: Id;
  toPosition?: number;
  objectType?: string;
  ownerId?: Id;
  controllerId?: Id;
  visibility?: Visibility;
  stats?: Record<string, number>;
  counters?: Record<string, number>;
  tags?: string[];
  keywords?: string[];
  exhausted?: boolean;
  reason?: string;
}

export interface CardMovedPayload {
  objectId: Id;
  fromZoneId?: Id;
  toZoneId: Id;
  toPosition?: number;
}

export interface ResourceChangedPayload {
  playerId: Id;
  resource: string;
  current: number;
  max?: number;
  reason?: string;
}

export interface DamageDealtPayload {
  sourceObjectId?: Id;
  sourcePlayerId?: Id;
  targetPlayerId?: Id;
  targetObjectId?: Id;
  amount: number;
  damageType?: string;
}

export interface PlayerStatusChangedPayload {
  playerId: Id;
  status: PlayerStatus;
  reason?: string;
}

export interface OutcomeDeclaredPayload {
  outcome: OutcomeState;
}

export interface PromptOpenedPayload {
  prompt: PromptState;
}

export interface PromptAnsweredPayload {
  promptId: Id;
  responderId?: Id;
  answer: unknown;
  status?: "open" | "answered";
  nextResponderId?: Id;
  passedResponderIds?: Id[];
}

export interface PromptClosedPayload {
  promptId: Id;
  status: "expired" | "cancelled";
}

export interface TriggerRegisteredPayload {
  trigger: TriggerState;
}

export interface TriggerFiredPayload {
  triggerId: Id;
}

export interface ObjectDestroyedPayload {
  objectId: Id;
  fromZoneId: Id;
  toZoneId?: Id;
  reason?: string;
}

export interface ObjectExhaustedPayload {
  objectId: Id;
  exhausted: boolean;
  reason?: string;
}

export interface ObjectKeywordChangedPayload {
  objectId: Id;
  keyword: string;
  present: boolean;
  reason?: string;
}

export interface ObjectTransformedPayload {
  objectId: Id;
  templateId?: Id;
  objectType?: string;
  visibility?: Visibility;
  stats?: Record<string, number>;
  counters?: Record<string, number>;
  tags?: string[];
  keywords?: string[];
  attachments?: Id[];
  modifiers?: Id[];
  exhausted?: boolean;
  reason?: string;
}

export interface ObjectControlChangedPayload {
  objectId: Id;
  controllerId: Id;
  fromZoneId?: Id;
  toZoneId?: Id;
  toPosition?: number;
  exhausted?: boolean;
  reason?: string;
}

export interface ObjectCounterChangedPayload {
  objectId: Id;
  counter: string;
  value: number;
  reason?: string;
}

export interface ObjectStatChangedPayload {
  objectId: Id;
  stat: string;
  value: number;
  reason?: string;
}

export interface RandomChoiceMadePayload {
  candidateIds: Id[];
  selectedId: Id;
  selectedKind: "player" | "object";
  rngCursorBefore: number;
  rngCursorAfter: number;
  reason?: string;
}

export interface TurnAdvancedPayload {
  previousPlayerId?: Id;
  activePlayerId: Id;
  turnNumber: number;
  roundNumber: number;
}
