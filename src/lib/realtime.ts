export type DebouncedRefresh = (() => void) & { cancel: () => void };

export function createDebouncedRefresh(callback: () => void | Promise<void>, delay = 180): DebouncedRefresh {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let pending = false;

  const refresh = (() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      if (inFlight) {
        pending = true;
        return;
      }
      inFlight = true;
      try {
        await callback();
      } finally {
        inFlight = false;
        if (pending) {
          pending = false;
          refresh();
        }
      }
    }, delay);
  }) as DebouncedRefresh;

  refresh.cancel = () => {
    pending = false;
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };

  return refresh;
}
