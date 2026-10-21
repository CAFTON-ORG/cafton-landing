import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Component tests opt into jsdom with `// @vitest-environment jsdom`; this is a
// no-op in the node environment used by everything else.
afterEach(() => cleanup());
