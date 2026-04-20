import type { Metadata } from "next";
import Link from "next/link";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const metadata: Metadata = {
  title: "팀 프로필",
  description:
    "KBO 10팀의 시즌 예측 기록·적중률·주요 투수·구장 특성을 모은 팀 프로필 허브.",
};

const TEAM_ORDER: TeamCode[] = [
  "HT",
  "SS",
  "LG",
  "OB",
  "KT",
  "SK",
  "LT",
  "HH",
  "NC",
  "WO",
];

export default function TeamsIndexPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">팀 프로필</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO 10팀의 시즌 예측 기록, 팩터 평균값, 주요 투수, 홈구장 특성.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEAM_ORDER.map((code) => {
          const team = KBO_TEAMS[code];
          const parkAdvantage =
            team.parkPf >= 105
              ? "타자 친화"
              : team.parkPf <= 95
                ? "투수 친화"
                : "중립";
          return (
            <Link
              key={code}
              href={`/teams/${code}`}
              className="group bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md hover:border-brand-500/50 transition-all space-y-2"
            >
              <div className="flex items-center gap-3">
                <TeamLogo team={code} size={32} className="shrink-0" />
                <h2 className="text-lg font-bold group-hover:text-brand-500 transition-colors">
                  {team.name}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {team.stadium}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                파크팩터 {team.parkPf} · {parkAdvantage}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
