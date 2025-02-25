import { Request, Response } from "express";
import { EntityTarget, FindOptionsWhere, Repository } from "typeorm";
import connectDB from "../data-source";

export class BaseController<Entity extends { _id?: string }> {
  entity: Repository<Entity>;

  constructor(entity: EntityTarget<Entity>) {
    this.entity = connectDB.getRepository(entity);
  }

  protected async post(req: Request, res: Response) {
    try {
      const response = await this.entity.save(req.body);
      res.status(200).send(response);
    } catch (err) {
      console.error("Failed to save object:", err);
      res.status(500).send({ message: "Failed to save object", error: err });
    }
  }

  /**
   * This method should not be used directly. It is designed to be extended
   * in specific controllers with proper data filtering for security.
   */
  protected async get(req: Request, res: Response) {
    try {
      if (req.params.id) {
        const object = await this.entity.findOneBy({
          _id: req.params.id,
        } as FindOptionsWhere<Entity>);
        if (object) {
          res.send(object);
        } else {
          res.status(404).send({ message: "Object not found" });
        }
      } else {
        const objects = await this.entity.find({ relations: ["owner"] });

        res.send(objects);
      }
    } catch (err) {
      console.error("Failed to retrieve data:", err);
      res.status(500).send({ message: "Error retrieving data", error: err });
    }
  }

  protected async put(req: Request, res: Response) {
    try {
      const objectToUpdate = await this.entity.findOneBy({
        _id: req.params.id,
      } as FindOptionsWhere<Entity>);

      if (objectToUpdate) {
        Object.assign(objectToUpdate, req.body);
        const updatedObject = await this.entity.save(objectToUpdate);
        res.status(200).send(updatedObject);
      } else {
        res.status(404).json({ message: "Object not found" });
      }
    } catch (err) {
      console.error("Failed to update object:", err);
      res.status(500).send({ message: "Error updating object", error: err });
    }
  }

  protected async delete(req: Request, res: Response) {
    try {
      const result = await this.entity.delete(req.params.id);
      if (result.affected === 0) {
        res.status(404).send({ message: "Object not found" });
      } else {
        res.send({ message: "Object deleted successfully" });
      }
    } catch (err) {
      console.error("Failed to delete object:", err);
      res.status(500).send({ message: "Error deleting object", error: err });
    }
  }
}
