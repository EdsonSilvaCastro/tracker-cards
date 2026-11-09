import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { shoppingApi } from '@/lib/api';

const mxn = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

const EMPTY = { category: '', name: '', price: '', budget: '', notes: '', links: '' };

const linkLabel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const safeHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    try {
      const res = await shoppingApi.list();
      setItems(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la lista de compras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push(it);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([category, list]) => ({
        category,
        list,
        price: list.reduce((s, i) => s + Number(i.price), 0),
        budget: list.reduce((s, i) => s + Number(i.budget), 0),
      }));
  }, [items]);

  const totals = useMemo(() => ({
    price: groups.reduce((s, g) => s + g.price, 0),
    budget: groups.reduce((s, g) => s + g.budget, 0),
  }), [groups]);

  const openNew = (category = '') => {
    setForm({ ...EMPTY, category });
    setFormError(null);
    setEditing('new');
  };

  const openEdit = (it) => {
    setForm({
      category: it.category,
      name: it.name,
      price: String(it.price),
      budget: String(it.budget),
      notes: it.notes || '',
      links: (it.links || []).join('\n'),
    });
    setFormError(null);
    setEditing(it);
  };

  const close = () => setEditing(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category.trim()) return setFormError('La categoría es obligatoria.');
    if (!form.name.trim()) return setFormError('El nombre es obligatorio.');
    const payload = { ...form, links: form.links.split('\n') };
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') await shoppingApi.create(payload);
      else await shoppingApi.update(editing.id, payload);
      close();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'No se pudo guardar el artículo.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await shoppingApi.delete(id);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el artículo.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
      </div>
    );
  }

  const th = 'px-3 py-2.5 font-bold';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lista de compras</h1>
          <p className="text-sm text-muted-foreground">
            Precio total {mxn(totals.price)} · Presupuesto total {mxn(totals.budget)}
          </p>
        </div>
        <Button onClick={() => openNew()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo artículo
        </Button>
      </div>

      {error && (
        <div role="alert" className="border-2 border-black bg-red-100 px-4 py-2 text-sm font-medium">{error}</div>
      )}

      {groups.length === 0 && !error && (
        <div className="bg-white border-2 border-black shadow-md px-4 py-10 text-center text-sm text-muted-foreground">
          Aún no hay artículos. Agrega el primero para crear una categoría.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.category} className="bg-white border-2 border-black shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black px-4 py-2.5">
            <h2 className="text-[13px] font-bold tracking-wider uppercase">{g.category}</h2>
            <Button size="sm" variant="outline" onClick={() => openNew(g.category)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13.5px] tabular-nums">
              <thead>
                <tr className="text-left text-[10.5px] tracking-widest uppercase text-muted-foreground">
                  <th scope="col" className={`${th} px-4`}>Nombre</th>
                  <th scope="col" className={`${th} text-right`}>Precio</th>
                  <th scope="col" className={`${th} text-right`}>Presupuesto</th>
                  <th scope="col" className={th}>Observaciones</th>
                  <th scope="col" className={th}>Links</th>
                  <th scope="col" className={th}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {g.list.map((it) => {
                  const over = Number(it.budget) > 0 && Number(it.price) > Number(it.budget);
                  return (
                    <tr key={it.id} className="border-t border-black/20 align-top">
                      <td className="px-4 py-2.5 font-medium">{it.name}</td>
                      <td className={`px-3 py-2.5 text-right ${over ? 'text-red-600 font-bold' : ''}`}>{mxn(it.price)}</td>
                      <td className="px-3 py-2.5 text-right">{mxn(it.budget)}</td>
                      <td className="px-3 py-2.5 max-w-[260px] whitespace-pre-wrap break-words">{it.notes}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          {(it.links || []).map((l) => (
                            <a
                              key={l}
                              href={safeHref(l)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 underline break-all"
                            >
                              {linkLabel(l)} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {confirmId === it.id ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => remove(it.id)}>Eliminar</Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>No</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button type="button" aria-label={`Editar ${it.name}`} onClick={() => openEdit(it)} className="p-1.5 hover:bg-accent rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" aria-label={`Eliminar ${it.name}`} onClick={() => setConfirmId(it.id)} className="p-1.5 hover:bg-accent rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-bold bg-black/5">
                  <td className="px-4 py-2.5">Suma de {g.category}</td>
                  <td className="px-3 py-2.5 text-right">{mxn(g.price)}</td>
                  <td className="px-3 py-2.5 text-right">{mxn(g.budget)}</td>
                  <td colSpan={3} className="px-3 py-2.5 text-[12px] font-medium">
                    {g.budget > 0 && (g.price <= g.budget
                      ? `Dentro del presupuesto por ${mxn(g.budget - g.price)}`
                      : `Excede el presupuesto por ${mxn(g.price - g.budget)}`)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}

      {editing && (
        <Modal isOpen onClose={close} title={editing === 'new' ? 'Nuevo artículo' : 'Editar artículo'}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Input label="Categoría" list="shopping-categories" value={form.category} onChange={set('category')} placeholder="Ej. Hogar" />
              <datalist id="shopping-categories">
                {groups.map((g) => <option key={g.category} value={g.category} />)}
              </datalist>
            </div>
            <Input label="Nombre" value={form.name} onChange={set('name')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} />
              <Input label="Presupuesto" type="number" min="0" step="0.01" inputMode="decimal" value={form.budget} onChange={set('budget')} />
            </div>
            <div>
              <label htmlFor="sl-notes" className="block text-sm font-medium mb-1">Observaciones</label>
              <textarea id="sl-notes" rows={3} value={form.notes} onChange={set('notes')}
                className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="sl-links" className="block text-sm font-medium mb-1">Links (uno por línea)</label>
              <textarea id="sl-links" rows={3} value={form.links} onChange={set('links')} placeholder="https://…"
                className="w-full px-3 py-2 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] focus:outline-none" />
            </div>
            {formError && <p role="alert" className="text-sm font-medium text-(--color-destructive)">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
