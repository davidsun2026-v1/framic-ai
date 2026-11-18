/**
 * Framic AI — Multi-tenant model and RBAC
 *
 * Hierarchy: Organization -> Workspace -> Project -> Assets & Jobs.
 * Source of truth: docs/01-PRODUCT/01-PRODUCT_BLUEPRINT.md §6.
 */
import type { IsoTimestamp, TokenAmount, Uuid } from './common.types';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface UserProfile {
  id: Uuid; // auth.users.id
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string; // IANA zone, e.g. 'Europe/London'
  status: UserStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  lastLoginAt: IsoTimestamp | null;
}

// ---------------------------------------------------------------------------
// Hierarchy
// ---------------------------------------------------------------------------

export interface Organization {
  id: Uuid;
  name: string;
  slug: string;
  /** Token treasury account (ownerType ORGANIZATION). Pools are allocated from it. */
  tokenAccountId: Uuid;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Workspace {
  id: Uuid;
  organizationId: Uuid;
  name: string;
  slug: string;
  /** Workspace token pool account (ownerType WORKSPACE). */
  tokenAccountId: Uuid;
  /** When false, VIEWER members cannot download master files. */
  viewerDownloadsEnabled: boolean;
  archivedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Project {
  id: Uuid;
  workspaceId: Uuid;
  /** Nested project folders; null for a top-level project. */
  parentProjectId: Uuid | null;
  name: string;
  createdByUserId: Uuid;
  archivedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Membership and roles
// ---------------------------------------------------------------------------

export type OrganizationRole = 'ORGANIZATION_OWNER' | 'ORGANIZATION_MEMBER';
export type WorkspaceRole = 'WORKSPACE_ADMIN' | 'CREATOR' | 'VIEWER';

/** Role after resolution: an Organization Owner holds full rights in every workspace. */
export type EffectiveRole = 'ORGANIZATION_OWNER' | WorkspaceRole;

export interface OrganizationMembership {
  organizationId: Uuid;
  userId: Uuid;
  role: OrganizationRole;
  createdAt: IsoTimestamp;
}

export interface WorkspaceMembership {
  workspaceId: Uuid;
  userId: Uuid;
  role: WorkspaceRole;
  /** Max Tokens this member may consume per calendar month (UTC); null = bounded only by the pool. */
  monthlyTokenCap: TokenAmount | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Permissions (Blueprint §6.1)
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  'billing.manage_tokens',
  'tokens.allocate_pool',
  'members.manage',
  'generation.execute',
  'tokens.consume_pool',
  'assets.view',
  'assets.download_master',
  'assets.delete_own',
  'assets.delete_any',
  'projects.archive_own',
  'projects.archive_any',
  'api_keys.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type PermissionCondition =
  | 'WITHIN_ALLOCATION_CAP' // Workspace Admin allocates only within the cap set by the Organization Owner
  | 'UP_TO_MEMBER_QUOTA' // Creator consumes only up to monthlyTokenCap
  | 'IF_WORKSPACE_ALLOWS'; // Viewer downloads only when viewerDownloadsEnabled

export const ROLE_PERMISSIONS: Readonly<Record<EffectiveRole, readonly Permission[]>> = {
  ORGANIZATION_OWNER: PERMISSIONS,
  WORKSPACE_ADMIN: [
    'tokens.allocate_pool',
    'members.manage',
    'generation.execute',
    'tokens.consume_pool',
    'assets.view',
    'assets.download_master',
    'assets.delete_any',
    'projects.archive_any',
    'api_keys.manage',
  ],
  CREATOR: [
    'generation.execute',
    'tokens.consume_pool',
    'assets.view',
    'assets.download_master',
    'assets.delete_own',
    'projects.archive_own',
  ],
  VIEWER: ['assets.view', 'assets.download_master'],
};

export const CONDITIONAL_PERMISSIONS: Readonly<
  Partial<Record<EffectiveRole, Partial<Record<Permission, PermissionCondition>>>>
> = {
  WORKSPACE_ADMIN: { 'tokens.allocate_pool': 'WITHIN_ALLOCATION_CAP' },
  CREATOR: { 'tokens.consume_pool': 'UP_TO_MEMBER_QUOTA' },
  VIEWER: { 'assets.download_master': 'IF_WORKSPACE_ALLOWS' },
};

// ---------------------------------------------------------------------------
// Pipeline access: API keys
// ---------------------------------------------------------------------------

/** Key secrets are shown once at creation and stored only as a hash; never part of this record. */
export interface ApiKeyRecord {
  id: Uuid;
  workspaceId: Uuid;
  name: string;
  /** First characters of the key, safe to display for identification. */
  prefix: string;
  createdByUserId: Uuid;
  lastUsedAt: IsoTimestamp | null;
  revokedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Audit (append-only)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: Uuid;
  organizationId: Uuid;
  workspaceId: Uuid | null;
  actorUserId: Uuid | null; // null for system actors
  action: string; // dotted verb, e.g. 'membership.role_changed'
  targetType: string;
  targetId: Uuid | null;
  metadata: Record<string, unknown>;
  createdAt: IsoTimestamp;
}
