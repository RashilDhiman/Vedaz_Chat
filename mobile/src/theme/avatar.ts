const palette = [
  '#00A884',
  '#53BDEB',
  '#7F66FF',
  '#FF8A65',
  '#C48A2A',
  '#E91E63',
  '#0097A7',
  '#5C6BC0',
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + hash * 31;
  }
  return palette[Math.abs(hash) % palette.length];
}

export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.slice(0, 1).toUpperCase();
}
