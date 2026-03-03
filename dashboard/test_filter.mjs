import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
(async () => {
    const filters = [
        [], // no filter
        [{ property: "deleted_at", operator: "IS NULL" }], 
        [{ property: "is_archived", value: 0 }],
        [{ property: "active", value: 1 }],
        [{ property: "deleted", value: 0 }]
    ];
    for (const f of filters) {
        const url = `https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes?page=1&limit=1&filter=${JSON.stringify(f)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`, Accept: 'application/json' }});
        if (res.ok) {
            const data = await res.json();
            console.log(`Filter: ${JSON.stringify(f)} -> Total: ${data.meta?.total || data.quotes?.meta?.total}`);
        } else {
            console.log(`Filter: ${JSON.stringify(f)} -> HTTP ${res.status}`);
        }
    }
})();
