export const DATE_PRESETS = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'custom', label: 'Custom' },
];

export function computePresetRange(presetId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (presetId === 'this_month') {
    const from = new Date(year, month, 1).toISOString().split('T')[0];
    const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return {
      from,
      to,
      label: `1 ${now.toLocaleString('en-US', { month: 'short' })} to ${new Date(year, month + 1, 0).getDate()} ${now.toLocaleString('en-US', { month: 'short' })} ${year}`,
    };
  }

  if (presetId === 'last_month') {
    const from = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const to = new Date(year, month, 0).toISOString().split('T')[0];
    const prevMonthDate = new Date(year, month - 1, 1);
    return {
      from,
      to,
      label: `1 ${prevMonthDate.toLocaleString('en-US', { month: 'short' })} to ${new Date(year, month, 0).getDate()} ${prevMonthDate.toLocaleString('en-US', { month: 'short' })} ${year}`,
    };
  }

  if (presetId === 'this_quarter') {
    const qStartMonth = Math.floor(month / 3) * 3;
    const from = new Date(year, qStartMonth, 1).toISOString().split('T')[0];
    const to = new Date(year, qStartMonth + 3, 0).toISOString().split('T')[0];
    return { from, to, label: `Q${Math.floor(month / 3) + 1} ${year}` };
  }

  return { from: '', to: '', label: 'Custom Range' };
}
