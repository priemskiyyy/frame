const rethrowLater = <TThrown>(error: TThrown) => {
  queueMicrotask(() => {
    throw error;
  });
};

export const isolate = (listener: () => void | Promise<void>) => {
  try {
    Promise.resolve(listener()).catch(rethrowLater);
  } catch (error) {
    rethrowLater(error);
  }
};
