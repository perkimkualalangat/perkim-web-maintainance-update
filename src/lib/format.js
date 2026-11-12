export function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

export function truncate(str, maxLength = 100) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength - 1) + '…' : str;
}