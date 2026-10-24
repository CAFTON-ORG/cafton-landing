-- Fields a deal must have filled in before it can move into a stage ("value", "expected_close",
-- "organization", or "custom:<field key>").
ALTER TABLE "pipeline_stages" ADD COLUMN "required_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
