-- Monthly sales goals, and contracts / statements of work that clients accept through a secret link.
CREATE SEQUENCE contract_reference_seq;

CREATE TYPE "contract_kind" AS ENUM ('contract', 'sow');
CREATE TYPE "contract_status" AS ENUM ('draft', 'sent', 'accepted', 'declined', 'withdrawn', 'expired');

CREATE TABLE "sales_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sales_targets_amount_positive" CHECK ("amount_minor" > 0),
    CONSTRAINT "sales_targets_first_of_month" CHECK (EXTRACT(DAY FROM "month") = 1)
);
CREATE UNIQUE INDEX "sales_targets_owner_id_month_key" ON "sales_targets"("owner_id", "month");
CREATE INDEX "sales_targets_month_idx" ON "sales_targets"("month");

CREATE TABLE "contract_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "kind" "contract_kind" NOT NULL DEFAULT 'contract',
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contract_templates_kind_active_idx" ON "contract_templates"("kind", "active");

CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL,
    "deal_id" UUID NOT NULL,
    "quote_id" UUID,
    "template_id" UUID,
    "kind" "contract_kind" NOT NULL DEFAULT 'contract',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "valid_until" DATE,
    "token_hash" TEXT,
    "sent_hash" TEXT,
    "accepted_hash" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "sent_to" TEXT,
    "viewed_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_by_name" TEXT,
    "accepted_by_email" TEXT,
    "accepted_ip" TEXT,
    "accepted_user_agent" TEXT,
    "declined_at" TIMESTAMPTZ(6),
    "declined_reason" TEXT,
    "withdrawn_at" TIMESTAMPTZ(6),
    "withdrawn_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contracts_reference_key" ON "contracts"("reference");
CREATE UNIQUE INDEX "contracts_token_hash_key" ON "contracts"("token_hash");
CREATE INDEX "contracts_deal_id_idx" ON "contracts"("deal_id");
CREATE INDEX "contracts_status_idx" ON "contracts"("status");
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Once sent, the wording is what the client sees; once accepted it is a record. Neither can be edited,
-- and an accepted contract can never be deleted.
CREATE FUNCTION contracts_freeze_sent() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('sent', 'accepted') AND (
       NEW.title <> OLD.title OR NEW.body <> OLD.body OR NEW.kind <> OLD.kind OR
       NEW.valid_until IS DISTINCT FROM OLD.valid_until) THEN
    RAISE EXCEPTION 'A sent or accepted contract cannot be changed.';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER contracts_freeze_sent BEFORE UPDATE ON "contracts"
  FOR EACH ROW EXECUTE FUNCTION contracts_freeze_sent();

CREATE FUNCTION contracts_keep_accepted() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'accepted' THEN
    RAISE EXCEPTION 'An accepted contract cannot be deleted.';
  END IF;
  RETURN OLD;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER contracts_keep_accepted BEFORE DELETE ON "contracts"
  FOR EACH ROW EXECUTE FUNCTION contracts_keep_accepted();

ALTER TABLE "sales_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;

-- Two starting templates so a new team can draft a contract on day one. Have them reviewed by your
-- own counsel before relying on them; edit them under Sales, Contracts, Templates.
INSERT INTO "contract_templates" ("name", "kind", "body", "updated_at") VALUES (
  'Standard terms',
  'contract',
  $body$SERVICE AGREEMENT

This agreement is made on {{today}} between {{company_name}} ("we", "us") and {{client_name}} {{client_company}} ("you") for the project "{{deal_title}}".

1. Scope
We will deliver the work described in quote {{quote_reference}}:

{{quote_scope}}

Anything outside this scope is quoted and agreed separately in writing.

2. Fees and payment
The total fee is {{quote_total}}. A deposit of {{quote_deposit}} is due when you sign, and the balance of {{quote_balance}} is due on completion.

{{payment_terms}}

3. Your responsibilities
You will give us the information, access and feedback we reasonably need, on time. Delays on your side may move the delivery dates.

4. Ownership
When the fees are paid in full, you own the final deliverables we made for you. We keep our own tools, code libraries and know-how, and may mention the project in our portfolio unless you tell us not to.

5. Confidentiality
Each of us will keep the other's non-public information confidential and use it only for this project.

6. Changes and ending the agreement
Changes to the scope or the fee must be agreed in writing. Either of us may end this agreement with written notice; you pay for the work done up to that date.

7. Liability
Our total liability under this agreement is limited to the fees you paid us for the project.

8. Governing law
This agreement is governed by the laws of the Republic of the Philippines.

Signing this agreement online with your typed name is your electronic signature under the Electronic Commerce Act (Republic Act No. 8792).$body$,
  CURRENT_TIMESTAMP
), (
  'Project scope',
  'sow',
  $body$STATEMENT OF WORK

Project: {{deal_title}}
Client: {{client_name}} {{client_company}}
Prepared by: {{company_name}} on {{today}}
Based on quote: {{quote_reference}}

1. Objective
Describe in a few lines what this project is meant to achieve for the client.

2. Deliverables
{{quote_scope}}

3. Timeline
List the milestones and their target dates here.

4. Responsibilities
We will: deliver the work above, report progress, and raise risks early.
You will: provide content, access and timely feedback, and name one person who can approve work.

5. Acceptance
Each deliverable is accepted when it meets the description above or when you have not raised a written issue within 5 working days of receiving it.

6. Fees
Total: {{quote_total}}. Deposit: {{quote_deposit}}. Balance: {{quote_balance}}.

{{payment_terms}}

Signing this statement online with your typed name is your electronic signature under the Electronic Commerce Act (Republic Act No. 8792).$body$,
  CURRENT_TIMESTAMP
);
