export type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspaceMemberStatusValue = "ACTIVE" | "LEFT" | "REMOVED";
export type WorkspaceVisibilityValue = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type WorkVisibilityValue = "PUBLIC" | "COLLABORATORS" | "PRIVATE";

export type WorkspaceAccess = {
  role: WorkspaceRoleValue;
  status: WorkspaceMemberStatusValue;
} | null;

function isActive(access: WorkspaceAccess): access is NonNullable<WorkspaceAccess> {
  return access?.status === "ACTIVE";
}

export function canManageWorkspace(access: WorkspaceAccess) {
  return isActive(access) && (access.role === "OWNER" || access.role === "ADMIN");
}

export function canCreateWorkspaceContent(access: WorkspaceAccess) {
  return isActive(access);
}

export function canViewWorkspace(input: {
  visibility: WorkspaceVisibilityValue;
  isOwner: boolean;
  access: WorkspaceAccess;
  isGlobalAdmin?: boolean;
}) {
  if (input.isGlobalAdmin || input.isOwner || isActive(input.access)) return true;
  return input.visibility !== "PRIVATE";
}

export function canViewWorkspaceMemberEmail(access: WorkspaceAccess) {
  return isActive(access);
}

export function canEditWorkspaceWork(input: {
  actorUserId: string;
  authorUserId: string;
  access: WorkspaceAccess;
}) {
  if (input.actorUserId === input.authorUserId) return true;
  return canManageWorkspace(input.access);
}

export function canViewWork(input: {
  actorUserId?: string | null;
  authorUserId: string;
  visibility: WorkVisibilityValue;
  access: WorkspaceAccess;
  isGlobalAdmin?: boolean;
}) {
  if (input.isGlobalAdmin) return true;
  if (input.visibility === "PUBLIC") return true;
  if (input.actorUserId === input.authorUserId) return true;
  if (!isActive(input.access)) return false;
  if (input.visibility === "COLLABORATORS") return true;
  return input.access.role === "OWNER" || input.access.role === "ADMIN";
}
