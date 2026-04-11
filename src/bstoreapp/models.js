export function parseNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const cleaned = String(value ?? '').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createBannerItem(json = {}) {
  const rawImageUrl = (
    json['Image URL']
    ?? json.imageUrl
    ?? json.imageURL
    ?? json.ImageURL
    ?? json.image
    ?? ''
  );

  const normalizedShowRaw = json.Show ?? json.show;

  return {
    imageUrl: String(rawImageUrl).trim(),
    description: json.Description ?? json.description ?? '',
    show: normalizedShowRaw === undefined
      ? true
      : String(normalizedShowRaw).toUpperCase() === 'TRUE' || normalizedShowRaw === true || String(normalizedShowRaw) === '1',
  };
}

export function createCategory(json = {}) {
  return {
    id: json.CategoryID ?? json.id ?? '',
    name: json.Name ?? json.name ?? '',
    iconUrl: json.IconURL ?? json.iconUrl ?? '',
  };
}

export function createProduct(json = {}) {
  return {
    id: json.ID ?? json.id ?? '',
    name: json.Name ?? json.name ?? '',
    description: json.Description ?? json.description ?? '',
    image: json.Images ?? json.image ?? '',
    price: json.Price ?? json.price ?? '0',
    discount: json.Discount ?? json.discount ?? '0',
    stock: json.Stock ?? json.stock ?? '0',
    categoryId: json.CategoryID ?? json.categoryId ?? '',
    rating: json.Rating ?? json.rating ?? '0',
  };
}

export function toBannerJson(item) {
  return {
    'Image URL': item.imageUrl,
    Description: item.description,
    Show: item.show,
  };
}

export function toCategoryJson(item) {
  return {
    CategoryID: item.id,
    Name: item.name,
    IconURL: item.iconUrl,
  };
}

export function toProductJson(item) {
  return {
    ID: item.id,
    Name: item.name,
    Description: item.description,
    Images: item.image,
    Price: item.price,
    Discount: item.discount,
    Stock: item.stock,
    CategoryID: item.categoryId,
    Rating: item.rating,
  };
}

export function createCartItem(product, quantity = 1) {
  return {
    product,
    quantity,
  };
}

export function getDiscountedUnitPrice(product) {
  const base = parseNumber(product?.price);
  const discount = parseNumber(product?.discount);
  return base - (base * discount) / 100;
}

export function getCartItemTotal(item) {
  return getDiscountedUnitPrice(item.product) * item.quantity;
}

export function splitProductImages(product) {
  return String(product?.image ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
