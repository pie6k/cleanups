import { describe, expect, it, vi } from 'vitest';

import { createCleanup } from './index';

describe('cleanup', () => {
  it('calls cleanup members', () => {
    const cleanup = createCleanup();

    const callback = vi.fn();

    cleanup.next = callback;

    cleanup();

    expect(callback).toHaveBeenCalled();

    cleanup();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('allows re-adding the same callback', () => {
    const cleanup = createCleanup();

    const callback = vi.fn();

    cleanup.next = callback;

    cleanup();

    expect(callback).toHaveBeenCalled();

    cleanup.next = callback;

    cleanup();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('in once mode - will warn about adding items after cleaning up', () => {
    const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const cleanup = createCleanup({ once: true });

    cleanup();

    cleanup.next = vi.fn();

    expect(console.warn).toHaveBeenCalled();

    consoleWarnMock.mockRestore();
  });

  it('in once mode - will not add new items after cleaning up and not call them', () => {
    const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cleanup = createCleanup({ once: true });

    const callback = vi.fn();

    cleanup.next = callback;

    cleanup();

    expect(callback).toHaveBeenCalled();

    cleanup.next = vi.fn();

    expect(console.warn).toHaveBeenCalledTimes(1);

    cleanup();

    expect(console.warn).toHaveBeenCalledTimes(2);

    expect(callback).toHaveBeenCalledTimes(1);

    consoleWarnMock.mockRestore();
  });

  it('properly handles cleanup.wasCalled', () => {
    const cleanup = createCleanup();

    expect(cleanup.wasCalled).toBe(false);

    cleanup();

    expect(cleanup.wasCalled).toBe(true);
  });

  it('calls cleanups in proper order', () => {
    const cleanup = createCleanup();

    const calls: string[] = [];

    cleanup.next = () => calls.push('first');
    cleanup.next = () => calls.push('second');
    cleanup.next = () => calls.push('third');

    cleanup();

    expect(calls).toEqual(['first', 'second', 'third']);
  });

  it('will not call callback that is added while cleaning up', () => {
    const cleanup = createCleanup();

    const cleanupAddedWhileCleaningUp = vi.fn();

    cleanup.next = () => (cleanup.next = cleanupAddedWhileCleaningUp);

    cleanup();

    expect(cleanupAddedWhileCleaningUp).not.toHaveBeenCalled();

    cleanup();

    expect(cleanupAddedWhileCleaningUp).toHaveBeenCalled();
  });

  it('allows assigning falsy values to cleanup', () => {
    const cleanup = createCleanup();

    cleanup.next = null;
    cleanup.next = undefined;
    cleanup.next = false;

    cleanup();
  });

  it('should warn when adding non falsy value that is not a function', () => {
    const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const cleanup = createCleanup();

    // @ts-expect-error - testing invalid value
    cleanup.next = 'not a function';

    expect(console.warn).toHaveBeenCalled();

    consoleWarnMock.mockRestore();
  });

  it('will call all callbacks even if some of them throws', () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cleanup = createCleanup();

    const callback1 = vi.fn();
    const callback2 = vi.fn(() => {
      throw new Error('Test error');
    });
    const callback3 = vi.fn();

    cleanup.next = callback1;
    cleanup.next = callback2;
    cleanup.next = callback3;

    cleanup();

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    expect(callback3).toHaveBeenCalled();

    expect(console.error).toHaveBeenCalled();

    consoleErrorMock.mockRestore();
  });

  it('will pass this context to cleanup functions', () => {
    const cleanup = createCleanup();

    const callback = vi.fn(function (this: unknown) {
      return this;
    });

    cleanup.next = callback;

    cleanup.call('foo');

    expect(callback).toHaveReturnedWith('foo');
  });

  it('will pass this context to cleanup functions when specified in options', () => {
    const cleanup = createCleanup({ thisArg: 'bar' });

    const callback = vi.fn(function (this: unknown) {
      return this;
    });

    cleanup.next = callback;

    cleanup.call('foo');

    expect(callback).toHaveReturnedWith('bar');
  });
});
