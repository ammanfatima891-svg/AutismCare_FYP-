const { writeIntegratedReportPdf, REPORTS_DIR } = require('../src/services/reportPdfService.js');

async function main() {
  const reportId = 'example-integrated-report';
  const now = new Date().toISOString();

  const data = {
    generatedAt: now,
    childInfo: {
      childName: 'Example Patient',
      parentName: 'Example Parent',
      caseId: 'CASE-10214',
    },
    therapyDuration: { weeks: 12, startDate: '2026-01-05', endDate: '2026-03-30' },
    sessionsCompleted: 18,
    overallMetrics: {
      overallScore: 3.9,
      improvementRate: 'Steady improvement',
      consistency: 0.82,
    },
    goalProgressTable: [
      { goal: 'Increase eye contact during interactions', status: 'Improving', baseline: 'Low', current: 'Moderate' },
      { goal: 'Follow 2-step instructions', status: 'On track', baseline: 'Occasional', current: 'Consistent' },
      { goal: 'Reduce transition distress', status: 'Improving', baseline: 'Frequent', current: 'Occasional' },
      { goal: 'Expand functional communication', status: 'On track', baseline: 'Limited', current: 'Moderate' },
    ],
    domainPerformance: [
      { name: 'Communication', score: 4.1, status: 'Improving' },
      { name: 'Social Interaction', score: 3.6, status: 'Improving' },
      { name: 'Adaptive Skills', score: 3.8, status: 'Stable' },
      { name: 'Behavior Regulation', score: 3.2, status: 'Needs support' },
    ],
    trendGraphData: {
      title: 'Weekly Composite Score Trend',
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
      series: [
        { label: 'Composite score', data: [2.4, 2.7, 3.0, 3.1, 3.3, 3.5, 3.7, 3.9], color: '#0B4F6C' },
      ],
    },
    recommendations: [
      'Maintain a consistent home practice schedule (3–4 short sessions per week).',
      'Use visual schedules to support transitions and reduce distress.',
      'Reinforce functional communication attempts immediately with specific praise.',
      'Coordinate with school staff to align reinforcement strategies across settings.',
    ],
    notes:
      'Overall clinical trajectory is positive. Patient demonstrates improved engagement and reduced avoidance during structured tasks. Continue current plan with emphasis on transition supports and generalization of skills to home and school contexts.',
  };

  const rel = await writeIntegratedReportPdf(reportId, data);
  // eslint-disable-next-line no-console
  console.log(`Generated example PDF at: ${rel}`);
  // eslint-disable-next-line no-console
  console.log(`Reports directory: ${REPORTS_DIR}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

