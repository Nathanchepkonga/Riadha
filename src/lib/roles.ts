import type { Role } from "@/db/schema";

/** Scouts and clubs (coaches) can use the Scout Portal; admins can see everything. */
export function canScout(user: { role: Role; isAdmin: boolean }) {
  return user.role === "scout" || user.role === "club" || user.isAdmin;
}
