import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/ui';

interface DisclosureProps {
  /** Short, descriptive summary shown on the closed row. */
  summary: string;
  /** Optional supporting line under the summary label. */
  hint?: string;
  /** Optional count badge, e.g. number of items inside. */
  count?: number;
  defaultOpen?: boolean;
  /** Only mount the contents once opened (for charts and heavy content). */
  lazy?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Progressive disclosure built on native <details>/<summary>, so it is
 * keyboard accessible, screen-reader friendly and works without JavaScript
 * beyond the open/close behavior the browser already provides.
 */
export const Disclosure: React.FC<DisclosureProps> = ({
  summary,
  hint,
  count,
  defaultOpen = false,
  lazy = false,
  className,
  children,
}) => {
  const [opened, setOpened] = useState(defaultOpen);

  return (
    <details
      className={cn('disclosure group', className)}
      open={defaultOpen}
      onToggle={event => setOpened((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span className="min-w-0">
          <span className="block text-sm">{summary}</span>
          {hint && <span className="mt-0.5 block text-xs font-normal text-silver">{hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {typeof count === 'number' && (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] font-medium text-silver">
              {count}
            </span>
          )}
          <ChevronRight
            className="h-4 w-4 text-silver transition-transform duration-200 group-open:rotate-90"
            aria-hidden="true"
          />
        </span>
      </summary>
      {(!lazy || opened) && <div className="disclosure-body">{children}</div>}
    </details>
  );
};

export default Disclosure;
