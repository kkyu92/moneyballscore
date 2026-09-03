import { fetchStandings, type StandingRow } from '@moneyball/kbo-data';

export async function buildStandings(): Promise<StandingRow[]> {
  return fetchStandings();
}
