'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './Placeholders.module.css';

const PlaceholderView: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={styles['placeholder-container']}
  >
    <div className={styles['icon']}>✨</div>
    <h2 className={styles['title']}>{title}</h2>
    <p className={styles['subtitle']}>{subtitle}</p>
  </motion.div>
);

export const StructuredLogsView: React.FC = () => (
  <PlaceholderView
    title='Structured Logs'
    subtitle='Searchable JSON logs with rich context and metadata. Coming soon.'
  />
);

export const DistributedTracingView: React.FC = () => (
  <PlaceholderView
    title='Distributed Tracing'
    subtitle='Visualize end-to-end request flows across microservices. Coming soon.'
  />
);
