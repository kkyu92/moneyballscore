import { fetchStandings, type StandingRow } from '@moneyball/kbo-data';

export type { StandingRow };

export async function buildStandings(): Promise<StandingRow[]> {
  return fetchStandings();
}
