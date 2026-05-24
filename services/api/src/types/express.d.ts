import type { UserType } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      userId: string;
      sessionId: string;
      userType: UserType | string;
    }
  }
}

export {};
