export type SaveCategoryInput = {
  id?: string;
  name: string;
  /** Required on create. Ignored on edit — prefixes are immutable. */
  codePrefix?: string;
  isAssembly: boolean;
  expectedComponents?: string[];
};

export type SaveServiceInput = {
  id?: string;
  name: string;
  active: boolean;
};
