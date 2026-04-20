import { useEffect, useRef, useState } from 'react';
import ShimmerImage from './ShimmerImage';

export default function FullScreenImageView({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex(index => (index + 1) % images.length);
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex(index => (index - 1 + images.length) % images.length);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, onClose]);

  if (!images?.length) {
    return null;
  }

  function goPrev() {
    setCurrentIndex(index => (index - 1 + images.length) % images.length);
  }

  function goNext() {
    setCurrentIndex(index => (index + 1) % images.length);
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
    touchEndXRef.current = touchStartXRef.current;
  }

  function handleTouchMove(event) {
    touchEndXRef.current = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
  }

  function handleTouchEnd() {
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(deltaX) < 45 || images.length <= 1) {
      return;
    }

    if (deltaX > 0) {
      goNext();
    } else {
      goPrev();
    }
  }

  return (
    <div className="bstore-modal" onClick={onClose}>
      <div
        className="bstore-modal__frame"
        onClick={event => event.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className="bstore-icon-button bstore-modal__close" type="button" onClick={onClose}>
          x
        </button>

        <div className="bstore-modal__counter">
          {currentIndex + 1}/{images.length}
        </div>

        <ShimmerImage
          src={images[currentIndex]}
          alt={`Preview ${currentIndex + 1}`}
          className="bstore-modal__image"
          wrapperClassName="bstore-modal-image-shell"
        />

        {images.length > 1 ? (
          <div className="bstore-modal__controls">
            <button
              className="bstore-icon-button"
              type="button"
              onClick={goPrev}
            >
              Prev
            </button>
            <button
              className="bstore-icon-button"
              type="button"
              onClick={goNext}
            >
              Next
            </button>
          </div>
        ) : null}

        {images.length > 1 ? (
          <div className="bstore-modal__controls">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                className="bstore-icon-button"
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to image ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
