import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Renders structured data as a `<script>` tag, per Next.js's own recommended
 * pattern. `serializeJsonLd` escapes everything that could end the script
 * element, so this is safe even when `data` includes CMS content.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- audited: output of serializeJsonLd, which escapes < > & so the data cannot leave the script element
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
