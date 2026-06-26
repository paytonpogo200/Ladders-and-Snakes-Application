export type DebouncedRefresh = (() => void) & { cancel: () => void };

export function createDebouncedRefresh(callback: () => void | Promise<void>, delay = 180): DebouncedRefresh {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = (() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void callback();
    }, delay);
  }) as DebouncedRefresh;

  refresh.cancel = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };

  return refresh;
}
