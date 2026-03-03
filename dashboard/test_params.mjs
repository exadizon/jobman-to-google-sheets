import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function testParam(params) {
    const url = `https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`, Accept: 'application/json' }});
    if (res.ok) {
        const data = await res.json();
        console.log(`Params: ${params} -> Total: ${data.meta?.total || data.quotes?.meta?.total}`);
    } else {
        console.log(`Params: ${params} -> HTTP ${res.status}`);
    }
}

(async () => {
    await testParam('page=1&limit=1');
    await testParam('page=1&limit=1&trashed=false');
    await testParam('page=1&limit=1&trashed=0');
    await testParam('page=1&limit=1&deleted=false');
    await testParam('page=1&limit=1&deleted=0');
    await testParam('page=1&limit=1&is_deleted=0');
    await testParam('page=1&limit=1&active=true');
    await testParam('page=1&limit=1&status=active');
    
    // Testing specific filters
    const filters = [
        [{ property: "deleted_at", operator: "=", value: null }],
        [{ property: "deleted_at", operator: "is null" }],
        [{ property: "deleted", value: 0 }],
        [{ property: "is_deleted", value: 0 }]
    ];
    for (const f of filters) {
        await testParam(`page=1&limit=1&filter=${encodeURIComponent(JSON.stringify(f))}`);
    }
})();
