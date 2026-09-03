import { Link } from 'react-router-dom';

import type { HierarchyNode } from '../../api/contracts/inventory';
import { InventoryStatusCluster, PhysicalWorkChip } from '../../shared/domain';
import { Mono } from '../../shared/ui';

function MissingSlotRow({
  slot,
  depth,
}: {
  slot: HierarchyNode['missingSlots'][number];
  depth: number;
}) {
  const originLabel =
    slot.origin === 'MISSING_AT_RECEIPT' ? 'Faltante en recepción' : 'Retirado tras desarme';

  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/80 px-2 py-1.5 text-amber-900"
        style={{ marginLeft: depth * 16 }}
      >
        <span className="font-medium">{slot.name}</span>
        <span className="text-xs">{originLabel}</span>
        {slot.formerItemId && (
          <Link to={`/inventory/${slot.formerItemId}`} className="text-xs font-medium underline">
            {slot.formerItemId}
          </Link>
        )}
      </div>
    </li>
  );
}

function TreeNode({
  node,
  currentId,
  depth,
}: {
  node: HierarchyNode;
  currentId: string;
  depth: number;
}) {
  const isCurrent = node.id === currentId;

  return (
    <li>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 ${
          isCurrent ? 'bg-brand/10' : ''
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        <Link
          to={`/inventory/${node.id}`}
          className={`font-medium ${isCurrent ? 'text-navy' : 'text-brand hover:underline'}`}
        >
          {node.name}
        </Link>
        <Mono className="text-xs text-navy-400">{node.id}</Mono>
        <InventoryStatusCluster
          commercialState={node.commercialState}
          physicalRelationship={node.physicalRelationship}
          parentName={node.parentName}
          isAssembly={node.isAssembly}
          complete={node.complete}
          reserved={false}
          noDesarmar={node.noDesarmar}
          protectedRootId={node.protectedRootId}
          compact
          layout="inline"
          extra={
            node.activeWork ? (
              <PhysicalWorkChip type={node.activeWork.type} status={node.activeWork.status} />
            ) : undefined
          }
        />
      </div>
      {(node.children.length > 0 || node.missingSlots.length > 0) && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} currentId={currentId} depth={depth + 1} />
          ))}
          {node.missingSlots.map((slot) => (
            <MissingSlotRow key={slot.id} slot={slot} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function HierarchyTree({
  tree,
  currentId,
}: {
  tree: HierarchyNode;
  currentId: string;
}) {
  return (
    <ul className="text-sm">
      <TreeNode node={tree} currentId={currentId} depth={0} />
    </ul>
  );
}
