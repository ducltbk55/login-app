import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class AssignGroupsDto {
  @IsArray()
  @ArrayUnique({ message: 'groupIds không được trùng' })
  @IsString({ each: true })
  groupIds!: string[];
}
