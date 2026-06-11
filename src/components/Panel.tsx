import type { PropsWithChildren, ReactNode } from "react";

interface PanelProps extends PropsWithChildren {
  title?: string;
  eyebrow?: string;
  aside?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, aside, className, children }: PanelProps) {
  return (
    <section className={`panel ${className ?? ""}`.trim()}>
      {(eyebrow || title || aside) && (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "start",
            marginBottom: "14px",
          }}
        >
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="section-title">{title}</h2> : null}
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

