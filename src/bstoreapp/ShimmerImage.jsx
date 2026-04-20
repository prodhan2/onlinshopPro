import { useEffect, useRef, useState } from 'react';
import { getCachedImage, cacheImage } from './imageCache';
import logo from './assets/images/logo.png';

export default function ShimmerImage({ src, alt, className = '', wrapperClassName = '' }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const timeoutRef = useRef(null);
  const isCachedRef = useRef(false);

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
    setImageSrc(null);
    isCachedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!src) {
      return undefined;
    }

    // Check if it's a WebP image or any other format
    const isWebP = src.toLowerCase().endsWith('.webp') || src.includes('format=webp');
    
    // Try to get from cache first
    const cachedUrl = getCachedImage(src);
    if (cachedUrl) {
      setImageSrc(cachedUrl);
      isCachedRef.current = true;
      setIsLoaded(true);
      return;
    }

    // Set src directly - browser handles WebP, PNG, JPG, GIF, AVIF, etc.
    setImageSrc(src);

    // Cache the image in background for future use
    cacheImage(src).then(cachedUrl => {
      if (cachedUrl && cachedUrl !== src) {
        setImageSrc(cachedUrl);
      }
    }).catch(() => {
      // Silently fail, image already set to original src
    });

    timeoutRef.current = window.setTimeout(() => {
      if (!isCachedRef.current && !isLoaded) {
        // Only mark as error if not already loaded
        if (!imageSrc) {
          setHasError(true);
        }
        setIsLoaded(true);
      }
    }, 9000);

    return () => clearFallbackTimeout();
  }, [src]);

  if (!src) {
    return (
      <div className={`bstore-image-shell is-loaded is-error ${wrapperClassName}`.trim()}>
        <div className="bstore-image-fallback">
          <img src={logo} alt="" className="bstore-image-fallback-logo" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bstore-image-shell ${isLoaded ? 'is-loaded' : ''} ${hasError ? 'is-error' : ''} ${wrapperClassName}`.trim()}>
      {!isLoaded || hasError ? (
        <div className="bstore-image-fallback">
          <img src={logo} alt="" className="bstore-image-fallback-logo" />
        </div>
      ) : null}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className={className}
          loading="lazy"
          onLoad={() => {
            clearFallbackTimeout();
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            clearFallbackTimeout();
            // Don't show error immediately, try fallback
            if (!hasError) {
              setHasError(true);
            }
            setIsLoaded(true);
          }}
        />
      ) : null}
    </div>
  );
}
