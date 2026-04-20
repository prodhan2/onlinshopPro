import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { FiArrowLeft, FiChevronRight, FiGrid, FiSearch, FiShoppingCart } from 'react-icons/fi';
import ShimmerImage from './bstoreapp/ShimmerImage';
import { createCategory, createProduct, splitProductImages } from './bstoreapp/models';
import { db } from './firebase';
import './category-page.css';

export default function CategoryPage({ onBackHome, onOpenCart, onOpenProduct }) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const nextCategories = snapshot.docs
        .map((doc) => createCategory({ _docId: doc.id, ...doc.data() }))
        .filter((item) => item.name);
      setCategories(nextCategories);
    });

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const nextProducts = snapshot.docs
        .map((doc) => createProduct({ _docId: doc.id, ...doc.data() }))
        .filter((item) => item.name);
      setProducts(nextProducts);
      setLoading(false);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const selectedCategoryItem = useMemo(
    () => categories.find((item) => item.id === selectedCategory) || categories[0] || null,
    [categories, selectedCategory],
  );

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = !selectedCategoryItem || product.categoryId === selectedCategoryItem.id;
      const matchesQuery = !query
        || product.name.toLowerCase().includes(query)
        || String(product.description || '').toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, searchTerm, selectedCategoryItem]);

  const categoryGroups = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      total: products.filter((product) => product.categoryId === category.id).length,
    }));
  }, [categories, products]);

  return (
    <section className="category-browser-page">
      <header className="category-browser-topbar">
        <button type="button" className="category-browser-icon" onClick={onBackHome}>
          <FiArrowLeft />
        </button>
        <h1>Categories</h1>
        <div className="category-browser-actions">
          <button type="button" className="category-browser-icon">
            <FiSearch />
          </button>
          <button type="button" className="category-browser-icon" onClick={onOpenCart}>
            <FiShoppingCart />
          </button>
        </div>
      </header>

      <div className="category-browser-layout">
        <aside className="category-browser-sidebar">
          {categoryGroups.map((category) => {
            const icon = category.iconUrl;
            const isActive = category.id === selectedCategoryItem?.id;

            return (
              <button
                key={category.id}
                type="button"
                className={`category-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="category-sidebar-thumb">
                  {icon ? (
                    <ShimmerImage
                      src={icon}
                      alt={category.name}
                      className="category-sidebar-thumb-image"
                      wrapperClassName="category-sidebar-thumb-shell"
                    />
                  ) : (
                    <span className="category-sidebar-fallback">
                      {category.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="category-sidebar-label">{category.name}</span>
                <small className="category-sidebar-count">{category.total}</small>
              </button>
            );
          })}
        </aside>

        <div className="category-browser-content">
          <div className="category-browser-search">
            <FiSearch />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search in ${selectedCategoryItem?.name || 'categories'}`}
            />
          </div>

          <div className="category-browser-hero">
            <div>
              <p className="category-browser-kicker">Smart Category View</p>
              <h2>{selectedCategoryItem?.name || 'Category'}</h2>
              <p>
                Browse products in a cleaner two-panel layout. Tap any product to open the details page.
              </p>
            </div>
            <div className="category-browser-badge">
              <FiGrid />
              <span>{filteredProducts.length} items</span>
            </div>
          </div>

          {loading ? (
            <div className="category-browser-grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="category-product-card is-loading" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="category-browser-empty">
              <h3>No items found</h3>
              <p>Try another category or search term.</p>
            </div>
          ) : (
            <>
              <div className="category-browser-section-head">
                <h3>{selectedCategoryItem?.name}</h3>
                <button type="button" className="category-browser-link">
                  Explore More <FiChevronRight />
                </button>
              </div>

              <div className="category-browser-grid">
                {filteredProducts.map((product) => {
                  const firstImage = splitProductImages(product)[0];
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className="category-product-card"
                      onClick={() => onOpenProduct?.(product)}
                    >
                      <div className="category-product-image">
                        {firstImage ? (
                          <ShimmerImage
                            src={firstImage}
                            alt={product.name}
                            className="category-product-image-element"
                            wrapperClassName="category-product-image-shell"
                          />
                        ) : (
                          <div className="category-product-fallback">{product.name.slice(0, 1).toUpperCase()}</div>
                        )}
                      </div>
                      <span className="category-product-name">{product.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
