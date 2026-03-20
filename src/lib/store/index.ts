import type { IDataStore } from './interface';
import { DemoStore } from './demo-store';

let store: IDataStore | null = null;

export function getStore(): IDataStore {
  if (store) return store;

  if (process.env.AWS_REGION && process.env.DYNAMODB_ROOMS_TABLE_NAME) {
    // Dynamic require to avoid importing AWS SDK when not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DynamoDBStore } = require('./dynamodb-store');
    store = new DynamoDBStore();
  } else {
    store = DemoStore.getInstance();
  }

  return store!;
}

export type { IDataStore } from './interface';
