#serpapi
`curl -X POST http://localhost:3000/api/search/profiles-serpapi -H "Content-Type: application/json" -d '{"region": "San Francisco", "company_sector": "software", "get_all_pages": true}' `

````curl -X POST http://localhost:3000/api/search/profiles-serpapi \
  -H "Content-Type: application/json" \
  -d '{
    "region": "San Francisco",
    "company_sector": "software",
    "company_type": "startup",
    "company_size": "early stage",
    "num_results": 100,
    "get_all_pages": true
  }'```


#google search api
```curl -X POST http://localhost:3000/api/search/profiles -H "Content-Type: application/json" -d '{"region": "San Francisco", "company_sector": "software", "get_all_pages": true}'```
````

csv
