import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import suppliersRouter from "./suppliers";
import productsRouter from "./products";
import salesRouter from "./sales";
import inventoryRouter from "./inventory";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(suppliersRouter);
router.use(productsRouter);
router.use(salesRouter);
router.use(inventoryRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
