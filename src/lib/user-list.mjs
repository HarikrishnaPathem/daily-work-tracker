// Exclude only the authenticated HEAD account; other HEADs remain manageable.
export function managedUserListWhere(currentUserId) {
  return { id: { not: currentUserId } };
}
