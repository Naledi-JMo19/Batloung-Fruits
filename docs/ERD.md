# Batloung Fruits – ERD and system diagrams

## Entity Relationship Diagram
```mermaid
erDiagram
    PROVINCES ||--o{ SUPPLIERS : "located in"
    PROVINCES ||--o{ FRUIT_SOURCE_PROVINCES : "source for"
    FRUITS ||--o{ FRUIT_SOURCE_PROVINCES : "sourced from"
    FRUITS ||--o{ PRODUCTS : "sold as"
    BOX_SIZES ||--o{ PRODUCTS : "packed as"
    PRODUCTS ||--|| STOCK : "has"
    SUPPLIERS ||--o{ PURCHASES : "supplies"
    PRODUCTS ||--o{ PURCHASES : "bought as"
    STREET_VENDORS ||--o{ ORDERS : "places"
    USERS ||--o{ ORDERS : "captures"
    ORDERS ||--|{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered as"
    PRODUCTS { int id PK  int fruit_id FK  int box_size_id FK  decimal selling_price  int units_per_box }
    STOCK { int id PK  int product_id FK  int quantity }
    SUPPLIERS { int id PK  int province_id FK  string supplier_name  string contact_person  string telephone  string email  string physical_address }
    PURCHASES { int id PK  int supplier_id FK  int product_id FK  int quantity_boxes  decimal unit_cost  date purchase_date }
    STREET_VENDORS { int id PK  string vendor_code  string vendor_name  string business_name  string telephone  string location_area  decimal latitude  decimal longitude  date registration_date  string status }
    ORDERS { int id PK  int vendor_id FK  int created_by FK  date order_date  decimal total_amount  string status }
    ORDER_ITEMS { int id PK  int order_id FK  int product_id FK  int quantity  decimal unit_price  decimal subtotal }
```

## Architecture
```mermaid
flowchart LR
    B[React + Vite<br/>React Router, JWT in localStorage] -- "JSON over HTTP /api" --> E[Express API<br/>helmet, cors, rate-limit,<br/>auth + role middleware, routes]
    E -- "mysql2 pool, parameterised SQL, transactions" --> M[(MySQL batloung_fruits)]
```

## Order lifecycle (stock rules)

The interface and API enforce each next step. Sales can progress as far as Ready; Administrator completes the order. Completed and Cancelled are terminal. Cancelling before completion leaves stock unchanged.
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed
    Confirmed --> Processing
    Processing --> ReadyForCollectionDelivery : Ready for Collection/Delivery
    ReadyForCollectionDelivery --> Completed : Admin only - stock reduced
    Pending --> Cancelled
    Confirmed --> Cancelled
    Processing --> Cancelled
    ReadyForCollectionDelivery --> Cancelled : stock untouched
    Completed --> [*]
    Cancelled --> [*]
```
