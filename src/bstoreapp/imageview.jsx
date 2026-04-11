import { useEffect, useState } from 'react';
import ShimmerImage from './ShimmerImage';

export default function FullScreenImageView({ images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex(index => Math.min(index + 1, images.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex(index => Math.max(index - 1, 0));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, onClose]);

  if (!images?.length) {
    return null;
  }

  return (
    <div className="bstore-modal" onClick={onClose}>
      <div className="bstore-modal__frame" onClick={event => event.stopPropagation()}>
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
              onClick={() => setCurrentIndex(index => Math.max(index - 1, 0))}
              disabled={currentIndex === 0}
            >
              Prev
            </button>
            <button
              className="bstore-icon-button"
              type="button"
              onClick={() => setCurrentIndex(index => Math.min(index + 1, images.length - 1))}
              disabled={currentIndex === images.length - 1}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
