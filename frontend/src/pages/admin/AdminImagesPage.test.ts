import { describe, expect, it } from 'vitest';
import { permissionForLicence, queryPresets } from './AdminImagesPage';

describe('AdminImagesPage helpers', () => {
  it('suggests searches that combine the name with the place and the parts of a campus', () => {
    expect(queryPresets({ name: 'Netarhat Residential School', city: 'Netarhat', stateName: 'Jharkhand' })).toEqual([
      'Netarhat Residential School',
      'Netarhat Residential School Netarhat',
      'Netarhat Residential School Jharkhand',
      'Netarhat Residential School campus',
      'Netarhat Residential School building',
      'Netarhat Residential School hostel',
      'Netarhat Residential School Netarhat school',
    ]);
    expect(queryPresets({ name: 'X', city: null, stateName: null })).toEqual(['X', 'X campus', 'X building', 'X hostel']);
  });

  it('starts approval from the permission the stored licence names', () => {
    expect(permissionForLicence('Public domain')).toBe('PUBLIC_DOMAIN');
    expect(permissionForLicence('CC0 1.0')).toBe('PUBLIC_DOMAIN');
    expect(permissionForLicence('CC BY-SA 4.0')).toBe('OPEN_LICENCE');
    expect(permissionForLicence('Used with written permission of the school')).toBe('WRITTEN_PERMISSION');
  });
});
