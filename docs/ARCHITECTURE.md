# System Architecture Documentation

## Overview  
The architecture of CoLedge Money Manage Split is designed to efficiently manage and split expenses among users. It utilizes a microservices architecture that allows each component to be developed, deployed, and scaled independently.

## Components  
1. **User Service**  
   - Responsible for user registration, authentication, and management.
   - Implements OAuth 2.0 for secure authentication.

2. **Expense Service**  
   - Manages all expense-related functionality including creation, retrieval, and splitting of expenses.
   - Interacts with the database to store expense records.

3. **Notification Service**  
   - Sends notifications to users regarding their expenses and reminders for payments.
   - Utilizes web sockets for real-time communication.

4. **Frontend Application**  
   - User interface developed using React.js.
   - Communicates with the backend services through REST APIs.

## Database  
- **PostgreSQL** is utilized as the main relational database for storing user and expense data. 

## Data Flow Diagram  
The data flows through the system in a manner where user interactions on the frontend trigger API calls to the backend services, which in turn interact with the database. Notifications are pushed back to the frontend as required.

## Deployment Strategy  
- Each microservice is containerized using Docker and orchestrated with Kubernetes for scalability and reliability.  

## Conclusion  
The architecture of CoLedge Money Manage Split is robust and designed to provide a seamless user experience in managing and splitting expenses.