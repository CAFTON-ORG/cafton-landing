-- Built-in role for whoever writes the website's content (permissions come from code).
INSERT INTO "roles" ("key", "name", "description", "is_system") VALUES
  ('editor', 'Content Editor', 'Writes and publishes the website''s blog, portfolio, events and partners. Cannot delete content.', true);
