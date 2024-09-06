interface CleanupOptions {
  once?: boolean;
  thisArg?: unknown;
}

const $cleanups = Symbol('cleanups');
const $wasCalled = Symbol('wasCalled');
const $options = Symbol('options');

export type Falsy = false | 0 | '' | null | undefined;
type AnyFunction = (...args: unknown[]) => unknown;
type FunctionWithProps<F extends AnyFunction, Props> = F & Props;

type CleanupHolder = FunctionWithProps<
  () => void,
  {
    [$cleanups]: Set<Cleanup>;
    [$wasCalled]?: true;
    [$options]?: CleanupOptions;
  }
>;

export type Cleanup = () => void;
export type MaybeCleanup = Cleanup | void;

export type CleanupObject = FunctionWithProps<
  () => void,
  {
    next?: MaybeCleanup | Falsy;
    readonly wasCalled: boolean;
  }
>;

const proxyHandler: ProxyHandler<CleanupHolder> = {
  set(target, key, cleanupToAdd: MaybeCleanup) {
    if (key !== 'next') {
      return Reflect.set(target, key, cleanupToAdd);
    }

    if (!cleanupToAdd) return true;

    if (typeof cleanupToAdd !== 'function') {
      console.warn('Cleanup must be a function');
      return true;
    }

    if (target[$wasCalled] && target[$options]?.once) {
      console.warn('Cleanup already called when adding new cleanup (ignoring)');
      return true;
    }

    target[$cleanups].add(cleanupToAdd);

    return true;
  },
  get(target, prop) {
    if (prop === 'wasCalled') {
      return !!target[$wasCalled];
    }

    return Reflect.get(target, prop);
  },
  apply(target, thisArg) {
    if (target[$options]?.once && target[$wasCalled]) {
      console.warn('Cleanup already called');
      return;
    }

    if (target[$options]?.thisArg) {
      thisArg = target[$options].thisArg;
    }

    target[$wasCalled] = true;

    const cleanups = [...target[$cleanups]];
    target[$cleanups].clear();

    for (const cleanup of cleanups) {
      try {
        cleanup.call(thisArg);
      } catch (error) {
        console.error('Error while cleaning up', error);
      }
    }
  },
};

/**
 * Useful for cases when we have to clean multiple things in effects.
 *
 * ```ts
 * useEffect(() => {
 *   const cleanup = createCleanup();
 *
 *   cleanup.next = createTimeout();
 *   cleanup.next = createEvent();
 *
 *   return cleanup;
 * })
 */
export function createCleanup(options?: CleanupOptions): CleanupObject {
  const holder: CleanupHolder = (() => void 0) as CleanupHolder;

  holder[$cleanups] = new Set();
  if (options) {
    holder[$options] = options;
  }

  const clean = new Proxy(holder, proxyHandler);

  return clean as unknown as CleanupObject;
}
