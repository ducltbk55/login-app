import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateProductDto } from './save-product.dto';

function galleryErrors(gallery: unknown): string[] {
  const dto = plainToInstance(UpdateProductDto, { gallery });
  return validateSync(dto)
    .filter((error) => error.property === 'gallery')
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

const OK = '/media/products/58bd34e7-a580-4112-9654-860852407a23.png';

describe('SaveProductDto.gallery', () => {
  it('nhận ảnh đã tải lên và link https', () => {
    expect(galleryErrors([OK, 'https://cdn.example.com/a.jpg'])).toEqual([]);
    expect(galleryErrors([])).toEqual([]);
  });

  it.each([
    [['javascript:alert(1)']],
    [['/media/articles/58bd34e7-a580-4112-9654-860852407a23.png']],
    [['data:image/png;base64,AA']],
    ['khong-phai-mang'],
    [Array.from({ length: 21 }, () => OK)],
  ])('chặn %p', (value) => {
    expect(galleryErrors(value)).not.toEqual([]);
  });
});

function specErrors(specs: unknown): number {
  const dto = plainToInstance(UpdateProductDto, { specs });
  return validateSync(dto).filter((error) => error.property === 'specs').length;
}

describe('SaveProductDto.specs', () => {
  it('nhận danh sách nhãn–giá trị, cắt khoảng trắng', () => {
    const dto = plainToInstance(UpdateProductDto, {
      specs: [{ label: ' Camera ', value: ' 200MP ' }],
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.specs).toEqual([{ label: 'Camera', value: '200MP' }]);
  });

  it.each([
    ['nhãn rỗng', [{ label: '', value: 'x' }]],
    ['giá trị rỗng', [{ label: 'Camera', value: '  ' }]],
    ['thiếu trường', [{ label: 'Camera' }]],
    ['không phải mảng', { Camera: '200MP' }],
    ['nhãn quá dài', [{ label: 'x'.repeat(81), value: 'x' }]],
    [
      'quá 60 dòng',
      Array.from({ length: 61 }, (_, i) => ({ label: `L${i}`, value: 'x' })),
    ],
  ])('chặn %s', (_label, specs) => {
    expect(specErrors(specs)).toBeGreaterThan(0);
  });
});
