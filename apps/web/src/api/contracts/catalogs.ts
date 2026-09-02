export type SaveCategoryInput = {
  id?: string;
  name: string;
  isAssembly: boolean;
  expectedComponents?: string[];
};

export type SaveServiceInput = {
  id?: string;
  name: string;
  active: boolean;
};
