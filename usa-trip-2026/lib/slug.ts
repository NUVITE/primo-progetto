/**
 * "Chi sei?" e' testo libero: qui lo trasformiamo in una forma sicura (niente
 * accenti, spazi o simboli), sempre la stessa per lo stesso nome. Usata sia
 * lato server (percorso sull'archivio foto) sia lato client (nome del file
 * avatar in public/avatars/): per questo non ha "server-only".
 */
export function slugifyPersonName(name: string): string {
  // normalize("NFKD") scompone le lettere accentate in lettera + segno
  // diacritico separato; il replace successivo scarta gia' da solo qualunque
  // carattere non alfanumerico, segni diacritici inclusi.
  const slug = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return slug || "persona";
}
