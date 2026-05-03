let ChartJsNodeCanvas;

/**
 * Best-effort Chart.js PNG rendering for PDF embedding.
 * If chart dependencies are missing or fail to load, functions return null.
 */
function tryLoadChartRenderer() {
  if (ChartJsNodeCanvas) return ChartJsNodeCanvas;
  try {
    // chartjs-node-canvas bundles Chart.js usage for Node canvas.
    // This keeps PDF generation code clean and isolates native deps.
    // eslint-disable-next-line global-require
    ChartJsNodeCanvas = require('chartjs-node-canvas').ChartJSNodeCanvas;
    return ChartJsNodeCanvas;
  } catch (e) {
    return null;
  }
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * @param {{
 *   labels?: string[],
 *   series?: Array<{ label?: string, data?: number[], color?: string }>,
 *   title?: string
 * }} trendGraphData
 * @returns {Promise<Buffer|null>}
 */
async function renderTrendChartPng(trendGraphData) {
  const Ctor = tryLoadChartRenderer();
  if (!Ctor) return null;

  const labels = safeArray(trendGraphData?.labels).map((x) => String(x));
  const series = safeArray(trendGraphData?.series);
  if (!labels.length || !series.length) return null;

  const width = 960;
  const height = 360;

  const chartJSNodeCanvas = new Ctor({
    width,
    height,
    backgroundColour: 'white',
  });

  const datasets = series.slice(0, 4).map((s, idx) => {
    const color = s?.color || (idx === 0 ? '#0B4F6C' : idx === 1 ? '#2A6F97' : idx === 2 ? '#16A34A' : '#9333EA');
    return {
      label: String(s?.label || `Series ${idx + 1}`),
      data: safeArray(s?.data).map((n) => (Number.isFinite(Number(n)) ? Number(n) : null)),
      borderColor: color,
      backgroundColor: color,
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 4,
      spanGaps: true,
    };
  });

  const configuration = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: Boolean(trendGraphData?.title),
          text: String(trendGraphData?.title || ''),
          color: '#0F172A',
          font: { size: 14 },
        },
      },
      scales: {
        x: { grid: { color: '#E2E8F0' }, ticks: { color: '#334155', maxRotation: 0 } },
        y: { grid: { color: '#E2E8F0' }, ticks: { color: '#334155' } },
      },
    },
  };

  try {
    return await chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  } catch (e) {
    return null;
  }
}

module.exports = { renderTrendChartPng };

