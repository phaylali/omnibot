/**
 * =============================================================================
 * RSS PARSER
 * Fetches and parses RSS/Atom XML feeds into structured items.
 * Uses Bun's built-in DOMParser (Web API) — no extra dependencies.
 * =============================================================================
 */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  author: string;
  imageUrl: string;
}

/**
 * Returns a unique identifier for an item (guid > link > title).
 */
function itemId(item: RssItem): string {
  return item.guid || item.link || item.title;
}

/**
 * Builds a stable string from a list of items to detect changes.
 */
export function itemsSignature(items: RssItem[]): string {
  return items.map((i) => itemId(i)).join("|");
}

/**
 * Fetches an RSS/Atom URL and parses it into items.
 * Returns null on error.
 */
export async function fetchRss(url: string): Promise<RssItem[] | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Omnibot-RSS/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    return parseRssXml(xml);
  } catch {
    return null;
  }
}

/**
 * Parses RSS 2.0 or Atom XML into a list of items.
 */
function parseRssXml(xml: string): RssItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items: RssItem[] = [];

  // Try RSS 2.0 format: <rss><channel><item>...</item></channel></rss>
  const rssItems = doc.querySelectorAll("rss > channel > item");
  if (rssItems.length > 0) {
    rssItems.forEach((node) => {
      if (node instanceof Element) {
        items.push(parseRssItem(node));
      }
    });
    return items;
  }

  // Try Atom format: <feed><entry>...</entry></feed>
  const atomItems = doc.querySelectorAll("feed > entry");
  if (atomItems.length > 0) {
    atomItems.forEach((node) => {
      if (node instanceof Element) {
        items.push(parseAtomEntry(node));
      }
    });
    return items;
  }

  return items;
}

function getElText(parent: Element, selector: string): string {
  const el = parent.querySelector(selector);
  if (!el) return "";
  // Handle CDATA and text content
  return el.textContent?.trim() ?? "";
}

function getElAttr(parent: Element, selector: string, attr: string): string {
  const el = parent.querySelector(selector);
  return el?.getAttribute(attr) ?? "";
}

function parseRssItem(el: Element): RssItem {
  return {
    title: getElText(el, "title"),
    link: getElText(el, "link"),
    description: cleanHtml(getElText(el, "description")),
    pubDate: getElText(el, "pubDate"),
    guid: getElText(el, "guid") || getElText(el, "link"),
    author: getElText(el, "author"),
    imageUrl: getElAttr(el, "enclosure", "url") || getElAttr(el, "media\\:content", "url"),
  };
}

function parseAtomEntry(el: Element): RssItem {
  return {
    title: getElText(el, "title"),
    link: getElAttr(el, "link", "href") || getElText(el, "link"),
    description: cleanHtml(getElText(el, "summary") || getElText(el, "content")),
    pubDate: getElText(el, "published") || getElText(el, "updated"),
    guid: getElText(el, "id") || getElAttr(el, "link", "href"),
    author: getElText(el, "author > name"),
    imageUrl: "", // Atom enclosures are less common
  };
}

/** Strips HTML tags from a string for clean embed descriptions */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // strip tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500); // discord embed field limit
}
