import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

(async () => {
    try {
        const res = await fetch(`https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes/7c16f163-f7f9-4b64-be6b-029a7c72999e`, {
          headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`, Accept: 'application/json' }
        });
        const data = await res.json();
        const q = data.quote || data;
        
        console.log('--- Detail Properties ---');
        console.log(Object.keys(q));
        console.log('deleted_at:', q.deleted_at);
        console.log('is_archived:', q.is_archived);
        console.log('archived:', q.archived);
        console.log('status:', q.quote_status_name);
        console.log('active:', q.active);
    } catch (e) {
        console.error(e);
    }
})();
