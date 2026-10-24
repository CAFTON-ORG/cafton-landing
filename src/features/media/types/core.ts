export interface MediaItem {
  id: string;
  path: string;
  /** Public address, ready to store in a content field. */
  url: string;
  name: string;
  /** Default alt text, offered when the image is picked. */
  alt: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  /** ISO timestamp. */
  createdAt: string;
  /** How many pieces of content use it. Anything above zero blocks deletion. */
  uses: number;
}
