export type LivenessResponse = {
  status: 'ok';
};

export type MigrationReadiness = 'up_to_date' | 'pending' | 'unavailable';

export type ReadinessResponse =
  | {
      status: 'ok';
      database: 'up';
      migrations: 'up_to_date';
    }
  | {
      status: 'error';
      database: 'down';
    }
  | {
      status: 'error';
      database: 'up';
      migrations: Exclude<MigrationReadiness, 'up_to_date'>;
    };
