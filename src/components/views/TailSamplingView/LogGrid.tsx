'use client';

import React from 'react';
import clsx from 'clsx';
import { LogSeverityId } from '../../../core/types/domain';
import styles from './LogGrid.module.css';

import { Virtualizer } from '@tanstack/react-virtual';

interface LogGridProps {
  severities: Uint8Array;
  logIndices: Int32Array;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  isLogVisible: (sevId: number, physicalIdx: number) => boolean;
  onSquareEnter: (e: React.MouseEvent, index: number) => void;
  onSquareLeave: () => void;
  displayLength: number;
}

export const LogGrid: React.FC<LogGridProps> = ({
  severities,
  logIndices,
  virtualizer,
  isLogVisible,
  onSquareEnter,
  onSquareLeave,
  displayLength,
}) => {
  const getSquareClass = (sevId: number, physicalIdx: number) => {
    const isVisible = isLogVisible(sevId, physicalIdx);

    const isError =
      sevId === LogSeverityId.CRITICAL || sevId === LogSeverityId.ERROR;
    const isWarn = sevId === LogSeverityId.WARN;
    const isInfo = sevId === LogSeverityId.INFO;

    let baseClass = styles['sq-default'];
    if (isError) baseClass = styles['sq-error'];
    else if (isWarn) baseClass = styles['sq-warn'];
    else if (isInfo) baseClass = styles['sq-info'];

    return clsx(
      styles.square,
      baseClass,
      isVisible ? styles['sq-visible'] : styles['sq-dimmed'],
    );
  };

  return (
    <div
      className={styles.virtualTrack}
      style={{
        width: `${virtualizer.getTotalSize()}px`,
      }}
    >
      {virtualizer.getVirtualItems().map((virtualColumn) => {
        const startIdx = virtualColumn.index * 15;
        const columnSeverities = Array.from(
          severities.subarray(startIdx, startIdx + 15),
        );

        const columnPhysicalIndices = logIndices.subarray(
          startIdx,
          startIdx + 15,
        );

        return (
          <div
            key={virtualColumn.key}
            className={styles.virtualColumn}
            style={{
              transform: `translateX(${virtualColumn.start}px)`,
            }}
          >
            {columnSeverities.map((sevId, rowIdx) => {
              const actualIndex = startIdx + rowIdx;
              const physicalIdx = columnPhysicalIndices[rowIdx];

              // Only render if within the damped display length
              if (actualIndex >= displayLength) {
                return (
                  <div
                    key={rowIdx}
                    className={clsx(styles.square, styles['sq-hidden'])}
                  />
                );
              }

              return (
                <div
                  key={rowIdx}
                  className={getSquareClass(sevId, physicalIdx)}
                  onMouseEnter={(e) => onSquareEnter(e, actualIndex)}
                  onMouseLeave={onSquareLeave}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
