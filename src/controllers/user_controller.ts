import { BaseController } from "./base_controller";
import { AuthRequest } from "../common/auth_middleware";
import { Response } from "express";
import bcrypt from "bcrypt";
import { EntityTarget } from "typeorm";
import { IUser, User } from "../entity/users_model";

class UserController extends BaseController<IUser> {
  constructor(entity: EntityTarget<IUser>) {
    super(entity);
  }
  async put(req: AuthRequest, res: Response) {
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = encryptedPassword;
    }
    return super.put(req, res);
  }
}

export default new UserController(User);
