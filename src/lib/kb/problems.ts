// The three problems inside #4471. causeOf files a report by tenant and channel.
// desk-notes.json names reports the desk read as a one-day move; those leave the cause they were filed under.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type ProblemId = 'parser' | 'hint' | 'one-day-move' | 'unplaced';

export type ProblemGroup = {
  id: ProblemId;
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

const ORDER: readonly ProblemId[] = ['parser', 'hint', 'one-day-move', 'unplaced'];

export function problemsOf(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayIds: readonly string[],
  ticket: number,
): ProblemGroup[] {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const moved = new Set(oneDayIds);
  const buckets = new Map<ProblemId, Report[]>(ORDER.map((id) => [id, []]));
  for (const r of merged) {
    const cause = causeOf(r, tenantOf(r));
    const id: ProblemId = cause === 'hint' || cause === 'parser' ? cause : 'unplaced';
    buckets.get(id)!.push(r);
    // The desk still counts these inside the cause above. The separate group is the reading, not a subtraction.
    if (moved.has(r.id)) buckets.get('one-day-move')!.push(r);
  }
  return ORDER.flatMap((id) => {
    const rs = buckets.get(id)!;
    if (rs.length === 0) return [];
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return [
      {
        id,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      },
    ];
  });
}
