import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface ThemedImageProps extends Omit<ImageProps, "src" | "alt"> {
  light: string;
  dark: string;
  alt: string;
}

/**
 * One image per theme, swapped with CSS (`dark:` variant) rather than JS so
 * the correct one paints on first frame with no flash. The hidden variant is
 * lazy and `display: none`, so the browser never downloads it. Only the
 * visible-in-light copy carries the alt text; the other is decorative to
 * avoid announcing the same image twice.
 */
export function ThemedImage({ light, dark, alt, className, ...props }: ThemedImageProps) {
  if (light === dark) {
    return <Image {...props} src={light} alt={alt} className={className} />;
  }

  return (
    <>
      <Image {...props} src={light} alt={alt} className={cn(className, "dark:hidden")} />
      <Image
        {...props}
        src={dark}
        alt=""
        aria-hidden="true"
        className={cn(className, "hidden dark:block")}
      />
    </>
  );
}
