"use client";

import Link from "next/link";
import { FileText, Handshake } from "lucide-react";

import type { Column } from "@/components/dashboard/data-table/data-table";
import { ResourceTable } from "@/components/dashboard/data-table/resource-table";
import { useTableParams } from "@/components/dashboard/data-table/use-table-params";
import { IconTile } from "@/components/dashboard/shared/icon-tile";
import { Person } from "@/components/dashboard/shared/person";
import { formatDate } from "@/lib/format";
import type { Page } from "@/lib/pagination";
import {
  CONTRACT_KINDS,
  CONTRACT_KIND_LABEL,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
} from "../rules/core";
import { CONTRACTS_TABLE } from "../rules/table";
import type { ContractRow } from "../types/core";
import { ContractStatusBadge } from "./contract-status-badge";

const columns: Column<ContractRow>[] = [
  {
    id: "reference",
    header: "Contract",
    sortable: true,
    cell: (contract) => (
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={FileText} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/sales/contracts/${contract.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {contract.reference}
          </Link>
          <p className="text-muted-foreground truncate text-xs">
            {CONTRACT_KIND_LABEL[contract.kind]} · {contract.title}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "deal",
    header: "Deal",
    hideBelow: "md",
    cell: (contract) => (
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={Handshake} />
        <div className="min-w-0">
          <Link
            href={`/dashboard/crm/deals/${contract.dealId}`}
            className="underline-offset-4 hover:underline"
          >
            {contract.dealTitle}
          </Link>
          <Person name={contract.contactName} className="text-muted-foreground mt-0.5 text-xs" />
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (contract) => <ContractStatusBadge status={contract.status} />,
  },
  {
    id: "valid",
    header: "Sign by",
    hideBelow: "lg",
    cell: (contract) =>
      contract.validUntil ? (
        formatDate(contract.validUntil)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "created",
    header: "Made",
    sortable: true,
    hideBelow: "lg",
    cell: (contract) => (
      <span className="text-muted-foreground">{formatDate(contract.createdAt)}</span>
    ),
  },
];

export function ContractsTable({ page }: { page: Page<ContractRow> }) {
  const table = useTableParams(CONTRACTS_TABLE);
  return (
    <ResourceTable
      table={table}
      page={page}
      columns={columns}
      getRowId={(contract) => contract.id}
      caption="Contracts"
      searchLabel="Search contracts"
      searchPlaceholder="Search by number, title, deal or client…"
      filters={[
        {
          id: "status",
          label: "Status",
          allLabel: "Any status",
          options: CONTRACT_STATUSES.map((status) => ({
            value: status,
            label: CONTRACT_STATUS_LABEL[status],
          })),
        },
        {
          id: "kind",
          label: "Type",
          allLabel: "Any type",
          options: CONTRACT_KINDS.map((kind) => ({
            value: kind,
            label: CONTRACT_KIND_LABEL[kind],
          })),
        },
      ]}
      emptyIcon={FileText}
      emptyTitle="No contracts yet"
      emptyDescription="Open a deal with an accepted quote and choose New contract. It appears here once it is drafted."
    />
  );
}
