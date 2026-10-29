import type { ReactNode } from "react";

export const PageHeader = ({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) => (
    <div className="flex flex-col gap-4 border-b border-secondary pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
            <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
            <p className="text-md text-tertiary">{description}</p>
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
    </div>
);
