import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import { isLiveSupabaseConfigured } from "./config/supabase.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// CORS Configuration (Disabled / Permissive Default)
// const allowedOrigins = [
//   ENV.CLIENT_URL,
//   "http://localhost:3000",
//   "http://localhost:3001",
//   "http://localhost:5173",
//   "http://127.0.0.1:3000",
//   "http://127.0.0.1:3001",
//   "http://127.0.0.1:5173",
// ];
// 
// const corsOptions: cors.CorsOptions = {
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (
//       allowedOrigins.includes(origin) ||
//       /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
//       ENV.NODE_ENV !== "production"
//     ) {
//       return callback(null, true);
//     }
//     return callback(null, true);
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
//   exposedHeaders: ["Authorization"],
//   preflightContinue: false,
//   optionsSuccessStatus: 204,
// };
// 
// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));

app.use(cors()); // Allow all origins by default

app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Ping check
const pingHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({
    message: "pong",
    timestamp: new Date().toISOString(),
    status: "online",
    service: "agrosafe-backend",
    database: isLiveSupabaseConfigured() ? "connected" : "misconfigured",
  });
};

app.get("/ping", pingHandler);
app.get("/api/ping", pingHandler);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    supabaseConnected: isLiveSupabaseConfigured(),
    environment: ENV.NODE_ENV,
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    supabaseConnected: isLiveSupabaseConfigured(),
    environment: ENV.NODE_ENV,
  });
});

// Mount API Routes on both /api and root to handle any serverless rewrite
app.use("/api", apiRouter);
app.use("/", apiRouter);

// Global Error Handler
app.use(errorHandler);

// Start server only when not running inside Vercel serverless environment
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`AgroSafe Backend Server running on port ${ENV.PORT}`);
    console.log(`Supabase DB Integration: ${isLiveSupabaseConfigured() ? "Connected" : "NOT CONFIGURED — check .env"}`);
    console.log(`Base API URL: http://localhost:${ENV.PORT}/api`);
    console.log(`====================================================`);

    // Start background ingestion, hold-release, and risk precomputation scheduler
    import("./services/backgroundJobs.js").then((m) => {
      m.backgroundScheduler.start();
    }).catch((e) => console.warn("[Server] Could not initialize background scheduler:", e.message));
  });
}


export default app;
