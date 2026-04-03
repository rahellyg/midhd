/**
 * Renders plain text with any URLs converted to clickable <a> links.
 * All external links open in a new tab with safe rel attributes.
 */
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

export default function LinkifiedText({ text, className }) {
  if (!text) return null;

  const parts = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 underline underline-offset-2 break-all hover:text-indigo-800"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
