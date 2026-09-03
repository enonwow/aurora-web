export interface AreaDraftSaveQueue {
  hasPending(sceneId: string): boolean;
  enqueue<TResult>(
    sceneId: string,
    save: () => Promise<TResult>
  ): Promise<TResult>;
}

export function createAreaDraftSaveQueue(): AreaDraftSaveQueue {
  const tails = new Map<string, Promise<void>>();

  return {
    hasPending(sceneId: string): boolean {
      return tails.has(sceneId);
    },
    enqueue<TResult>(sceneId: string, save: () => Promise<TResult>): Promise<TResult> {
      const previous = tails.get(sceneId) ?? Promise.resolve();
      const result = previous.catch(() => undefined).then(save);
      const tail = result.then(
        () => undefined,
        () => undefined
      );
      tails.set(sceneId, tail);
      void tail.then(() => {
        if (tails.get(sceneId) === tail) {
          tails.delete(sceneId);
        }
      });
      return result;
    }
  };
}
