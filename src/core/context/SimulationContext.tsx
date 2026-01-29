'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSimulation, SimulationControls } from '../hooks/useSimulation';

const SimulationContext = createContext<SimulationControls | undefined>(
  undefined,
);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const simulation = useSimulation();
  return (
    <SimulationContext.Provider value={simulation}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulationContext = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error(
      'useSimulationContext must be used within a SimulationProvider',
    );
  }
  return context;
};
