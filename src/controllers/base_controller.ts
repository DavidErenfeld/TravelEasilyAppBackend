import { Request, Response } from "express";
import { EntityTarget, FindOptionsWhere, Repository } from "typeorm";
import connectDB from "../data-source";

export class BaseController<Entity extends { _id?: string }> {
  entity: Repository<Entity>;

  constructor(entity: EntityTarget<Entity>) {
    this.entity = connectDB.getRepository(entity);
  }

  async post(req: Request, res: Response) {
    console.log("save object");
    console.log(req.body);
    try {
      const response = await this.entity.save(req.body);
      res.status(200).send(response);
    } catch (err) {
      console.log(err);
      res.status(500).send("fail" + err);
    }
  }

  async get(req: Request, res: Response) {
    try {
      if (req.params.id) {
        const object = await this.entity.findOneBy({
          _id: req.params.id,
        } as FindOptionsWhere<Entity>);
        console.log(object);
        res.send(object);
      } else {
        const objects = await this.entity.find({ relations: ["owner"] });
        console.log(objects);
        res.send(objects);
      }
    } catch (err) {
      res.status(500).send(err);
    }
  }

  async put(req: Request, res: Response) {
    console.log("update Object");
    console.log(req.params.id);

    try {
      const userToUpdate = await this.entity.findOneBy({
        _id: req.params.id,
      } as FindOptionsWhere<Entity>);

      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }

      // Replace the entire user object with the new data
      Object.assign(userToUpdate, req.body);

      // Save the updated user back to the database
      const updatedObject = await this.entity.save(userToUpdate);

      //Shorter Way but not returning updatedOjbect for test
      // const updatedObject = await this.entity.update(req.params.id, req.body);
      //  if (!updatedObject) {
      //     return res.status(404).json({ message: 'User not found' });
      // }
      res.status(200).send(updatedObject);
      console.log(updatedObject);
    } catch (err) {
      res.status(404).send(err);
    }
  }

  async delete(req: Request, res: Response) {
    console.log("delete Object");
    try {
      if (req.params.id) {
        const object = await this.entity.delete(req.params.id);
        if (object.affected === 0) {
          // No rows affected, respond with 504
          return res
            .status(504)
            .send("No rows deleted, request timed out or object not found");
        }
        console.log(object);
      } else {
        await this.entity.delete({});
        console.log("All object deleted");
      }
      res.send("deleted successfully");
    } catch (err) {
      res.status(404).send(err);
    }
  }
}
