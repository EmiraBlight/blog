export function generatePostId(title: string): number {
  let hash = 5381;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 33) ^ title.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
