-- A custom field can be marked required: it must be filled in whenever the record's fields are saved.
ALTER TABLE "custom_fields" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT false;
