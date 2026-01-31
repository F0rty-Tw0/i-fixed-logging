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
import { logStore } from '../../../core/store';
import { LogSeverityId } from '../../../core/types/domain';
import styles from './TailSamplingView.module.css';
import { FilterPanel } from './FilterPanel';
import { LogTooltip } from './LogTooltip';
import { LogGrid } from './LogGrid';

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
      const latency = logStore.metaIndices[physicalIdx];

      // 1. PRIORITY BYPASS: High-signal telemetry bypasses global slider
      if (isError && filters.errors) return true;
      if (isWarn && filters.warnings) return true;
      if (isInfo && filters.sampleInfo && physicalIdx % 20 === 0) return true;

      // 2. SAMPLED TELEMETRY: Subject to the Sampling Density slider
      const bucket = logStore.samplingBuckets[physicalIdx];

      // Slow logs (Latency > 1s)
      if (filters.slow && latency > 1000) {
        return bucket < debouncedSamplingRate;
      }

      // Info logs follow slider when not in forced 5% mode
      if (isInfo && !filters.sampleInfo) {
        return bucket < debouncedSamplingRate;
      }

      return false;
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
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={styles.title}
        >
          Live Traffic Matrix
          <span className={styles.stats}>
            {filteredTotalCount === -1
              ? 'Searching...'
              : `${filteredTotalCount.toLocaleString()} logs`}
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={styles.subtitle}
        >
          High-density telemetry stream. Each cell maps a discrete event across
          the sampling dimension. Standby for signature detection.
        </motion.p>
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
            <div className={styles.emptyIcon}>
              <svg
                width='48'
                height='48'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <circle cx='12' cy='12' r='10'></circle>
                <line x1='12' y1='8' x2='12' y2='12'></line>
                <line x1='12' y1='16' x2='12.01' y2='16'></line>
              </svg>
            </div>
            <p>
              {logStore.getSearchStatus().query
                ? `NO_MATCH: No signatures matching "${logStore.getSearchStatus().query}"`
                : 'NO_SIGNAL: System standing by for incoming telemetry stream...'}
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
