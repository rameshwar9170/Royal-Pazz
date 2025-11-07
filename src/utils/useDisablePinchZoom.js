import { useEffect } from 'react';

const useDisablePinchZoom = () => {
  useEffect(() => {
    const disablePinchZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const disableGestures = (e) => {
      e.preventDefault();
    };

    // Prevent multi-touch gestures
    document.addEventListener('touchstart', disablePinchZoom, { passive: false });
    document.addEventListener('touchmove', disablePinchZoom, { passive: false });
    document.addEventListener('touchend', disablePinchZoom, { passive: false });
    
    // Prevent iOS Safari gestures
    document.addEventListener('gesturestart', disableGestures, { passive: false });
    document.addEventListener('gesturechange', disableGestures, { passive: false });
    document.addEventListener('gestureend', disableGestures, { passive: false });

    return () => {
      document.removeEventListener('touchstart', disablePinchZoom);
      document.removeEventListener('touchmove', disablePinchZoom);
      document.removeEventListener('touchend', disablePinchZoom);
      document.removeEventListener('gesturestart', disableGestures);
      document.removeEventListener('gesturechange', disableGestures);
      document.removeEventListener('gestureend', disableGestures);
    };
  }, []);
};

export default useDisablePinchZoom;
