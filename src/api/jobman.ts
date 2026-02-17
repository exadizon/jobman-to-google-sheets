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

    // Slowed down to 30/min to be extremely safe during deep dives
    this.queue = new PQueue({ intervalCap: 30, interval: 60000 });
  }

  private async request<T>(config: any, retryCount = 0): Promise<T> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 429 && retryCount < 3) {
            const waitTime = (error.response.headers['retry-after'] || 30) * 1000;
            console.warn(`⚠️ Rate limited. Waiting ${waitTime/1000}s then retrying (Attempt ${retryCount + 1})...`);
            await new Promise(res => setTimeout(res, waitTime));
            return this.request(config, retryCount + 1);
        }
        if (error.response) {
            console.error(`❌ API Error ${error.response.status} on ${config.url}`);
        }
        throw error;
      }
    }) as Promise<T>;
  }

  async initializeLookups() {
    console.log('🔄 Loading Contact Types and Sources into cache...');
    const types: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/contacts/types` });
    const typeList = types.data || types.contact_types?.data || types.contact_types || [];
    typeList.forEach((t: any) => this.typeCache.set(t.id, t.name));

    const sources: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/contacts/sources` });
    const sourceList = sources.data || sources.contact_sources?.data || sources.contact_sources || [];
    sourceList.forEach((s: any) => this.sourceCache.set(s.id, s.name));
  }

  async getQuotes(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/quotes`, params: { page, limit } });
  }

  async getQuoteDetails(quoteId: string) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/quotes/${quoteId}` });
  }

  async getQuoteSectionsWithItems(quoteId: string) {
    const response: any = await this.request({
        method: 'GET',
        url: `/organisations/${this.orgId}/quotes/${quoteId}/sections`,
        params: { include: 'items' }
    });
    return response.quote_sections?.data || response.data || [];
  }

  async getQuoteItemComponents(quoteId: string, itemId: string) {
      const response: any = await this.request({
          method: 'GET',
          url: `/organisations/${this.orgId}/quotes/${quoteId}/items/${itemId}/components`
      });
      return response.quote_section_item_components?.data || response.data || [];
  }

  async getContactWithDetails(contactId: string) {
    if (this.contactCache.has(contactId)) return this.contactCache.get(contactId);
    try {
        const response: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/contacts/${contactId}` });
        const contact = response.data || response.contact || response;
        const detailedContact = {
            name: contact.name || contact.display_name || 'Unknown',
            type: this.typeCache.get(contact.contact_type_id) || '',
            source: this.sourceCache.get(contact.contact_source_id) || this.sourceCache.get(contact.source_id) || ''
        };
        this.contactCache.set(contactId, detailedContact);
        return detailedContact;
    } catch (e) {
        return { name: 'Unknown', type: '', source: '' };
    }
  }
}
