import { prisma } from '../../infrastructure/database/index.js';

export class HealthRepository {
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
