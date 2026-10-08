export async function startCamera({ getUserMedia, video, facingMode, setStream, setActive, isCurrent = () => true }) {
  let stream;
  try {
    stream = await getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (!isCurrent()) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    if (!video) throw new Error('Elemen video kamera tidak tersedia');
    video.srcObject = stream;
    setStream(stream);
    setActive(true);
    return stream;
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (isCurrent()) {
      if (video) video.srcObject = null;
      setStream(null);
      setActive(false);
      throw error;
    }
    return null;
  }
}

export function createCameraController({ setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
  let generation = 0;
  let restartTimer = null;
  let restartToken = 0;

  const invalidate = () => {
    generation += 1;
    restartToken += 1;
    if (restartTimer !== null) {
      clearTimeoutFn(restartTimer);
      restartTimer = null;
    }
  };

  return {
    start(options) {
      const currentGeneration = ++generation;
      return startCamera({
        ...options,
        isCurrent: () => currentGeneration === generation,
      });
    },
    stop(options) {
      invalidate();
      stopCamera(options);
    },
    scheduleRestart(start) {
      if (restartTimer !== null) clearTimeoutFn(restartTimer);
      const scheduledGeneration = generation;
      const scheduledToken = ++restartToken;
      restartTimer = setTimeoutFn(() => {
        restartTimer = null;
        if (scheduledGeneration === generation && scheduledToken === restartToken) start();
      }, 100);
    },
    invalidate,
  };
}

export function stopCamera({ stream, video, setStream, setActive }) {
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
  setStream(null);
  setActive(false);
}
