import { projects } from "@/data/projects";
import type { Project } from "@/types/content";

/**
 * Data access for portfolio projects. These are async on purpose: every page already
 * `await`s them, so moving the content from `src/data` to a backend means
 * changing only the bodies here, not the pages or components that use them.
 */

export async function listProjects(): Promise<Project[]> {
  return projects;
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return projects.find((project) => project.slug === slug);
}
