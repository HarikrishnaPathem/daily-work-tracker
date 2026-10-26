/** @param {string | Date} value @param {string} timeZone */
export function formatWorkspaceDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(value));
}
