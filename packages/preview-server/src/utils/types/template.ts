export interface Template {
  (props: Record<string, unknown> | Record<string, never>): React.ReactNode;
  PreviewProps?: Record<string, unknown>;
}

export const isTemplate = (val: unknown): val is Template => {
  return typeof val === 'function';
};
