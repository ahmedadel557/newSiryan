import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import "dotenv/config";
import passport from "passport";
import "./config/passport";

import authRoutes from "./routes/auth.routes";
import patientRoutes from "./routes/patient.routes";
import doctorRoutes from "./routes/doctor.routes";
import nurseRoutes from "./routes/nurse.routes";
import receptionistRoutes from "./routes/receptionist.routes";
import pharmacistRoutes from "./routes/pharmacist.routes";
import inventoryRoutes from "./routes/inventory.routes";
import labRoutes from "./routes/lab.routes";
import radiologyRoutes from "./routes/radiology.routes";
import cashierRoutes from "./routes/cashier.routes";
import adminRoutes from "./routes/admin.routes";
import departmentRoutes from "./routes/department.routes";
import notificationRoutes from "./routes/notification.routes";
import uploadRoutes from "./routes/upload.routes";
import settingsRoutes from "./routes/settings.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiter } from "./middlewares/rateLimiter";
import { maintenanceGuard } from "./middlewares/maintenanceMode";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(rateLimiter);
app.use(maintenanceGuard);
app.use(
  "/api/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(process.cwd(), "uploads")),
);
app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/nurse", nurseRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/pharmacy", pharmacistRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/lab", labRoutes);
app.use("/api/radiology", radiologyRoutes);
app.use("/api/cashier", cashierRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/settings", settingsRoutes);

app.use(errorHandler);

export default app;
