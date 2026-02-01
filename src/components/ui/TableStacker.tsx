'use client';

import { useEffect, useState } from 'react';

// A lightweight client utility that converts tables with `data-stack="true"`
// into stacked card lists on small screens. It will replace the table with
// a responsive card column when viewport width <= 640px and restore the
// original table when the viewport is larger.

export default function TableStacker() {
  const [hasMounted, setHasMounted] = useState(false);

  // Wait for hydration to complete before enabling DOM manipulation
  useEffect(() => {
    // Use requestAnimationFrame to ensure we're past the hydration phase
    const rafId = requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    // Don't run until after hydration is complete
    if (!hasMounted) return;

    const mq = window.matchMedia('(max-width: 640px)');

    function apply() {
      const tables = Array.from(
        document.querySelectorAll('table[data-stack="true"]'),
      ) as HTMLTableElement[];
      tables.forEach((table, idx) => {
        const wrapperId = `stacked-${idx}`;
        if (mq.matches) {
          // build cards
          const thead = Array.from(table.querySelectorAll('thead th')).map(
            (th) => th.textContent?.trim() || '',
          );
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          const container = document.createElement('div');
          container.className = 'stacked-cards space-y-6 p-5';
          container.id = wrapperId;

          rows.forEach((tr, rowIndex) => {
            const cells = Array.from(tr.querySelectorAll('td'));
            const card = document.createElement('div');
            card.className =
              'card card-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
            card.setAttribute('role', 'listitem');
            card.setAttribute('tabindex', '0');

            // Use first column as the visible heading for the card when available
            const firstCell = cells[0];
            if (firstCell) {
              const headingId = `${wrapperId}-heading-${rowIndex}`;
              const h = document.createElement('h3');
              h.id = headingId;
              h.className = 'text-sm font-semibold mb-2 text-card-foreground';
              h.innerHTML = firstCell.innerHTML;
              card.appendChild(h);
              card.setAttribute('aria-labelledby', headingId);
            }

            // Render the rest of the cells as label/value pairs. Skip index 0
            // because it is used as the card heading above.
            cells.forEach((td, i) => {
              if (i === 0) return;
              const label = thead[i] || '';
              const rowItem = document.createElement('div');
              rowItem.className = 'flex justify-between text-sm mb-1';
              const spanLabel = document.createElement('div');
              spanLabel.className = 'text-muted-foreground text-xs';
              spanLabel.textContent = label;
              const spanValue = document.createElement('div');
              spanValue.className = 'text-card-foreground font-medium';
              spanValue.innerHTML = td.innerHTML;
              rowItem.appendChild(spanLabel);
              rowItem.appendChild(spanValue);
              card.appendChild(rowItem);
            });
            container.appendChild(card);
          });

          // Hide original table and insert container
          table.style.display = 'none';
          if (!document.getElementById(wrapperId)) {
            table.parentNode?.insertBefore(container, table.nextSibling);
          }
        } else {
          // restore
          const existing = document.getElementById(wrapperId);
          if (existing) existing.remove();
          table.style.display = '';
        }
      });
    }

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [hasMounted]);

  return null;
}
