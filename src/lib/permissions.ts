export type Role = "admin" | "editor" | "viewer" | "owner";
export type Action = "create" | "read" | "update" | "delete" | "admin";

export function canPerform(
  role: Role,
  action: Action,
  itemOwnerId?: string,
  userId?: string,
): boolean {
  switch (role) {
    case "admin":
      return true;
    case "editor":
      return action !== "admin";
    case "viewer":
      return action === "read";
    case "owner":
      if (action === "read") {
        return true;
      }
      if (action === "create") {
        return true;
      }
      if (action === "update" || action === "delete") {
        return Boolean(itemOwnerId && userId && itemOwnerId === userId);
      }
      return false;
    default:
      return false;
  }
}
