import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import {
  CreateUserAdminDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from '../dtos/user.dto.js';

export class UserController {
  private service = new UserService();

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateUserAdminDto;
      const adminUserId = req.user!.idUser;
      const user = await this.service.createUser(dto, adminUserId);
      res.status(201).json({
        statusCode: 201,
        message: `User created successfully with role '${user.RoleCode}'.`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as UserQueryDto;
      const result = await this.service.listUsers(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const user = await this.service.getUserById(id);
      res.status(200).json({ statusCode: 200, data: user });
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateUserRoleDto;
      const adminUserId = req.user!.idUser;
      const user = await this.service.updateRole(id, dto, adminUserId);
      res.status(200).json({
        statusCode: 200,
        message: `User role updated successfully to '${user.RoleCode}'.`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateUserStatusDto;
      const adminUserId = req.user!.idUser;
      const user = await this.service.updateStatus(id, dto, adminUserId);
      res.status(200).json({
        statusCode: 200,
        message: `User status updated successfully to ${user.IsActive ? 'active' : 'inactive'}.`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };
}
