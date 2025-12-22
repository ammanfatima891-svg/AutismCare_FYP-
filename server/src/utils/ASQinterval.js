// utils/asqInterval.js
const intervalRanges = [
  { interval: 2, minMonths: 2, maxMonths: 4 },
  { interval: 4, minMonths: 4, maxMonths: 6 },
  { interval: 6, minMonths: 6, maxMonths: 8 },
  { interval: 8, minMonths: 8, maxMonths: 9 },
  { interval: 9, minMonths: 9, maxMonths: 10 },
  { interval: 10, minMonths: 10, maxMonths: 12 },
  { interval: 12, minMonths: 12, maxMonths: 14 },
  { interval: 14, minMonths: 14, maxMonths: 16 },
  { interval: 16, minMonths: 16, maxMonths: 18 },
  { interval: 18, minMonths: 18, maxMonths: 20 },
  { interval: 20, minMonths: 20, maxMonths: 22 },
  { interval: 22, minMonths: 22, maxMonths: 24 },
  { interval: 24, minMonths: 24, maxMonths: 27 },
  { interval: 27, minMonths: 27, maxMonths: 30 },
  { interval: 30, minMonths: 30, maxMonths: 33 },
  { interval: 33, minMonths: 33, maxMonths: 36 },
  { interval: 36, minMonths: 36, maxMonths: 42 },
  { interval: 42, minMonths: 42, maxMonths: 48 },
  { interval: 48, minMonths: 48, maxMonths: 54 },
  { interval: 54, minMonths: 54, maxMonths: 60 },
  { interval: 60, minMonths: 60, maxMonths: 66 },
];

exports.getASQInterval = (ageDays) => {
  const ageMonths = ageDays / 30.44;

  const range = intervalRanges.find(r => ageMonths >= r.minMonths && ageMonths < r.maxMonths);

  if (!range) {
    throw new Error(`No ASQ-3 interval found for age ${ageMonths.toFixed(1)} months (${ageDays} days)`);
  }

  return range.interval;
};
