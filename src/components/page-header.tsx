import * as React from "react";

export function PageHeader({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  /** Kurze Meta-/Datensatzanzahl-Zeile — steht rechts neben der Überschrift (spart eine UI-Zeile). */
  count?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-navy">{title}</h1>
          {count ? <span className="text-sm font-normal text-muted">{count}</span> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
