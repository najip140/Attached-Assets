import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import setupRouter from "./setup";
import backupRouter from "./backup";
import usersRouter from "./users";
import suppliersRouter from "./suppliers";
import productsRouter from "./products";
import salesRouter from "./sales";
import inventoryRouter from "./inventory";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import documentsRouter from "./documents";
import endOfDayRouter from "./end-of-day";
import inventoryLossRouter from "./inventory-loss";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(setupRouter);
router.use(backupRouter);
router.use(usersRouter);
router.use(suppliersRouter);
router.use(productsRouter);
router.use(salesRouter);
router.use(inventoryRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(documentsRouter);
router.use(endOfDayRouter);
router.use(inventoryLossRouter);

export default router;
