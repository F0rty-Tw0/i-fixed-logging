'use client';

import React from 'react';
import { motion } from 'framer-motion';

const PlaceholderView: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '400px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '24px',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      margin: '2rem 0',
      textAlign: 'center',
      padding: '2rem',
    }}
  >
    <div
      style={{
        fontSize: '3rem',
        marginBottom: '1rem',
        filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))',
      }}
    >
      ✨
    </div>
    <h2
      style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '0.5rem',
      }}
    >
      {title}
    </h2>
    <p style={{ color: 'rgba(255, 255, 255, 0.5)', maxWidth: '400px' }}>
      {subtitle}
    </p>
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
