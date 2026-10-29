// One problem per fix. Counted the way the desk counts (CauseTable): each report under the cause it is
// filed under by tenant. The reports the desk read as a one-day move (desk-notes.json) stay where they
// are filed and are counted again as `shift`, a third bug with a ticket of its own.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: string[];
  firstSeen: string;
  lastSeen: string;
  // Reports intake tagged with a different cause than the one they are filed under.
  mistagged: number;
  // Reports in this group that are also counted as `shift`.
  shifted: number;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  const add = (p: Problem, r: Report) => byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  for (const r of uniqueById(reports)) {
    add(causeOf(r, tenantOf(r)) ?? 'unplaced', r);
    if (shiftIds.includes(r.id)) add('shift', r);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: [...new Set(rs.map((r) => r.channel))].sort(),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        mistagged: problem === 'shift' ? 0 : rs.filter((r) => r.meta.intakeTag !== problem).length,
        shifted: problem === 'shift' ? 0 : rs.filter((r) => shiftIds.includes(r.id)).length,
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
