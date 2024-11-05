import { Request, Response } from "express";
import { EntityTarget, FindOptionsWhere, Repository } from "typeorm";
import connectDB from "../data-source";

export class BaseController<Entity extends { _id?: string }> {
  entity: Repository<Entity>;

  constructor(entity: EntityTarget<Entity>) {
    this.entity = connectDB.getRepository(entity);
  }

  async post(req: Request, res: Response) {
    console.log("Attempting to save object:", req.body);
    try {
      const response = await this.entity.save(req.body);
      console.log("Object saved successfully:", response);
      res.status(200).send(response);
    } catch (err) {
      console.error("Failed to save object:", err);
      res.status(500).send({ message: "Failed to save object", error: err });
    }
  }

  async get(req: Request, res: Response) {
    try {
      if (req.params.id) {
        const object = await this.entity.findOneBy({
          _id: req.params.id,
        } as FindOptionsWhere<Entity>);
        if (object) {
          console.log("Object found:", object);
          res.send(object);
        } else {
          console.log("Object not found, id:", req.params.id);
          res.status(404).send({ message: "Object not found" });
        }
      } else {
        const objects = await this.entity.find({ relations: ["owner"] });
        console.log("Objects retrieved:", objects);
        res.send(objects);
      }
    } catch (err) {
      console.error("Failed to retrieve data:", err);
      res.status(500).send({ message: "Error retrieving data", error: err });
    }
  }

  async put(req: Request, res: Response) {
    console.log("Attempting to update object, id:", req.params.id);
    try {
      const objectToUpdate = await this.entity.findOneBy({
        _id: req.params.id,
      } as FindOptionsWhere<Entity>);

      if (objectToUpdate) {
        Object.assign(objectToUpdate, req.body);
        const updatedObject = await this.entity.save(objectToUpdate);
        console.log("Object updated successfully:", updatedObject);
        res.status(200).send(updatedObject);
      } else {
        console.log("Object not found, id:", req.params.id);
        res.status(404).json({ message: "Object not found" });
      }
    } catch (err) {
      console.error("Failed to update object:", err);
      res.status(500).send({ message: "Error updating object", error: err });
    }
  }

  async delete(req: Request, res: Response) {
    console.log("Attempting to delete object, id:", req.params.id);
    try {
      const result = await this.entity.delete(req.params.id);
      if (result.affected === 0) {
        console.log("No object found to delete, id:", req.params.id);
        res.status(404).send({ message: "Object not found" });
      } else {
        console.log("Object deleted successfully");
        res.send({ message: "Object deleted successfully" });
      }
    } catch (err) {
      console.error("Failed to delete object:", err);
      res.status(500).send({ message: "Error deleting object", error: err });
    }
  }
}
