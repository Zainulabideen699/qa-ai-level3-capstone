import { APIRequestContext } from '@playwright/test';

export interface ProductCategory {
  usertype: {
    usertype: string;
  };
  category: string;
}

export interface ProductItem {
  id: number;
  name: string;
  price: string;
  brand: string;
  category: ProductCategory;
}

export interface BrandItem {
  id: number;
  brand: string;
}

export interface ProductsApiResponse {
  status: number;
  responseCode: number;
  products: ProductItem[];
  rawBody: any;
}

export interface BrandsApiResponse {
  status: number;
  responseCode: number;
  brands: BrandItem[];
  rawBody: any;
}

export interface SearchProductApiResponse {
  status: number;
  responseCode: number;
  products: ProductItem[];
  message?: string;
  rawBody: any;
}

/**
 * Products and Brands API helper for Automation Exercise backend endpoints.
 * Interacts with /api/productsList, /api/brandsList, and /api/searchProduct.
 */
export class ProductsApi {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Retrieve all products from GET /api/productsList.
   */
  async getProductsList(): Promise<ProductsApiResponse> {
    const response = await this.request.get('/api/productsList');
    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      products: body.products || [],
      rawBody: body,
    };
  }

  /**
   * Search for products via POST /api/searchProduct.
   */
  async searchProduct(searchTerm?: string): Promise<SearchProductApiResponse> {
    const formData: Record<string, string> = {};
    if (searchTerm !== undefined) {
      formData.search_product = searchTerm;
    }

    const response = await this.request.post('/api/searchProduct', {
      form: formData,
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      products: body.products || [],
      message: body.message,
      rawBody: body,
    };
  }

  /**
   * Retrieve all brands from GET /api/brandsList.
   */
  async getBrandsList(): Promise<BrandsApiResponse> {
    const response = await this.request.get('/api/brandsList');
    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      brands: body.brands || [],
      rawBody: body,
    };
  }
}

// Re-export alias matching docs/traceability.md convention
export { ProductsApi as ProductsApiClient };
export { parseJsonResponse } from './apiHelper';
