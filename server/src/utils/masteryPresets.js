/**
 * Preset mastery rules (easy / moderate / strict) + merge with optional custom fields.
 * Used by TherapyPlan normalization and progressEngine goal evaluation.
 */

const PRESETS = {
  easy: { ruleType: 'threshold_out_of_n_sessions', threshold: 65, window: 4, minSessions: 2 },
  moderate: { ruleType: 'threshold_out_of_n_sessions', threshold: 80, window: 5, minSessions: 3 },
  strict: { ruleType: 'threshold_out_of_n_sessions', threshold: 90, window: 6, minSessions: 4 },
};

const PRESET_KEYS = ['easy', 'moderate', 'strict'];

function normalizeMasteryRuleFragment(mr) {
  const input = mr && typeof mr === 'object' ? mr : {};
  const ruleType =
    input.ruleType === 'threshold_consecutive_sessions' ? 'threshold_consecutive_sessions' : 'threshold_out_of_n_sessions';
  const threshold = Number(input.threshold);
  const window = Number(input.window);
  const minSessions = Number(input.minSessions);
  return {
    ruleType,
    threshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 80,
    window: Number.isFinite(window) && window > 0 ? window : 5,
    minSessions: Number.isFinite(minSessions) && minSessions > 0 ? minSessions : 3,
  };
}

/**
 * @param {{ masteryPreset?: string, masteryRule?: object }} goalLike
 * @returns {{ ruleType: string, threshold: number, window: number, minSessions: number }}
 */
function resolveMasteryRuleFromGoal(goalLike) {
  const preset = String(goalLike?.masteryPreset || '')
    .trim()
    .toLowerCase();
  const mr = goalLike?.masteryRule;
  if (PRESET_KEYS.includes(preset)) {
    const base = { ...PRESETS[preset] };
    if (mr && typeof mr === 'object') {
      return normalizeMasteryRuleFragment({ ...base, ...mr });
    }
    return normalizeMasteryRuleFragment(base);
  }
  return normalizeMasteryRuleFragment(mr);
}

module.exports = {
  MASTERY_PRESETS: PRESETS,
  PRESET_KEYS,
  resolveMasteryRuleFromGoal,
  normalizeMasteryRuleFragment,
};
