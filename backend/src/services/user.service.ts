import argon2 from 'argon2';
import { UserDal, UserRecord } from '../dal/user.dal.js';
import { AuthDal } from '../dal/auth.dal.js';
import {
  CreateUserAdminDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from '../dtos/user.dto.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app-error.js';
import { logger } from '../utils/logger.util.js';

export class UserService {
  private userDal = new UserDal();
  private authDal = new AuthDal();

  async createUser(dto: CreateUserAdminDto, adminUserId: number): Promise<UserRecord> {
    const existing = await this.authDal.getUserByEmail(dto.email);
    if (existing) {
      throw new ConflictError('A user with this email address is already registered.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
    });

    const newIdUser = await this.userDal.createUserByAdmin(
      dto.roleCode,
      dto.fullName,
      dto.email,
      passwordHash,
      dto.phoneNumber,
      adminUserId
    );

    const created = await this.userDal.getUserById(newIdUser);
    if (!created) {
      throw new NotFoundError(`User with ID ${newIdUser} was created but could not be retrieved.`);
    }

    logger.info(
      `User created by Admin: ID=${newIdUser}, Email='${dto.email}', Role='${dto.roleCode}' by Admin ${adminUserId}`
    );

    return created;
  }

  async listUsers(query: UserQueryDto) {
    const { items, total } = await this.userDal.listUsers(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
      data: items,
    };
  }

  async getUserById(idUser: number): Promise<UserRecord> {
    const user = await this.userDal.getUserById(idUser);
    if (!user) {
      throw new NotFoundError(`User with ID ${idUser} not found.`);
    }
    return user;
  }

  async updateRole(
    idUser: number,
    dto: UpdateUserRoleDto,
    adminUserId: number
  ): Promise<UserRecord> {
    if (idUser === adminUserId && dto.roleCode !== 'ADMINISTRATOR') {
      throw new BadRequestError('Administrators cannot revoke their own administrator role.');
    }

    const existing = await this.userDal.getUserById(idUser);
    if (!existing) {
      throw new NotFoundError(`User with ID ${idUser} not found.`);
    }

    await this.userDal.updateRole(idUser, dto.roleCode, adminUserId);
    const updated = await this.userDal.getUserById(idUser);

    logger.info(
      `User role updated: ID=${idUser}, PreviousRole='${existing.RoleCode}', NewRole='${dto.roleCode}' by Admin ${adminUserId}`
    );

    return updated!;
  }

  async updateStatus(
    idUser: number,
    dto: UpdateUserStatusDto,
    adminUserId: number
  ): Promise<UserRecord> {
    if (idUser === adminUserId && !dto.isActive) {
      throw new BadRequestError('Administrators cannot deactivate their own account.');
    }

    const existing = await this.userDal.getUserById(idUser);
    if (!existing) {
      throw new NotFoundError(`User with ID ${idUser} not found.`);
    }

    await this.userDal.updateStatus(idUser, dto.isActive, dto.reason, adminUserId);
    const updated = await this.userDal.getUserById(idUser);

    logger.info(
      `User status updated: ID=${idUser}, IsActive=${dto.isActive}, Reason='${dto.reason || 'None'}' by Admin ${adminUserId}`
    );

    return updated!;
  }
}
