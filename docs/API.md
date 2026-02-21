# API Documentation

## Overview

This document provides comprehensive details about the API endpoints available for the CoLedge Money Manage Split application. The API allows users to manage their financial splits easily and effectively.

## Base URL

The base URL for all the API calls is:

```
https://api.colledge.money/manage
```

## Authentication

All API requests require authentication. Users must pass a valid API key in the headers.

### Headers

- `Authorization: Bearer {token}`

## Endpoints

### 1. Create a Split

- **POST** `/splits`

#### Request Body
```json
{
  "amount": number,
  "participants": [
    "userId1",
    "userId2"
  ]
}
```

#### Response
- **201 Created**
- Returns the details of the created split.

### 2. Get All Splits

- **GET** `/splits`

#### Response
- **200 OK**
- Returns a list of all splits.

### 3. Update a Split

- **PUT** `/splits/{id}`

#### Path Parameters
- `id` - ID of the split to be updated.

#### Request Body
```json
{
  "amount": number,
  "participants": [
    "userId1",
    "userId2"
  ]
}
```

#### Response
- **200 OK**
- Returns the updated split details.

### 4. Delete a Split

- **DELETE** `/splits/{id}`

#### Path Parameters
- `id` - ID of the split to be deleted.

#### Response
- **204 No Content**
- Indicates that the split has been successfully deleted.

### 5. Get Split by ID

- **GET** `/splits/{id}`

#### Path Parameters
- `id` - ID of the split to retrieve.

#### Response
- **200 OK**
- Returns the details of the specified split.

## Error Handling

All API responses include an error object when applicable.

```json
{
  "error": {
    "code": number,
    "message": "Error message"
  }
}
```

## Conclusion

This API provides a robust way to manage financial splits among participants. For further assistance, please refer to the API guidelines or contact support.