/**
 * 🔍 SEO Utilities
 */

export interface SEOData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

/**
 * Update page meta tags for SEO
 */
export const updateSEO = (data: SEOData) => {
  // Update title
  if (data.title) {
    document.title = data.title;
    
    // Update meta title
    let metaTitle = document.querySelector('meta[property="og:title"]');
    if (!metaTitle) {
      metaTitle = document.createElement('meta');
      metaTitle.setAttribute('property', 'og:title');
      document.head.appendChild(metaTitle);
    }
    metaTitle.setAttribute('content', data.title);
  }

  // Update description
  if (data.description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', data.description);

    // Update OG description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', data.description);
  }

  // Update image
  if (data.image) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', data.image);
  }

  // Update URL
  if (data.url) {
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', data.url);
  }

  // Update type
  if (data.type) {
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      document.head.appendChild(ogType);
    }
    ogType.setAttribute('content', data.type);
  }
};

/**
 * Generate structured data (JSON-LD) for product
 */
export const generateProductStructuredData = (product: {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  stock: number;
  sku?: string;
  category?: { name: string };
}) => {
  const images = Array.isArray(product.images) 
    ? product.images 
    : typeof product.images === 'string' 
      ? JSON.parse(product.images || '[]') 
      : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: images,
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'EGP',
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      ...(product.comparePrice && {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
  };
};

/**
 * Add structured data to page
 */
export const addStructuredData = (data: object) => {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
};

