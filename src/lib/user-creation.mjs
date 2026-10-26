/**
 * @param {{ name: string, designation: string, email: string, role: "USER" | "HEAD" }} input
 * @param {string} passwordHash
 * @returns {{ name: string, designation: string, email: string, passwordHash: string, role: "USER" | "HEAD" }}
 */
export function createManagedUserData(input, passwordHash) {
  if (input.role !== "USER" && input.role !== "HEAD") throw new TypeError("Invalid account role");
  return {
    name: input.name,
    designation: input.designation,
    email: input.email,
    passwordHash,
    role: input.role,
  };
}
