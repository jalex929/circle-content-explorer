export type ExportRecord = {
  id: string;
  title: string;
  slug: string;
  url: string;
  body: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  author_name: string;
  author_id: string;
  space_name: string;
  space_id: string;
  cover_image_url: string;
  attachment_urls: string;
  raw_source_url: string;
  raw_json: string;
};

function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

export function normalizeRecord(
  item: Record<string, unknown>,
  sourceUrl: string
): ExportRecord {
  const author = (item.author ?? item.user ?? {}) as Record<string, unknown>;
  const space = (item.space ?? item.group ?? item.community ?? {}) as Record<string, unknown>;
  const attachments = (item.attachments ?? item.files ?? []) as unknown[];

  return {
    id: asString(item.id ?? item.post_id ?? item.uuid),
    title: asString(item.title ?? item.name),
    slug: asString(item.slug),
    url: asString(item.url ?? item.path),
    body: asString(item.body ?? item.content ?? item.description),
    created_at: asString(item.created_at ?? item.createdAt),
    updated_at: asString(item.updated_at ?? item.updatedAt),
    published_at: asString(item.published_at ?? item.publishedAt),
    author_name: asString(author.name),
    author_id: asString(author.id),
    space_name: asString(space.name),
    space_id: asString(space.id),
    cover_image_url: asString(
      item.cover_image_url ?? item.image_url ?? item.thumbnail_url ?? item.coverImageUrl
    ),
    attachment_urls: JSON.stringify(attachments),
    raw_source_url: sourceUrl,
    raw_json: JSON.stringify(item),
  };
}
