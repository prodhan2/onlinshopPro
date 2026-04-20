import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { createProduct, getDiscountedUnitPrice } from '../bstoreapp/models';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import logo from '../bstoreapp/assets/images/logo.png';
import './SearchPage.css';

export default function SearchPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), snap => {
      setProducts(snap.docs.map(d => createProduct(d.data())));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [query, products]);

  return (
    <div className="search-page">
      {/* App Bar */}
      <div className="search-appbar">
        <button className="search-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <div className="search-input-wrapper">
          <FiSearch className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="search-input-clear" onClick={() => setQuery('')}>
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="search-body">
        <img src={logo} alt="" className="search-watermark" />
        {loading ? (
          <div className="search-loading">Loading...</div>
        ) : !query.trim() ? (
          <div className="search-empty">
            <FiSearch className="search-empty-icon" />
            <p>Type to search products</p>
          </div>
        ) : results.length === 0 ? (
          <div className="search-empty">
            <FiSearch className="search-empty-icon" />
            <p>No results for "<strong>{query}</strong>"</p>
          </div>
        ) : (
          <div className="search-results">
            <p className="search-count">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map(product => {
              const image = product.image ? product.image.split(',')[0]?.trim() : product.imageUrl;
              const price = getDiscountedUnitPrice(product);
              return (
                <button
                  key={product.id}
                  className="search-result-item"
                  onClick={() => navigate('/details', { state: { product } })}
                >
                  <div className="search-result-img">
                    <ShimmerImage src={image} alt={product.name} className="search-result-img-el" />
                  </div>
                  <div className="search-result-info">
                    <p className="search-result-name">{product.name}</p>
                    <p className="search-result-desc">{product.description}</p>
                    <div className="search-result-price">
                      <span className="search-result-price-current">৳{price.toFixed(0)}</span>
                      {product.discount > 0 && (
                        <span className="search-result-price-old">৳{Number(product.price || product.unitPrice).toFixed(0)}</span>
                      )}
                      {product.discount > 0 && (
                        <span className="search-result-badge">{product.discount}% off</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
