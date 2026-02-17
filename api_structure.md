
Goal Automate JobMan Export to GoogleSheet

### JobMan Data: Quotes
What is in quotes endpoint
https://api-docs.jobmanapp.com/#quotes

GET /api/v1/organisations/{organisationId}/quotes

``` json

    "quotes": {
        "data": [
            {
                "id": "54ee63e9-6ed0-4864-b06b-7325f1eb0d50",
                "number": "2203-002/01",
                "description": null,
                "organisation_id": "33b928af-f0b5-42f9-ae2f-48dba38929ca",
                "quote_status_id": "efd6c63a-b74c-4884-aba0-4b5566286f0f",
                "contact_id": "8a0d7b5a-723a-4070-bdd1-13802b931cd7",
                "template_id": "396618aa-5c15-4fae-b11b-8fd3cc4ea971",
                "contact_person_id": "56ca3581-52ab-470c-af97-02ff92674d5e",
                "date": "2022-03-04T00:00:00.000000Z",
                "expiry_date": "2022-04-03T00:00:00.000000Z",
                "totals_calculated": false,
                "created_at": "2022-03-04T06:32:27.000000Z",
                "updated_at": "2022-03-04T06:32:27.000000Z",
            }
                    {
                "id": "54ee63e9-6ed0-4864-b06b-7325f1eb0d50",
                "number": "2203-002/02",
                "description": null,
                "organisation_id": "33b928af-f0b5-42f9-ae2f-48dba38929ca",
                "quote_status_id": "efd6c63a-b74c-4884-aba0-4b5566286f0f",
                "contact_id": "8a0d7b5a-723a-4070-bdd1-13802b931cd7",
                "template_id": "396618aa-5c15-4fae-b11b-8fd3cc4ea971",
                "contact_person_id": "56ca3581-52ab-470c-af97-02ff92674d5e",
                "date": "2022-03-04T00:00:00.000000Z",
                "expiry_date": "2022-04-03T00:00:00.000000Z",
                "totals_calculated": false,
                "created_at": "2022-03-04T06:32:27.000000Z",
                "updated_at": "2022-03-04T06:32:27.000000Z",
            }
        ]
    }

```

Needed Fields:

|        |             |         |              |                |        |      |             |      |               |             |              |                |          |         |          |            |          |     |       |            |              |         |         |                                 |        |
| ------ | ----------- | ------- | ------------ | -------------- | ------ | ---- | ----------- | ---- | ------------- | ----------- | ------------ | -------------- | -------- | ------- | -------- | ---------- | -------- | --- | ----- | ---------- | ------------ | ------- | ------- | ------------------------------- | ------ |
| Number | Description | Contact | Contact Type | Contact Source | Status | Date | Expiry Date | Cost | Material Cost | Labour Cost | Service Cost | Appliance Cost | Overhead | Wastage | Discount | Discount % | Subtotal | Tax | Total | Net Profit | Net Profit % | Created | Updated | Jobman job no. / other comments | quotes |
|        |             |         |              |                |        |      |             |      |               |             |              |                |          |         |          |            |          |     |       |            |              |         |         |                                 |        |

Workarounds I found

To get material cost, labour cost, service cost, appliance cost: I need to access this:

https://api-docs.jobmanapp.com/#quotes-sections

GET /api/v1/organisations/{organisationId}/quotes/{quoteId}/sections

```json
{
  "quote_sections": [
    {
      "id": "9eeca875-832e-4e96-bf54-c2f1ebccd2d0",
      "quote_id": "54ee63e9-6ed0-4864-b06b-7325f1eb0d50",
      "name": "Section 1",
      "tax_type_id": null,
      "style_id": null,
      "items": [
        {
          "id": "c816be9c-80af-4852-80bb-1b2d945275c4",
          "quote_id": "54ee63e9-6ed0-4864-b06b-7325f1eb0d50",
          "quote_section_id": "9eeca875-832e-4e96-bf54-c2f1ebccd2d0",
          "lead_item_id": null,
          "name": "Kitchen",
          "description": null,
          "tax_type_id": null,
          "style_id": null,
          "quantity": 1,
          "cost": "1407.5200",
          "overhead": "140.7520",
          "overhead_percent": "10.0000",
          "wastage": "70.3760",
          "wastage_percent": "5.0000",
          "profit": "179.8500",
          "profit_percent": "10.0000",
          "discount": "0.0000",
          "discount_percent": "0.0000",
          "subtotal": "1798.4980",
          "tax": "179.8499",
          "total": "1978.3479",
          "sort_order": 1,
          "created_at": "2025-05-16T04:08:16.000000Z",
          "updated_at": "2025-05-22T06:05:35.000000Z",
          "remove_product_labour": null
        }
      ],
      "cost": "1407.5200",
      "overhead": "140.7520",
      "overhead_percent": "10.0000",
      "wastage": "70.3760",
      "wastage_percent": "5.0000",
      "profit": "179.8500",
      "profit_percent": "10.0000",
      "discount": "0.0000",
      "discount_percent": "0.0000",
      "subtotal": "1798.4980",
      "tax": "179.8499",
      "total": "1978.3479",
      "sort_order": 1,
      "created_at": "2023-10-11T05:26:14.000000Z",
      "updated_at": "2023-10-11T06:03:01.000000Z",
      "remove_product_labour": null
    },
    {
      "id": "34bdb391-4e91-4339-8fc7-78e4001246f5",
      "quote_id": "54ee63e9-6ed0-4864-b06b-7325f1eb0d50",
      "name": "Section 2",
      "tax_type_id": null,
      "style_id": null,
      "items": [],
      "cost": "0.0000",
      "overhead": "0.0000",
      "overhead_percent": "0.0000",
      "wastage": "0.0000",
      "wastage_percent": "0.0000",
      "profit": "0.0000",
      "profit_percent": "0.0000",
      "discount": "0.0000",
      "discount_percent": "0.0000",
      "subtotal": "0.0000",
      "tax": "0.0000",
      "total": "0.0000",
      "sort_order": 2,
      "created_at": "2023-10-11T05:54:42.000000Z",
      "updated_at": "2023-10-11T05:54:42.000000Z",
      "remove_product_labour": null
    }
  ]
}
```

And further down here:

https://api-docs.jobmanapp.com/#quotes-section-item-components

`GET /api/v1/organisations/{organisationId}/quotes/{quoteId}/items/{quoteSectionItemId}/components`

```
{
  "quote_section_item_components": [
    {
      "id": "a83e6bfe-aac7-4450-bffd-955afb85dd53",
      "name": "Component A",
      "quantity": 1,
      "cost": 12.9,
      "overhead": "1.2900",
      "overhead_percent": 10,
      "wastage": "0.6450",
      "wastage_percent": 5,
      "profit": "1.6484",
      "profit_percent": "10.0004",
      "discount": "0.0000",
      "discount_percent": "0.0000",
      "subtotal": "16.4834",
      "tax": "1.6484",
      "total": "18.1318",
      "created_at": "2023-10-11T06:58:58.000000Z",
      "updated_at": "2023-10-11T06:58:58.000000Z"
    },
    {
      "id": "bba3cf3e-9fbe-4819-bb99-7c1f283360b7",
      "name": "Component B",
      "quantity": 1,
      "cost": 12.9,
      "overhead": "1.2900",
      "overhead_percent": 10,
      "wastage": "0.6450",
      "wastage_percent": 5,
      "profit": "1.6484",
      "profit_percent": "10.0004",
      "discount": "0.0000",
      "discount_percent": "0.0000",
      "subtotal": "16.4834",
      "tax": "1.6483",
      "total": "18.1317",
      "created_at": "2023-10-11T06:58:58.000000Z",
      "updated_at": "2023-10-11T06:58:58.000000Z"
    },
    {
      "id": "42cd8afe-80de-417d-937e-c94412736ba2",
      "name": "Component C",
      "quantity": 1,
      "cost": 6.72,
      "overhead": "0.6720",
      "overhead_percent": 10,
      "wastage": "0.3360",
      "wastage_percent": 5,
      "profit": "0.8587",
      "profit_percent": "10.0003",
      "discount": "0.0000",
      "discount_percent": "0.0000",
      "subtotal": "8.5867",
      "tax": "0.8587",
      "total": "9.4454",
      "created_at": "2023-10-11T06:58:58.000000Z",
      "updated_at": "2023-10-11T06:58:58.000000Z"
    }
  ]
}
```
