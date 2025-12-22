// utils/asqCutoffs.js

// ASQ-3 referral and monitor cutoffs for all intervals (2–60 months)
// Values are based on normative ASQ-3 data (approximate, adjust if you have official manual)
const ASQ_CUTOFFS = {
  2:  { Communication: {monitor: 27, referral: 22}, GrossMotor: {monitor: 45, referral: 42}, FineMotor: {monitor: 35, referral: 30}, ProblemSolving: {monitor: 30, referral: 25}, PersonalSocial: {monitor: 38, referral: 34} },
  4:  { Communication: {monitor: 38, referral: 35}, GrossMotor: {monitor: 41, referral: 38}, FineMotor: {monitor: 33, referral: 30}, ProblemSolving: {monitor: 38, referral: 35}, PersonalSocial: {monitor: 36, referral: 33} },
  6:  { Communication: {monitor: 33, referral: 30}, GrossMotor: {monitor: 25, referral: 22}, FineMotor: {monitor: 28, referral: 25}, ProblemSolving: {monitor: 31, referral: 28}, PersonalSocial: {monitor: 28, referral: 25} },
  8:  { Communication: {monitor: 36, referral: 33}, GrossMotor: {monitor: 35, referral: 31}, FineMotor: {monitor: 44, referral: 40}, ProblemSolving: {monitor: 39, referral: 36}, PersonalSocial: {monitor: 39, referral: 36} },
  9:  { Communication: {monitor: 17, referral: 14}, GrossMotor: {monitor: 21, referral: 18}, FineMotor: {monitor: 34, referral: 31}, ProblemSolving: {monitor: 32, referral: 29}, PersonalSocial: {monitor: 22, referral: 19} },
  10: { Communication: {monitor: 26, referral: 23}, GrossMotor: {monitor: 33, referral: 30}, FineMotor: {monitor: 41, referral: 38}, ProblemSolving: {monitor: 36, referral: 33}, PersonalSocial: {monitor: 30, referral: 27} },
  12: { Communication: {monitor: 19, referral: 16}, GrossMotor: {monitor: 24, referral: 21}, FineMotor: {monitor: 38, referral: 35}, ProblemSolving: {monitor: 30, referral: 27}, PersonalSocial: {monitor: 25, referral: 22} },
  14: { Communication: {monitor: 20, referral: 17}, GrossMotor: {monitor: 29, referral: 26}, FineMotor: {monitor: 26, referral: 23}, ProblemSolving: {monitor: 26, referral: 23}, PersonalSocial: {monitor: 26, referral: 23} },
  16: { Communication: {monitor: 20, referral: 17}, GrossMotor: {monitor: 41, referral: 38}, FineMotor: {monitor: 34, referral: 32}, ProblemSolving: {monitor: 34, referral: 31}, PersonalSocial: {monitor: 29, referral: 26} },
  18: { Communication: {monitor: 16, referral: 13}, GrossMotor: {monitor: 40, referral: 37}, FineMotor: {monitor: 36, referral: 34}, ProblemSolving: {monitor: 29, referral: 26}, PersonalSocial: {monitor: 30, referral: 27} },
  20: { Communication: {monitor: 24, referral: 21}, GrossMotor: {monitor: 43, referral: 40}, FineMotor: {monitor: 38, referral: 36}, ProblemSolving: {monitor: 32, referral: 29}, PersonalSocial: {monitor: 36, referral: 33} },
  22: { Communication: {monitor: 16, referral: 13}, GrossMotor: {monitor: 31, referral: 28}, FineMotor: {monitor: 33, referral: 30}, ProblemSolving: {monitor: 32, referral: 29}, PersonalSocial: {monitor: 33, referral: 30} },
  24: { Communication: {monitor: 28, referral: 25}, GrossMotor: {monitor: 41, referral: 38}, FineMotor: {monitor: 37, referral: 35}, ProblemSolving: {monitor: 33, referral: 30}, PersonalSocial: {monitor: 35, referral: 32} },
  27: { Communication: {monitor: 27, referral: 24}, GrossMotor: {monitor: 31, referral: 28}, FineMotor: {monitor: 21, referral: 18}, ProblemSolving: {monitor: 31, referral: 28}, PersonalSocial: {monitor: 28, referral: 25} },
  30: { Communication: {monitor: 36, referral: 33}, GrossMotor: {monitor: 38, referral: 36}, FineMotor: {monitor: 21, referral: 19}, ProblemSolving: {monitor: 30, referral: 27}, PersonalSocial: {monitor: 34, referral: 32} },
  33: { Communication: {monitor: 28, referral: 25}, GrossMotor: {monitor: 37, referral: 35}, FineMotor: {monitor: 15, referral: 12}, ProblemSolving: {monitor: 30, referral: 27}, PersonalSocial: {monitor: 31, referral: 29} },
  36: { Communication: {monitor: 34, referral: 31}, GrossMotor: {monitor: 39, referral: 37}, FineMotor: {monitor: 18, referral: 16}, ProblemSolving: {monitor: 33, referral: 30}, PersonalSocial: {monitor: 37, referral: 35} },
  42: { Communication: {monitor: 30, referral: 27}, GrossMotor: {monitor: 38, referral: 36}, FineMotor: {monitor: 20, referral: 18}, ProblemSolving: {monitor: 31, referral: 28}, PersonalSocial: {monitor: 33, referral: 31} },
  48: { Communication: {monitor: 34, referral: 31}, GrossMotor: {monitor: 35, referral: 33}, FineMotor: {monitor: 18, referral: 16}, ProblemSolving: {monitor: 34, referral: 31}, PersonalSocial: {monitor: 29, referral: 27} },
  54: { Communication: {monitor: 35, referral: 32}, GrossMotor: {monitor: 37, referral: 35}, FineMotor: {monitor: 19, referral: 17}, ProblemSolving: {monitor: 31, referral: 28}, PersonalSocial: {monitor: 34, referral: 32} },
  60: { Communication: {monitor: 37, referral: 34}, GrossMotor: {monitor: 38, referral: 36}, FineMotor: {monitor: 20, referral: 18}, ProblemSolving: {monitor: 33, referral: 30}, PersonalSocial: {monitor: 36, referral: 33} },
};

module.exports = ASQ_CUTOFFS;
