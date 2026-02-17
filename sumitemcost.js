// Use this node after "GET Components"
// It sums up the material, labour, etc. for ONE specific item
return $input.all().map((item, index) => {
  let material = 0, labour = 0, service = 0, appliance = 0;

  // 1. Get components array
  const components = item.json.quote_section_item_components || (Array.isArray(item.json) ? item.json : []);

  // 2. Sum them up
  for (const comp of components) {
    const cost = parseFloat(comp.cost) || 0;
    
    // Access properties using bracket notation to avoid TS linter warnings
    let type = (comp['catalogue_item_type'] || comp['type'] || '').toLowerCase();
    const name = (comp['name'] || '').toLowerCase();

    // Fallback: Keyword matching on the Name if type is missing/generic
    if (!type) {
      if (name.includes('freight') || name.includes('delivery') || name.includes('design')) {
        type = 'service';
      } else if (name.includes('install') || name.includes('assembly') || name.includes('labour')) {
        type = 'labour';
      } else if (name.includes('oven') || name.includes('sink') || name.includes('tap') || name.includes('appliance')) {
        type = 'appliance';
      } else {
        type = 'material';
      }
    }

    if (type.includes('material')) material += cost;
    else if (type.includes('labour')) labour += cost;
    else if (type.includes('service')) service += cost;
    else if (type.includes('appliance')) appliance += cost;
  }

  // 3. RECOVER THE QUOTE ID (The Join Key)
  let quoteId = null;
  
  // Try checking the item JSON directly first
  if (item.json.quote_id) {
    quoteId = item.json.quote_id;
  } 
  // Try looking back at the PREVIOUS node (flattenItems) using explicit node reference
  else {
    try {
      // This is the most reliable way in n8n to get data from a previous node in a linear flow
      // We use the current index to match the item
      const parentData = $("flattenItems").item.json;
      quoteId = parentData.quote_id || parentData.parent_quote_id;
    } catch (e) {
      // Ignore error if node reference fails
    }
  }

  return {
    json: {
      quote_id: quoteId, 
      material_cost: material,
      labour_cost: labour,
      service_cost: service,
      appliance_cost: appliance
    }
  };
});