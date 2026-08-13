export type WorkspaceRoleValue = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspaceMemberStatusValue = "ACTIVE" | "LEFT" | "REMOVED";
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
}) {
  if (input.visibility === "PUBLIC") return true;
  if (input.actorUserId === input.authorUserId) return true;
  if (!isActive(input.access)) return false;
  if (input.visibility === "COLLABORATORS") return true;
  return input.access.role === "OWNER" || input.access.role === "ADMIN";
}
