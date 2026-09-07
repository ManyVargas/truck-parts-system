import { Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import { AppError } from '../../infrastructure/errors/app-error.js';
import { CustomerRepository } from '../customers/repository.js';
import { HistoryRepository } from '../history/repository.js';
import { UserRepository } from '../users/repository.js';
import { SalesRepository } from './repository.js';

export type SalesRepositories = {
  sales: SalesRepository;
  customers: CustomerRepository;
  users: UserRepository;
  history: HistoryRepository;
};
export type SalesTransaction = <T>(
  work: (repositories: SalesRepositories) => Promise<T>,
) => Promise<T>;

export const salesTransaction: SalesTransaction = async (work) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) =>
          work({
            sales: new SalesRepository(tx),
            customers: new CustomerRepository(tx),
            users: new UserRepository(tx),
            history: new HistoryRepository(tx),
          }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034' && attempt < 3) continue;
        if (error.code === 'P2025') throw AppError.notFound();
        if (error.code === 'P2003') throw AppError.notFound('Customer not found');
        if (error.code === 'P2034')
          throw AppError.conflict('Concurrent invoice change; retry the request');
      }
      throw error;
    }
  }
};
