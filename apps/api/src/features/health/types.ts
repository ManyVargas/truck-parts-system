export type LivenessResponse = {
  status: 'ok';
};

export type ReadinessResponse =
  | {
      status: 'ok';
      database: 'up';
    }
  | {
      status: 'error';
      database: 'down';
    };
