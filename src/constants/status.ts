export const ORDER_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress', 
  READY: 'ready',
  DONE: 'done'
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];