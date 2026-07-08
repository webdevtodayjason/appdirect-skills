# AppDirect GraphQL Mutation Reference (verified against developer.appdirect.com)

All product APIs are Early Availability. Endpoint: your marketplace's GraphQL endpoint; test in the hosted GraphQL Explorer (must be enabled per marketplace). Token scope: `ROLE_DEVELOPER`.

## 1. Create the product shell (core data — IMMUTABLE)

```graphql
mutation {
  createProduct(
    input: {
      type: WEB_APP
      addon: false
      allowMultiplePurchases: true
      usageType: MULTI_USER
      referable: false
    }
  ) {
    product { id vendorId }
  }
}
```

Capture `id` and `vendorId` — needed for every subsequent call. Vendors omit vendor ID (auto-associated); partner-role callers must include one.

## 2. Request userErrors (do this in every mutation)

```graphql
mutation {
  createProduct(input: { ... }) {
    userErrors {
      ... on MissingDefaultLanguageError { __typename message path }
      ... on UnspecifiedVendorError { __typename path message }
      ... on InvalidUsageTypeError { __typename message path type usage }
      ... on StringTooLongError { __typename message path }
      ... on URLTooLongError { __typename message path }
      ... on InvalidMediaSourceError { __typename message path }
      ... on ProductSupportInvalidEmailAddressError { __typename message path }
    }
  }
}
```

Example failure: `"Product is missing localized value for its default language: \"en-US\""` — locale tags follow IETF BCP 47 and `en` ≠ `en-US`.

## 3. Integration configuration

### 3a. Create it

```graphql
mutation {
  createProductIntegration(
    input: {
      createUrl: "https://yourapp.com/appdirect/events"
      upgradeUrl: "https://yourapp.com/appdirect/events"
      cancelUrl: "https://yourapp.com/appdirect/events"
      notifyUrl: "https://yourapp.com/appdirect/events"
      eventStatusUrl: "https://yourapp.com/appdirect/events"
      assignUrl: "https://yourapp.com/appdirect/events"
      unassignUrl: "https://yourapp.com/appdirect/events"
      name: "Shared Integration"
      outboundCredentials: {
        type: OAUTH2
        clientId: "YOUR_CLIENT_ID"
        clientSecret: "YOUR_SECRET"
        tokenUri: "https://yourapp.com/api/token"
        grantType: client_credentials
      }
    }
  ) {
    productIntegration { id }
  }
}
```

`assignUrl`/`unassignUrl` only apply to MULTI_USER products. One URL for all events is valid.

### 3b. SSO (pick one)

OpenID Connect:

```graphql
mutation {
  addProductIntegrationOpenIdConnectConfiguration(
    input: {
      integrationConfigurationId: 34827
      clientCreationMethod: "PER_SUBSCRIPTION"
      grantTypes: ["AUTHORIZATION_CODE"]
      redirectUrls: ["https://yourapp.com/auth/callback"]
      allowOidcScope: false
      allowUserScopes: false
      allowRoleScopes: false
      initiateLoginUrl: "https://yourapp.com/auth/appdirect"
      logoutUrl: "https://yourapp.com/logout"
    }
  ) {
    openIdConnectConfiguration { clientCreationMethod grantTypes redirectUrls }
  }
}
```

Alternatives: `addProductIntegrationSamlConfiguration`, `addProductIntegrationBookmarkConfiguration` (static link — use when the product has no SSO).

### 3c. Inbound client (your app → AppDirect)

```graphql
mutation {
  generateProductIntegrationInboundClient(
    input: { id: "INTEGRATION_ID" }
  ) {
    productIntegrationInboundClient { clientId clientSecret createdOn }
  }
}
```

Store the secret immediately; treat like any OAuth secret.

### 3d. Ping test

```graphql
mutation {
  triggerProductIntegrationPingTest(
    input: {
      id: "INTEGRATION_ID"
      version: WORKING
      eventTypes: [SUBSCRIPTION_ORDER]
    }
  ) {
    productIntegration { id version type }
  }
}
```

Results land in the product's `lastTest` object (`ProductIntegrationTest`) — query it to verify before publication.

### 3e. Publish + link

```graphql
mutation {
  publishProductIntegration(input: { integrationId: "INTEGRATION_ID" }) {
    productIntegration { id version }   # version: PUBLISHED
  }
}
```

```graphql
mutation {
  linkProductIntegration(
    input: { productId: "PRODUCT_ID", integrationId: "INTEGRATION_ID" }
  ) {
    product { id version }
  }
}
```

Linking one config to 2+ products makes it read-only in the UI (API-only edits thereafter) — deliberate choice for multi-product portfolios.

## 4. Publication (EA — requires AppDirect technical rep)

```graphql
mutation {
  triggerProductPublicationProcess(input: { productIds: ["PRODUCT_ID"] }) {
    productPublicationProcesses { id productId }
  }
}
```

Poll:

```graphql
query {
  productPublicationProcess(id: "PROCESS_ID") {
    completedOn startedOn triggeredOn status id productId
    errors {
      ... on DuplicatePublicationTriggeredError { __typename message }
      ... on EditionIdMismatchError { __typename message }
    }
  }
}
```

Until `status: PUBLISHED`.

## 5. Marketplace product settings (REST, post-publish)

Requires `ROLE_CHANNEL_ADMIN` or `ROLE_CHANNEL_PRODUCT_SUPPORT` (`ROLE_PARTNER` unsupported):

```
PUT https://{marketplace}/api/v3/marketplaceProduct/productSettings/{productId}
```

Body categories: `billing` (tax code, disableSelfServe, per-edition selfServiceabilityRestricted), `general.settings` (visibleOnMarketplace, visibleOnNetwork, availableToResellers, collectLeads, showAsComingSoon, hideAllPricing, sortingRank, termsOfServiceURL), `general.apiHealthMaintenance` (toggle purchase/SSO/assign endpoints), product groups (categories, attributes, merchandising).
