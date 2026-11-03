export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ShopCart E-Commerce API',
    version: '1.0.0',
    description:
      'Enterprise E-Commerce REST API for Tech Challenge 360 (Grupo Pentandra). Built with Node.js 24, Express, TypeScript, and Microsoft SQL Server 2019+ via Stored Procedures (zero ORM).',
    contact: {
      name: 'ShopCart Engineering Team',
      email: 'thecris.danny@gmail.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Default Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token in the format: Bearer <token>',
      },
      guestToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Guest-Token',
        description: 'UUID token for anonymous guest shopping carts',
      },
      idempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'Unique client UUID to guarantee atomic, non-duplicated order creation',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          error: { type: 'string', example: 'Bad Request' },
          message: { type: 'string', example: 'Invalid request payload or business rule violation' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Juan Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          password: { type: 'string', minLength: 8, example: 'Password123!' },
          phoneNumber: { type: 'string', example: '50212345678' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@shopcart.gt' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Tecnología' },
          description: { type: 'string', example: 'Dispositivos electrónicos y computación' },
          idParentCategory: { type: 'integer', nullable: true, example: null },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['idCategory', 'name'],
        properties: {
          idCategory: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Laptop Gamer Pro 16"' },
          description: { type: 'string', example: 'Laptop de alto rendimiento 32GB RAM SSD 1TB' },
          mainImageUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8' },
        },
      },
      CreateVariantRequest: {
        type: 'object',
        required: ['sku', 'price', 'initialStock', 'attributesJson'],
        properties: {
          sku: { type: 'string', example: 'LAP-PRO-16-BLK' },
          price: { type: 'number', example: 8999.0 },
          initialStock: { type: 'integer', example: 25 },
          attributesJson: {
            type: 'object',
            example: { color: 'Espacio Gris', ram: '32GB', storage: '1TB' },
          },
        },
      },
      AddItemToCartRequest: {
        type: 'object',
        required: ['idVariant', 'quantity'],
        properties: {
          idVariant: { type: 'integer', example: 1 },
          quantity: { type: 'integer', minimum: 1, example: 2 },
        },
      },
      MergeCartRequest: {
        type: 'object',
        required: ['guestToken'],
        properties: {
          guestToken: { type: 'string', example: 'd3b07384-d113-46d4-8d48-6a3f01f2f01a' },
        },
      },
      CreateCouponRequest: {
        type: 'object',
        required: ['code', 'discountType', 'discountValue', 'startDate', 'endDate', 'maxTotalUses'],
        properties: {
          code: { type: 'string', example: 'BIENVENIDA' },
          discountType: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'], example: 'PERCENTAGE' },
          discountValue: { type: 'number', example: 10.0 },
          minPurchaseAmount: { type: 'number', example: 100.0 },
          startDate: { type: 'string', format: 'date-time', example: '2026-11-01T00:00:00Z' },
          endDate: { type: 'string', format: 'date-time', example: '2026-12-31T23:59:59Z' },
          maxTotalUses: { type: 'integer', example: 1000 },
          maxUsesPerClient: { type: 'integer', example: 1 },
          idCategory: { type: 'integer', nullable: true, example: null },
        },
      },
      ValidateCouponRequest: {
        type: 'object',
        required: ['code', 'eligibleSubtotal'],
        properties: {
          code: { type: 'string', example: 'BIENVENIDA' },
          eligibleSubtotal: { type: 'number', example: 350.0 },
        },
      },
      CreateAddressRequest: {
        type: 'object',
        required: ['alias', 'recipientName', 'addressLine1', 'municipality', 'department', 'contactPhone'],
        properties: {
          alias: { type: 'string', example: 'Casa' },
          recipientName: { type: 'string', example: 'Carlos Flores' },
          addressLine1: { type: 'string', example: 'Km 14.5 Carretera a El Salvador' },
          addressLine2: { type: 'string', example: 'Condominio Las Luces Casa 12' },
          municipality: { type: 'string', example: 'Santa Catarina Pinula' },
          department: { type: 'string', example: 'Guatemala' },
          postalCode: { type: 'string', example: '01051' },
          contactPhone: { type: 'string', example: '50212345678' },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['idDeliveryAddress'],
        properties: {
          idDeliveryAddress: { type: 'integer', example: 1 },
          couponCode: { type: 'string', nullable: true, example: 'BIENVENIDA' },
        },
      },
      AdvanceOrderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
            example: 'IN_PREPARATION',
          },
          reason: { type: 'string', example: 'Order moved to warehouse packaging stage' },
        },
      },
      ProcessReturnRequest: {
        type: 'object',
        required: ['idOrderItem', 'quantity', 'reason'],
        properties: {
          idOrderItem: { type: 'integer', example: 1 },
          quantity: { type: 'integer', example: 1 },
          reason: { type: 'string', example: 'Defective screen pixel line reported by client' },
        },
      },
      StockAdjustmentRequest: {
        type: 'object',
        required: ['idVariant', 'quantityChange', 'reason'],
        properties: {
          idVariant: { type: 'integer', example: 1 },
          quantityChange: { type: 'integer', example: 10, description: 'Positive to increase, negative to decrease' },
          reason: { type: 'string', example: 'Received supplier shipment PO-2026-884' },
        },
      },
      UpdateConfigurationRequest: {
        type: 'object',
        required: ['newValue'],
        properties: {
          newValue: { type: 'string', example: '12.00' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Database & API health check status',
        responses: {
          200: { description: 'Service is healthy and database is connected' },
          503: { description: 'Service is unavailable or database is disconnected' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'Customer registered successfully' },
          400: { description: 'Validation error or email already in use' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate with email and password to receive JWT tokens',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Authentication successful. Returns access and refresh tokens' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue a fresh 15-minute access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } },
        },
        responses: {
          200: { description: 'New token pair issued' },
          401: { description: 'Invalid, revoked or reused refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke active refresh token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } },
        },
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/catalog/categories': {
      get: {
        tags: ['Catalog'],
        summary: 'List hierarchical product categories',
        parameters: [
          { in: 'query', name: 'onlyActive', schema: { type: 'boolean', default: true } },
        ],
        responses: { 200: { description: 'List of categories' } },
      },
      post: {
        tags: ['Catalog'],
        summary: 'Create a new category (Administrator)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: { 201: { description: 'Category created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/catalog/categories/{id}': {
      put: {
        tags: ['Catalog'],
        summary: 'Update category (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } } },
        },
        responses: { 200: { description: 'Category updated' } },
      },
    },
    '/catalog/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Search products with server-side pagination, filters and stock',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'idCategory', schema: { type: 'integer' } },
          { in: 'query', name: 'minPrice', schema: { type: 'number' } },
          { in: 'query', name: 'maxPrice', schema: { type: 'number' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated product listing' } },
      },
      post: {
        tags: ['Catalog'],
        summary: 'Create a product (Administrator)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: { 201: { description: 'Product created' } },
      },
    },
    '/catalog/products/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get product detail with all its variants and real-time stock',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Product details' }, 404: { description: 'Product not found' } },
      },
      put: {
        tags: ['Catalog'],
        summary: 'Update product header (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: { 200: { description: 'Product updated' } },
      },
    },
    '/catalog/products/{id}/deactivate': {
      delete: {
        tags: ['Catalog'],
        summary: 'Soft-delete / deactivate product (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Product deactivated' } },
      },
    },
    '/catalog/products/{id}/variants': {
      post: {
        tags: ['Catalog'],
        summary: 'Create a variant with SKU, initial stock and Kardex entry (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateVariantRequest' } } },
        },
        responses: { 201: { description: 'Variant created' } },
      },
    },
    '/catalog/products/{id}/variants/{variantId}': {
      put: {
        tags: ['Catalog'],
        summary: 'Update variant price and attributes (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
          { in: 'path', name: 'variantId', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['price', 'attributesJson'],
                properties: {
                  price: { type: 'number', example: 8499.0 },
                  attributesJson: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Variant updated' } },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get active shopping cart with item details and 12% IVA breakdown',
        security: [{ bearerAuth: [] }, { guestToken: [] }],
        responses: { 200: { description: 'Active cart details' } },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear all items from active cart',
        security: [{ bearerAuth: [] }, { guestToken: [] }],
        responses: { 200: { description: 'Cart emptied' } },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add product variant to cart verifying real-time available stock',
        security: [{ bearerAuth: [] }, { guestToken: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddItemToCartRequest' } } },
        },
        responses: {
          200: { description: 'Item added/updated' },
          400: { description: 'Insufficient available stock' },
        },
      },
    },
    '/cart/items/{variantId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Update item quantity in cart (quantity: 0 removes the item)',
        security: [{ bearerAuth: [] }, { guestToken: [] }],
        parameters: [{ in: 'path', name: 'variantId', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: { quantity: { type: 'integer', minimum: 0, example: 3 } },
              },
            },
          },
        },
        responses: { 200: { description: 'Quantity updated' } },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove an item variant from cart',
        security: [{ bearerAuth: [] }, { guestToken: [] }],
        parameters: [{ in: 'path', name: 'variantId', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Item removed' } },
      },
    },
    '/cart/merge': {
      post: {
        tags: ['Cart'],
        summary: 'Merge anonymous guest cart into authenticated customer cart after login',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MergeCartRequest' } } },
        },
        responses: { 200: { description: 'Guest cart merged successfully' } },
      },
    },
    '/coupons/validate': {
      post: {
        tags: ['Coupons'],
        summary: 'Validate coupon and preview calculated discount',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateCouponRequest' } } },
        },
        responses: {
          200: { description: 'Validation result and discount preview' },
        },
      },
    },
    '/coupons': {
      get: {
        tags: ['Coupons'],
        summary: 'List all coupons (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'onlyActive', schema: { type: 'boolean' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated coupons' } },
      },
      post: {
        tags: ['Coupons'],
        summary: 'Create coupon (Administrator)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCouponRequest' } } },
        },
        responses: { 201: { description: 'Coupon created' } },
      },
    },
    '/coupons/{id}': {
      get: {
        tags: ['Coupons'],
        summary: 'Get coupon by ID (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Coupon details' } },
      },
      put: {
        tags: ['Coupons'],
        summary: 'Update coupon limits and dates (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCouponRequest' } } },
        },
        responses: { 200: { description: 'Coupon updated' } },
      },
      delete: {
        tags: ['Coupons'],
        summary: 'Deactivate coupon (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Coupon deactivated' } },
      },
    },
    '/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'List delivery addresses for authenticated customer',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of addresses' } },
      },
      post: {
        tags: ['Addresses'],
        summary: 'Save a new delivery address',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAddressRequest' } } },
        },
        responses: { 201: { description: 'Address created' } },
      },
    },
    '/orders/checkout': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Atomic checkout from active cart with 15-min reservation & Kardex deduction',
        security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } } },
        },
        responses: {
          201: { description: 'Order created and paid successfully' },
          400: { description: 'Cart empty, invalid coupon, insufficient stock, or invalid address' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'List orders (Customer sees own; Staff sees all)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated order history' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'Get order detail by ID with items, taxes and status audit trail',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Order detail' },
          403: { description: 'Forbidden: customer cannot view another user’s order' },
          404: { description: 'Order not found' },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders & Checkout'],
        summary: 'Advance order state machine (Operator / Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdvanceOrderStatusRequest' } } },
        },
        responses: {
          200: { description: 'Order status updated' },
          400: { description: 'Invalid state machine transition' },
        },
      },
    },
    '/orders/{id}/returns': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Process return for delivered order items and restock inventory in Kardex',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProcessReturnRequest' } } },
        },
        responses: {
          200: { description: 'Return processed and stock restocked' },
          400: { description: 'Order not delivered or return quantity exceeded' },
        },
      },
    },
    '/inventory/adjustments': {
      post: {
        tags: ['Inventory & Kardex'],
        summary: 'Manual stock adjustment with mandatory justification (Admin / Inventory Manager)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StockAdjustmentRequest' } } },
        },
        responses: {
          200: { description: 'Stock adjusted and audited in Kardex' },
          400: { description: 'Negative stock violation or invalid reason' },
        },
      },
    },
    '/inventory/kardex': {
      get: {
        tags: ['Inventory & Kardex'],
        summary: 'Query complete Kardex movement ledger with balance audits',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'idVariant', schema: { type: 'integer' } },
          { in: 'query', name: 'movementType', schema: { type: 'string' } },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Kardex movements' } },
      },
    },
    '/inventory/stock': {
      get: {
        tags: ['Inventory & Kardex'],
        summary: 'Real-time stock overview (physical, active reservations, available)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'idCategory', schema: { type: 'integer' } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'lowStockOnly', schema: { type: 'boolean' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Stock overview' } },
      },
    },
    '/reports/sales-summary': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Aggregated net and gross sales, average ticket and returns (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Sales summary analytics' } },
      },
    },
    '/reports/sales-by-category': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Net sales and units sold ranked by category (Administrator)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Category sales' } },
      },
    },
    '/reports/top-products': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Top selling products ranked by revenue and units sold (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: 'Top selling products' } },
      },
    },
    '/reports/abandoned-carts': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Abandoned shopping carts exceeding inactivity hours threshold (Administrator)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Abandoned carts list' } },
      },
    },
    '/audit/logs': {
      get: {
        tags: ['Audit & System'],
        summary: 'Administrative audit trail log (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'module', schema: { type: 'string' } },
          { in: 'query', name: 'entityName', schema: { type: 'string' } },
          { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
        ],
        responses: { 200: { description: 'Audit logs' } },
      },
    },
    '/configurations/{key}': {
      get: {
        tags: ['Audit & System'],
        summary: 'Get system configuration value by key (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Configuration key detail' } },
      },
      put: {
        tags: ['Audit & System'],
        summary: 'Update editable configuration key (Administrator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateConfigurationRequest' } } },
        },
        responses: { 200: { description: 'Configuration updated and audited' } },
      },
    },
    '/users': {
      post: {
        tags: ['User Management'],
        summary: 'Create a new user with any role (Administrator only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'roleCode'],
                properties: {
                  fullName: { type: 'string', example: 'Carlos Bodeguero' },
                  email: { type: 'string', format: 'email', example: 'carlos.bodega@shopcart.gt' },
                  password: { type: 'string', minLength: 8, example: 'Password123!' },
                  roleCode: { type: 'string', enum: ['ADMINISTRATOR', 'OPERATOR', 'CLIENT'], example: 'OPERATOR' },
                  phoneNumber: { type: 'string', example: '+502 2222-3333' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'User created successfully' }, 409: { description: 'Email already exists' } },
      },
      get: {
        tags: ['User Management'],
        summary: 'List users with pagination, role filter, and text search (Administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['ADMINISTRATOR', 'OPERATOR', 'CLIENT'] } },
          { in: 'query', name: 'q', schema: { type: 'string', description: 'Search by full name or email' } },
          { in: 'query', name: 'isActive', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'Paginated user list' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['User Management'],
        summary: 'Get user details by ID (Administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'User record' }, 404: { description: 'User not found' } },
      },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['User Management'],
        summary: 'Update or promote user role (Administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roleCode'],
                properties: {
                  roleCode: { type: 'string', enum: ['ADMINISTRATOR', 'OPERATOR', 'CLIENT'], example: 'OPERATOR' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'User role updated' }, 400: { description: 'Cannot revoke own administrator role' } },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['User Management'],
        summary: 'Activate or deactivate user account (Administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean', example: false },
                  reason: { type: 'string', example: 'Contract ended' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'User status updated' }, 400: { description: 'Cannot deactivate own account' } },
      },
    },
  },
};
