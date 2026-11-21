import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "hr", "i", "li", "ol", "p", "pre", "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"];

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\d{1,3},\s*){2}\d{1,3}\)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
