# Engineering Decisions

This document chronicles the major architectural and engineering decisions made during the development of the Propel AI Fault Detection System.

---

### 1. Database Choice: PostgreSQL
- **Decision:** Use PostgreSQL as the primary datastore.
- **Alternatives considered:** MongoDB (NoSQL), InfluxDB (Time-series).
- **Why chosen:** The grid topology (Feeders → Transformers → Poles → Devices) is inherently relational. We required strict ACID compliance and robust `CHECK` constraints to ensure workflow state integrity.
- **Tradeoffs:** Postgres is less optimized for raw time-series ingestion out-of-the-box compared to InfluxDB, requiring careful indexing on `telemetry_events`.

### 2. Database Access: Raw SQL via `pg` (No ORM)
- **Decision:** Use parameterized raw SQL queries instead of an ORM.
- **Alternatives considered:** Prisma, TypeORM, Sequelize.
- **Why chosen:** ORMs introduce heavy abstraction and often generate inefficient SQL for complex hierarchical joins (e.g., recursive topological queries). Raw SQL allowed for precise control over execution plans and made it trivial to use `COUNT(*) FILTER` clauses for dashboard statistics.
- **Tradeoffs:** Reduced developer velocity for simple CRUD operations; lacks automatic TypeScript type inference for query results.

### 3. Application Logic: Pure Functions
- **Decision:** Isolate the fault detection and localization algorithms into pure, side-effect-free TypeScript functions.
- **Alternatives considered:** Coupling the detection logic directly inside Express controllers or database triggers.
- **Why chosen:** The classification rules (Span vs Transformer vs Feeder) are highly complex. Making them pure functions guarantees they are 100% testable without mocking a database connection.
- **Tradeoffs:** Requires the service layer to fetch all necessary topological data upfront and pass it into the algorithms, occasionally resulting in over-fetching.

### 4. Workflow Management: Strict Database Constraints
- **Decision:** Enforce the ticketing state machine (`open → in_progress → resolved → pending_verification → closed`) directly in PostgreSQL via a `CHECK` constraint.
- **Alternatives considered:** Enforcing it only at the application (Express) level.
- **Why chosen:** The database is the ultimate source of truth. Relying solely on the application layer leaves the database vulnerable to manual DBA errors or bugs in edge-case scripts (like the Simulator).
- **Tradeoffs:** Requires rigid adherence across all clients. (This actually caused a bug during development where the simulator crashed due to outdated string literals).

### 5. Frontend State: React Query with HTTP Polling
- **Decision:** Use `@tanstack/react-query` with a 15-second `refetchInterval` to keep the UI in sync.
- **Alternatives considered:** WebSockets (Socket.io), Server-Sent Events (SSE).
- **Why chosen:** The assignment prioritizes robustness and rapid deployment. Setting up scalable WebSockets across Node instances introduces significant infrastructure complexity. HTTP polling combined with React Query's caching provides an acceptable illusion of real-time operation for a control room.
- **Tradeoffs:** Inefficient network utilization; polling stresses the backend even when no data has changed.

### 6. Mapping: React-Leaflet
- **Decision:** Render the topology using OpenStreetMap and Leaflet via `react-leaflet`.
- **Alternatives considered:** Mapbox GL JS, Google Maps.
- **Why chosen:** Leaflet is open-source, requires no API keys, and is lightweight enough for plotting hundreds of custom SVG icons (transformers and incidents) dynamically.
- **Tradeoffs:** Leaflet manipulates the DOM directly, clashing with Next.js Server-Side Rendering (SSR). This required using `next/dynamic` to force client-side-only rendering, slightly increasing initial load times.

### 7. Confidence Scoring Strategy
- **Decision:** Use algorithmic density and topological agreement to calculate an arbitrary 0.0–1.0 score, rather than an ML probability model.
- **Alternatives considered:** Training a lightweight regression model.
- **Why chosen:** A deterministic algorithm provides immediate explainability to human operators (e.g., "Confidence is 0.8 because 3 neighbors corroborate"). ML models are often black boxes which are unacceptable in critical grid operations.
- **Tradeoffs:** The heuristic tuning (e.g., +0.4 for neighbor agreement) is arbitrary and might require constant tweaking as the grid evolves.

### 8. Missing Topology Strategy
- **Decision:** Default to logical bounding and geographic centroids when precise GIS data is unavailable.
- **Alternatives considered:** Rejecting telemetry that lacks topological mapping.
- **Why chosen:** In real-world utility grids, GIS databases are notoriously out of date. Dropping telemetry because of poor GIS mapping is dangerous. Providing an estimated centroid ensures the dispatcher still gets an actionable area.
- **Tradeoffs:** May result in crews being dispatched to the middle of an empty field rather than an exact pole, increasing search time on site.

### 9. Integrated Simulator
- **Decision:** Build the fault simulator directly into the backend rather than as a separate microservice.
- **Alternatives considered:** A standalone Python script or Postman collection.
- **Why chosen:** Allows the simulator to easily fetch the existing database topology and generate realistic, interconnected events tailored exactly to the seeded network. It also allowed creating a dedicated frontend UI for easy demonstrations.
- **Tradeoffs:** Pollutes the production backend codebase with test/simulation code. In a real environment, this module would need strict `NODE_ENV=development` guards.
