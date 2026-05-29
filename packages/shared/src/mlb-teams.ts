// MLB 30팀 + division mapping.
// AL East/Central/West + NL East/Central/West (각 5팀).
//
// 5팀 pre-render (LAD/NYY/BOS/CHC/SFG) = Plan B Tier C+D Task 4 generateStaticParams 정합.
//
// parkPf: Statcast 5-year average park factor (100 = neutral, 100+ 타자 친화, 100- 투수 친화).
// 출처: Baseball Savant Statcast Park Factors 2020-2024.
// 100 = league neutral 정합. 코드는 Baseball-Reference 3-letter 표준.

export const MLB_TEAMS = {
  // AL East
  BAL: { name: 'Baltimore Orioles', shortName: 'Orioles', city: 'Baltimore', stadium: 'Oriole Park at Camden Yards', color: '#DF4601', parkPf: 100, league: 'AL', division: 'East' },
  BOS: { name: 'Boston Red Sox', shortName: 'Red Sox', city: 'Boston', stadium: 'Fenway Park', color: '#BD3039', parkPf: 105, league: 'AL', division: 'East' },
  NYY: { name: 'New York Yankees', shortName: 'Yankees', city: 'New York', stadium: 'Yankee Stadium', color: '#003087', parkPf: 102, league: 'AL', division: 'East' },
  TBR: { name: 'Tampa Bay Rays', shortName: 'Rays', city: 'St. Petersburg', stadium: 'Tropicana Field', color: '#092C5C', parkPf: 95, league: 'AL', division: 'East' },
  TOR: { name: 'Toronto Blue Jays', shortName: 'Blue Jays', city: 'Toronto', stadium: 'Rogers Centre', color: '#134A8E', parkPf: 100, league: 'AL', division: 'East' },
  // AL Central
  CHW: { name: 'Chicago White Sox', shortName: 'White Sox', city: 'Chicago', stadium: 'Guaranteed Rate Field', color: '#27251F', parkPf: 102, league: 'AL', division: 'Central' },
  CLE: { name: 'Cleveland Guardians', shortName: 'Guardians', city: 'Cleveland', stadium: 'Progressive Field', color: '#00385D', parkPf: 99, league: 'AL', division: 'Central' },
  DET: { name: 'Detroit Tigers', shortName: 'Tigers', city: 'Detroit', stadium: 'Comerica Park', color: '#0C2340', parkPf: 96, league: 'AL', division: 'Central' },
  KCR: { name: 'Kansas City Royals', shortName: 'Royals', city: 'Kansas City', stadium: 'Kauffman Stadium', color: '#004687', parkPf: 102, league: 'AL', division: 'Central' },
  MIN: { name: 'Minnesota Twins', shortName: 'Twins', city: 'Minneapolis', stadium: 'Target Field', color: '#002B5C', parkPf: 100, league: 'AL', division: 'Central' },
  // AL West
  HOU: { name: 'Houston Astros', shortName: 'Astros', city: 'Houston', stadium: 'Minute Maid Park', color: '#EB6E1F', parkPf: 102, league: 'AL', division: 'West' },
  LAA: { name: 'Los Angeles Angels', shortName: 'Angels', city: 'Anaheim', stadium: 'Angel Stadium', color: '#BA0021', parkPf: 99, league: 'AL', division: 'West' },
  ATH: { name: 'Athletics', shortName: 'Athletics', city: 'Sacramento', stadium: 'Sutter Health Park', color: '#003831', parkPf: 95, league: 'AL', division: 'West' },
  SEA: { name: 'Seattle Mariners', shortName: 'Mariners', city: 'Seattle', stadium: 'T-Mobile Park', color: '#0C2C56', parkPf: 92, league: 'AL', division: 'West' },
  TEX: { name: 'Texas Rangers', shortName: 'Rangers', city: 'Arlington', stadium: 'Globe Life Field', color: '#003278', parkPf: 100, league: 'AL', division: 'West' },
  // NL East
  ATL: { name: 'Atlanta Braves', shortName: 'Braves', city: 'Atlanta', stadium: 'Truist Park', color: '#CE1141', parkPf: 102, league: 'NL', division: 'East' },
  MIA: { name: 'Miami Marlins', shortName: 'Marlins', city: 'Miami', stadium: 'loanDepot park', color: '#00A3E0', parkPf: 93, league: 'NL', division: 'East' },
  NYM: { name: 'New York Mets', shortName: 'Mets', city: 'New York', stadium: 'Citi Field', color: '#002D72', parkPf: 96, league: 'NL', division: 'East' },
  PHI: { name: 'Philadelphia Phillies', shortName: 'Phillies', city: 'Philadelphia', stadium: 'Citizens Bank Park', color: '#E81828', parkPf: 103, league: 'NL', division: 'East' },
  WSN: { name: 'Washington Nationals', shortName: 'Nationals', city: 'Washington', stadium: 'Nationals Park', color: '#AB0003', parkPf: 99, league: 'NL', division: 'East' },
  // NL Central
  CHC: { name: 'Chicago Cubs', shortName: 'Cubs', city: 'Chicago', stadium: 'Wrigley Field', color: '#0E3386', parkPf: 102, league: 'NL', division: 'Central' },
  CIN: { name: 'Cincinnati Reds', shortName: 'Reds', city: 'Cincinnati', stadium: 'Great American Ball Park', color: '#C6011F', parkPf: 110, league: 'NL', division: 'Central' },
  MIL: { name: 'Milwaukee Brewers', shortName: 'Brewers', city: 'Milwaukee', stadium: 'American Family Field', color: '#12284B', parkPf: 100, league: 'NL', division: 'Central' },
  PIT: { name: 'Pittsburgh Pirates', shortName: 'Pirates', city: 'Pittsburgh', stadium: 'PNC Park', color: '#FDB827', parkPf: 96, league: 'NL', division: 'Central' },
  STL: { name: 'St. Louis Cardinals', shortName: 'Cardinals', city: 'St. Louis', stadium: 'Busch Stadium', color: '#C41E3A', parkPf: 98, league: 'NL', division: 'Central' },
  // NL West
  ARI: { name: 'Arizona Diamondbacks', shortName: 'Diamondbacks', city: 'Phoenix', stadium: 'Chase Field', color: '#A71930', parkPf: 103, league: 'NL', division: 'West' },
  COL: { name: 'Colorado Rockies', shortName: 'Rockies', city: 'Denver', stadium: 'Coors Field', color: '#33006F', parkPf: 115, league: 'NL', division: 'West' },
  LAD: { name: 'Los Angeles Dodgers', shortName: 'Dodgers', city: 'Los Angeles', stadium: 'Dodger Stadium', color: '#005A9C', parkPf: 100, league: 'NL', division: 'West' },
  SDP: { name: 'San Diego Padres', shortName: 'Padres', city: 'San Diego', stadium: 'Petco Park', color: '#2F241D', parkPf: 95, league: 'NL', division: 'West' },
  SFG: { name: 'San Francisco Giants', shortName: 'Giants', city: 'San Francisco', stadium: 'Oracle Park', color: '#FD5A1E', parkPf: 92, league: 'NL', division: 'West' },
} as const;

export type MlbTeamCode = keyof typeof MLB_TEAMS;

export type MlbLeagueSide = 'AL' | 'NL';
export type MlbDivisionSide = 'East' | 'Central' | 'West';

export const MLB_DIVISIONS = {
  AL: {
    East: ['BAL', 'BOS', 'NYY', 'TBR', 'TOR'],
    Central: ['CHW', 'CLE', 'DET', 'KCR', 'MIN'],
    West: ['ATH', 'HOU', 'LAA', 'SEA', 'TEX'],
  },
  NL: {
    East: ['ATL', 'MIA', 'NYM', 'PHI', 'WSN'],
    Central: ['CHC', 'CIN', 'MIL', 'PIT', 'STL'],
    West: ['ARI', 'COL', 'LAD', 'SDP', 'SFG'],
  },
} as const satisfies Record<MlbLeagueSide, Record<MlbDivisionSide, readonly MlbTeamCode[]>>;

// 5팀 pre-render — Task 4 generateStaticParams. 인기/시청자 트래픽 기준.
export const MLB_TEAMS_PRE_RENDER: readonly MlbTeamCode[] = ['LAD', 'NYY', 'BOS', 'CHC', 'SFG'] as const;

export function mlbShortTeamName(code: MlbTeamCode | string | null | undefined): string {
  if (!code) return '';
  if (code in MLB_TEAMS) return MLB_TEAMS[code as MlbTeamCode].shortName;
  return String(code);
}

export function mlbTeamDivision(code: MlbTeamCode): { league: MlbLeagueSide; division: MlbDivisionSide } {
  const meta = MLB_TEAMS[code];
  return { league: meta.league, division: meta.division };
}
