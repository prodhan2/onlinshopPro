import { useEffect, useRef, useState } from 'react';

export default function ShimmerImage({ src, alt, className = '', wrapperClassName = '' }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef(null);

  function clearFallbackTimeout() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => {
    clearFallbackTimeout();
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!src) {
      return undefined;
    }

    timeoutRef.current = window.setTimeout(() => {
      setHasError(true);
      setIsLoaded(true);
    }, 9000);

    return () => clearFallbackTimeout();
  }, [src]);

  if (!src) {
    return (
      <div className={`bstore-image-shell is-loaded is-error ${wrapperClassName}`.trim()}>
        <div className="bstore-image-fallback">No image</div>
      </div>
    );
  }

  return (
    <div className={`bstore-image-shell ${isLoaded ? 'is-loaded' : ''} ${hasError ? 'is-error' : ''} ${wrapperClassName}`.trim()}>
      {hasError ? <div className="bstore-image-fallback">Image unavailable</div> : null}
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          onLoad={() => {
            clearFallbackTimeout();
            setIsLoaded(true);
          }}
          onError={() => {
            clearFallbackTimeout();
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      ) : null}
    </div>
  );
}
