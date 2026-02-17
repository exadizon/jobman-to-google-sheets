import axios, { type AxiosInstance } from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';

dotenv.config();

export class JobManClient {
  private client: AxiosInstance;
  private queue: PQueue;
  private orgId: string;
  
  private contactCache: Map<string, any> = new Map();
  private typeCache: Map<string, string> = new Map();
  private sourceCache: Map<string, string> = new Map();

  constructor() {
    const apiKey = process.env.JOBMAN_API_KEY;
    this.orgId = process.env.JOBMAN_ORG_ID || '';

    if (!apiKey || !this.orgId) {
      throw new Error('JOBMAN_API_KEY and JOBMAN_ORG_ID must be set in .env');
    }

    this.client = axios.create({
      baseURL: 'https://api.jobmanapp.com/api/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.queue = new PQueue({ intervalCap: 45, interval: 60000 });
  }

  private async request<T>(config: any): Promise<T> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error: any) {
        throw error;
      }
    }) as Promise<T>;
  }

  async initializeLookups() {
    console.log('🔄 Loading Contact Types and Sources into cache...');
    
    // Correcting to /contacts/types
    const types: any = await this.request({ 
      method: 'GET', 
      url: `/organisations/${this.orgId}/contacts/types` 
    });
    const typeList = types.data || types.contact_types?.data || [];
    typeList.forEach((t: any) => this.typeCache.set(t.id, t.name));

    // Correcting to /contacts/sources
    const sources: any = await this.request({ 
      method: 'GET', 
      url: `/organisations/${this.orgId}/contacts/sources` 
    });
    const sourceList = sources.data || sources.contact_sources?.data || [];
    sourceList.forEach((s: any) => this.sourceCache.set(s.id, s.name));
    
    console.log(`✅ Cached ${this.typeCache.size} types and ${this.sourceCache.size} sources.`);
  }

  async getQuotes(page = 1, limit = 50) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/quotes`,
      params: { page, limit },
    });
  }

  async getQuoteDetails(quoteId: string) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/quotes/${quoteId}`,
    });
  }

  async getContactWithDetails(contactId: string) {
    if (this.contactCache.has(contactId)) {
      return this.contactCache.get(contactId);
    }
    
    const response: any = await this.request({
      method: 'GET',
      url: `/organisations/${this.orgId}/contacts/${contactId}`,
    });
    
    const contact = response.data || response.contact || response;
    
    const detailedContact = {
        name: contact.name || contact.display_name || 'Unknown',
        type: this.typeCache.get(contact.contact_type_id) || '',
        source: this.sourceCache.get(contact.contact_source_id) || ''
    };
    
    this.contactCache.set(contactId, detailedContact);
    return detailedContact;
  }

  // Adding getters for Leads, Jobs, Invoices for later use
  async getLeads(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/leads`, params: { page, limit } });
  }
  async getJobs(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/jobs`, params: { page, limit } });
  }
  async getInvoices(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/invoices`, params: { page, limit } });
  }
}
