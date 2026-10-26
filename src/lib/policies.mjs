export const canReadReport = (viewer, ownerId) => viewer.role === "HEAD" || viewer.id === ownerId;
export const canManageUsers = (viewer) => viewer.role === "HEAD";
export const canReview = (viewer) => viewer.role === "HEAD";
class PolicyError extends Error { status = 409; }
export const assertEditable = (status) => { if (status === "APPROVED") throw new PolicyError("Approved reports are locked"); };
export const assertReviewable = (status) => { if (status !== "SUBMITTED") throw new PolicyError("Only submitted reports can be reviewed"); };
