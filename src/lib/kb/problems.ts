// One problem per fix. causes.ts places a report by its tenant; the reports the desk read as a one-day
// move (desk-notes.json) are a third bug, not the parser, so they get a problem of their own.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

export function problemOf(r: Report, t: Tenant | undefined, shiftIds: readonly string[]): Problem {
  if (shiftIds.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: string[];
  firstSeen: string;
  lastSeen: string;
  // Reports intake tagged with a different cause than the one they belong to.
  mistagged: number;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of uniqueById(reports)) {
    const p = problemOf(r, tenantOf(r), shiftIds);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
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
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
