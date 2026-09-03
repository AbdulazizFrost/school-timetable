import { runSchedulerTestSuite } from './src/scheduler/schedulerTestRunner';

console.log('====================================================');
console.log('🚀 RUNNING SCHOOL TIMETABLE GENERATOR TEST SUITE');
console.log('====================================================\n');

const { allPassed, results } = runSchedulerTestSuite();

results.forEach((r, idx) => {
  const icon = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${r.durationMs}ms] ${r.name}`);
  if (!r.passed) {
    console.error(`   Error details: ${r.message}`);
  }
});

console.log('\n----------------------------------------------------');
console.log(`Total tests: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
console.log('----------------------------------------------------');

if (!allPassed) {
  process.exit(1);
} else {
  console.log('🎉 ALL SCHEDULER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
