import { User } from "@prisma/client";
import {File} from "multer"
declare global {
  namespace Express {
    interface Request {
      user?: User;
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}
