// src/services/ProductService.ts
// Handles all product-related operations including pricing and stock

import supabase from '../lib/supabase';
import { Product, ProductWithStock, ProductDiopterRange, CustomerPrice } from '../types/database';

export class ProductService {
  /**
   * Get all active products
   */
  static async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'Active')
        .is('deleted_at', null)
        .order('sku', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID with stock and pricing info
   */
  static async getProductById(productId: string, customerId?: string): Promise<ProductWithStock | null> {
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .is('deleted_at', null)
        .single();

      if (productError) throw productError;
      if (!product) return null;

      // Get diopter ranges if diopter-based
      let diopter_ranges: ProductDiopterRange[] = [];
      if (product.is_diopter_based) {
        const { data: ranges, error: rangesError } = await supabase
          .from('product_diopter_ranges')
          .select('*')
          .eq('product_id', productId);

        if (!rangesError && ranges) {
          diopter_ranges = ranges;
        }
      }

      // Get total stock
      const { data: stockData, error: stockError } = await supabase
        .from('stock_entries')
        .select('quantity')
        .eq('product_id', productId);

      const total_stock = stockError
        ? 0
        : (stockData || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Get customer price if provided
      let customer_price: number | undefined;
      if (customerId) {
        const { data: priceData, error: priceError } = await supabase
          .from('customer_prices')
          .select('unit_price')
          .eq('customer_id', customerId)
          .eq('product_id', productId)
          .single();

        if (!priceError && priceData) {
          customer_price = priceData.unit_price;
        }
      }

      return {
        ...(product as Product),
        diopter_ranges,
        total_stock,
        customer_price,
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  /**
   * Get diopter ranges for a product
   */
  static async getProductDiopterRanges(productId: string): Promise<ProductDiopterRange[]> {
    try {
      const { data, error } = await supabase
        .from('product_diopter_ranges')
        .select('*')
        .eq('product_id', productId)
        .order('min_diopter', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching diopter ranges:', error);
      throw error;
    }
  }

  /**
   * Get unit price for a product (considers customer price first)
   * Fallback: customer price → master price (cost + markup)
   */
  static async getUnitPrice(
    productId: string,
    customerId?: string
  ): Promise<number> {
    try {
      // Try customer price first
      if (customerId) {
        const { data: priceData, error: priceError } = await supabase
          .from('customer_prices')
          .select('unit_price')
          .eq('customer_id', customerId)
          .eq('product_id', productId)
          .single();

        if (!priceError && priceData) {
          return priceData.unit_price;
        }
      }

      // Fall back to master price (cost + markup)
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('cost_price, markup_percentage')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      const masterPrice = product.cost_price * (1 + product.markup_percentage / 100);
      return masterPrice;
    } catch (error) {
      console.error('Error calculating unit price:', error);
      throw error;
    }
  }

  /**
   * Set custom price for a customer
   */
  static async setCustomerPrice(
    customerId: string,
    productId: string,
    unitPrice: number,
    notes?: string
  ): Promise<CustomerPrice> {
    try {
      const { data, error } = await supabase
        .from('customer_prices')
        .upsert(
          [
            {
              customer_id: customerId,
              product_id: productId,
              unit_price: unitPrice,
              notes,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'customer_id,product_id' }
        )
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to set customer price');

      return data as CustomerPrice;
    } catch (error) {
      console.error('Error setting customer price:', error);
      throw error;
    }
  }

  /**
   * Get all products with diopter-based flag
   */
  static async getDiopterBasedProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_diopter_based', true)
        .eq('status', 'Active')
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching diopter products:', error);
      throw error;
    }
  }

  /**
   * Get all non-diopter products
   */
  static async getNonDiopterProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_diopter_based', false)
        .eq('status', 'Active')
        .is('deleted_at', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching non-diopter products:', error);
      throw error;
    }
  }

  /**
   * Search products by SKU or name
   */
  static async searchProducts(query: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'Active')
        .is('deleted_at', null)
        .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
        .order('sku', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
}

export default ProductService;
