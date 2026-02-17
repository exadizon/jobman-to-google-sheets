import axios, { type AxiosInstance } from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';

dotenv.config();

export class JobManClient {
  private client: AxiosInstance;
  private queue: PQueue;
  private orgId: string;
  private contactCache: Map<number, any> = new Map();

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

    // JobMan limit: 50 requests per minute
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

  async getQuotes(page = 1, limit = 50) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/quotes`,
      params: { page, limit },
    });
  }

  async getQuoteDetails(quoteId: number) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/quotes/${quoteId}`,
    });
  }

  async getQuoteSections(quoteId: number) {
      return this.request<any>({
          method: 'GET',
          url: `/organisations/${this.orgId}/quotes/${quoteId}/sections`,
      });
  }

  async getContact(contactId: number) {
    if (this.contactCache.has(contactId)) {
      return this.contactCache.get(contactId);
    }
    const contact = await this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/contacts/${contactId}`,
    });
    this.contactCache.set(contactId, contact);
    return contact;
  }

  async getLeads(page = 1, limit = 50) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/leads`,
      params: { page, limit },
    });
  }

  async getJobs(page = 1, limit = 50) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/jobs`,
      params: { page, limit },
    });
  }

  async getInvoices(page = 1, limit = 50) {
    return this.request<any>({
      method: 'GET',
      url: `/organisations/${this.orgId}/invoices`,
      params: { page, limit },
    });
  }
}
