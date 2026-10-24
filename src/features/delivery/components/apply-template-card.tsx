"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { Field } from "@/components/dashboard/shared/field";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { applyTemplate } from "../actions/extras";

/** For a project with nothing planned yet: fill it with a template's milestones and tasks in one go. */
export function ApplyTemplateCard({
  projectId,
  templates,
}: {
  projectId: string;
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { run, pending } = useServerAction();
  const [templateId, setTemplateId] = useState("");
  const chosen = templates.find((template) => template.id === templateId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start from a template</CardTitle>
        <CardDescription>
          This project has nothing planned yet. A template adds its milestones and tasks in one go.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Field id="apply-template" label="Template">
          <Select value={templateId} onValueChange={(next) => setTemplateId(String(next))}>
            <SelectTrigger id="apply-template" className="w-full">
              <SelectValue placeholder="Choose a template">{chosen?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div>
          <Button
            size="sm"
            disabled={pending || !templateId}
            onClick={() =>
              run(() => applyTemplate(projectId, templateId), {
                success: (data) =>
                  `Added ${data?.milestones ?? 0} milestones and ${data?.tasks ?? 0} tasks.`,
                onSuccess: () => router.refresh(),
              })
            }
          >
            <LayoutTemplate aria-hidden="true" /> {pending ? "Adding…" : "Use this template"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
