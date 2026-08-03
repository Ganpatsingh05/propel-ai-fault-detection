import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

const app = express();

/**
 * Global Middleware
 */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);


export default app;