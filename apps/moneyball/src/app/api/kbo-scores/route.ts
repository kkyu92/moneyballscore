import { type NextRequest } from 'next/server';

const NAVER_API_URL = 'https://api-gw.sports.naver.com/schedule/games';
const NAVER_HEADERS = {
  'Referer': 'https://sports.naver.com/kbaseball/schedule/index',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

// 네이버 팀코드 → 우리 TeamCode 매핑
const NAVER_TO_TEAM: Record<string, string> = {
  SSG: 'SK',
  KIA: 'HT',
  LG: 'LG',
  두산: 'OB',
  KT: 'KT',
  삼성: 'SS',
  롯데: 'LT',
  한화: 'HH',
  NC: 'NC',
  키움: 'WO',
};

export interface NaverGame {
  gameId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamScore: number;
  awayTeamScore: number;
  // Naver 실측: BEFORE(예정) / STARTED(진행중) / RESULT(종료) / CANCEL(취소).
  // LIVE/FINAL 은 과거 문서 형식 — 호환 위해 유지.
  statusCode: 'BEFORE' | 'STARTED' | 'LIVE' | 'RESULT' | 'FINAL' | 'CANCEL';
  statusInfo: string;
  stadium: string;
  gameDateTime: string;
  homeTeamEmblemUrl: string;
  awayTeamEmblemUrl: string;
}

export interface LiveScore {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'live' | 'final' | 'cancelled';
  statusText: string;
  stadium: string;
  gameTime: string;
}

function mapStatus(code: string): LiveScore['status'] {
  switch (code) {
    case 'STARTED':
    case 'LIVE':
      return 'live';
    case 'RESULT':
    case 'FINAL':
      return 'final';
    case 'CANCEL':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

function mapTeamCode(naverName: string): string {
  return NAVER_TO_TEAM[naverName] ?? naverName;
}

function toKSTDate(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') ?? toKSTDate();

  try {
    const url = `${NAVER_API_URL}?fields=basic%2Cschedule%2Cbaseball%2CmanualRelayUrl&upperCategoryId=kbaseball&fromDate=${date}&toDate=${date}&size=500`;

    const res = await fetch(url, {
      headers: NAVER_HEADERS,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return Response.json(
        { error: 'Naver API unavailable', scores: [] },
        { status: 502 },
      );
    }

    const data = await res.json();
    const naverGames: NaverGame[] = (data?.result?.games ?? []).filter(
      (g: { categoryId?: string }) => g.categoryId === 'kbo',
    );

    const scores: LiveScore[] = naverGames.map((g) => ({
      gameId: g.gameId,
      homeTeam: mapTeamCode(g.homeTeamName),
      awayTeam: mapTeamCode(g.awayTeamName),
      homeTeamName: g.homeTeamName,
      awayTeamName: g.awayTeamName,
      homeScore: g.homeTeamScore ?? 0,
      awayScore: g.awayTeamScore ?? 0,
      status: mapStatus(g.statusCode),
      statusText: g.statusInfo ?? '',
      stadium: g.stadium ?? '',
      gameTime: g.gameDateTime?.split('T')[1]?.slice(0, 5) ?? '',
    }));

    return Response.json({ scores, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json(
      { error: 'Failed to fetch scores', scores: [] },
      { status: 502 },
    );
  }
}
