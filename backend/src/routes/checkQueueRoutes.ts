// src/routes/checkQueueRoutes.ts

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import CheckQueuesController from "../controllers/CheckQueueController";

const checkQueueRoutes = Router();

checkQueueRoutes.get("/checkqueue/:queueId", isAuth, CheckQueuesController.getWhatsappIds);

export default checkQueueRoutes;
