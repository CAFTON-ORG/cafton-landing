/** Media rules: pure, shared by the library UI and the Server Actions. */

export function checkDeleteMedia(item: { uses: number }): string | null {
  if (item.uses === 0) return null;
  return `This image is used in ${item.uses} ${item.uses === 1 ? "place" : "places"}. Remove it from the content first.`;
}

/** Alt text is for people who cannot see the image: describe it, do not label it. */
export function checkAltText(alt: string): string | null {
  const text = alt.trim();
  if (text.length > 300) return "Keep the description under 300 characters.";
  if (/^(img|image|photo|picture|screenshot)[-_ ]?\d*(\.(jpe?g|png|webp))?$/i.test(text)) {
    return "Describe what is in the image, not its file name.";
  }
  return null;
}
