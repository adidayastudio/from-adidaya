export async function searchQuery(q: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  return res.json();
}
