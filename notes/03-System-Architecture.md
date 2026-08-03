# System Architecture

## Architecture Goals
The system is designed to automatically detect, localize, and manage electrical distribution faults using telemetry received from IoT devices installed on electricity poles.

The architecture aims to:

- Detect electrical faults in under two minutes.
- Minimize false positives caused by device failures or scheduled outages.
- Localize the probable fault span or equipment.
- Automatically create and manage incident tickets.
- Verify restoration using telemetry rather than manual confirmation.
- Provide a simple and reliable operator dashboard.
- Support realistic fault simulation for testing.

## High-Level Architecture
The application follows a modular architecture.

Major components:

- Telemetry API
- Telemetry Processing Service
- Fault Localization Engine
- Ticket Management Service
- PostgreSQL Database
- Operator Dashboard
- Fault Simulator

Each component is responsible for a single business function, making the system easier to maintain and extend.

## Services

### Telemetry Service

Receives telemetry from pole devices, validates messages, removes duplicates, and stores events.

### Network Service

Provides access to network topology, pole registry, feeder information, and transformer details.

### Fault Localization Engine

Analyzes telemetry to identify probable fault locations and calculates confidence.

### Ticket Service

Creates and updates incident tickets throughout their lifecycle.

### Simulator Service

Generates synthetic telemetry for span faults, transformer faults, feeder faults, scheduled outages, duplicate packets, and device failures.

### AI Service

Generates operator-friendly summaries and explanations for detected incidents.

## Data Flow
1. Pole devices send telemetry.
2. Telemetry API receives messages.
3. Messages are validated and stored.
4. Fault Localization Engine analyzes the latest network state.
5. A new incident is created if a fault is detected.
6. A ticket is generated.
7. The operator dashboard displays the incident.
8. Restoration telemetry automatically verifies the repair.

## Storage Strategy
The system stores both static and dynamic data.

Static Data

- Feeders
- Distribution Transformers
- Poles
- Devices

Dynamic Data

- Telemetry Events
- Fault Incidents
- Tickets
- Ticket History

Configuration Data

- Scheduled Outages
- Confidence Thresholds


## Technology Stack
Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

Backend

- Node.js
- Express.js

Database

- PostgreSQL

Maps

- Leaflet
- OpenStreetMap

Real-Time Communication

- Socket.IO

Deployment

- Docker
- Docker Compose

Version Control

- Git
- GitHub


## Design Decisions
Decision 1
Use PostgreSQL because the electrical network is naturally relational.

Decision 2
Keep fault localization deterministic instead of using an LLM.

Decision 3
Separate telemetry processing from ticket management.

Decision 4
Use OpenStreetMap to avoid requiring reviewer API keys.

Decision 5
Use modular services rather than a single monolithic controller.

## Risks
- Missing topology for many transformers.
- Device failures causing misleading telemetry.
- Duplicate or delayed messages.
- Firmware differences between devices.
- Incorrect localization when topology is unavailable.

## Future Improvements
- Crew routing optimization.
- Predictive maintenance using historical outages.
- Mobile application for field crews.
- Multi-city deployment.
- Authentication and role-based access control.

## Backend Architecture

The backend follows a layered architecture.

Request Flow

Client

↓

Routes

↓

Controllers

↓

Services

↓

Algorithms

↓

Database

Controllers remain thin and only coordinate requests.

Business logic is implemented inside services.

Fault localization logic is isolated inside the algorithms module to keep it independent of API and database concerns.

This separation improves maintainability, testability, and future extensibility.

## Backend Initialization

The backend is implemented using Node.js, Express.js, and TypeScript.

The application follows a layered architecture.

Responsibilities are separated into dedicated modules:

- Routes handle endpoint definitions.
- Controllers process HTTP requests.
- Services contain business logic.
- Algorithms implement fault localization.
- Database manages persistence.
- Socket.IO provides real-time updates.

The backend is intentionally modular to ensure each component has a single responsibility.

## Application Bootstrap

The backend entry point is divided into two files.

### server.ts

Responsible for:

- Loading environment variables.
- Starting the HTTP server.
- Listening on the configured port.

### app.ts

Responsible for:

- Creating the Express application.
- Registering middleware.
- Defining application routes.
- Exporting the configured Express instance.

Separating startup logic from application configuration improves maintainability and enables easier testing because the Express application can be imported without starting the HTTP server.

## Error Handling Strategy

The backend uses centralized middleware for handling errors.

### 404 Middleware

Handles requests for undefined routes and returns a consistent JSON response.

### Global Error Handler

Captures unexpected exceptions and returns a standardized error response.

Development environments include stack traces to simplify debugging, while production environments hide implementation details.

## Layered Request Architecture

The backend follows a layered request flow.

Request

↓

Route

↓

Controller

↓

Service

↓

Business Logic / Database

Routes define endpoints only.

Controllers handle HTTP concerns such as request parsing and response formatting.

Services contain business logic and can be reused by multiple controllers.

This separation improves readability, testability, and long-term maintainability.