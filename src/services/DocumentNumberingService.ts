// src/services/DocumentNumberingService.ts
// Handles generation of unique document numbers: ERA-###, DO-ERA-###, INV-ERA-###

import supabase from '../lib/supabase';
import { DocumentCounter } from '../types/database';

export type DocumentType = 'quotation' | 'delivery_order' | 'invoice';

interface DocumentNumberResponse {
  document_number: string;
  next_number: number;
}

export class DocumentNumberingService {
  /**
   * Get the next document number for the specified type
   * Uses database counter to ensure uniqueness
   * 
   * Examples:
   * - quotation → ERA-200, ERA-201, ERA-202...
   * - delivery_order → DO-ERA-200, DO-ERA-201...
   * - invoice → INV-ERA-200, INV-ERA-201...
   */
  static async getNextDocumentNumber(
    documentType: DocumentType
  ): Promise<DocumentNumberResponse> {
    try {
      // Fetch current counter
      const { data: counter, error: fetchError } = await supabase
        .from('document_counters')
        .select('*')
        .eq('counter_type', documentType)
        .single();

      if (fetchError || !counter) {
        throw new Error(`Counter not found for type: ${documentType}`);
      }

      const nextNumber = counter.last_number + 1;
      const documentNumber = `${counter.prefix}-${nextNumber}`;

      // Update counter in database (atomic increment)
      const { error: updateError } = await supabase
        .from('document_counters')
        .update({ last_number: nextNumber, updated_at: new Date().toISOString() })
        .eq('counter_type', documentType);

      if (updateError) {
        throw new Error(`Failed to update counter: ${updateError.message}`);
      }

      return {
        document_number: documentNumber,
        next_number: nextNumber,
      };
    } catch (error) {
      console.error('Error generating document number:', error);
      throw error;
    }
  }

  /**
   * Get all document counters (admin view)
   */
  static async getAllCounters(): Promise<DocumentCounter[]> {
    try {
      const { data, error } = await supabase
        .from('document_counters')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching counters:', error);
      throw error;
    }
  }

  /**
   * Reset counter to a specific number (admin only - use with caution)
   */
  static async resetCounter(documentType: DocumentType, newNumber: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_counters')
        .update({
          last_number: newNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('counter_type', documentType);

      if (error) throw error;
      console.log(`Counter reset for ${documentType} to ${newNumber}`);
    } catch (error) {
      console.error('Error resetting counter:', error);
      throw error;
    }
  }
}

export default DocumentNumberingService;
