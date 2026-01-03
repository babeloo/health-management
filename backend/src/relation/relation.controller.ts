import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';
import { RelationService } from './relation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateDoctorPatientRelationDto,
  CreateManagerMemberRelationDto,
  UpdateMembershipDto,
  QueryRelationsDto,
} from './dto';

/**
 * 请求用户接口（来自 JWT payload）
 */
interface RequestUser {
  id: string;
  userId: string;
  role: UserRole;
}

/**
 * 扩展的请求接口
 */
interface RequestWithUser extends Request {
  user: RequestUser;
}

/**
 * 医患关系管理控制器
 * 提供医生-患者关系和健康管理师-会员关系的 CRUD 功能
 */
@ApiTags('医患关系管理')
@ApiBearerAuth()
@Controller('relations')
@UseGuards(JwtAuthGuard)
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  /**
   * 创建医患关系
   * POST /api/v1/relations/doctor-patient
   */
  @Post('doctor-patient')
  @ApiOperation({ summary: '创建医患关系' })
  @ApiResponse({
    status: 201,
    description: '医患关系创建成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 404,
    description: '医生或患者不存在',
  })
  @ApiResponse({
    status: 409,
    description: '医患关系已存在',
  })
  async createDoctorPatientRelation(
    @Body() createDto: CreateDoctorPatientRelationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.relationService.createDoctorPatientRelation(createDto, req.user.id, req.user.role);
  }

  /**
   * 获取医生的患者列表
   * GET /api/v1/relations/doctor/:doctorId/patients
   */
  @Get('doctor/:doctorId/patients')
  @ApiOperation({ summary: '获取医生的患者列表（分页）' })
  @ApiParam({
    name: 'doctorId',
    description: '医生 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: '关系状态',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码（默认 1）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量（默认 20）',
  })
  @ApiResponse({
    status: 200,
    description: '返回医生的患者列表',
  })
  async getDoctorPatients(
    @Param('doctorId') doctorId: string,
    @Query() queryDto: QueryRelationsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.relationService.getDoctorPatients(doctorId, queryDto, req.user.id, req.user.role);
  }

  /**
   * 获取患者的医生列表
   * GET /api/v1/relations/patient/:patientId/doctors
   */
  @Get('patient/:patientId/doctors')
  @ApiOperation({ summary: '获取患者的医生列表' })
  @ApiParam({
    name: 'patientId',
    description: '患者 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: '返回患者的医生列表',
  })
  async getPatientDoctors(@Param('patientId') patientId: string, @Request() req: RequestWithUser) {
    return this.relationService.getPatientDoctors(patientId, req.user.id, req.user.role);
  }

  /**
   * 解除医患关系
   * DELETE /api/v1/relations/doctor-patient/:id
   */
  @Delete('doctor-patient/:id')
  @ApiOperation({ summary: '解除医患关系' })
  @ApiParam({
    name: 'id',
    description: '关系 ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: '医患关系解除成功',
  })
  @ApiResponse({
    status: 403,
    description: '无权操作此关系',
  })
  @ApiResponse({
    status: 404,
    description: '关系不存在',
  })
  async deleteDoctorPatientRelation(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.relationService.deleteDoctorPatientRelation(id, req.user.id, req.user.role);
    return { message: '医患关系解除成功' };
  }

  /**
   * 创建健康管理师会员关系
   * POST /api/v1/relations/manager-member
   */
  @Post('manager-member')
  @ApiOperation({ summary: '创建健康管理师会员关系' })
  @ApiResponse({
    status: 201,
    description: '健康管理师会员关系创建成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 404,
    description: '健康管理师或会员不存在',
  })
  @ApiResponse({
    status: 409,
    description: '关系已存在',
  })
  async createManagerMemberRelation(
    @Body() createDto: CreateManagerMemberRelationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.relationService.createManagerMemberRelation(createDto, req.user.id, req.user.role);
  }

  /**
   * 获取健康管理师的会员列表
   * GET /api/v1/relations/manager/:managerId/members
   */
  @Get('manager/:managerId/members')
  @ApiOperation({ summary: '获取健康管理师的会员列表（分页）' })
  @ApiParam({
    name: 'managerId',
    description: '健康管理师 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: '关系状态',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码（默认 1）',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量（默认 20）',
  })
  @ApiResponse({
    status: 200,
    description: '返回健康管理师的会员列表',
  })
  async getManagerMembers(
    @Param('managerId') managerId: string,
    @Query() queryDto: QueryRelationsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.relationService.getManagerMembers(managerId, queryDto, req.user.id, req.user.role);
  }

  /**
   * 更新会员类型
   * PUT /api/v1/relations/manager-member/:id/membership
   */
  @Put('manager-member/:id/membership')
  @ApiOperation({ summary: '更新会员类型' })
  @ApiParam({
    name: 'id',
    description: '关系 ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: '会员类型更新成功',
  })
  @ApiResponse({
    status: 404,
    description: '关系不存在',
  })
  async updateMembership(
    @Param('id') id: string,
    @Body() updateDto: UpdateMembershipDto,
    @Request() req: RequestWithUser,
  ) {
    return this.relationService.updateMembership(id, updateDto, req.user.id, req.user.role);
  }

  /**
   * 解除健康管理师会员关系
   * DELETE /api/v1/relations/manager-member/:id
   */
  @Delete('manager-member/:id')
  @ApiOperation({ summary: '解除健康管理师会员关系' })
  @ApiParam({
    name: 'id',
    description: '关系 ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: '健康管理师会员关系解除成功',
  })
  @ApiResponse({
    status: 403,
    description: '无权操作此关系',
  })
  @ApiResponse({
    status: 404,
    description: '关系不存在',
  })
  async deleteManagerMemberRelation(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.relationService.deleteManagerMemberRelation(id, req.user.id, req.user.role);
    return { message: '健康管理师会员关系解除成功' };
  }
}
