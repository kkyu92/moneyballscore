"use client";

import { useMemo, useState } from "react";

interface Props {
  pickKeys: string[];                 // 우리 pick 전체 (dedup)
  picksByFile: Record<string, string[]>;  // 파일별 세트 keys
  winnersMap: Record<string, { round: number; date: string; bonus: number }>;
  totalPickSets: number;
  totalWinners: number;
}

interface Result {
  input: number[];
  key: string;
  inPicks: boolean;
  pickFiles: string[];       // 어느 주차 파일에 있는지
  isPastWinner: boolean;
  winnerRound: number | null;
  winnerDate: string | null;
}

function parseInput(text: string): number[] | null {
  const parts = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (parts.length !== 6) return null;
  if (parts.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) return null;
  if (new Set(parts).size !== 6) return null;
  return parts;
}

export function ComboCheckClient({ pickKeys, picksByFile, winnersMap, totalPickSets, totalWinners }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inputs, setInputs] = useState<string[]>(["", "", "", "", "", ""]);

  const pickSet = useMemo(() => new Set(pickKeys), [pickKeys]);

  function handleCheck(nums: number[]) {
    const sorted = nums.slice().sort((a, b) => a - b);
    const key = sorted.join(",");
    const pickFiles: string[] = [];
    for (const [file, keys] of Object.entries(picksByFile)) {
      if (keys.includes(key)) pickFiles.push(file);
    }
    const winner = winnersMap[key];
    setResult({
      input: sorted,
      key,
      inPicks: pickSet.has(key),
      pickFiles,
      isPastWinner: !!winner,
      winnerRound: winner?.round ?? null,
      winnerDate: winner?.date ?? null,
    });
    setErr(null);
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nums = parseInput(text);
    if (!nums) {
      setErr("1-45 범위 서로 다른 6개 숫자를 입력해주세요 (콤마 또는 스페이스 구분)");
      setResult(null);
      return;
    }
    handleCheck(nums);
  }

  function handleGridSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nums = inputs.map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    if (nums.length !== 6 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) {
      setErr("6개 칸 모두 1-45 범위 숫자를 입력해주세요");
      setResult(null);
      return;
    }
    if (new Set(nums).size !== 6) {
      setErr("중복된 번호가 있습니다");
      setResult(null);
      return;
    }
    handleCheck(nums);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          우리 전체 <strong>{totalPickSets.toLocaleString()}세트</strong> · 역대 1등 <strong>{totalWinners.toLocaleString()}회</strong> 기준
        </div>

        {/* Grid input (6칸) */}
        <form onSubmit={handleGridSubmit} className="space-y-2">
          <label className="text-sm font-medium">6칸 입력</label>
          <div className="flex gap-2 flex-wrap">
            {inputs.map((v, i) => (
              <input
                key={i}
                type="number"
                min={1}
                max={45}
                value={v}
                onChange={(e) => {
                  const next = [...inputs];
                  next[i] = e.target.value;
                  setInputs(next);
                }}
                className="w-14 h-12 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-lg font-semibold"
                aria-label={`번호 ${i + 1}`}
              />
            ))}
            <button
              type="submit"
              className="px-4 h-12 rounded-lg font-semibold bg-brand-600 hover:bg-brand-700 text-white"
            >
              확인
            </button>
          </div>
        </form>

        {/* Text input (붙여넣기) */}
        <form onSubmit={handleTextSubmit} className="space-y-2">
          <label className="text-sm font-medium">붙여넣기 (콤마/스페이스 구분)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="예: 1,7,13,22,34,45 또는 1 7 13 22 34 45"
              className="flex-1 h-12 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            />
            <button
              type="submit"
              className="px-4 h-12 rounded-lg font-semibold bg-brand-600 hover:bg-brand-700 text-white"
            >
              확인
            </button>
          </div>
        </form>

        {err && <div className="text-sm text-red-600 dark:text-red-400">❌ {err}</div>}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 p-5 space-y-3" style={{ borderColor: result.isPastWinner || result.inPicks ? "var(--color-accent)" : undefined }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">입력 조합:</span>
            <div className="flex gap-1.5">
              {result.input.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-800"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {/* 역대 1등 매칭 */}
            {result.isPastWinner ? (
              <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="font-bold text-amber-900 dark:text-amber-200">🏆 역대 1등 당첨 조합</div>
                <div className="text-amber-800 dark:text-amber-300 mt-1">
                  제 {result.winnerRound}회 ({result.winnerDate}) 실제 1등 번호와 정확히 일치
                </div>
              </div>
            ) : (
              <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">역대 1등:</span> 일치 없음 (역대 {totalWinners.toLocaleString()}회 중 미출현)
                </div>
              </div>
            )}

            {/* 우리 pick 매칭 */}
            {result.inPicks ? (
              <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="font-bold text-blue-900 dark:text-blue-200">📌 우리 예측 조합에 포함</div>
                <div className="text-blue-800 dark:text-blue-300 mt-1">
                  {result.pickFiles.length}개 주차 (
                  {result.pickFiles.slice(0, 5).join(", ")}
                  {result.pickFiles.length > 5 ? ` 외 ${result.pickFiles.length - 5}주` : ""}
                  )
                </div>
              </div>
            ) : (
              <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">우리 예측:</span> 신규 조합 (전체 {totalPickSets.toLocaleString()}세트 중 미포함)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
