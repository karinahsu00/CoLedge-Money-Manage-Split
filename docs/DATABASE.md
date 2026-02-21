# Database Schema & Firestore Structure Documentation

## Overview
This document outlines the database schema used in the CoLedge Money Management Split application utilizing Firestore as the backend database.

## Firestore Structure
Firestore is a NoSQL document database that stores data in documents, which are organized into collections. Here is the main structure for the application:

### Collections
- **Users**  
  Each user has their own document that stores user-specific data.  
  - **Fields**:  
    - `userId` (String): Unique identifier for the user.  
    - `name` (String): The name of the user.  
    - `email` (String): User's email address.  
    - `createdAt` (Timestamp): The date and time the user was created.  
    - `updatedAt` (Timestamp): The date and time the user was last updated.  

- **Transactions**  
  Contains all financial transactions made by users.  
  - **Fields**:  
    - `transactionId` (String): Unique identifier for each transaction.  
    - `userId` (String): Reference to the user who made the transaction.  
    - `amount` (Number): Amount of money involved in the transaction.  
    - `type` (String): Type of transaction (e.g. `income`, `expense`).  
    - `createdAt` (Timestamp): The date and time the transaction was created.  

- **Budgets**  
  Stores user-defined budgets.  
  - **Fields**:  
    - `budgetId` (String): Unique identifier for the budget.  
    - `userId` (String): Reference to the user who created the budget.  
    - `amount` (Number): Budgeted amount.  
    - `category` (String): Category of the budget (e.g. `Food`, `Utilities`).  
    - `createdAt` (Timestamp): The date and time the budget was created.  

## Database Relationships
- **Users** to **Transactions**: One-to-many relationship (one user can have multiple transactions).
- **Users** to **Budgets**: One-to-many relationship (one user can have multiple budgets).  

## Indexing
To improve performance and support querying, the following indexes are recommended:  
- **Users Collection**: Index on `email` field to support user lookup by email.  
- **Transactions Collection**: Composite index on `userId` and `createdAt` to efficiently retrieve transactions by user and date.  
- **Budgets Collection**: Index on `userId` to quickly access a user's budgets.

## Conclusion
This document provides the foundational structure for the CoLedge Money Management Split application database. Future updates may expand the schema to accommodate new features.