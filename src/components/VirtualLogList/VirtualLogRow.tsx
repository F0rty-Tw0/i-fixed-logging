import React from 'react';
import clsx from 'clsx';
import { VirtualItem } from '@tanstack/react-virtual';
import styles from './VirtualLogList.module.css';
import { LogCell } from './LogCell';

interface VirtualLogRowProps {
  virtualItem: VirtualItem;
  measureElement?: (element: Element | null | undefined) => void;
  absIndex: number;
  isExpanded: boolean;
  toggleExpand: (index: number) => void;
  gridTemplateColumns: string;
  columns: string[];
  getItem: (column: string) => unknown;
  getRowData?: () => Record<string, unknown>; // Optional full row data for expanded view
}

export const VirtualLogRow: React.FC<VirtualLogRowProps> = React.memo(
  ({
    virtualItem,
    measureElement,
    absIndex,
    isExpanded,
    toggleExpand,
    gridTemplateColumns,
    columns,
    getItem,
    getRowData,
  }) => {
    // Safety check
    if (absIndex < 0) {
      return (
        <div
          ref={measureElement}
          className={clsx(styles['log-row-wrapper'], styles['virtual-item'])}
          style={{
            transform: `translate3d(0, ${virtualItem.start}px, 0)`,
            willChange: 'transform',
            height: virtualItem.size,
          }}
        />
      );
    }

    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        ref={measureElement}
        className={clsx(styles['log-row-wrapper'], styles['virtual-item'], {
          [styles['expanded']]: isExpanded,
        })}
        style={{
          transform: `translate3d(0, ${virtualItem.start}px, 0)`,
          willChange: 'transform',
        }}
      >
        <div
          className={clsx(styles['log-row'])}
          onClick={() => toggleExpand(virtualItem.index)}
          style={{ gridTemplateColumns }}
        >
          {columns.map((col, idx) => (
            <div key={`${col}-${idx}`} className={styles.cell}>
              <LogCell col={col} value={getItem(col)} />
            </div>
          ))}
        </div>
        {isExpanded && getRowData && (
          <div className={styles['details-panel']}>
            <div className={styles['details-header']}>EVENT DETAILS</div>
            <pre className={styles['json-view']}>
              {JSON.stringify(getRowData(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.absIndex === next.absIndex &&
      prev.isExpanded === next.isExpanded &&
      prev.virtualItem.start === next.virtualItem.start &&
      prev.gridTemplateColumns === next.gridTemplateColumns &&
      prev.columns === next.columns // shallow compare array ref usually enough if stable
    );
  },
);

VirtualLogRow.displayName = 'VirtualLogRow';
