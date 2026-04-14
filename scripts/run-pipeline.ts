import { runDailyPipeline } from '../packages/kbo-data/src/pipeline/daily';

const date = process.argv[2] || undefined;
const mode = (process.argv[3] as 'predict' | 'verify') || 'predict';

console.log(`Running pipeline: date=${date || 'today'} mode=${mode}`);
console.log('---');

runDailyPipeline(date, mode)
  .then((result) => {
    console.log('---');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
