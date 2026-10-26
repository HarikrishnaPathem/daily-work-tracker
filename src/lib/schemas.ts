import { z } from "zod";

export const loginSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(1).max(200) });
export const userSchema = z.object({ name: z.string().trim().min(1).max(100), designation: z.string().trim().min(1).max(100), email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(12).max(200), role: z.enum(["USER", "HEAD"]) }).strict();
export const reportSchema = z.object({ workDate: z.iso.date(), completedTasks: z.string().max(10000), ongoingTasks: z.string().max(10000), blockers: z.string().max(10000), nextSteps: z.string().max(10000), status: z.enum(["DRAFT", "SUBMITTED"]).optional() });
export const reviewSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), comment: z.string().max(4000).optional() }).refine((v) => v.decision !== "REJECTED" || Boolean(v.comment?.trim()), { message: "A comment is required when rejecting a report", path: ["comment"] });
