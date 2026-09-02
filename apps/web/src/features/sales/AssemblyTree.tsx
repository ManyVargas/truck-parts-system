import type { HierarchyNode } from '../../api/contracts/inventory';
import { HierarchyTree } from '../inventory/HierarchyTree';

export function AssemblyTree({ tree, currentId }: { tree: HierarchyNode; currentId: string }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-navy-400">
        Árbol del ensamblaje
      </p>
      <HierarchyTree tree={tree} currentId={currentId} />
    </div>
  );
}
