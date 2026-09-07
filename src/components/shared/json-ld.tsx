/**
 * Renders structured data as a `<script>` tag, per Next.js's own recommended
 * pattern. `JSON.stringify` alone doesn't sanitize for XSS -- escaping `<`
 * to its unicode equivalent is the documented mitigation, since `data` here
 * is always our own static content, never user input, but the escape costs
 * nothing and matches the framework's own guidance.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
