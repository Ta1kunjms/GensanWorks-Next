// admin_access_requests has a single free-text `reason` column (no phone,
// organization or notes columns). The request form's details are stored there
// as labelled lines and parsed back for the admin queue.

export interface AccessRequestDetails {
  phone?: string | null;
  organization?: string | null;
  notes?: string | null;
}

const LABELS = { organization: "Organization", phone: "Phone", notes: "Notes" } as const;

export function packAccessRequestReason(details: AccessRequestDetails): string | null {
  const lines: string[] = [];
  if (details.organization?.trim()) lines.push(`${LABELS.organization}: ${details.organization.trim()}`);
  if (details.phone?.trim()) lines.push(`${LABELS.phone}: ${details.phone.trim()}`);
  if (details.notes?.trim()) lines.push(`${LABELS.notes}: ${details.notes.trim()}`);
  return lines.length ? lines.join("\n").slice(0, 4000) : null;
}

export function parseAccessRequestReason(reason: unknown): Required<AccessRequestDetails> {
  const out: Required<AccessRequestDetails> = { phone: null, organization: null, notes: null };
  if (typeof reason !== "string" || !reason.trim()) return out;
  let matched = false;
  const notesLines: string[] = [];
  let inNotes = false;
  for (const line of reason.split("\n")) {
    const m = line.match(/^(Organization|Phone|Notes): ?(.*)$/);
    if (m) {
      matched = true;
      inNotes = m[1] === "Notes";
      if (m[1] === "Organization") out.organization = m[2] || null;
      else if (m[1] === "Phone") out.phone = m[2] || null;
      else notesLines.push(m[2] ?? "");
    } else if (inNotes) {
      notesLines.push(line);
    }
  }
  // Legacy/plain text reasons are shown as notes.
  out.notes = matched ? (notesLines.join("\n").trim() || null) : reason.trim();
  return out;
}
