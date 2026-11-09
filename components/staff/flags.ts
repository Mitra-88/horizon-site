// Applications are off (the council, 2026-11-09: it recruits the people it wants itself; Kira's KIRA_APPLICATIONS).
// While off, the staff dashboards neither load nor show them, and /apply is not served. A plain module, so server
// pages read the real value (a "use client" module would hand them a reference).
export const APPLICATIONS_ON = false;
