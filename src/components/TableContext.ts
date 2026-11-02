import { createContext } from 'react';
import type { TableColumn, ViewPrefs } from '@/domain/types';
export const TableContext = createContext<{ columns: TableColumn[]; coloration: NonNullable<ViewPrefs['tableColoration']>; freeze: Record<string, number> } | null>(null);
