'use client';

import React from 'react';
import { VirtualLogList } from '../VirtualLogList';

export const QueueSimulatorView: React.FC = () => {
  return (
    <div className='view-content'>
      <VirtualLogList />
    </div>
  );
};
