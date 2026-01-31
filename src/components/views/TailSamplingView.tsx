'use client';
'use no memo';

import {
  useRef,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { logStore } from '../../core/store';
import { LogSeverityId } from '../../core/types/domain';
import styles from './TailSamplingView.module.css';
import { FilterPanel } from './TailSamplingView/FilterPanel';
import { LogTooltip } from './TailSamplingView/LogTooltip';
import { LogGrid } from './TailSamplingView/LogGrid';

// Stable function references for useSyncExternalStore
const subscribeToStore = (cb: () => void) => logStore.subscribe(cb);
const getTailSamplingSnapshot = () => logStore.getTailSamplingData();
const INITIAL_TAIL_SAMPLING_DATA = {
  severities: new Uint8Array(0),
  logIndices: new Int32Array(0),
} as const;
const getServerTailSamplingSnapshot = () => INITIAL_TAIL_SAMPLING_DATA;

export const TailSamplingView = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Filter state
  const [filters, setFilters] = useState({
    errors: true,
    warnings: true,
    slow: true,
    sampleInfo: true,
  });
  const [samplingRate, setSamplingRate] = useState(100);
  const [debouncedSamplingRate, setDebouncedSamplingRate] = useState(100);

  // Debounce sampling rate updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSamplingRate(samplingRate);
    }, 300);
    return () => clearTimeout(handler);
  }, [samplingRate]);

  // Subscribe to log store updates to get tail sampling data
  const { severities, logIndices } = useSyncExternalStore(
    subscribeToStore,
    getTailSamplingSnapshot,
    getServerTailSamplingSnapshot,
  );

  // Helper to check visibility based on all filters
  const isLogVisible = useCallback(
    (sevId: number, physicalIdx: number) => {
      const isError =
        sevId === LogSeverityId.CRITICAL || sevId === LogSeverityId.ERROR;
      const isWarn = sevId === LogSeverityId.WARN;
      const isInfo = sevId === LogSeverityId.INFO;

      let isVisible = false;

      // Check Type Filters
      if (isError && filters.errors) isVisible = true;
      if (isWarn && filters.warnings) isVisible = true;

      // Check Slow Filter
      if (filters.slow) {
        const latency = logStore.metaIndices[physicalIdx];
        if (latency > 1000) isVisible = true;
      }

      // Check Info Filter
      if (isInfo) {
        if (!filters.sampleInfo) {
          isVisible = true;
        } else if (physicalIdx % 20 === 0) {
          isVisible = true;
        }
      }

      // Apply Global Sampling on top of everything
      if (isVisible) {
        const bucket = logStore.samplingBuckets[physicalIdx];
        if (bucket >= debouncedSamplingRate) {
          isVisible = false;
        }
      }

      return isVisible;
    },
    [filters, debouncedSamplingRate],
  );

  // Derive hovered log from current store state and hovered index
  const hoveredLog = useMemo(() => {
    if (hoveredIndex === null) return null;

    // Bounds check
    if (hoveredIndex < 0 || hoveredIndex >= severities.length) return null;

    const physicalIdx = logIndices[hoveredIndex];
    const sevId = severities[hoveredIndex];

    // Ensure it's visible based on current filters
    if (!isLogVisible(sevId, physicalIdx)) {
      return null;
    }

    return logStore.getSnapshotByPhysicalIndex(physicalIdx);
  }, [hoveredIndex, severities, logIndices, isLogVisible]);

  // Calculate column count
  const columnCount = useMemo(
    () => Math.ceil(severities.length / 15),
    [severities.length],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    horizontal: true,
    count: columnCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 16, // 14px + 2px gap
    overscan: 20,
  });

  // Auto-scroll to the latest column
  useEffect(() => {
    if (columnCount > 0) {
      virtualizer.scrollToIndex(columnCount - 1, { align: 'end' });
    }
  }, [columnCount, virtualizer]);

  // Calculate filtered count
  // Stable getSnapshot for filtered count - needs to be memoized since it depends on filters
  const getFilteredCountSnapshot = useCallback(
    () =>
      logStore.getFilteredCount({
        ...filters,
        samplingRate: debouncedSamplingRate,
      }),
    [filters, debouncedSamplingRate],
  );
  const getServerFilteredCountSnapshot = useCallback(() => 0, []);

  const filteredTotalCount = useSyncExternalStore(
    subscribeToStore,
    getFilteredCountSnapshot,
    getServerFilteredCountSnapshot,
  );

  const handleSquareEnter = (e: React.MouseEvent, index: number) => {
    // Check if visible before showing tooltip
    const sevId = severities[index];
    const physicalIdx = logIndices[index];

    if (!isLogVisible(sevId, physicalIdx)) {
      return;
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.right + 10, y: rect.top });
    setHoveredIndex(index);
  };

  const handleSquareLeave = () => {
    setHoveredIndex(null);
  };

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.container}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>
          Live Traffic Matrix:{' '}
          <span className={styles.stats}>
            {filteredTotalCount === -1
              ? 'Searching...'
              : `${filteredTotalCount.toLocaleString()} logs`}
          </span>
        </h2>

        <p className={styles.subtitle}>
          Each square represents a single log. The grid fills 15x down, then
          moves to the next column. Hover for details.
        </p>
      </div>

      <FilterPanel
        filters={filters}
        toggleFilter={toggleFilter}
        samplingRate={samplingRate}
        setSamplingRate={setSamplingRate}
        setDebouncedSamplingRate={setDebouncedSamplingRate}
      />

      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        {severities.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💎</span>
            <p>
              {logStore.getSearchStatus().query
                ? `No logs matching "${logStore.getSearchStatus().query}"`
                : 'Waiting for incoming logs...'}
            </p>
          </div>
        )}
        <LogGrid
          severities={severities}
          logIndices={logIndices}
          virtualizer={virtualizer}
          isLogVisible={isLogVisible}
          onSquareEnter={handleSquareEnter}
          onSquareLeave={handleSquareLeave}
        />
      </div>

      <LogTooltip hoveredLog={hoveredLog} tooltipPos={tooltipPos} />
    </motion.div>
  );
};
