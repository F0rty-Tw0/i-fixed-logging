'use client';

import React from 'react';
import styles from './Placeholders.module.css';

const PlaceholderView: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
  <div className={styles['placeholder-container']}>
    <div className={styles['icon']}>✨</div>
    <h2 className={styles['title']}>{title}</h2>
    <p className={styles['subtitle']}>{subtitle}</p>
  </div>
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
