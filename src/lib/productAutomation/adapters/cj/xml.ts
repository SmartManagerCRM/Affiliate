/**
 * Minimal, defensive XML record extraction — CJ's legacy REST APIs (like
 * Advertiser Lookup) return XML, not JSON, and this project has no XML
 * parsing dependency (mirrors feedParser.ts's hand-rolled CSV parser: only
 * what's actually needed, nothing added for hypothetical future use).
 *
 * This is NOT a general-purpose XML parser — it only extracts flat,
 * non-nested tag values from repeated same-named record elements (e.g.
 * every <advertiser>...</advertiser> block in a CJ Advertiser Lookup
 * response), which is exactly CJ's actual response shape for this family
 * of APIs. It tolerates self-closing tags, CDATA, extra whitespace, and
 * unknown/extra tags — a response that doesn't match what's expected
 * yields fewer/empty records rather than throwing.
 */

/** Every <recordTag>...</recordTag> block in the document, as raw inner XML strings. */
export function extractXmlRecords(xml: string, recordTag: string): string[] {
  const records: string[] = [];
  const pattern = new RegExp(`<${recordTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${recordTag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    records.push(match[1]);
  }
  return records;
}

/** The text content of the first <fieldTag>...</fieldTag> (or self-closing <fieldTag/>) found in this record's inner XML, CDATA-unwrapped and whitespace-trimmed. Null when the tag is absent or empty. */
export function extractXmlField(recordXml: string, fieldTag: string): string | null {
  const selfClosing = new RegExp(`<${fieldTag}(?:\\s[^>]*)?/>`, "i");
  if (selfClosing.test(recordXml)) return null;

  const pattern = new RegExp(`<${fieldTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${fieldTag}>`, "i");
  const match = pattern.exec(recordXml);
  if (!match) return null;

  const raw = match[1].trim();
  if (!raw) return null;

  const cdataMatch = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(raw);
  const value = (cdataMatch ? cdataMatch[1] : raw).trim();
  return value || null;
}
