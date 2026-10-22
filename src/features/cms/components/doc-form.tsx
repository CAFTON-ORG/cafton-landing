"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { useCan } from "@/components/dashboard/layout/staff-context";
import { Field } from "@/components/dashboard/shared/field";
import { EditorLayout } from "@/components/dashboard/shared/editor-layout";
import { FormActions } from "@/components/dashboard/shared/form-action-bar";
import { Button } from "@/components/dashboard/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/ui/card";
import { Checkbox } from "@/components/dashboard/ui/checkbox";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { Textarea } from "@/components/dashboard/ui/textarea";
import type { Permission } from "@/lib/auth/permissions";
import { useServerAction } from "@/hooks/use-server-action";
import { saveSiteDocument } from "../admin/document-actions";
import { listFromText, textFromList } from "../rules";
import { blankFor, type DocSpec, type FieldSpec } from "../site/spec";
import { EditorTab, EditorTabs, Repeater } from "./editor-kit";
import { ImageField } from "./image-field";

type Obj = Record<string, unknown>;
type Errors = Record<string, string>;

const asObj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : {};

/** One string per row. Typing a newline must not be swallowed, so the raw text is kept here. */
function LinesField({
  id,
  spec,
  value,
  onChange,
  error,
}: {
  id: string;
  spec: Extract<FieldSpec, { kind: "lines" }>;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const [text, setText] = useState(textFromList(value));
  return (
    <Field id={id} label={spec.label} hint={spec.hint} error={error}>
      <Textarea
        id={id}
        rows={spec.rows ?? 3}
        value={text}
        aria-invalid={!!error}
        onChange={(event) => {
          setText(event.target.value);
          onChange(listFromText(event.target.value));
        }}
      />
    </Field>
  );
}

function FieldView({
  spec,
  parent,
  path,
  onChange,
  errors,
}: {
  spec: FieldSpec;
  parent: Obj;
  path: string;
  onChange: (value: unknown) => void;
  errors: Errors;
}) {
  const id = `doc-${path.replace(/\./g, "-")}`;
  const error = errors[path];
  const value = parent[spec.name];

  switch (spec.kind) {
    case "text":
      return (
        <Field id={id} label={spec.label} hint={spec.hint} error={error}>
          <Input
            id={id}
            value={String(value ?? "")}
            placeholder={spec.placeholder}
            readOnly={spec.readonly}
            aria-invalid={!!error}
            autoComplete="off"
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      );
    case "textarea":
      return (
        <Field id={id} label={spec.label} hint={spec.hint} error={error}>
          <Textarea
            id={id}
            rows={spec.rows ?? 3}
            value={String(value ?? "")}
            aria-invalid={!!error}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      );
    case "lines":
      return (
        <LinesField
          id={id}
          spec={spec}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          error={error}
        />
      );
    case "image":
      return (
        <ImageField
          id={id}
          label={spec.label}
          hint={spec.hint}
          aspect={spec.aspect}
          value={String(value ?? "")}
          error={error}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <Field id={id} label={spec.label} hint={spec.hint} error={error}>
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={value === undefined || value === null ? "" : String(value)}
            aria-invalid={!!error}
            onChange={(event) =>
              onChange(event.target.value === "" ? "" : Number(event.target.value))
            }
          />
        </Field>
      );
    case "checkbox":
      return (
        <div className="grid gap-1">
          <div className="flex items-start gap-2 py-0.5">
            <Checkbox
              id={id}
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={id} className="text-sm leading-snug font-normal">
              {spec.label}
            </Label>
          </div>
          {spec.hint && <p className="text-muted-foreground ml-6 text-xs">{spec.hint}</p>}
          {error && (
            <p role="alert" className="text-destructive ml-6 text-sm">
              {error}
            </p>
          )}
        </div>
      );
    case "select":
      return (
        <Field id={id} label={spec.label} hint={spec.hint} error={error}>
          <Select value={String(value ?? "")} onValueChange={(next) => onChange(String(next))}>
            <SelectTrigger id={id} className="w-full">
              <SelectValue>
                {(current: string) =>
                  spec.options.find((option) => option.value === current)?.label ?? current
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {spec.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    case "group":
      return (
        <fieldset className="grid gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">{spec.label}</legend>
          {spec.hint && <p className="text-muted-foreground -mt-2 text-xs">{spec.hint}</p>}
          <Fields
            fields={spec.fields}
            value={asObj(value)}
            path={path}
            errors={errors}
            onChange={onChange}
          />
        </fieldset>
      );
    case "list": {
      const items = Array.isArray(value) ? (value as Obj[]) : [];
      return (
        <Repeater<Obj>
          label={spec.label}
          hint={spec.hint}
          itemName={spec.itemName}
          max={spec.max}
          fixed={spec.fixed}
          itemLabels={spec.itemLabels}
          collapsible={!!spec.summary}
          summary={(item) => String(item[spec.summary ?? ""] ?? "")}
          forceOpen={(index) =>
            Object.keys(errors).some((key) => key.startsWith(`${path}.${index}.`))
          }
          items={items}
          onChange={onChange}
          create={() => ({ ...blankFor(spec.fields), ...spec.blank })}
          error={error}
          render={(item, index, update) => (
            <div className="grid gap-4">
              <Fields
                fields={spec.fields}
                value={asObj(item)}
                path={`${path}.${index}`}
                errors={errors}
                onChange={(next) => update(next as Partial<Obj>)}
                merge
              />
            </div>
          )}
        />
      );
    }
  }
}

/** The fields of one object. With `merge` a change is reported as a patch for the parent to merge. */
function Fields({
  fields,
  value,
  path,
  errors,
  onChange,
  merge = false,
}: {
  fields: FieldSpec[];
  value: Obj;
  path: string;
  errors: Errors;
  onChange: (value: unknown) => void;
  merge?: boolean;
}) {
  return (
    <>
      {fields.map((field) => (
        <FieldView
          key={field.name}
          spec={field}
          parent={value}
          path={path ? `${path}.${field.name}` : field.name}
          errors={errors}
          onChange={(next) =>
            onChange(merge ? { [field.name]: next } : { ...value, [field.name]: next })
          }
        />
      ))}
    </>
  );
}

/** Edits one document of site content from its spec. Saving updates the website. */
export function DocForm({
  spec,
  initial,
  permission = "content:update" as Permission,
}: {
  spec: DocSpec;
  initial: Obj;
  permission?: Permission;
}) {
  const router = useRouter();
  const canEdit = useCan(permission);
  const { run, pending } = useServerAction();
  const [value, setValue] = useState<Obj>(initial);
  const [errors, setErrors] = useState<Errors>({});
  // Bumped on Discard so every field (including the raw-text ones) starts again from the saved values.
  const [resetKey, setResetKey] = useState(0);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sections = spec.sections.map((section) => (
    <Card key={section.title}>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        {section.description && <CardDescription>{section.description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">
        {section.fields.map((field) => (
          <FieldView
            key={field.name}
            spec={field}
            parent={value}
            path={field.name}
            errors={errors}
            onChange={(next) => setValue((current) => ({ ...current, [field.name]: next }))}
          />
        ))}
      </CardContent>
    </Card>
  ));

  const rail = (
    <>
      {canEdit ? (
        <FormActions
          description={spec.description}
          dirty={dirty}
          pending={pending}
          error={errors.form}
          onDiscard={() => {
            setValue(initial);
            setErrors({});
            setResetKey((key) => key + 1);
          }}
          links={
            <>
              {spec.path && (
                <Button
                  type="button"
                  variant="ghost"
                  nativeButton={false}
                  render={<a href={spec.path} target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLink aria-hidden="true" /> View on the site
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/dashboard/content/pages" />}
              >
                Back to all pages
              </Button>
            </>
          }
        />
      ) : (
        <Card>
          <CardContent className="text-muted-foreground text-sm">
            You can read this page but not change it.
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Good to know</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-2 text-sm">
          <p>Saving updates the website right away.</p>
          <p>Every change is recorded in the audit log.</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setErrors({});
        run(() => saveSiteDocument(spec.key, value), {
          success: "Saved. The website is updating.",
          onSuccess: () => router.refresh(),
          onFieldErrors: setErrors,
        });
      }}
    >
      <fieldset key={resetKey} disabled={!canEdit || pending} className="min-w-0">
        {spec.sections.length > 1 ? (
          <EditorTabs
            tabs={spec.sections.map((section) => ({
              value: section.title,
              label: section.title,
              fields: section.fields.map((field) => field.name),
            }))}
            errors={errors}
            rail={rail}
          >
            {spec.sections.map((section, index) => (
              <EditorTab key={section.title} value={section.title}>
                {sections[index]}
              </EditorTab>
            ))}
          </EditorTabs>
        ) : (
          <EditorLayout rail={rail}>{sections}</EditorLayout>
        )}
      </fieldset>
    </form>
  );
}
