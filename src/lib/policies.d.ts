export function canReadReport(viewer: { id: string; role: string }, ownerId: string): boolean;
export function canManageUsers(viewer: { role: string }): boolean;
export function canReview(viewer: { role: string }): boolean;
export function assertEditable(status: string): void;
export function assertReviewable(status: string): void;
