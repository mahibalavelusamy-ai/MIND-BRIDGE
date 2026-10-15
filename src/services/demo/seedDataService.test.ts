import { describe, it, expect } from 'vitest';
import { SeedDataService, UserRole } from './seedDataService';

describe('SeedDataService', () => {
  const roles: UserRole[] = ['student', 'parent', 'teacher', 'counselor', 'school_admin'];

  roles.forEach(role => {
    it(`generates complete persona seed data for ${role}`, () => {
      const data = SeedDataService.getSeedDataForRole(role);

      expect(data.user).toBeDefined();
      expect(data.user.role).toBe(role);
      expect(data.user.name).toBeDefined();
      expect(data.user.email).toBeDefined();
      expect(data.children.length).toBeGreaterThanOrEqual(1);
      expect(data.alerts.length).toBeGreaterThanOrEqual(1);

      if (role === 'counselor') {
        expect(data.triageCases).toBeDefined();
        expect(data.triageCases!.length).toBeGreaterThan(0);
      }
    });
  });
});
