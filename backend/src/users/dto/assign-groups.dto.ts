import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class AssignGroupsDto {
  @IsArray()
  @ArrayUnique({ message: 'groupIds không được trùng' })
  @IsInt({ each: true, message: 'groupIds phải là số nguyên' })
  groupIds!: number[];
}
