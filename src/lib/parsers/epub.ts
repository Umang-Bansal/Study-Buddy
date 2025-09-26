export async function parseEpubContent(arrayBuffer: ArrayBuffer): Promise<string> {
  const ePub = await import('epubjs');
  const book = ePub.default(arrayBuffer);
  await book.ready;

  const spineItems = book.spine.spineItems;
  const parts: string[] = [];

  for (const item of spineItems) {
    const text = await item.load(book.load.bind(book)).then(() => item.text());
    if (text) {
      parts.push(text.replace(/\s+/g, ' ').trim());
    }
    item.unload();
  }

  return parts.join('\n\n').trim();
}

