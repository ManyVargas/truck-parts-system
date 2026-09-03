import type { CategoryAttributeDefinition } from './entities';

export type SaveCategoryInput = {
  id?: string;
  name: string;
  /** Required on create. Ignored on edit — prefixes are immutable. */
  codePrefix?: string;
  isAssembly: boolean;
  expectedComponents?: string[];
  /** Omit on edit to keep the current schema. Empty array clears it. */
  attributes?: CategoryAttributeDefinition[];
};

export type SaveServiceInput = {
  id?: string;
  name: string;
  active: boolean;
};
