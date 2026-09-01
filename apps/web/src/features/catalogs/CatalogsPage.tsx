import { useState } from 'react';

import type { SaveCategoryInput, SaveServiceInput } from '../../api/contracts/catalogs';
import type { Category, Service } from '../../api/contracts/entities';
import { Button, Info, useToast } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { TabBar } from '../../shared/layout/TabBar';
import { CategoryFormModal } from './CategoryFormModal';
import { CategoryList } from './CategoryList';
import { ServiceFormModal } from './ServiceFormModal';
import { ServiceList } from './ServiceList';
import { useCatalogs, type CatalogTab } from './useCatalogs';

const TABS: { id: CatalogTab; label: string }[] = [
  { id: 'categories', label: 'Categorías' },
  { id: 'services', label: 'Servicios' },
];

export function CatalogsPage() {
  const { tab, setTab, categories, services, isSaving, saveCategory, saveService } = useCatalogs();
  const { pushToast } = useToast();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);

  function openCreateCategory() {
    setEditingCategory(null);
    setFormError(null);
    setCategoryModalOpen(true);
  }

  function openCreateService() {
    setEditingService(null);
    setFormError(null);
    setServiceModalOpen(true);
  }

  function closeCategoryModal() {
    if (isSaving) {
      return;
    }
    setCategoryModalOpen(false);
    setEditingCategory(null);
    setFormError(null);
  }

  function closeServiceModal() {
    if (isSaving) {
      return;
    }
    setServiceModalOpen(false);
    setEditingService(null);
    setFormError(null);
  }

  async function handleCategorySubmit(input: SaveCategoryInput) {
    setFormError(null);
    const response = await saveCategory(input);
    if (!response.ok) {
      setFormError(response.error.message);
      return;
    }

    pushToast(input.id ? 'Categoría actualizada' : 'Categoría creada', 'success');
    setCategoryModalOpen(false);
    setEditingCategory(null);
  }

  async function handleServiceSubmit(input: SaveServiceInput) {
    setFormError(null);
    const response = await saveService(input);
    if (!response.ok) {
      setFormError(response.error.message);
      return;
    }

    pushToast(input.id ? 'Servicio actualizado' : 'Servicio creado', 'success');
    setServiceModalOpen(false);
    setEditingService(null);
  }

  async function handleToggleService(row: Service) {
    setTogglingServiceId(row.id);
    const response = await saveService({
      id: row.id,
      name: row.name,
      active: !row.active,
    });
    setTogglingServiceId(null);

    if (!response.ok) {
      pushToast(response.error.message, 'error');
      return;
    }

    pushToast(row.active ? 'Servicio desactivado' : 'Servicio activado', 'success');
  }

  const loadError =
    categories.status === 'error'
      ? categories.error
      : services.status === 'error'
        ? services.error
        : null;

  if (loadError) {
    return (
      <Info tone="error" title="No se pudo cargar catálogos">
        {loadError.message}
      </Info>
    );
  }

  const isLoading = categories.status === 'loading' || services.status === 'loading';

  return (
    <>
      <PageHeader
        title="Catálogos"
        description="Categorías de inventario y servicios mecánicos. El vendedor usa estas definiciones; no puede cambiarlas."
        actions={
          tab === 'categories' ? (
            <Button onClick={openCreateCategory} disabled={isLoading}>
              Nueva categoría
            </Button>
          ) : (
            <Button onClick={openCreateService} disabled={isLoading}>
              Nuevo servicio
            </Button>
          )
        }
      />

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {isLoading ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando catálogos…
        </p>
      ) : tab === 'categories' && categories.status === 'ready' ? (
        <CategoryList
          rows={categories.rows}
          onEdit={(row) => {
            setEditingCategory(row);
            setFormError(null);
            setCategoryModalOpen(true);
          }}
        />
      ) : tab === 'services' && services.status === 'ready' ? (
        <ServiceList
          rows={services.rows}
          togglingId={togglingServiceId}
          onEdit={(row) => {
            setEditingService(row);
            setFormError(null);
            setServiceModalOpen(true);
          }}
          onToggleActive={(row) => {
            void handleToggleService(row);
          }}
        />
      ) : null}

      <CategoryFormModal
        open={categoryModalOpen}
        category={editingCategory}
        isSaving={isSaving}
        error={formError}
        onClose={closeCategoryModal}
        onSubmit={(input) => {
          void handleCategorySubmit(input);
        }}
      />

      <ServiceFormModal
        open={serviceModalOpen}
        service={editingService}
        isSaving={isSaving}
        error={formError}
        onClose={closeServiceModal}
        onSubmit={(input) => {
          void handleServiceSubmit(input);
        }}
      />
    </>
  );
}
