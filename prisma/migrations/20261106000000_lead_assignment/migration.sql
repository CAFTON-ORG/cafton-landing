-- Round-robin lead assignment: staff who take a turn at new website enquiries.
-- Off by default, so nothing changes until someone is chosen under Users.
ALTER TABLE "profiles" ADD COLUMN "takes_leads" BOOLEAN NOT NULL DEFAULT false;
