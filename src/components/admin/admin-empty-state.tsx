// Kopiert fra Photon: apps/kvark/src/components/admin-empty-state.tsx
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AdminEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Optional actions (buttons, links) rendered below the description. */
  children?: ReactNode;
};

/**
 * Consistent empty / placeholder state for admin sections — used both for
 * "nothing here yet" tables and for pages whose backend endpoint does not
 * exist yet.
 */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  children,
}: AdminEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
