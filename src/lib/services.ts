import { Cloud, Code2, MonitorSmartphone, Smartphone, type LucideIcon } from "lucide-react";
import { projectTypes } from "@/lib/contact";

export interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The matching option in the contact form's "Project type" select. */
  projectType: (typeof projectTypes)[number];
}

export const services: Service[] = [
  {
    icon: Code2,
    title: "Custom Software",
    description:
      "Purpose-built systems designed around your organization's workflows.",
    projectType: "Custom Software",
  },
  {
    icon: MonitorSmartphone,
    title: "Web Applications",
    description:
      "Platforms, dashboards, portals, and business systems accessible from the web.",
    projectType: "Web Application",
  },
  {
    icon: Smartphone,
    title: "Mobile Applications",
    description:
      "Mobile experiences for customers, employees, field teams, and communities.",
    projectType: "Mobile Application",
  },
  {
    icon: Cloud,
    title: "SaaS & Digital Products",
    description: "Scalable software products designed to solve recurring problems.",
    projectType: "SaaS / Product",
  },
];
