# AI Workflow & Retrospective

## 🤖 AI Tools Used
- **Google Antigravity (AGY):** Served as the primary autonomous agent (Implementer) for exploring the codebase, debugging constraints, and applying cross-repository refactors.
- **Claude (Anthropic):** Assisted with conceptual system design, particularly defining the rules-based deterministic logic for the Fault Classifier and Confidence Scorer algorithms.
- **ChatGPT (OpenAI):** Utilized early on for rapid generation of dummy telemetry payload structures and helping script the complex PostgreSQL seed data for the topological hierarchy.

## 🏗️ What AI Generated vs What I Rewrote

**What AI Generated:**
- The Next.js frontend scaffolding and Tailwind CSS grid layouts.
- The PostgreSQL `CREATE TABLE` and `ALTER TABLE` schemas.
- The bulk of the initial boilerplate for Express routes and controllers.
- The recursive algorithms for topological tree traversal.

**What I Rewrote (Human Intervention):**
- **The Simulator Logic:** AI initially wrote the simulator to randomly flip database flags. I rewrote this to directly invoke `processTelemetry()` with generated payloads, ensuring every simulated event passes through the full detection pipeline (validation → deduplication → outage filter → classifier → localization → confidence → incident/ticket creation) rather than bypassing it.
- **The Map Component:** AI struggled with Leaflet's interaction with Next.js Server-Side Rendering (SSR). I had to manually extract the map into a separate component and import it dynamically using `next/dynamic`.
- **Database Workflow Constraints:** AI generated the states but failed to align the application logic with the database `CHECK` constraints, requiring manual architectural enforcement.

## ❌ Three Concrete AI Mistakes & How I Caught Them

1. **State Machine Desynchronization**
   - **Mistake:** The AI implemented a 6-state ticket workflow in the frontend UI (`acknowledged`, `assigned`, `verified`, etc.) but the database was strictly locked to 5 states (`open`, `in_progress`, `pending_verification`, `resolved`, `closed`).
   - **How I caught it:** The application crashed with a `chk_tickets_status` constraint violation when the Simulator attempted to restore power and close the incident. I deployed an AI agent specifically to audit the discrepancy via `grep` and apply a strict mapping matrix.

2. **Incorrect Tool Usage resulting in Partial Updates**
   - **Mistake:** When asked to update statuses across multiple files (`repositories.ts` and `ticket.service.ts`), the AI agent grouped chunks for both files into a single `multi_replace_file_content` request directed only at one file. It silently failed to update the database repository.
   - **How I caught it:** Even after the "fix" was applied, the exact same database crash occurred. I instructed the AI to search the entire backend for the rogue string (`verified`), revealing the silent failure.

3. **Suboptimal React State Polling**
   - **Mistake:** The AI originally attempted to use `useEffect` loops with `setInterval` to fetch dashboard data, leading to severe race conditions and unhandled promise rejections on unmount.
   - **How I caught it:** The browser console was flooded with memory leak warnings. I instructed the AI to replace the custom hooks with `@tanstack/react-query` to let the library handle the polling interval and cache invalidation natively.

## 📊 AI Code Contribution
- **Estimated Percentage of AI-Generated Code:** 85%
- **Human Contribution (15%):** System architecture definition, strict prompt engineering, constraint alignment, debugging integration points, and documentation.

## 🧠 Lessons Learned
1. **The Database is King:** Always make the SQL schema the absolute source of truth. AI will frequently drift and invent its own application-level states if not constantly grounded by strict DB constraints.
2. **Review Multi-file Refactors Carefully:** Autonomous agents can get confused when executing regex replacements across multiple files simultaneously. Always run unit tests or manual compilations (`npm run build`) after an AI performs a wide-sweeping text replacement.
3. **AI is Excellent at Algorithms, Poor at Integration:** The AI flawlessly generated the complex graph traversal logic for localizing a fault. However, it struggled significantly to wire that logic correctly through the Express controllers, the Database repository, and the React UI.

---

## 🎯 Interview Preparation (25 Potential Questions)

Based purely on this repository's architecture and codebase, here are 25 questions an interviewer is likely to ask:

**Architecture & Design**
1. Why did you choose a layered architecture (Controllers, Services, Repositories) for the Express backend?
2. Explain the flow of data from the moment a smart meter loses power to the moment it appears on the frontend dashboard.
3. Why did you choose raw PostgreSQL over an ORM like Prisma or TypeORM?
4. How does the system ensure duplicate telemetry events from stuttering IoT devices don't skew the incident counts?
5. You chose HTTP polling via React Query instead of WebSockets. Walk me through the tradeoffs of that decision.

**Algorithms & Logic**
6. How does your Fault Classifier distinguish between a Transformer Fault and a Span Fault?
7. Explain the "Estimated Localization" algorithm. How do you find a fault location when exact topology data is missing?
8. Your Confidence Scorer is deterministic rather than ML-based. What heuristics are you using to calculate the 0.0 to 1.0 score?
9. How does the system handle "late messages" where `recorded_at` is older than `received_at`?
10. If a sensor dies completely and fails to send a `power_lost` event, how does your pipeline handle the silence?

**Database & Data Integrity**
11. Talk me through your database schema hierarchy (Feeders → Transformers → Poles → Devices).
12. You enforce the ticket workflow using a `CHECK` constraint (`chk_tickets_status`). Why enforce this at the database level rather than just the application level?
13. How are scheduled outages filtered out so they don't trigger false positive incidents?
14. In `repositories.ts`, you use a correlated subquery to determine real-time device online/offline status. How will this scale as `telemetry_events` grows into the millions?
15. Explain how you automated the database initialization using Docker's `docker-entrypoint-initdb.d`.

**Frontend & UI**
16. The Control Room UI needs to be high-density and responsive. Why did you choose TailwindCSS over traditional CSS modules?
17. You used `react-leaflet` for mapping. How did you resolve the conflicts between Leaflet's DOM manipulation and Next.js Server-Side Rendering?
18. Walk me through how you implemented the `tickets/page.tsx` workflow UI to ensure an operator can only click valid state transitions.
19. How did you implement error resilience on the frontend when the backend API goes offline?
20. Why did you isolate state management entirely in React Query rather than using Redux or the Context API?

**Deployment & DevOps**
21. Walk me through your multi-stage `Dockerfile`. How does it keep the final production image small?
22. What is the difference between `npm install` and `npm ci`, and why did you use `npm ci` in your Docker build?
23. Explain your `docker-compose.yml` setup. How does the backend container know when the postgres container is ready to accept connections?
24. If I deploy this to Render or Railway, how do environment variables connect the separate Web Service and Database instances?
25. Tell me about a time during this project when an integration between the frontend, backend, and simulator failed, and how you debugged it.
