import {
  RichText,
  type AppBskyFeedDefs,
  type RichTextProps,
} from "@atproto/api";

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHTML = (str?: string) =>
  str?.replace(/[&<>"']/g, (match) => escapeMap[match] || match) ?? "";

export const nl2br = (str?: string) => str?.replaceAll("\n", "<br/ >\n") ?? "";

export function renderPostAsHtml(
  post: AppBskyFeedDefs.PostView,
  transformNewlines = true,
) {
  const rt = new RichText(post.record as RichTextProps);
  let html = "";
  for (const segment of rt.segments()) {
    if (segment.isLink()) {
      html += `<a href="${escapeHTML(segment.link?.uri)}">${escapeHTML(segment.text)}</a>`;
    } else if (segment.isMention()) {
      html += `<a href="https://bsky.app/profile/${escapeHTML(segment.mention!.did)}">${escapeHTML(segment.text)}</a>`;
    } else if (segment.isTag()) {
      html += `<a href="https://bsky.app/hashtag/${escapeHTML(segment.tag!.tag)}">#${escapeHTML(segment.tag!.tag)}</a>`;
    } else {
      html += transformNewlines
        ? nl2br(escapeHTML(segment.text))
        : escapeHTML(segment.text);
    }
  }
  return html;
}
