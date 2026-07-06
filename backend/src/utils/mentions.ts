// Metin içindeki @kullanıcı bahsetmelerini (mention) ayıklar.
// - Yalnızca @'ten önce kelime karakteri/@ bulunmayan konumları yakalar
//   (e-posta adreslerindeki @ gibi durumları eler).
// - Kullanıcı adları küçük harfe normalize edilir ve tekilleştirilir.
const MENTION_RE = /(?<![\w@])@([a-zA-Z0-9_]{1,30})/g;

export function extractMentions(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return [...found];
}
