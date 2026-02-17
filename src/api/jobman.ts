import axios, { type AxiosInstance } from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';

dotenv.config();

export class JobManClient {
  public client: AxiosInstance;
  private queue: PQueue;
  public orgId: string;
  
  private contactCache: Map<string, any> = new Map();
  private typeCache: Map<string, string> = new Map();
  private sourceCache: Map<string, string> = new Map();
  private leadCache: Map<string, any> = new Map();
  private jobCache: Map<string, any> = new Map();

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

    this.queue = new PQueue({ intervalCap: 30, interval: 60000 });
  }

  public async request<T>(config: any, retryCount = 0): Promise<T> {
    return this.queue.add(async () => {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 429 && retryCount < 3) {
            const waitTime = (error.response.headers['retry-after'] || 30) * 1000;
            console.warn(`⚠️ Rate limited. Waiting ${waitTime/1000}s...`);
            await new Promise(res => setTimeout(res, waitTime));
            return this.request(config, retryCount + 1);
        }
        throw error;
      }
    }) as Promise<T>;
  }

  async initializeLookups() {
    console.log('🔄 Loading Lookup Tables...');
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
  async getLeads(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/leads`, params: { page, limit } });
  }
  async getJobs(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/jobs`, params: { page, limit } });
  }
  async getInvoices(page = 1, limit = 50) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/invoices`, params: { page, limit } });
  }
  async getInvoiceDetails(invoiceId: string) {
    return this.request<any>({ method: 'GET', url: `/organisations/${this.orgId}/invoices/${invoiceId}` });
  }
  async getInvoicePayments(invoiceId: string) {
    try {
        const response: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/invoices/${invoiceId}/payments` });
        return response.data || response.invoice_payments || [];
    } catch (e) { return []; }
  }

  async getLeadDetails(leadId: string) {
    if (this.leadCache.has(leadId)) return this.leadCache.get(leadId);
    const response: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/leads/${leadId}` });
    const data = response.data || response.lead || response;
    this.leadCache.set(leadId, data);
    return data;
  }

  async getJobDetails(jobId: string) {
    if (this.jobCache.has(jobId)) return this.jobCache.get(jobId);
    const response: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/jobs/${jobId}` });
    const data = response.data || response.job || response;
    this.jobCache.set(jobId, data);
    return data;
  }

  async getContactWithDetails(contactId: string) {
    if (this.contactCache.has(contactId)) return this.contactCache.get(contactId);
    try {
        const response: any = await this.request({ method: 'GET', url: `/organisations/${this.orgId}/contacts/${contactId}` });
        const contact = response.data || response.contact || response;
        const detailedContact = {
            name: contact.name || contact.display_name || 'Unknown',
            type: this.typeCache.get(contact.contact_type_id) || '',
            source: this.sourceCache.get(contact.contact_source_id) || ''
        };
        this.contactCache.set(contactId, detailedContact);
        return detailedContact;
    } catch (e) { return { name: 'Unknown', type: '', source: '' }; }
  }
}
