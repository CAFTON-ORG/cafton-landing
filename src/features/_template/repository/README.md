# repository/

Data access, one file per area (`orders.ts`). Every file starts with `import "server-only";`. Reads return plain serialisable data; scope by owner or permission here so a forgotten check upstream cannot leak rows.
