
import { syncLeads } from './dashboard/lib/sync/sync/leads';

// Mock JobManClient
const mockClient = {
  initializeLookups: async () => {},
  getLeads: async () => ({
    leads: {
      data: [
        {
          id: 'lead-1',
          number: 'L-001',
          description: 'Test Lead Project',
          contact_id: 'contact-1',
          contact_person_id: 'person-1',
          lead_status_name: 'New',
          types: [{ name: 'Type A' }],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ]
    }
  }),
  getContactWithDetails: async () => ({ name: 'Test Contact', source: 'Web' }),
  getContactPerson: async () => ({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    mobile: '0987654321'
  }),
  getLeadMembers: async () => ([
    { first_name: 'Alice', last_name: 'Smith' },
    { first_name: 'Bob', last_name: 'Jones' }
  ])
};

// Test function
async function test() {
  console.log('Starting verification...');
  try {
    const result = await syncLeads(mockClient as any);
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Assertions
    const lead = result[0];
    if (lead['Person'] !== 'John Doe') throw new Error('Person mapping failed');
    if (lead['Members'] !== 'Alice Smith, Bob Jones') throw new Error('Members mapping failed');
    if (lead['Project'] !== 'Test Lead Project') throw new Error('Project mapping failed');
    
    console.log('Verification PASSED!');
  } catch (error) {
    console.error('Verification FAILED:', error);
    process.exit(1);
  }
}

test();
